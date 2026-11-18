"""Layanan pembaca metrik eksperimen asli (E1-E4) dan audit APTOS 2019."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from backend.config import resolve_active_artifacts
from backend.schemas import ComparisonsResponse


def _read_csv_records(csv_path: Path | None) -> list[dict[str, Any]]:
    if csv_path is None or not csv_path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed: dict[str, Any] = {}
            for k, v in row.items():
                if v is None:
                    parsed[k] = None
                    continue
                try:
                    parsed[k] = float(v)
                except ValueError:
                    parsed[k] = v
            rows.append(parsed)
    return rows


def _read_json(json_path: Path | None) -> dict[str, Any] | None:
    if json_path is None or not json_path.exists():
        return None
    return json.loads(json_path.read_text(encoding="utf-8"))


def load_comparisons() -> ComparisonsResponse:
    paths = resolve_active_artifacts()
    run_dir = paths.run_outputs_dir
    return ComparisonsResponse(
        stage=paths.stage,
        audit_summary=_read_json(paths.audit_summary_path),
        e1_preprocessing=_read_csv_records(run_dir / "E1_comparison.csv") if run_dir else [],
        e2_backbones=_read_csv_records(run_dir / "E2_comparison.csv") if run_dir else [],
        e3_losses=_read_csv_records(run_dir / "E3_comparison.csv") if run_dir else [],
        e4_test_metrics=_read_json(run_dir / "E4_heldout_test_metrics.json") if run_dir else None,
        model_meta=_read_json(paths.meta_path),
    )
