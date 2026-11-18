"""Factory aplikasi FastAPI utama untuk instrumen skrining retina Mydria."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import REPO_ROOT
from backend.routes import examples, health, inference, metrics


def create_app() -> FastAPI:
    app = FastAPI(
        title="Mydria API",
        description="Backend inferensi ONNX Runtime dan gerbang kualitas citra fundus APTOS 2019.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
            "http://localhost:4173",
        ],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(examples.router)
    app.include_router(inference.router)
    app.include_router(metrics.router)

    frontend_dist = REPO_ROOT / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

    return app


app = create_app()
