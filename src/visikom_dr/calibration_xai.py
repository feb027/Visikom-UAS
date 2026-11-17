"""Kalibrasi Temperature Scaling, Grad-CAM++, dan ekspor model ONNX terpadu."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Sequence

import cv2
import numpy as np
import torch
import torch.nn as nn
from scipy.optimize import minimize

from visikom_dr.losses import (
    OptimizedRounder,
    corn_logits_to_numpy_probs,
    corn_logits_to_preds,
    corn_probs_to_preds,
)
from visikom_dr.metrics import expected_calibration_error


@dataclass(frozen=True)
class CalibrationResult:
    temperature: float
    smooth_sigma: float
    nll_before: float
    nll_after: float
    ece_before: float
    ece_after: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _softmax_np(logits: np.ndarray) -> np.ndarray:
    shifted = logits - np.max(logits, axis=1, keepdims=True)
    exp_z = np.exp(np.clip(shifted, -50.0, 50.0))
    return exp_z / np.clip(exp_z.sum(axis=1, keepdims=True), 1e-12, None)


def _categorical_nll(probs: np.ndarray, y_true: np.ndarray) -> float:
    p = np.asarray(probs, dtype=np.float64)
    yt = np.asarray(y_true, dtype=np.int64).ravel()
    idx = np.arange(yt.size)
    chosen = np.clip(p[idx, yt], 1e-12, 1.0)
    return float(-np.mean(np.log(chosen)))


def raw_output_to_calibrated_probs(
    raw_output: np.ndarray,
    head_type: str,
    temperature: float = 1.0,
    thresholds: Sequence[float] | None = None,
    smooth_sigma: float = 0.65,
) -> np.ndarray:
    """Ubah keluaran mentah PyTorch atau ONNX menjadi matriks probabilitas 5 kelas terkalibrasi."""
    arr = np.asarray(raw_output, dtype=np.float64)
    if arr.ndim == 1:
        arr = arr[:, None]
    temp = max(float(temperature), 1e-3)

    if head_type == "ce":
        return _softmax_np(arr / temp)
    if head_type == "corn":
        return corn_logits_to_numpy_probs(arr / temp)
    if head_type == "smooth_l1":
        del thresholds
        return OptimizedRounder.scores_to_probs(arr.ravel(), sigma=smooth_sigma, num_classes=5)
    raise ValueError(f"head_type tidak dikenal: {head_type}")


def raw_output_to_predictions(
    raw_output: np.ndarray,
    head_type: str,
    temperature: float = 1.0,
    thresholds: Sequence[float] | None = None,
    smooth_sigma: float = 0.65,
) -> tuple[np.ndarray, np.ndarray]:
    """Hasilkan pasangan (probabilitas_kalibrasi, label_prediksi) dari keluaran mentah."""
    probs = raw_output_to_calibrated_probs(
        raw_output,
        head_type=head_type,
        temperature=temperature,
        thresholds=thresholds,
        smooth_sigma=smooth_sigma,
    )
    if head_type == "smooth_l1":
        rounder = OptimizedRounder(
            initial_thresholds=tuple(thresholds) if thresholds is not None else OptimizedRounder.DEFAULT_THRESHOLDS
        )
        preds = rounder.predict(np.asarray(raw_output, dtype=np.float64).ravel())
    elif head_type == "corn":
        preds = corn_probs_to_preds(probs)
    else:
        preds = np.argmax(probs, axis=1).astype(np.int64)
    return probs, preds


class TemperatureScaler:
    """Kalibrasi probabilitas pasca-pelatihan pada set validasi tanpa mengubah argmax."""

    def __init__(self, temperature: float = 1.0, smooth_sigma: float = 0.65) -> None:
        self.temperature = float(temperature)
        self.smooth_sigma = float(smooth_sigma)

    def fit(self, raw_outputs: np.ndarray, y_true: np.ndarray, head_type: str) -> CalibrationResult:
        raw = np.asarray(raw_outputs, dtype=np.float64)
        yt = np.asarray(y_true, dtype=np.int64).ravel()

        probs_before = raw_output_to_calibrated_probs(raw, head_type=head_type, temperature=1.0, smooth_sigma=0.65)
        nll_before = _categorical_nll(probs_before, yt)
        ece_before = expected_calibration_error(yt, probs_before)

        if head_type in ("ce", "corn"):
            def loss_fn(log_t: np.ndarray) -> float:
                t = float(np.exp(log_t[0]))
                p = raw_output_to_calibrated_probs(raw, head_type=head_type, temperature=t)
                return _categorical_nll(p, yt)

            res = minimize(loss_fn, x0=np.array([0.0]), method="L-BFGS-B", bounds=[(-2.5, 2.5)])
            self.temperature = float(np.exp(res.x[0]))
            self.smooth_sigma = 0.65
        elif head_type == "smooth_l1":
            def sigma_loss(log_s: np.ndarray) -> float:
                s = float(np.exp(log_s[0]))
                p = raw_output_to_calibrated_probs(raw, head_type="smooth_l1", smooth_sigma=s)
                return _categorical_nll(p, yt)

            res = minimize(sigma_loss, x0=np.array([np.log(0.65)]), method="L-BFGS-B", bounds=[(-1.6, 0.8)])
            self.temperature = 1.0
            self.smooth_sigma = float(np.exp(res.x[0]))
        else:
            raise ValueError(f"head_type tidak dikenal: {head_type}")

        probs_after = raw_output_to_calibrated_probs(
            raw,
            head_type=head_type,
            temperature=self.temperature,
            smooth_sigma=self.smooth_sigma,
        )
        return CalibrationResult(
            temperature=self.temperature,
            smooth_sigma=self.smooth_sigma,
            nll_before=nll_before,
            nll_after=_categorical_nll(probs_after, yt),
            ece_before=ece_before,
            ece_after=expected_calibration_error(yt, probs_after),
        )


def compute_gradcam_plusplus(
    model: nn.Module,
    input_tensor: torch.Tensor,
    target_index: int | None = None,
) -> np.ndarray:
    """Hitung peta aktivasi Grad-CAM++ pada feature_tap untuk citra tunggal [1, 3, H, W]."""
    if input_tensor.ndim != 4 or input_tensor.shape[0] != 1:
        raise ValueError(f"Grad-CAM++ membutuhkan tensor [1, 3, H, W], diterima {tuple(input_tensor.shape)}")

    activations: list[torch.Tensor] = []
    gradients: list[torch.Tensor] = []

    def fwd_hook(_module: nn.Module, _inp: tuple[torch.Tensor, ...], out: torch.Tensor) -> None:
        activations.append(out.detach())

    def bwd_hook(_module: nn.Module, _grad_in: tuple[torch.Tensor | None, ...], grad_out: tuple[torch.Tensor | None, ...]) -> None:
        if grad_out[0] is not None:
            gradients.append(grad_out[0].detach())

    was_training = model.training
    model.eval()
    h_fwd = model.feature_tap.register_forward_hook(fwd_hook)
    h_bwd = model.feature_tap.register_full_backward_hook(bwd_hook)
    try:
        with torch.enable_grad():
            x = input_tensor.detach().clone().requires_grad_(True)
            model.zero_grad(set_to_none=True)
            output = model(x)
            if target_index is None:
                if output.shape[1] == 1:
                    idx = 0
                elif getattr(model, "head_type", "ce") == "corn":
                    pred_cls = int(corn_logits_to_preds(output.detach())[0].item())
                    idx = min(max(pred_cls - 1, 0), output.shape[1] - 1)
                else:
                    idx = int(torch.argmax(output.detach(), dim=1)[0].item())
            else:
                idx = min(max(int(target_index), 0), output.shape[1] - 1)
            output[0, idx].backward()
    finally:
        h_fwd.remove()
        h_bwd.remove()
        model.train(was_training)

    if not activations or not gradients:
        return np.zeros((input_tensor.shape[2], input_tensor.shape[3]), dtype=np.float32)

    act = activations[0][0]
    grad = gradients[0][0]
    grad2 = grad.pow(2)
    grad3 = grad.pow(3)
    sum_act_grad3 = (act * grad3).sum(dim=(1, 2), keepdim=True)
    denom = 2.0 * grad2 + sum_act_grad3
    alpha = torch.where(denom != 0.0, grad2 / denom, torch.zeros_like(grad2))
    weights = (alpha * torch.relu(grad)).sum(dim=(1, 2))
    cam = torch.relu((weights[:, None, None] * act).sum(dim=0)).cpu().numpy().astype(np.float32)

    cam_resized = cv2.resize(
        cam,
        (int(input_tensor.shape[3]), int(input_tensor.shape[2])),
        interpolation=cv2.INTER_LINEAR,
    )
    c_min, c_max = float(cam_resized.min()), float(cam_resized.max())
    if c_max - c_min > 1e-8:
        return ((cam_resized - c_min) / (c_max - c_min)).astype(np.float32)
    return np.zeros_like(cam_resized, dtype=np.float32)


def cam_map_from_onnx_output(
    cam_maps: np.ndarray,
    target_index: int = 0,
    out_size: int = 384,
) -> np.ndarray:
    """Ekstrak dan normalisasi peta aktivasi spasial dari keluaran kedua model ONNX."""
    arr = np.asarray(cam_maps, dtype=np.float32)
    if arr.ndim == 4:
        arr = arr[0]
    idx = min(max(int(target_index), 0), arr.shape[0] - 1)
    cam = np.maximum(arr[idx], 0.0)
    resized = cv2.resize(cam, (out_size, out_size), interpolation=cv2.INTER_LINEAR)
    c_min, c_max = float(resized.min()), float(resized.max())
    if c_max - c_min > 1e-8:
        return ((resized - c_min) / (c_max - c_min)).astype(np.float32)
    return np.zeros((out_size, out_size), dtype=np.float32)


def overlay_heatmap_on_fundus(
    rgb_square: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = 0.40,
) -> np.ndarray:
    """Padukan peta panas Grad-CAM++ hanya pada piksel retina agar bingkai hitam tetap bersih."""
    h, w = rgb_square.shape[:2]
    hm = np.clip(np.asarray(heatmap, dtype=np.float32), 0.0, 1.0)
    if hm.shape[:2] != (h, w):
        hm = cv2.resize(hm, (w, h), interpolation=cv2.INTER_LINEAR)

    hm_u8 = np.clip(hm * 255.0, 0, 255).astype(np.uint8)
    colored_bgr = cv2.applyColorMap(hm_u8, cv2.COLORMAP_TURBO)
    colored_rgb = cv2.cvtColor(colored_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    gray = cv2.cvtColor(rgb_square, cv2.COLOR_RGB2GRAY)
    fg_mask = gray > 7
    out = rgb_square.copy().astype(np.float32)
    out[fg_mask] = (1.0 - alpha) * out[fg_mask] + alpha * colored_rgb[fg_mask]
    return np.clip(out, 0, 255).astype(np.uint8)


class _OnnxExportWrapper(nn.Module):
    def __init__(self, model: nn.Module) -> None:
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        return self.model.forward_with_cam(x)


def export_model_to_onnx(
    model: nn.Module,
    output_onnx_path: Path,
    meta_json_path: Path,
    preprocess_mode: str = "lab_clahe",
    input_size: int = 384,
    temperature: float = 1.0,
    smooth_sigma: float = 0.65,
    thresholds: Sequence[float] | None = None,
    extra_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Ekspor model ke format ONNX beserta metadata kalibrasi untuk backend FastAPI."""
    output_onnx_path = Path(output_onnx_path)
    meta_json_path = Path(meta_json_path)
    output_onnx_path.parent.mkdir(parents=True, exist_ok=True)
    meta_json_path.parent.mkdir(parents=True, exist_ok=True)

    was_training = model.training
    device = next(model.parameters()).device
    model.eval()
    wrapper = _OnnxExportWrapper(model).eval()
    dummy = torch.randn(1, 3, input_size, input_size, device=device)

    try:
        # dynamo=False menjaga kompatibilitas opset ekspor standar tanpa dependensi onnxscript.
        torch.onnx.export(
            wrapper,
            (dummy,),
            str(output_onnx_path),
            input_names=["input"],
            output_names=["raw_output", "cam_maps"],
            dynamic_axes={
                "input": {0: "batch"},
                "raw_output": {0: "batch"},
                "cam_maps": {0: "batch"},
            },
            opset_version=17,
            do_constant_folding=True,
            dynamo=False,
        )
    finally:
        model.train(was_training)

    meta: dict[str, Any] = {
        "backbone": getattr(model, "backbone_name", "unknown"),
        "backend_tag": getattr(model, "backend_tag", "unknown"),
        "head_type": getattr(model, "head_type", "ce"),
        "preprocess_mode": preprocess_mode,
        "input_size": int(input_size),
        "temperature": float(temperature),
        "smooth_sigma": float(smooth_sigma),
        "thresholds": [float(t) for t in thresholds] if thresholds is not None else [0.5, 1.5, 2.5, 3.5],
        "imagenet_mean": [0.485, 0.456, 0.406],
        "imagenet_std": [0.229, 0.224, 0.225],
        "class_labels": ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"],
    }
    if extra_meta:
        meta.update(extra_meta)

    meta_json_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta
