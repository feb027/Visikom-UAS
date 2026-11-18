"""Endpoint pemeriksaan kesehatan layanan dan status runtime ONNX."""

from __future__ import annotations

from fastapi import APIRouter

from backend.model_service import inference_service
from backend.schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return inference_service.health()
