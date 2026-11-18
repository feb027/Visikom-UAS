"""Endpoint penyedia citra contoh nyata APTOS 2019 (held-out test)."""

from __future__ import annotations

from functools import lru_cache

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response

from backend.config import DEMO_SAMPLES, DEMO_SAMPLES_DIR
from backend.schemas import ExampleItem, ExamplesResponse

router = APIRouter(prefix="/api", tags=["examples"])


@lru_cache(maxsize=16)
def _render_thumbnail_bytes(file_path_str: str, size: int = 160) -> bytes:
    bgr = cv2.imread(file_path_str, cv2.IMREAD_COLOR)
    if bgr is None or bgr.size == 0:
        raise FileNotFoundError(file_path_str)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    mask = (gray > 10).astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
        crop = rgb[y : y + h, x : x + w]
    else:
        crop = rgb
    ch, cw = crop.shape[:2]
    # Potong persegi dari tengah retina agar thumbnail bundar bebas pita hitam atas-bawah.
    side = max(16, min(ch, cw))
    cy, cx = ch // 2, cw // 2
    half = side // 2
    square = crop[cy - half : cy - half + side, cx - half : cx - half + side]
    thumb = cv2.resize(square, (size, size), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", cv2.cvtColor(thumb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 86])
    if not ok:
        raise RuntimeError("Gagal menyandikan thumbnail contoh.")
    return buf.tobytes()


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
                image_url=f"/api/examples/{sample['id']}/image?thumb=1",
            )
        )
    return ExamplesResponse(examples=items)


@router.get("/examples/{example_id}/image")
def get_example_image(
    example_id: str,
    thumb: int = Query(default=0, ge=0, le=1),
):
    match = next((s for s in DEMO_SAMPLES if s["id"] == example_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Contoh citra tidak ditemukan.")
    file_path = DEMO_SAMPLES_DIR / match["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Berkas citra contoh belum tersedia di server.")
    if thumb == 1:
        thumb_bytes = _render_thumbnail_bytes(str(file_path), size=160)
        return Response(content=thumb_bytes, media_type="image/jpeg")
    return FileResponse(path=file_path, media_type="image/png", filename=match["filename"])
