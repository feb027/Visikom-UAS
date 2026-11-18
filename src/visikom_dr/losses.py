"""Fungsi loss ordinal (CORN, SmoothL1), pencegahan double-rebalancing, dan perata ambang QWK."""

from __future__ import annotations

from typing import Iterable

import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError:
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]
    F = None  # type: ignore[assignment]

from visikom_dr.metrics import quadratic_weighted_kappa

_ModuleBase = nn.Module if nn is not None else object


def _require_torch_module() -> None:
    if torch is None or nn is None or F is None:
        raise ImportError("PyTorch diperlukan untuk modul loss/pelatihan ini (pasang extra '.[train]').")


def validate_rebalance_config(use_sampler: bool, use_class_weights: bool) -> None:
    """Tolak penggabungan sampler dan bobot loss yang memicu kolaps kelas Moderate DR."""
    if use_sampler and use_class_weights:
        raise ValueError(
            "Konfigurasi double-rebalancing (use_sampler=True bersama use_class_weights=True) "
            "dilarang karena terbukti menekan F1 kelas Moderate DR menuju 0,00."
        )


def compute_single_rebalance_weights(
    labels: Iterable[int],
    num_classes: int = 5,
    power: float = 0.5,
) -> np.ndarray:
    """Hitung bobot kelas frekuensi terbalik terhalus dengan rata-rata ternormalisasi 1,0."""
    arr = np.asarray(list(labels), dtype=np.int64)
    counts = np.bincount(arr, minlength=num_classes).astype(np.float64)
    total = float(counts.sum())
    if total == 0.0:
        return np.ones(num_classes, dtype=np.float32)

    weights = np.ones(num_classes, dtype=np.float64)
    present = counts > 0
    weights[present] = (total / (float(num_classes) * counts[present])) ** power
    mean_present = float(weights[present].mean()) if np.any(present) else 1.0
    weights = weights / max(mean_present, 1e-8)
    return weights.astype(np.float32)


class CORNLoss(_ModuleBase):
    """Rank-consistent ordinal regression berdasarkan probabilitas kondisional berurutan."""

    def __init__(self, num_classes: int = 5) -> None:
        _require_torch_module()
        super().__init__()
        self.num_classes = num_classes

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        if logits.shape[1] != self.num_classes - 1:
            raise ValueError(
                f"CORN membutuhkan {self.num_classes - 1} logit keluaran, diterima {logits.shape[1]}"
            )

        losses: list[torch.Tensor] = []
        for k in range(self.num_classes - 1):
            subset_mask = targets >= k
            if torch.any(subset_mask):
                binary_target = (targets[subset_mask] > k).to(dtype=logits.dtype)
                task_loss = F.binary_cross_entropy_with_logits(
                    logits[subset_mask, k],
                    binary_target,
                    reduction="mean",
                )
                losses.append(task_loss)

        if not losses:
            return logits.sum() * 0.0
        return torch.stack(losses).mean()


def corn_logits_to_probs(logits: torch.Tensor) -> torch.Tensor:
    """Konversi K-1 logit kondisional CORN menjadi distribusi probabilitas K kelas."""
    _require_torch_module()
    cond_probs = torch.sigmoid(logits)
    cum_probs = torch.cumprod(cond_probs, dim=1)
    p0 = 1.0 - cum_probs[:, :1]
    middle = cum_probs[:, :-1] - cum_probs[:, 1:]
    p_last = cum_probs[:, -1:]
    probs = torch.cat([p0, middle, p_last], dim=1).clamp(min=0.0)
    return probs / probs.sum(dim=1, keepdim=True).clamp(min=1e-8)


def corn_logits_to_numpy_probs(logits: np.ndarray) -> np.ndarray:
    """Versi NumPy murni konversi logit CORN untuk inferensi ONNX Runtime tanpa PyTorch."""
    z = np.clip(np.asarray(logits, dtype=np.float64), -50.0, 50.0)
    cond_probs = 1.0 / (1.0 + np.exp(-z))
    cum_probs = np.cumprod(cond_probs, axis=1)
    p0 = 1.0 - cum_probs[:, :1]
    middle = cum_probs[:, :-1] - cum_probs[:, 1:]
    p_last = cum_probs[:, -1:]
    probs = np.clip(np.concatenate([p0, middle, p_last], axis=1), 0.0, None)
    denom = np.clip(probs.sum(axis=1, keepdims=True), 1e-8, None)
    return probs / denom


def corn_logits_to_preds(logits: torch.Tensor) -> torch.Tensor:
    _require_torch_module()
    cum_probs = torch.cumprod(torch.sigmoid(logits), dim=1)
    return (cum_probs > 0.5).sum(dim=1)


def corn_probs_to_preds(probs: np.ndarray) -> np.ndarray:
    p = np.asarray(probs, dtype=np.float64)
    cum_gt = np.flip(np.cumsum(np.flip(p, axis=1), axis=1), axis=1)[:, 1:]
    return (cum_gt > 0.5).sum(axis=1).astype(np.int64)


class OptimizedRounder:
    """Optimasi ambang batas regresi kontinu untuk memaksimalkan QWK pada data validasi."""

    DEFAULT_THRESHOLDS = (0.5, 1.5, 2.5, 3.5)

    def __init__(self, initial_thresholds: tuple[float, ...] = DEFAULT_THRESHOLDS) -> None:
        self.thresholds = tuple(float(t) for t in initial_thresholds)

    def fit(self, scores: np.ndarray, y_true: np.ndarray) -> tuple[float, ...]:
        from scipy.optimize import minimize

        sc = np.asarray(scores, dtype=np.float64).ravel()
        yt = np.asarray(y_true, dtype=np.int64).ravel()

        def objective(thresh: np.ndarray) -> float:
            if not np.all(np.diff(thresh) > 0.05):
                return 1e6
            preds = np.digitize(sc, thresh)
            return -quadratic_weighted_kappa(yt, preds, num_classes=len(self.thresholds) + 1)

        res = minimize(
            objective,
            x0=np.array(self.thresholds, dtype=np.float64),
            method="Nelder-Mead",
            options={"maxiter": 500},
        )
        fitted = np.sort(res.x)
        if np.all(np.diff(fitted) > 0.01):
            self.thresholds = tuple(float(v) for v in fitted)
        return self.thresholds

    def predict(self, scores: np.ndarray, thresholds: Iterable[float] | None = None) -> np.ndarray:
        sc = np.asarray(scores, dtype=np.float64).ravel()
        active = sorted(float(t) for t in (self.thresholds if thresholds is None else thresholds))
        return np.digitize(sc, active).astype(np.int64)

    @staticmethod
    def scores_to_probs(scores: np.ndarray, sigma: float = 0.65, num_classes: int = 5) -> np.ndarray:
        """Petakan skor regresi kontinu menjadi pseudo-probabilitas unimodal 5 kelas."""
        sc = np.asarray(scores, dtype=np.float64).ravel()[:, None]
        centers = np.arange(num_classes, dtype=np.float64)[None, :]
        s = max(float(sigma), 1e-3)
        raw = np.exp(-0.5 * ((sc - centers) / s) ** 2)
        denom = np.clip(raw.sum(axis=1, keepdims=True), 1e-8, None)
        return raw / denom
