"""Uji integrasi endpoint FastAPI Mydria terhadap artefak ONNX dan contoh APTOS 2019."""

from __future__ import annotations

import csv
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
for p in (ROOT, ROOT / "src"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.config import DEMO_SAMPLES, DEMO_SAMPLES_DIR, ModelPaths, resolve_active_artifacts
from backend.model_service import inference_service
from test_cv_pipeline import _make_synthetic_fundus
from visikom_dr.calibration_xai import export_model_to_onnx
from visikom_dr.models import RetinaGradingModel


class TestBackendApi(unittest.TestCase):
    _tmp_dir: tempfile.TemporaryDirectory[str] | None = None
    _patches: list[object] = []

    @classmethod
    def setUpClass(cls) -> None:
        paths = resolve_active_artifacts()
        has_demo_pngs = all((DEMO_SAMPLES_DIR / s["filename"]).exists() for s in DEMO_SAMPLES)
        if paths.onnx_path is None or paths.meta_path is None or not has_demo_pngs:
            cls._tmp_dir = tempfile.TemporaryDirectory()
            tmp = Path(cls._tmp_dir.name)
            samples_dir = tmp / "demo_samples"
            samples_dir.mkdir(parents=True, exist_ok=True)
            for idx, sample in enumerate(DEMO_SAMPLES):
                # Sisipkan pita hitam letterbox atas-bawah pada sampel ke-2 untuk menguji _trim_letterbox_for_view.
                synth = _make_synthetic_fundus(width=192, height=192, seed=200 + idx)
                if sample["id"] == "000c1434d8d7":
                    synth[:22, :] = 0
                    synth[-22:, :] = 0
                cv2.imwrite(str(samples_dir / sample["filename"]), cv2.cvtColor(synth, cv2.COLOR_RGB2BGR))

            run_dir = tmp / "full"
            run_dir.mkdir(parents=True, exist_ok=True)
            onnx_p = run_dir / "model_best.onnx"
            meta_p = run_dir / "model_meta.json"
            model = RetinaGradingModel(backbone="efficientnet_b0", head_type="ce", pretrained=False)
            export_model_to_onnx(
                model,
                output_onnx_path=onnx_p,
                meta_json_path=meta_p,
                input_size=64,
                extra_meta={
                    "backbone": "efficientnet_b0",
                    "head_type": "ce",
                    "preprocess_mode": "lab_clahe",
                    "smoke_test": True,
                },
            )
            audit_p = tmp / "aptos_audit_summary.json"
            audit_p.write_text(
                json.dumps({"valid_images": 15, "num_duplicate_clusters": 1, "num_label_conflict_clusters": 0, "split_counts": {"train_cv": 10, "test": 5}}),
                encoding="utf-8",
            )
            with (run_dir / "E1_comparison.csv").open("w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["experiment", "preprocess_mode", "val_qwk", "val_macro_f1", "mild_recall", "val_accuracy"])
                for idx, mode in enumerate(("ben_graham", "lab_clahe", "crop_only", "raw_resize")):
                    writer.writerow([f"E1_{idx}", mode, 0.85 - idx * 0.05, 0.6, 0.5, 0.8])

            ci_paths = ModelPaths(
                stage="smoke",
                onnx_path=onnx_p,
                meta_path=meta_p,
                run_outputs_dir=run_dir,
                audit_summary_path=audit_p,
            )
            for mod in ("backend.config", "backend.model_service", "backend.metrics_service"):
                p1 = patch(f"{mod}.resolve_active_artifacts", return_value=ci_paths)
                p1.start()
                cls._patches.append(p1)
            for mod in ("backend.routes.examples", "backend.routes.inference"):
                p2 = patch(f"{mod}.DEMO_SAMPLES_DIR", samples_dir)
                p2.start()
                cls._patches.append(p2)
            inference_service._session = None

        cls.client = TestClient(create_app())

    @classmethod
    def tearDownClass(cls) -> None:
        for p in reversed(cls._patches):
            p.stop()
        cls._patches.clear()
        if cls._tmp_dir is not None:
            cls._tmp_dir.cleanup()
            cls._tmp_dir = None
        inference_service._session = None

    def test_health_examples_and_metrics_endpoints(self) -> None:
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        h_json = health.json()
        self.assertEqual(h_json["status"], "ok")
        self.assertTrue(h_json["model_loaded"])
        self.assertIn(h_json["model_stage"], ("smoke", "full"))

        examples = self.client.get("/api/examples")
        self.assertEqual(examples.status_code, 200)
        ex_list = examples.json()["examples"]
        self.assertEqual(len(ex_list), 3)
        self.assertTrue(all(item["available"] for item in ex_list))

        thumb = self.client.get(ex_list[0]["image_url"])
        self.assertEqual(thumb.status_code, 200)
        self.assertEqual(thumb.headers["content-type"], "image/jpeg")
        self.assertLess(len(thumb.content), 40000)

        metrics = self.client.get("/api/metrics")
        self.assertEqual(metrics.status_code, 200)
        m_json = metrics.json()
        self.assertIsNotNone(m_json["audit_summary"])
        self.assertEqual(len(m_json["e1_preprocessing"]), 4)

    def test_predict_example_and_reject_non_fundus(self) -> None:
        pred_ok = self.client.post("/api/predict?example_id=000c1434d8d7")
        self.assertEqual(pred_ok.status_code, 200)
        body = pred_ok.json()
        self.assertTrue(body["accepted"])
        self.assertEqual(len(body["probabilities"]), 5)
        self.assertTrue(body["viewer_layers"]["gradcam_overlay"].startswith("data:image/png;base64,"))

        import base64
        crop_b64 = body["viewer_layers"]["original_crop"].split(",", 1)[1]
        crop_arr = cv2.imdecode(np.frombuffer(base64.b64decode(crop_b64), np.uint8), cv2.IMREAD_COLOR)
        self.assertGreater(float(crop_arr[0].mean()), 8.0)
        self.assertGreater(float(crop_arr[-1].mean()), 8.0)

        blue_screen = np.full((256, 256, 3), (235, 110, 20), dtype=np.uint8)
        ok, buf = cv2.imencode(".png", blue_screen)
        self.assertTrue(ok)
        pred_reject = self.client.post(
            "/api/predict",
            files={"file": ("not_fundus.png", io.BytesIO(buf.tobytes()), "image/png")},
        )
        self.assertEqual(pred_reject.status_code, 200)
        rej_body = pred_reject.json()
        self.assertFalse(rej_body["accepted"])
        self.assertEqual(rej_body["quality"]["rejection_code"], "not_retinal_fundus")


if __name__ == "__main__":
    unittest.main()
