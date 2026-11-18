"""Layanan inferensi ONNX Runtime, OpenCV quality gate, dan visualisasi Grad-CAM++."""

from __future__ import annotations

import base64
import json
import threading
import time
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

from backend.config import (
    CLASS_LABELS,
    CLINICAL_DISCLAIMER,
    GRADE_GUIDANCE,
    ModelPaths,
    resolve_active_artifacts,
)
from backend.schemas import (
    ClassProbabilityItem,
    HealthResponse,
    PredictionResponse,
    QualityResponse,
    ViewerLayers,
)
from visikom_dr.calibration_xai import (
    cam_map_from_onnx_output,
    overlay_heatmap_on_fundus,
    raw_output_to_predictions,
)
from visikom_dr.preprocessing import preprocess_fundus
from visikom_dr.quality_gate import assess_fundus_quality


def _encode_rgb_data_url(rgb: np.ndarray) -> str:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    ok, buf = cv2.imencode(".png", bgr)
    if not ok:
        raise RuntimeError("Gagal menyandikan pratinjau PNG.")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def _decode_upload_bytes(data: bytes) -> np.ndarray | None:
    arr = np.frombuffer(data, dtype=np.uint8)
    if arr.size == 0:
        return None
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None or bgr.size == 0:
        return None
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def _trim_letterbox_for_view(
    layers: list[np.ndarray],
    reference_rgb: np.ndarray,
) -> list[np.ndarray]:
    """Buang pita hitam atas-bawah sisa padding persegi agar viewfinder bundar terisi penuh."""
    gray = cv2.cvtColor(reference_rgb, cv2.COLOR_RGB2GRAY)
    row_active = np.where((gray > 10).mean(axis=1) > 0.05)[0]
    col_active = np.where((gray > 10).mean(axis=0) > 0.05)[0]
    if row_active.size == 0 or col_active.size == 0:
        return layers
    y0, y1 = int(row_active[0]), int(row_active[-1]) + 1
    x0, x1 = int(col_active[0]), int(col_active[-1]) + 1
    if (y1 - y0) < 32 or (x1 - x0) < 32:
        return layers
    return [img[y0:y1, x0:x1] for img in layers]


class OnnxInferenceService:
    """Mengelola sesi ONNX Runtime beserta cache artefak aktif dengan pemuatan malas."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._session: ort.InferenceSession | None = None
        self._meta: dict[str, Any] | None = None
        self._paths: ModelPaths | None = None
        self._active_provider: str | None = None
        self._loaded_mtime: float = 0.0

    def _ensure_loaded(self) -> tuple[ort.InferenceSession | None, dict[str, Any] | None, ModelPaths]:
        paths = resolve_active_artifacts()
        if paths.onnx_path is None or paths.meta_path is None:
            return None, None, paths

        mtime = paths.onnx_path.stat().st_mtime
        with self._lock:
            if (
                self._session is not None
                and self._paths is not None
                and self._paths.onnx_path == paths.onnx_path
                and abs(self._loaded_mtime - mtime) < 1e-6
            ):
                return self._session, self._meta, self._paths

            available = ort.get_available_providers()
            preferred = [p for p in ("DmlExecutionProvider", "CPUExecutionProvider") if p in available]
            if not preferred:
                preferred = ["CPUExecutionProvider"]

            session = ort.InferenceSession(str(paths.onnx_path), providers=preferred)
            active = session.get_providers()
            meta = json.loads(paths.meta_path.read_text(encoding="utf-8"))

            self._session = session
            self._meta = meta
            self._paths = paths
            self._active_provider = active[0] if active else "CPUExecutionProvider"
            self._loaded_mtime = mtime
            return self._session, self._meta, self._paths

    def health(self) -> HealthResponse:
        session, meta, paths = self._ensure_loaded()
        available = ort.get_available_providers()
        return HealthResponse(
            status="ok" if session is not None else "model_missing",
            model_loaded=session is not None,
            model_stage=paths.stage,
            backbone=meta.get("backbone") if meta else None,
            head_type=meta.get("head_type") if meta else None,
            preprocess_mode=meta.get("preprocess_mode") if meta else None,
            input_size=int(meta.get("input_size", 384)) if meta else 384,
            active_provider=self._active_provider,
            available_providers=available,
            disclaimer=CLINICAL_DISCLAIMER,
        )

    def predict_bytes(self, image_bytes: bytes) -> PredictionResponse:
        rgb = _decode_upload_bytes(image_bytes)
        if rgb is None:
            return PredictionResponse(
                accepted=False,
                quality=QualityResponse(
                    accepted=False,
                    rejection_code="invalid_image_file",
                    blur_warning=False,
                    laplacian_variance=0.0,
                    roi_area_ratio=0.0,
                    red_blue_ratio=0.0,
                    red_green_ratio=0.0,
                    message_id="Berkas gambar tidak dapat dibaca. Unggah file PNG atau JPG/JPEG yang utuh.",
                ),
                disclaimer=CLINICAL_DISCLAIMER,
            )

        q = assess_fundus_quality(rgb)
        quality_resp = QualityResponse(**q.to_dict())
        if not q.accepted:
            return PredictionResponse(
                accepted=False,
                quality=quality_resp,
                disclaimer=CLINICAL_DISCLAIMER,
            )

        session, meta, paths = self._ensure_loaded()
        if session is None or meta is None:
            raise RuntimeError("Model ONNX belum tersedia di server.")

        input_size = int(meta.get("input_size", 384))
        active_mode = str(meta.get("preprocess_mode", "lab_clahe"))
        head_type = str(meta.get("head_type", "ce"))
        temperature = float(meta.get("temperature", 1.0))
        smooth_sigma = float(meta.get("smooth_sigma", 0.65))
        thresholds = [float(v) for v in meta.get("thresholds", [0.5, 1.5, 2.5, 3.5])]
        mean = np.array(meta.get("imagenet_mean", [0.485, 0.456, 0.406]), dtype=np.float32)
        std = np.array(meta.get("imagenet_std", [0.229, 0.224, 0.225]), dtype=np.float32)

        pre_raw = preprocess_fundus(rgb, mode="raw_resize", size=input_size)
        pre_crop = preprocess_fundus(rgb, mode="crop_only", size=input_size)
        pre_clahe = preprocess_fundus(rgb, mode="lab_clahe", size=input_size)
        pre_graham = preprocess_fundus(rgb, mode="ben_graham", size=input_size)

        mode_map = {
            "raw_resize": pre_raw,
            "crop_only": pre_crop,
            "lab_clahe": pre_clahe,
            "ben_graham": pre_graham,
        }
        model_rgb = mode_map.get(active_mode, pre_clahe)

        tensor = ((model_rgb.astype(np.float32) / 255.0) - mean) / std
        tensor_nchw = np.ascontiguousarray(tensor.transpose(2, 0, 1)[None, ...], dtype=np.float32)

        t0 = time.perf_counter()
        raw_out, cam_maps = session.run(["raw_output", "cam_maps"], {"input": tensor_nchw})
        inference_ms = (time.perf_counter() - t0) * 1000.0

        probs_mat, preds = raw_output_to_predictions(
            raw_out,
            head_type=head_type,
            temperature=temperature,
            thresholds=thresholds,
            smooth_sigma=smooth_sigma,
        )
        probs = probs_mat[0]
        pred_grade = int(preds[0])

        if head_type == "smooth_l1":
            cam_idx = 0
        elif head_type == "corn":
            cam_idx = min(max(pred_grade - 1, 0), cam_maps.shape[1] - 1)
        else:
            cam_idx = min(max(pred_grade, 0), cam_maps.shape[1] - 1)

        cam_heat = cam_map_from_onnx_output(cam_maps, target_index=cam_idx, out_size=input_size)
        cam_overlay = overlay_heatmap_on_fundus(pre_crop, cam_heat, alpha=0.40)

        view_crop, view_clahe, view_graham, view_cam = _trim_letterbox_for_view(
            [pre_crop, pre_clahe, pre_graham, cam_overlay],
            reference_rgb=pre_crop,
        )

        prob_items = [
            ClassProbabilityItem(grade=i, label=CLASS_LABELS[i], probability=float(probs[i]))
            for i in range(len(CLASS_LABELS))
        ]
        referable_prob = float(np.sum(probs[2:]))

        return PredictionResponse(
            accepted=True,
            quality=quality_resp,
            model_stage=paths.stage,
            backbone=str(meta.get("backbone", "unknown")),
            head_type=head_type,
            preprocess_mode=active_mode,
            active_provider=self._active_provider,
            inference_ms=round(inference_ms, 2),
            predicted_grade=pred_grade,
            predicted_label=CLASS_LABELS[pred_grade],
            referable_dr=pred_grade >= 2,
            referable_probability=referable_prob,
            confidence=float(probs[pred_grade]),
            temperature=temperature,
            guidance_id=GRADE_GUIDANCE[pred_grade],
            disclaimer=CLINICAL_DISCLAIMER,
            probabilities=prob_items,
            viewer_layers=ViewerLayers(
                original_crop=_encode_rgb_data_url(view_crop),
                raw_resize=_encode_rgb_data_url(pre_raw),
                lab_clahe=_encode_rgb_data_url(view_clahe),
                ben_graham=_encode_rgb_data_url(view_graham),
                gradcam_overlay=_encode_rgb_data_url(view_cam),
            ),
        )


inference_service = OnnxInferenceService()
