"""Endpoint inferensi skrining fundus retina (unggah berkas maupun sampel bawaan)."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.config import DEMO_SAMPLES, DEMO_SAMPLES_DIR
from backend.model_service import inference_service
from backend.schemas import PredictionResponse

router = APIRouter(prefix="/api", tags=["inference"])

MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@router.post("/predict", response_model=PredictionResponse)
async def predict_fundus(
    file: UploadFile | None = File(default=None),
    example_id: str | None = None,
) -> PredictionResponse:
    if file is not None:
        raw_bytes = await file.read()
        if len(raw_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Ukuran berkas melebihi batas maksimum 20 MB.")
        return inference_service.predict_bytes(raw_bytes)

    if example_id:
        match = next((s for s in DEMO_SAMPLES if s["id"] == example_id), None)
        if match is None:
            raise HTTPException(status_code=404, detail="ID contoh citra tidak dikenal.")
        sample_path = DEMO_SAMPLES_DIR / match["filename"]
        if not sample_path.exists():
            raise HTTPException(status_code=404, detail="Berkas contoh tidak ditemukan di disk.")
        return inference_service.predict_bytes(sample_path.read_bytes())

    raise HTTPException(status_code=400, detail="Kirim berkas gambar (file) atau parameter example_id.")
