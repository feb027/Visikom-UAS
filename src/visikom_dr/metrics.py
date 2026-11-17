"""Metrik evaluasi klasifikasi ordinal, Referable DR, dan kalibrasi probabilitas."""

from __future__ import annotations

from typing import Any

import numpy as np


def confusion_matrix_np(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    num_classes: int = 5,
) -> np.ndarray:
    yt = np.asarray(y_true, dtype=np.int64).ravel()
    yp = np.asarray(y_pred, dtype=np.int64).ravel()
    if yt.shape != yp.shape:
        raise ValueError(f"Dimensi y_true {yt.shape} berbeda dengan y_pred {yp.shape}")
    if yt.size == 0:
        return np.zeros((num_classes, num_classes), dtype=np.int64)
    encoded = yt * num_classes + yp
    return np.bincount(encoded, minlength=num_classes * num_classes).reshape(num_classes, num_classes)


def quadratic_weighted_kappa(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    num_classes: int = 5,
) -> float:
    """Hitung Quadratic Weighted Kappa untuk skala keparahan berurutan."""
    yt = np.asarray(y_true, dtype=np.int64).ravel()
    yp = np.asarray(y_pred, dtype=np.int64).ravel()
    if yt.size == 0:
        return 0.0

    conf_mat = confusion_matrix_np(yt, yp, num_classes=num_classes).astype(np.float64)
    total = float(conf_mat.sum())
    if total == 0.0:
        return 0.0

    hist_true = conf_mat.sum(axis=1)
    hist_pred = conf_mat.sum(axis=0)
    expected = np.outer(hist_true, hist_pred) / total

    idx = np.arange(num_classes, dtype=np.float64)
    weights = ((idx[:, None] - idx[None, :]) ** 2) / float((num_classes - 1) ** 2)

    numerator = float(np.sum(weights * conf_mat))
    denominator = float(np.sum(weights * expected))
    if denominator == 0.0:
        return 1.0 if numerator == 0.0 else 0.0
    return float(1.0 - (numerator / denominator))


def _average_ranks(scores: np.ndarray) -> np.ndarray:
    order = np.argsort(scores, kind="mergesort")
    sorted_scores = scores[order]
    n = scores.size
    ranks_sorted = np.empty(n, dtype=np.float64)

    i = 0
    while i < n:
        j = i + 1
        while j < n and sorted_scores[j] == sorted_scores[i]:
            j += 1
        avg_rank = 0.5 * ((i + 1) + j)
        ranks_sorted[i:j] = avg_rank
        i = j

    ranks = np.empty(n, dtype=np.float64)
    ranks[order] = ranks_sorted
    return ranks


def binary_roc_auc_np(y_true_bin: np.ndarray, y_score: np.ndarray) -> float:
    """Hitung AUROC biner secara eksak memakai peringkat Mann-Whitney U."""
    yt = np.asarray(y_true_bin, dtype=np.int64).ravel()
    ys = np.asarray(y_score, dtype=np.float64).ravel()
    pos_mask = yt == 1
    n_pos = int(pos_mask.sum())
    n_neg = int(yt.size - n_pos)
    if n_pos == 0 or n_neg == 0:
        return 0.0

    ranks = _average_ranks(ys)
    pos_rank_sum = float(ranks[pos_mask].sum())
    return float((pos_rank_sum - (n_pos * (n_pos + 1) / 2.0)) / float(n_pos * n_neg))


def expected_calibration_error(
    y_true: np.ndarray,
    probs: np.ndarray,
    n_bins: int = 15,
) -> float:
    """Hitung Expected Calibration Error (ECE) berbobot jumlah sampel tiap bin."""
    yt = np.asarray(y_true, dtype=np.int64).ravel()
    p = np.asarray(probs, dtype=np.float64)
    if yt.size == 0:
        return 0.0

    confidences = p.max(axis=1)
    predictions = p.argmax(axis=1)
    accuracies = (predictions == yt).astype(np.float64)
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)

    ece = 0.0
    n = float(yt.size)
    for b in range(n_bins):
        low, high = bin_edges[b], bin_edges[b + 1]
        if b == 0:
            in_bin = (confidences >= low) & (confidences <= high)
        else:
            in_bin = (confidences > low) & (confidences <= high)
        count = int(in_bin.sum())
        if count > 0:
            acc_bin = float(accuracies[in_bin].mean())
            conf_bin = float(confidences[in_bin].mean())
            ece += (float(count) / n) * abs(acc_bin - conf_bin)
    return float(ece)


def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    probs: np.ndarray | None = None,
    num_classes: int = 5,
) -> dict[str, Any]:
    """Rangkum metrik QWK, F1 per kelas, Referable DR (>= 2), dan ECE."""
    yt = np.asarray(y_true, dtype=np.int64).ravel()
    yp = np.asarray(y_pred, dtype=np.int64).ravel()
    conf_mat = confusion_matrix_np(yt, yp, num_classes=num_classes)
    total = int(conf_mat.sum())
    accuracy = float(np.trace(conf_mat) / total) if total > 0 else 0.0

    per_class: dict[str, dict[str, float | int]] = {}
    f1_list: list[float] = []
    supports: list[int] = []

    for c in range(num_classes):
        tp = int(conf_mat[c, c])
        fp = int(conf_mat[:, c].sum() - tp)
        fn = int(conf_mat[c, :].sum() - tp)
        support = int(conf_mat[c, :].sum())
        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float((2.0 * precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0
        per_class[str(c)] = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": support,
        }
        f1_list.append(f1)
        supports.append(support)

    macro_f1 = float(np.mean(f1_list))
    weighted_f1 = float(np.average(f1_list, weights=supports)) if sum(supports) > 0 else 0.0

    ref_true = (yt >= 2).astype(np.int64)
    ref_pred = (yp >= 2).astype(np.int64)
    tp_r = int(((ref_true == 1) & (ref_pred == 1)).sum())
    fn_r = int(((ref_true == 1) & (ref_pred == 0)).sum())
    tn_r = int(((ref_true == 0) & (ref_pred == 0)).sum())
    fp_r = int(((ref_true == 0) & (ref_pred == 1)).sum())
    sens_r = float(tp_r / (tp_r + fn_r)) if (tp_r + fn_r) > 0 else 0.0
    spec_r = float(tn_r / (tn_r + fp_r)) if (tn_r + fp_r) > 0 else 0.0

    if probs is not None:
        probs_arr = np.asarray(probs, dtype=np.float64)
        ref_score = probs_arr[:, 2:].sum(axis=1)
        ece_val: float | None = expected_calibration_error(yt, probs_arr)
    else:
        ref_score = ref_pred.astype(np.float64)
        ece_val = None

    return {
        "qwk": quadratic_weighted_kappa(yt, yp, num_classes=num_classes),
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "per_class": per_class,
        "confusion_matrix": conf_mat.tolist(),
        "referable_dr": {
            "auroc": binary_roc_auc_np(ref_true, ref_score),
            "sensitivity": sens_r,
            "specificity": spec_r,
        },
        "ece": ece_val,
    }
