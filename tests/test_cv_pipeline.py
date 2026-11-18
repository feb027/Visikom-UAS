"""Uji unit otomatis untuk modul audit dataset, prapemrosesan, dan gerbang kualitas."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
import pandas as pd

from visikom_dr.audit_dataset import (
    assign_stratified_group_splits,
    audit_aptos_directory,
    cluster_near_duplicates,
    compute_dhash_64,
    compute_phash_64,
)
from visikom_dr.preprocessing import circular_roi_crop, preprocess_fundus
from visikom_dr.quality_gate import assess_fundus_quality


def _make_synthetic_fundus(
    width: int = 640,
    height: int = 480,
    seed: int = 0,
    blur_ksize: int = 0,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    cx, cy = width // 2, height // 2
    radius = int(min(width, height) * 0.42)

    cv2.circle(canvas, (cx, cy), radius, (210, 110, 52), thickness=-1)
    cv2.circle(canvas, (cx - radius // 3, cy - radius // 8), radius // 6, (245, 200, 120), thickness=-1)

    # Pembuluh darah dan bintik mikro memberikan gradien tekstur di dalam cakram retina.
    for i in range(8):
        angle = (seed * 0.7) + (i * np.pi / 4.0)
        x2 = int(cx + radius * 0.72 * np.cos(angle))
        y2 = int(cy + radius * 0.72 * np.sin(angle))
        cv2.line(canvas, (cx - radius // 3, cy), (x2, y2), (110, 35, 20), thickness=3)

    for _ in range(25):
        px = int(cx + rng.integers(-radius // 2, radius // 2))
        py = int(cy + rng.integers(-radius // 2, radius // 2))
        cv2.circle(canvas, (px, py), 3, (85, 20, 15), thickness=-1)

    if blur_ksize > 1:
        canvas = cv2.GaussianBlur(canvas, (blur_ksize, blur_ksize), sigmaX=12.0, sigmaY=12.0)

    return canvas


class TestComputerVisionPipeline(unittest.TestCase):
    def test_circular_crop_and_all_preprocess_modes(self) -> None:
        img = _make_synthetic_fundus(width=640, height=480, seed=7)
        cropped, mask = circular_roi_crop(img)

        self.assertEqual(cropped.shape[0], cropped.shape[1])
        self.assertEqual(mask.shape[:2], cropped.shape[:2])
        self.assertGreater(int(mask.sum()), 0)

        for mode in ("raw_resize", "crop_only", "lab_clahe", "ben_graham"):
            out = preprocess_fundus(img, mode=mode, size=384)
            self.assertEqual(out.shape, (384, 384, 3))
            self.assertEqual(out.dtype, np.uint8)
            if mode in ("lab_clahe", "ben_graham"):
                self.assertTrue(np.array_equal(out[0, 0], np.array([0, 0, 0], dtype=np.uint8)))

        with self.assertRaises(ValueError):
            preprocess_fundus(img, mode="unknown_mode")

    def test_quality_gate_accepts_sharp_warns_blur_and_rejects_non_fundus(self) -> None:
        sharp_fundus = _make_synthetic_fundus(seed=3, blur_ksize=0)
        sharp_report = assess_fundus_quality(sharp_fundus)
        self.assertTrue(sharp_report.accepted)
        self.assertFalse(sharp_report.blur_warning)
        self.assertIsNone(sharp_report.rejection_code)

        blurry_fundus = _make_synthetic_fundus(seed=3, blur_ksize=35)
        blur_report = assess_fundus_quality(blurry_fundus)
        self.assertTrue(blur_report.accepted)
        self.assertTrue(blur_report.blur_warning)

        blue_screen = np.full((320, 420, 3), (235, 242, 252), dtype=np.uint8)
        cv2.rectangle(blue_screen, (40, 40), (380, 260), (15, 95, 210), thickness=-1)
        rejected_report = assess_fundus_quality(blue_screen)
        self.assertFalse(rejected_report.accepted)
        self.assertEqual(rejected_report.rejection_code, "not_retinal_fundus")

        tiny = np.zeros((64, 64, 3), dtype=np.uint8)
        tiny_report = assess_fundus_quality(tiny)
        self.assertFalse(tiny_report.accepted)
        self.assertEqual(tiny_report.rejection_code, "image_too_small_or_invalid")

    def test_duplicate_clustering_and_zero_leakage_split(self) -> None:
        base = _make_synthetic_fundus(width=384, height=384, seed=99)
        near_dup = np.clip(base.astype(np.int16) + 2, 0, 255).astype(np.uint8)

        rows: list[dict[str, object]] = [
            {
                "id_code": "14e3f84445f7",
                "diagnosis": 3,
                "phash": compute_phash_64(base),
                "dhash": compute_dhash_64(base),
            },
            {
                "id_code": "f0f89314e860",
                "diagnosis": 4,
                "phash": compute_phash_64(near_dup),
                "dhash": compute_dhash_64(near_dup),
            },
        ]

        for idx in range(20):
            rng = np.random.default_rng(1000 + idx)
            sample = rng.integers(0, 256, size=(128, 128, 3), dtype=np.uint8)
            rows.append(
                {
                    "id_code": f"unique_{idx:02d}",
                    "diagnosis": idx % 5,
                    "phash": compute_phash_64(sample),
                    "dhash": compute_dhash_64(sample),
                }
            )

        df = pd.DataFrame(rows)
        clustered = cluster_near_duplicates(df, phash_threshold=6, dhash_threshold=6)

        dup_rows = clustered[clustered["id_code"].isin(["14e3f84445f7", "f0f89314e860"])]
        self.assertEqual(dup_rows["cluster_id"].nunique(), 1)
        self.assertTrue(bool(dup_rows["has_label_conflict"].all()))
        self.assertTrue((dup_rows["cluster_size"] == 2).all())

        split_df = assign_stratified_group_splits(clustered, n_folds=5, holdout_fold=0, seed=42)
        test_clusters = set(split_df.loc[split_df["split"] == "test", "cluster_id"])
        train_clusters = set(split_df.loc[split_df["split"] == "train_cv", "cluster_id"])
        self.assertGreater(len(test_clusters), 0)
        self.assertGreater(len(train_clusters), 0)
        self.assertEqual(len(test_clusters & train_clusters), 0)

    def test_audit_aptos_directory_end_to_end(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            img_dir = root / "train_images"
            img_dir.mkdir(parents=True, exist_ok=True)

            csv_rows: list[dict[str, object]] = []
            shared = _make_synthetic_fundus(width=320, height=240, seed=55)
            for idx, diag in enumerate((3, 4)):
                code = f"dup_{idx}"
                cv2.imwrite(str(img_dir / f"{code}.png"), cv2.cvtColor(shared, cv2.COLOR_RGB2BGR))
                csv_rows.append({"id_code": code, "diagnosis": diag})

            for idx in range(8):
                rng = np.random.default_rng(200 + idx)
                noise = rng.integers(0, 256, size=(200, 200, 3), dtype=np.uint8)
                code = f"img_{idx}"
                cv2.imwrite(str(img_dir / f"{code}.png"), noise)
                csv_rows.append({"id_code": code, "diagnosis": idx % 5})

            csv_rows.append({"id_code": "missing_sample", "diagnosis": 1})
            pd.DataFrame(csv_rows).to_csv(root / "train.csv", index=False)

            out_csv = root / "out" / "splits.csv"
            out_json = root / "out" / "summary.json"
            split_df, summary = audit_aptos_directory(
                data_dir=root,
                output_csv=out_csv,
                summary_json=out_json,
            )

            self.assertTrue(out_csv.exists())
            self.assertTrue(out_json.exists())
            self.assertEqual(len(split_df), 10)
            self.assertEqual(summary["valid_images"], 10)
            self.assertEqual(summary["invalid_images"], 1)
            self.assertEqual(summary["num_label_conflict_clusters"], 1)

    def test_black_border_funduses_do_not_snowball_cluster(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            img_dir = root / "train_images"
            img_dir.mkdir(parents=True, exist_ok=True)

            csv_rows: list[dict[str, object]] = []
            rng = np.random.default_rng(77)
            for idx in range(25):
                canvas = _make_synthetic_fundus(width=400, height=300, seed=idx)
                # Variasi fitur acak unik agar setiap retina sintetis mewakili pasien berbeda.
                for _ in range(18):
                    px = int(rng.integers(130, 270))
                    py = int(rng.integers(85, 215))
                    cv2.circle(canvas, (px, py), int(rng.integers(3, 8)), (75, 18, 12), thickness=-1)
                code = f"patient_{idx:02d}"
                cv2.imwrite(str(img_dir / f"{code}.png"), cv2.cvtColor(canvas, cv2.COLOR_RGB2BGR))
                csv_rows.append({"id_code": code, "diagnosis": idx % 5})
                if idx == 0:
                    shifted = np.clip(canvas.astype(np.int16) + 2, 0, 255).astype(np.uint8)
                    cv2.imwrite(str(img_dir / "patient_00_dup.png"), cv2.cvtColor(shifted, cv2.COLOR_RGB2BGR))
                    csv_rows.append({"id_code": "patient_00_dup", "diagnosis": 1})

            pd.DataFrame(csv_rows).to_csv(root / "train.csv", index=False)
            split_df, summary = audit_aptos_directory(data_dir=root, n_folds=5, holdout_fold=0, seed=42)

            self.assertGreaterEqual(summary["unique_clusters"], 22)
            self.assertLessEqual(summary["max_cluster_size"], 3)
            self.assertEqual(split_df["fold"].nunique(), 5)
            self.assertEqual(split_df.loc[split_df["id_code"] == "patient_00", "cluster_id"].iloc[0],
                             split_df.loc[split_df["id_code"] == "patient_00_dup", "cluster_id"].iloc[0])


if __name__ == "__main__":
    unittest.main()
