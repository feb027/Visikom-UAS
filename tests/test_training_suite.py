"""Uji unit untuk metrik ordinal, fungsi loss, kalibrasi, Grad-CAM++, dan siklus training ONNX."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
import pandas as pd
import torch

from test_cv_pipeline import _make_synthetic_fundus
from visikom_dr.calibration_xai import (
    TemperatureScaler,
    cam_map_from_onnx_output,
    compute_gradcam_plusplus,
    export_model_to_onnx,
    overlay_heatmap_on_fundus,
    raw_output_to_calibrated_probs,
)
from visikom_dr.losses import (
    CORNLoss,
    OptimizedRounder,
    compute_single_rebalance_weights,
    corn_logits_to_numpy_probs,
    corn_logits_to_probs,
    validate_rebalance_config,
)
from visikom_dr.metrics import (
    binary_roc_auc_np,
    compute_classification_metrics,
    expected_calibration_error,
    quadratic_weighted_kappa,
)
from visikom_dr.models import RetinaGradingModel
from visikom_dr.train import TrainConfig, run_training_experiment


class TestTrainingAndExportSuite(unittest.TestCase):
    def test_metrics_qwk_auc_ece_and_per_class(self) -> None:
        y_true = np.array([0, 1, 2, 3, 4, 0, 2, 4])
        y_pred = np.array([0, 1, 2, 3, 4, 0, 2, 4])
        self.assertAlmostEqual(quadratic_weighted_kappa(y_true, y_pred), 1.0, places=6)

        y_off = np.array([4, 3, 2, 1, 0, 4, 2, 0])
        self.assertLess(quadratic_weighted_kappa(y_true, y_off), 0.1)

        probs = np.eye(5, dtype=np.float64)[y_true] * 0.90 + 0.02
        probs /= probs.sum(axis=1, keepdims=True)
        summary = compute_classification_metrics(y_true, y_pred, probs=probs)
        self.assertAlmostEqual(summary["accuracy"], 1.0, places=6)
        self.assertAlmostEqual(summary["referable_dr"]["auroc"], 1.0, places=6)
        self.assertLess(summary["ece"], 0.15)
        self.assertEqual(len(summary["per_class"]), 5)

        auc_perfect = binary_roc_auc_np(np.array([0, 0, 1, 1]), np.array([0.1, 0.3, 0.7, 0.9]))
        self.assertAlmostEqual(auc_perfect, 1.0, places=6)
        ece_perfect = expected_calibration_error(np.array([0, 1]), np.array([[1.0, 0.0], [0.0, 1.0]]))
        self.assertAlmostEqual(ece_perfect, 0.0, places=6)

    def test_losses_rebalance_guard_corn_and_rounder(self) -> None:
        validate_rebalance_config(use_sampler=False, use_class_weights=False)
        validate_rebalance_config(use_sampler=True, use_class_weights=False)
        validate_rebalance_config(use_sampler=False, use_class_weights=True)
        with self.assertRaises(ValueError):
            validate_rebalance_config(use_sampler=True, use_class_weights=True)

        weights = compute_single_rebalance_weights([0, 0, 0, 1, 2, 3, 4], num_classes=5, power=0.5)
        self.assertEqual(weights.shape, (5,))
        self.assertAlmostEqual(float(weights.mean()), 1.0, places=4)
        self.assertGreater(float(weights[3]), float(weights[0]))

        corn = CORNLoss(num_classes=5)
        logits = torch.tensor(
            [[2.0, -2.0, -2.0, -2.0], [2.0, 2.0, 2.0, 2.0], [-2.0, -2.0, -2.0, -2.0]],
            dtype=torch.float32,
        )
        targets = torch.tensor([1, 4, 0], dtype=torch.long)
        loss_val = corn(logits, targets)
        self.assertGreater(float(loss_val.item()), 0.0)

        probs_t = corn_logits_to_probs(logits).numpy()
        probs_np = corn_logits_to_numpy_probs(logits.numpy())
        np.testing.assert_allclose(probs_t, probs_np, atol=1e-5)
        np.testing.assert_allclose(probs_np.sum(axis=1), np.ones(3), atol=1e-5)

        rounder = OptimizedRounder()
        scores = np.array([0.1, 0.2, 1.1, 1.3, 2.2, 2.4, 3.1, 3.3, 4.1, 4.4])
        labels = np.array([0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
        fitted = rounder.fit(scores, labels)
        self.assertEqual(len(fitted), 4)
        self.assertEqual(quadratic_weighted_kappa(labels, rounder.predict(scores)), 1.0)
        soft_probs = OptimizedRounder.scores_to_probs(scores)
        self.assertEqual(soft_probs.shape, (10, 5))
        np.testing.assert_allclose(soft_probs.sum(axis=1), np.ones(10), atol=1e-6)

    def test_models_gradcam_overlay_and_calibration(self) -> None:
        x = torch.randn(1, 3, 64, 64)
        for backbone in ("resnet50", "efficientnet_b0", "convnextv2_tiny"):
            model = RetinaGradingModel(backbone=backbone, head_type="ce", pretrained=False)
            model.eval()
            logits, cam_maps = model.forward_with_cam(x)
            self.assertEqual(logits.shape, (1, 5))
            self.assertEqual(cam_maps.shape[0], 1)
            self.assertEqual(cam_maps.shape[1], 5)

        eff = RetinaGradingModel(backbone="efficientnet_b0", head_type="ce", pretrained=False)
        heatmap = compute_gradcam_plusplus(eff, x, target_index=2)
        self.assertEqual(heatmap.shape, (64, 64))
        self.assertGreaterEqual(float(heatmap.min()), 0.0)
        self.assertLessEqual(float(heatmap.max()), 1.0)

        fundus = _make_synthetic_fundus(width=128, height=128, seed=11)
        black_bg = np.zeros_like(fundus)
        cv2.circle(black_bg, (64, 64), 40, (200, 100, 50), thickness=-1)
        overlay = overlay_heatmap_on_fundus(black_bg, np.ones((128, 128), dtype=np.float32))
        self.assertTrue(np.array_equal(overlay[0, 0], np.array([0, 0, 0], dtype=np.uint8)))

        raw_ce = np.array([[4.0, 1.0, 0.0, -1.0, -2.0], [0.0, 3.5, 0.5, 0.0, -1.0]])
        y_val = np.array([0, 1])
        scaler = TemperatureScaler()
        cal_res = scaler.fit(raw_ce, y_val, head_type="ce")
        self.assertGreater(cal_res.temperature, 0.0)
        cal_probs = raw_output_to_calibrated_probs(raw_ce, head_type="ce", temperature=cal_res.temperature)
        np.testing.assert_allclose(cal_probs.sum(axis=1), np.ones(2), atol=1e-6)

    def test_mini_training_cycle_and_onnx_parity(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            raw_dir = root / "train_images"
            raw_dir.mkdir(parents=True, exist_ok=True)

            rows: list[dict[str, object]] = []
            # Gunakan 15 sampel (5 per fold pada 3 fold) agar train, val, dan test semua terisi.
            for idx in range(15):
                code = f"syn_{idx:02d}"
                img = _make_synthetic_fundus(width=160, height=120, seed=500 + idx)
                cv2.imwrite(str(raw_dir / f"{code}.png"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
                fold = idx // 5
                rows.append(
                    {
                        "id_code": code,
                        "diagnosis": idx % 5,
                        "cluster_id": idx,
                        "fold": fold,
                        "split": "test" if fold == 0 else "train_cv",
                    }
                )
            split_df = pd.DataFrame(rows)

            cfg = TrainConfig(
                experiment_id="smoke_corn",
                backbone="efficientnet_b0",
                head_type="corn",
                preprocess_mode="lab_clahe",
                input_size=64,
                epochs=1,
                batch_size=5,
                val_fold=1,
                num_workers=0,
                pretrained=False,
            )
            out_dir = root / "runs" / "smoke_corn"
            summary = run_training_experiment(
                config=cfg,
                split_df=split_df,
                raw_images_dir=raw_dir,
                output_dir=out_dir,
                cache_dir=root / "cache",
                evaluate_test=True,
                export_onnx=True,
            )

            self.assertTrue((out_dir / "history.csv").exists())
            self.assertTrue((out_dir / "metrics_summary.json").exists())
            self.assertTrue((out_dir / "model_best.onnx").exists())
            self.assertTrue((out_dir / "model_meta.json").exists())
            self.assertIn("test_metrics", summary)

            model = RetinaGradingModel(backbone="efficientnet_b0", head_type="corn", pretrained=False)
            model.load_state_dict(torch.load(out_dir / "best_model.pt", map_location="cpu", weights_only=True))
            model.eval()

            sample_x = torch.randn(1, 3, 64, 64)
            with torch.no_grad():
                pt_raw, pt_cam = model.forward_with_cam(sample_x)

            session = ort.InferenceSession(str(out_dir / "model_best.onnx"), providers=["CPUExecutionProvider"])
            ort_raw, ort_cam = session.run(None, {"input": sample_x.numpy()})

            np.testing.assert_allclose(pt_raw.numpy(), ort_raw, rtol=1e-4, atol=1e-4)
            np.testing.assert_allclose(pt_cam.numpy(), ort_cam, rtol=1e-4, atol=1e-4)

            cam_2d = cam_map_from_onnx_output(ort_cam, target_index=0, out_size=64)
            self.assertEqual(cam_2d.shape, (64, 64))
            self.assertGreaterEqual(float(cam_2d.min()), 0.0)
            self.assertLessEqual(float(cam_2d.max()), 1.0)

            # Verifikasi fungsi ekspor berdiri sendiri dengan model ConvNeXt juga berjalan normal.
            conv_model = RetinaGradingModel(backbone="convnextv2_tiny", head_type="ce", pretrained=False)
            conv_onnx = root / "conv_test.onnx"
            export_model_to_onnx(
                conv_model,
                output_onnx_path=conv_onnx,
                meta_json_path=root / "conv_meta.json",
                input_size=64,
            )
            conv_sess = ort.InferenceSession(str(conv_onnx), providers=["CPUExecutionProvider"])
            c_raw, c_cam = conv_sess.run(None, {"input": sample_x.numpy()})
            self.assertEqual(c_raw.shape, (1, 5))
            self.assertEqual(c_cam.shape[0], 1)


if __name__ == "__main__":
    unittest.main()
