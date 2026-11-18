"""Endpoint penyedia citra contoh nyata APTOS 2019 (held-out test)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.config import DEMO_SAMPLES, DEMO_SAMPLES_DIR
from backend.schemas import ExampleItem, ExamplesResponse

router = APIRouter(prefix="/api", tags=["examples"])


@router.get("/examples", response_model=ExamplesResponse)
def list_examples() -> ExamplesResponse:
    items: list[ExampleItem] = []
    for sample in DEMO_SAMPLES:
        file_path = DEMO_SAMPLES_DIR / sample["filename"]
        items.append(
            ExampleItem(
                id=sample["id"],
                label=sample["label"],
                short_label=sample["short_label"],
                expected_grade=sample["expected_grade"],
                split=sample["split"],
                available=file_path.exists(),
                image_url=f"/api/examples/{sample['id']}/image",
            )
        )
    return ExamplesResponse(examples=items)


@router.get("/examples/{example_id}/image")
def get_example_image(example_id: str) -> FileResponse:
    match = next((s for s in DEMO_SAMPLES if s["id"] == example_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Contoh citra tidak ditemukan.")
    file_path = DEMO_SAMPLES_DIR / match["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Berkas citra contoh belum tersedia di server.")
    return FileResponse(path=file_path, media_type="image/png", filename=match["filename"])
