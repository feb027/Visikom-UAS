"""Titik masuk CLI untuk menjalankan server FastAPI Mydria secara lokal maupun kontainer."""

from __future__ import annotations

import os

import uvicorn


def main() -> None:
    host = os.environ.get("MYDRIA_HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("backend.app:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
