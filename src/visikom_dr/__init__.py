"""Paket inti Mydria untuk audit data, Visi Komputer klasik, pelatihan, dan ekspor ONNX."""

from __future__ import annotations

from importlib import import_module
from typing import Any

from visikom_dr.audit_dataset import (
    assign_stratified_group_splits,
    audit_aptos_directory,
    cluster_near_duplicates,
    compute_dhash_64,
    compute_phash_64,
    hamming_distance,
)
from visikom_dr.losses import (
    CORNLoss,
    OptimizedRounder,
    compute_single_rebalance_weights,
    corn_logits_to_numpy_probs,
    corn_logits_to_preds,
    corn_logits_to_probs,
    corn_probs_to_preds,
    validate_rebalance_config,
)
from visikom_dr.metrics import (
    binary_roc_auc_np,
    compute_classification_metrics,
    confusion_matrix_np,
    expected_calibration_error,
    quadratic_weighted_kappa,
)
from visikom_dr.preprocessing import (
    apply_ben_graham,
    apply_lab_clahe,
    circular_roi_crop,
    preprocess_fundus,
    resize_square,
)
from visikom_dr.quality_gate import FundusQualityReport, assess_fundus_quality

# Simbol pelatihan/PyTorch dimuat secara malas agar mode inferensi ONNX tanpa torch tetap berjalan.
_LAZY_EXPORTS: dict[str, tuple[str, str]] = {
    "CalibrationResult": ("visikom_dr.calibration_xai", "CalibrationResult"),
    "TemperatureScaler": ("visikom_dr.calibration_xai", "TemperatureScaler"),
    "cam_map_from_onnx_output": ("visikom_dr.calibration_xai", "cam_map_from_onnx_output"),
    "compute_gradcam_plusplus": ("visikom_dr.calibration_xai", "compute_gradcam_plusplus"),
    "export_model_to_onnx": ("visikom_dr.calibration_xai", "export_model_to_onnx"),
    "overlay_heatmap_on_fundus": ("visikom_dr.calibration_xai", "overlay_heatmap_on_fundus"),
    "raw_output_to_calibrated_probs": ("visikom_dr.calibration_xai", "raw_output_to_calibrated_probs"),
    "raw_output_to_predictions": ("visikom_dr.calibration_xai", "raw_output_to_predictions"),
    "RetinaGradingModel": ("visikom_dr.models", "RetinaGradingModel"),
    "EXPERIMENT_PRESETS": ("visikom_dr.train", "EXPERIMENT_PRESETS"),
    "AptosFundusDataset": ("visikom_dr.train", "AptosFundusDataset"),
    "TrainConfig": ("visikom_dr.train", "TrainConfig"),
    "image_to_tensor": ("visikom_dr.train", "image_to_tensor"),
    "prepare_preprocessed_cache": ("visikom_dr.train", "prepare_preprocessed_cache"),
    "run_training_experiment": ("visikom_dr.train", "run_training_experiment"),
}


def __getattr__(name: str) -> Any:
    target = _LAZY_EXPORTS.get(name)
    if target is None:
        raise AttributeError(f"module 'visikom_dr' has no attribute {name!r}")
    module_name, attr_name = target
    value = getattr(import_module(module_name), attr_name)
    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(set(globals()) | set(__all__))

__all__ = [
    "AptosFundusDataset",
    "CORNLoss",
    "CalibrationResult",
    "EXPERIMENT_PRESETS",
    "FundusQualityReport",
    "OptimizedRounder",
    "RetinaGradingModel",
    "TemperatureScaler",
    "TrainConfig",
    "apply_ben_graham",
    "apply_lab_clahe",
    "assess_fundus_quality",
    "assign_stratified_group_splits",
    "audit_aptos_directory",
    "binary_roc_auc_np",
    "cam_map_from_onnx_output",
    "circular_roi_crop",
    "cluster_near_duplicates",
    "compute_classification_metrics",
    "compute_dhash_64",
    "compute_gradcam_plusplus",
    "compute_phash_64",
    "compute_single_rebalance_weights",
    "confusion_matrix_np",
    "corn_logits_to_numpy_probs",
    "corn_logits_to_preds",
    "corn_logits_to_probs",
    "corn_probs_to_preds",
    "expected_calibration_error",
    "export_model_to_onnx",
    "hamming_distance",
    "image_to_tensor",
    "overlay_heatmap_on_fundus",
    "prepare_preprocessed_cache",
    "preprocess_fundus",
    "quadratic_weighted_kappa",
    "raw_output_to_calibrated_probs",
    "raw_output_to_predictions",
    "resize_square",
    "run_training_experiment",
    "validate_rebalance_config",
]
