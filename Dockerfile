# Tahap 1: Build aset produksi React + Vite
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Tahap 2: Runtime FastAPI + ONNX Runtime (kompatibel Docker lokal, Railway, & Hugging Face Spaces)
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MYDRIA_HOST=0.0.0.0 \
    PORT=7860

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 mydria
WORKDIR /app

COPY pyproject.toml README.md ./
COPY src/ ./src/
COPY backend/ ./backend/
COPY scripts/download_weights.py ./scripts/download_weights.py
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir ".[serve]" && \
    mkdir -p /app/models/weights /app/outputs/demo_samples /app/outputs/kaggle_full/outputs/full && \
    chown -R mydria:mydria /app

USER mydria
EXPOSE 7860

CMD ["sh", "-c", "python scripts/download_weights.py --skip-if-present && python -m backend.main"]
