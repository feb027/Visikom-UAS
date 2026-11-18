"""Utilitas CLI untuk mendorong, memantau, dan mengunduh kernel Kaggle Paket B."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_SRC = REPO_ROOT / "notebooks" / "paket_b_training_colab_kaggle.ipynb"
STAGE_ROOT = REPO_ROOT / "outputs" / ".kaggle_stage"

KERNEL_SPECS = {
    "smoke": {
        "slug": "visikom-uas-paket-b-smoke",
        "title": "Visikom UAS Paket B Smoke",
        "smoke_flag": True,
        "default_dest": REPO_ROOT / "outputs" / "kaggle_smoke",
    },
    "full": {
        "slug": "visikom-uas-paket-b-full",
        "title": "Visikom UAS Paket B Full",
        "smoke_flag": False,
        "default_dest": REPO_ROOT / "outputs" / "kaggle_full",
    },
}


def _resolve_kaggle_username() -> str:
    cfg_path = Path.home() / ".kaggle" / "kaggle.json"
    if cfg_path.exists():
        data = json.loads(cfg_path.read_text(encoding="utf-8"))
        username = str(data.get("username", "")).strip()
        if username:
            return username
    env_user = os.environ.get("KAGGLE_USERNAME", "").strip()
    if env_user:
        return env_user
    raise FileNotFoundError(
        f"Username Kaggle tidak ditemukan di {cfg_path} maupun variabel lingkungan KAGGLE_USERNAME."
    )


def _stage_kernel(mode: str, username: str) -> tuple[Path, str]:
    spec = KERNEL_SPECS[mode]
    stage_dir = STAGE_ROOT / mode
    stage_dir.mkdir(parents=True, exist_ok=True)

    nb_text = NOTEBOOK_SRC.read_text(encoding="utf-8")
    target_val = "True" if spec["smoke_flag"] else "False"
    patched = False
    for candidate in ('"SMOKE_TEST = True\\n"', '"SMOKE_TEST = False\\n"'):
        if candidate in nb_text:
            nb_text = nb_text.replace(candidate, f'"SMOKE_TEST = {target_val}\\n"', 1)
            patched = True
            break
    if not patched:
        raise ValueError("Baris saklar SMOKE_TEST tidak ditemukan di notebook sumber.")

    json.loads(nb_text)
    (stage_dir / NOTEBOOK_SRC.name).write_text(nb_text, encoding="utf-8")

    kernel_id = f"{username}/{spec['slug']}"
    metadata = {
        "id": kernel_id,
        "title": spec["title"],
        "code_file": NOTEBOOK_SRC.name,
        "language": "python",
        "kernel_type": "notebook",
        "is_private": True,
        "enable_gpu": True,
        "enable_internet": True,
        "dataset_sources": [],
        "competition_sources": ["aptos2019-blindness-detection"],
        "kernel_sources": [],
    }
    (stage_dir / "kernel-metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n",
        encoding="utf-8",
    )
    return stage_dir, kernel_id


def _run_kaggle(args: list[str]) -> int:
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run([sys.executable, "-m", "kaggle", *args], env=env)
    return proc.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Automasi Kaggle Notebook Paket B via Kaggle CLI.")
    subparsers = parser.add_subparsers(dest="action", required=True)

    push_p = subparsers.add_parser("push", help="Dorong dan jalankan notebook ke Kaggle GPU.")
    push_p.add_argument("--mode", choices=sorted(KERNEL_SPECS.keys()), default="smoke")
    push_p.add_argument("--accelerator", default="NvidiaTeslaT4")
    push_p.add_argument("--timeout", type=int, default=None)

    status_p = subparsers.add_parser("status", help="Cek status eksekusi kernel di Kaggle.")
    status_p.add_argument("--mode", choices=sorted(KERNEL_SPECS.keys()), default="smoke")

    out_p = subparsers.add_parser("output", help="Unduh seluruh keluaran kernel dari Kaggle.")
    out_p.add_argument("--mode", choices=sorted(KERNEL_SPECS.keys()), default="smoke")
    out_p.add_argument("--dest", type=Path, default=None)

    clean_p = subparsers.add_parser("clean", help="Hapus folder staging lokal.")
    clean_p.add_argument("--mode", choices=[*sorted(KERNEL_SPECS.keys()), "all"], default="all")

    args = parser.parse_args()
    if args.action == "clean":
        target = STAGE_ROOT if args.mode == "all" else STAGE_ROOT / args.mode
        if target.exists():
            shutil.rmtree(target)
        print(f"Staging dibersihkan: {target}")
        return 0

    username = _resolve_kaggle_username()
    spec = KERNEL_SPECS[args.mode]
    kernel_id = f"{username}/{spec['slug']}"

    if args.action == "push":
        stage_dir, kernel_id = _stage_kernel(args.mode, username)
        print(f"Mendorong kernel {kernel_id} (mode={args.mode}, accelerator={args.accelerator})...")
        cmd = ["kernels", "push", "-p", str(stage_dir), "--accelerator", args.accelerator]
        if args.timeout is not None:
            cmd.extend(["--timeout", str(args.timeout)])
        return _run_kaggle(cmd)

    if args.action == "status":
        return _run_kaggle(["kernels", "status", kernel_id])

    if args.action == "output":
        dest = args.dest if args.dest is not None else spec["default_dest"]
        dest.mkdir(parents=True, exist_ok=True)
        print(f"Mengunduh keluaran {kernel_id} ke {dest}...")
        return _run_kaggle(["kernels", "output", kernel_id, "-p", str(dest)])

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
