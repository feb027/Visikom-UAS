"""Utilitas pengunduh bobot ONNX final, metrik E1-E4, dan sampel uji dari GitHub Release."""

from __future__ import annotations

import argparse
import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPO = os.environ.get("MYDRIA_GITHUB_REPO", "feb027/Visikom-UAS")
DEFAULT_TAG = os.environ.get("MYDRIA_RELEASE_TAG", "v1.0.0")

RELEASE_ASSETS: list[tuple[str, Path]] = [
    ("model_best.onnx", REPO_ROOT / "models" / "weights" / "model_best.onnx"),
    ("model_meta.json", REPO_ROOT / "models" / "weights" / "model_meta.json"),
    ("aptos_audit_summary.json", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "aptos_audit_summary.json"),
    ("E1_comparison.csv", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full" / "E1_comparison.csv"),
    ("E2_comparison.csv", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full" / "E2_comparison.csv"),
    ("E3_comparison.csv", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full" / "E3_comparison.csv"),
    ("E4_heldout_test_metrics.json", REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full" / "E4_heldout_test_metrics.json"),
]


def _download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "mydria-downloader/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp, tmp_path.open("wb") as out:
        shutil.copyfileobj(resp, out, length=1024 * 1024)
    tmp_path.replace(dest)


def download_release_assets(
    repo: str = DEFAULT_REPO,
    tag: str = DEFAULT_TAG,
    skip_if_present: bool = True,
) -> None:
    base_url = f"https://github.com/{repo}/releases/download/{tag}"

    for asset_name, dest_path in RELEASE_ASSETS:
        if skip_if_present and dest_path.exists() and dest_path.stat().st_size > 0:
            print(f"[Lewati] {dest_path.relative_to(REPO_ROOT).as_posix()} sudah tersedia.")
            continue
        url = f"{base_url}/{asset_name}"
        print(f"[Unduh] {url} -> {dest_path.relative_to(REPO_ROOT).as_posix()}")
        _download_file(url, dest_path)

    demo_dir = REPO_ROOT / "outputs" / "demo_samples"
    demo_files = [demo_dir / "0125fbd2e791.png", demo_dir / "000c1434d8d7.png", demo_dir / "0083ee8054ee.png"]
    if skip_if_present and all(p.exists() and p.stat().st_size > 0 for p in demo_files):
        print("[Lewati] outputs/demo_samples sudah tersedia.")
        return

    zip_dest = demo_dir / "demo_samples.zip"
    demo_url = f"{base_url}/demo_samples.zip"
    print(f"[Unduh] {demo_url} -> outputs/demo_samples/")
    _download_file(demo_url, zip_dest)
    with zipfile.ZipFile(zip_dest, "r") as zf:
        zf.extractall(demo_dir)
    zip_dest.unlink(missing_ok=True)
    print("Seluruh bobot ONNX, metrik E1-E4, dan sampel uji siap.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Unduh artefak rilis Mydria dari GitHub Releases.")
    parser.add_argument("--repo", default=DEFAULT_REPO, help="Slug repositori GitHub (pemilik/repo).")
    parser.add_argument("--tag", default=DEFAULT_TAG, help="Tag rilis GitHub.")
    parser.add_argument(
        "--skip-if-present",
        action="store_true",
        help="Lewati berkas yang sudah ada secara lokal (perilaku bawaan bila tanpa --force).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Unduh ulang walau berkas sudah ada secara lokal.",
    )
    args = parser.parse_args()
    download_release_assets(repo=args.repo, tag=args.tag, skip_if_present=not args.force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
