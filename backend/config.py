"""Konfigurasi terpadu backend Mydria, resolusi bobot ONNX, dan label klinis."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = REPO_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

CLASS_LABELS = ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"]

GRADE_GUIDANCE = {
    0: "Tidak tampak tanda retinopati diabetik pada citra ini; tetap lakukan pemeriksaan rutin berkala.",
    1: "Terindikasi retinopati diabetik ringan (NPDR ringan); disarankan pemantauan berkala oleh tenaga medis.",
    2: "Masuk ambang rujukan (Referable DR: Moderate); disarankan pemeriksaan oftalmologi lebih lanjut.",
    3: "Terindikasi retinopati diabetik berat (NPDR berat / Referable DR); prioritas evaluasi spesialis mata.",
    4: "Terindikasi retinopati diabetik proliferatif (Referable DR tingkat lanjut); perlu rujukan segera ke spesialis.",
}

CLINICAL_DISCLAIMER = (
    "Perangkat lunak prototipe riset akademik (bukan alat diagnosis medis). "
    "Keputusan klinis wajib ditetapkan oleh dokter spesialis mata."
)


@dataclass(frozen=True)
class ModelPaths:
    stage: str
    onnx_path: Path | None
    meta_path: Path | None
    run_outputs_dir: Path | None
    audit_summary_path: Path | None


def resolve_active_artifacts() -> ModelPaths:
    """Pilih artefak terlatih penuh bila tersedia, lalu fallback ke artefak smoke test terverifikasi."""
    full_onnx_candidates = [
        (REPO_ROOT / "models" / "weights" / "model_best.onnx", REPO_ROOT / "models" / "weights" / "model_meta.json", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full"),
        (REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full" / "model_best.onnx", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full" / "model_meta.json", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full"),
        (REPO_ROOT / "outputs" / "full" / "model_best.onnx", REPO_ROOT / "outputs" / "full" / "model_meta.json", REPO_ROOT / "outputs" / "full"),
    ]
    for onnx_p, meta_p, run_dir in full_onnx_candidates:
        if onnx_p.exists() and meta_p.exists():
            meta = json.loads(meta_p.read_text(encoding="utf-8"))
            stage = "smoke" if meta.get("smoke_test") else "full"
            audit_p = REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "aptos_audit_summary.json"
            if not audit_p.exists():
                audit_p = REPO_ROOT / "outputs" / "kaggle_smoke" / "outputs" / "aptos_audit_summary.json"
            return ModelPaths(
                stage=stage,
                onnx_path=onnx_p,
                meta_path=meta_p,
                run_outputs_dir=run_dir if run_dir.exists() else None,
                audit_summary_path=audit_p if audit_p.exists() else None,
            )

    smoke_dir = REPO_ROOT / "outputs" / "kaggle_smoke" / "outputs" / "smoke"
    smoke_onnx = smoke_dir / "model_best.onnx"
    smoke_meta = smoke_dir / "model_meta.json"
    smoke_audit = REPO_ROOT / "outputs" / "kaggle_smoke" / "outputs" / "aptos_audit_summary.json"
    if smoke_onnx.exists() and smoke_meta.exists():
        return ModelPaths(
            stage="smoke",
            onnx_path=smoke_onnx,
            meta_path=smoke_meta,
            run_outputs_dir=smoke_dir,
            audit_summary_path=smoke_audit if smoke_audit.exists() else None,
        )

    return ModelPaths(
        stage="unavailable",
        onnx_path=None,
        meta_path=None,
        run_outputs_dir=None,
        audit_summary_path=smoke_audit if smoke_audit.exists() else None,
    )


DEMO_SAMPLES: list[dict[str, Any]] = [
    {
        "id": "0125fbd2e791",
        "filename": "0125fbd2e791.png",
        "label": "Grade 0: No DR",
        "short_label": "Contoh Grade 0",
        "expected_grade": 0,
        "split": "Held-Out Test (Fold 0)",
    },
    {
        "id": "000c1434d8d7",
        "filename": "000c1434d8d7.png",
        "label": "Grade 2: Moderate",
        "short_label": "Contoh Grade 2",
        "expected_grade": 2,
        "split": "Held-Out Test (Fold 0)",
    },
    {
        "id": "0083ee8054ee",
        "filename": "0083ee8054ee.png",
        "label": "Grade 4: Proliferative DR",
        "short_label": "Contoh Grade 4",
        "expected_grade": 4,
        "split": "Held-Out Test (Fold 0)",
    },
]

DEMO_SAMPLES_DIR = REPO_ROOT / "outputs" / "demo_samples"
