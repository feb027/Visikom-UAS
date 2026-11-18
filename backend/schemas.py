"""Skema respons Pydantic untuk kontrak API FastAPI Mydria."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_stage: str
    backbone: str | None
    head_type: str | None
    preprocess_mode: str | None
    input_size: int
    active_provider: str | None
    available_providers: list[str]
    disclaimer: str


class QualityResponse(BaseModel):
    accepted: bool
    rejection_code: str | None
    blur_warning: bool
    laplacian_variance: float
    roi_area_ratio: float
    red_blue_ratio: float
    red_green_ratio: float
    message_id: str


class ClassProbabilityItem(BaseModel):
    grade: int
    label: str
    probability: float


class ViewerLayers(BaseModel):
    original_crop: str
    raw_resize: str
    lab_clahe: str
    ben_graham: str
    gradcam_overlay: str


class PredictionResponse(BaseModel):
    accepted: bool
    quality: QualityResponse
    model_stage: str | None = None
    backbone: str | None = None
    head_type: str | None = None
    preprocess_mode: str | None = None
    active_provider: str | None = None
    inference_ms: float | None = None
    predicted_grade: int | None = None
    predicted_label: str | None = None
    referable_dr: bool | None = None
    referable_probability: float | None = None
    confidence: float | None = None
    temperature: float | None = None
    guidance_id: str | None = None
    disclaimer: str
    probabilities: list[ClassProbabilityItem] = []
    viewer_layers: ViewerLayers | None = None


class ExampleItem(BaseModel):
    id: str
    label: str
    short_label: str
    expected_grade: int
    split: str
    available: bool
    image_url: str


class ExamplesResponse(BaseModel):
    examples: list[ExampleItem]


class ComparisonsResponse(BaseModel):
    stage: str
    audit_summary: dict[str, Any] | None
    e1_preprocessing: list[dict[str, Any]]
    e2_backbones: list[dict[str, Any]]
    e3_losses: list[dict[str, Any]]
    e4_test_metrics: dict[str, Any] | None
    model_meta: dict[str, Any] | None
