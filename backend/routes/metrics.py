"""Endpoint pembaca metrik eksperimen E1-E4 dan audit dataset APTOS 2019."""

from __future__ import annotations

from fastapi import APIRouter

from backend.metrics_service import load_comparisons
from backend.schemas import ComparisonsResponse

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics", response_model=ComparisonsResponse)
def get_metrics() -> ComparisonsResponse:
    return load_comparisons()
