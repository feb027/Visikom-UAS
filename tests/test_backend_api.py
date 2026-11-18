"""Uji integrasi endpoint FastAPI Mydria terhadap artefak ONNX dan contoh APTOS 2019."""

from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for p in (ROOT, ROOT / "src"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.app import create_app


class TestBackendApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(create_app())

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
        pred_ok = self.client.post("/api/predict?example_id=0125fbd2e791")
        self.assertEqual(pred_ok.status_code, 200)
        body = pred_ok.json()
        self.assertTrue(body["accepted"])
        self.assertEqual(len(body["probabilities"]), 5)
        self.assertTrue(body["viewer_layers"]["gradcam_overlay"].startswith("data:image/png;base64,"))

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
