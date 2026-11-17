"""Audit dataset APTOS 2019, deteksi duplikat perseptual, dan partisi bebas bocor."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pandas as pd

_POPCOUNT_BYTE = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def _to_grayscale(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return image
    if image.ndim == 3 and image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    raise ValueError(f"Format dimensi citra tidak didukung: {image.shape}")


def _pack_bits_64(bits: np.ndarray) -> int:
    flat = np.asarray(bits, dtype=np.uint8).ravel()
    if flat.size != 64:
        raise ValueError(f"Diperlukan 64 bit, diterima {flat.size}")
    value = 0
    for bit in flat.tolist():
        value = (value << 1) | int(bit & 1)
    return value


def compute_dhash_64(image: np.ndarray) -> int:
    """Hitung dHash 64-bit dari perbandingan gradien horizontal 9x8 piksel."""
    gray = _to_grayscale(image)
    resized = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    return _pack_bits_64(diff)


def compute_phash_64(image: np.ndarray) -> int:
    """Hitung pHash 64-bit berbasis DCT dengan mengecualikan komponen DC dari median."""
    gray = _to_grayscale(image)
    resized = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    dct = cv2.dct(resized)
    low_freq = dct[:8, :8]
    ac_coeffs = low_freq.ravel()[1:]
    median_val = float(np.median(ac_coeffs))
    bits = low_freq > median_val
    return _pack_bits_64(bits)


def hamming_distance(hash_a: int, hash_b: int) -> int:
    return (int(hash_a) ^ int(hash_b)).bit_count()


class _UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            if ra < rb:
                self.parent[rb] = ra
            else:
                self.parent[ra] = rb


def _pairwise_hamming_chunked(
    hashes_u64: np.ndarray,
    start: int,
    end: int,
) -> np.ndarray:
    chunk = hashes_u64[start:end, None]
    xor_u64 = np.bitwise_xor(chunk, hashes_u64[None, :])
    xor_bytes = xor_u64.view(np.uint8).reshape(end - start, hashes_u64.size, 8)
    return _POPCOUNT_BYTE[xor_bytes].sum(axis=2, dtype=np.uint8)


def cluster_near_duplicates(
    df: pd.DataFrame,
    phash_threshold: int = 6,
    dhash_threshold: int = 6,
) -> pd.DataFrame:
    """Kelompokkan citra duplikat dan tandai klaster dengan konflik label diagnosis."""
    out = df.copy().reset_index(drop=True)
    n = len(out)
    if n == 0:
        out["cluster_id"] = pd.Series(dtype=int)
        out["cluster_size"] = pd.Series(dtype=int)
        out["has_label_conflict"] = pd.Series(dtype=bool)
        return out

    phashes = np.array([int(v) for v in out["phash"]], dtype=np.uint64)
    dhashes = np.array([int(v) for v in out["dhash"]], dtype=np.uint64)
    uf = _UnionFind(n)

    # Pemrosesan per blok menjaga penggunaan RAM rendah saat menghitung matriks N x N.
    block_size = 256
    for start in range(0, n, block_size):
        end = min(start + block_size, n)
        p_dist = _pairwise_hamming_chunked(phashes, start, end)
        d_dist = _pairwise_hamming_chunked(dhashes, start, end)
        match_mask = (p_dist <= phash_threshold) | (d_dist <= dhash_threshold)
        rows, cols = np.where(match_mask)
        for r_off, c in zip(rows.tolist(), cols.tolist()):
            r = start + r_off
            if c > r:
                uf.union(r, c)

    roots = [uf.find(i) for i in range(n)]
    unique_roots = sorted(set(roots))
    root_to_cluster = {root: idx for idx, root in enumerate(unique_roots)}
    out["cluster_id"] = [root_to_cluster[r] for r in roots]

    sizes = out.groupby("cluster_id")["cluster_id"].transform("count")
    conflicts = out.groupby("cluster_id")["diagnosis"].transform("nunique") > 1
    out["cluster_size"] = sizes.astype(int)
    out["has_label_conflict"] = conflicts.astype(bool)
    return out


def assign_stratified_group_splits(
    df: pd.DataFrame,
    n_folds: int = 5,
    holdout_fold: int = 0,
    seed: int = 42,
) -> pd.DataFrame:
    """Bagi klaster utuh ke n_folds secara berstrata tanpa kebocoran antarpartisi."""
    if n_folds < 2:
        raise ValueError("n_folds minimal harus bernilai 2")
    if not (0 <= holdout_fold < n_folds):
        raise ValueError(f"holdout_fold harus berada di antara 0 dan {n_folds - 1}")

    out = df.copy()
    if len(out) == 0:
        out["fold"] = pd.Series(dtype=int)
        out["split"] = pd.Series(dtype=str)
        return out

    classes = sorted(out["diagnosis"].unique().tolist())
    class_to_idx = {cls: i for i, cls in enumerate(classes)}
    n_classes = len(classes)

    total_counts = np.zeros(n_classes, dtype=np.float64)
    cluster_rows: list[tuple[int, int, np.ndarray]] = []
    for cid, grp in out.groupby("cluster_id", sort=True):
        vec = np.zeros(n_classes, dtype=np.float64)
        for diag in grp["diagnosis"]:
            vec[class_to_idx[diag]] += 1.0
        total_counts += vec
        cluster_rows.append((int(cid), int(len(grp)), vec))

    rng = np.random.default_rng(seed)
    tie_breakers = rng.random(len(cluster_rows))
    order = sorted(
        range(len(cluster_rows)),
        key=lambda i: (-cluster_rows[i][1], -float(np.max(cluster_rows[i][2])), tie_breakers[i]),
    )

    target_per_fold = total_counts / float(n_folds)
    target_total = float(len(out)) / float(n_folds)
    fold_class_counts = np.zeros((n_folds, n_classes), dtype=np.float64)
    fold_totals = np.zeros(n_folds, dtype=np.float64)
    cluster_to_fold: dict[int, int] = {}

    for idx in order:
        cid, csize, vec = cluster_rows[idx]
        best_fold = 0
        best_cost = float("inf")
        for f in range(n_folds):
            cand_vec = fold_class_counts[f] + vec
            rel_err = ((cand_vec - target_per_fold) ** 2) / (target_per_fold + 1.0)
            size_err = ((fold_totals[f] + csize - target_total) ** 2) / (target_total + 1.0)
            cost = float(rel_err.sum() + 0.25 * size_err)
            if cost < best_cost:
                best_cost = cost
                best_fold = f
        fold_class_counts[best_fold] += vec
        fold_totals[best_fold] += float(csize)
        cluster_to_fold[cid] = best_fold

    out["fold"] = out["cluster_id"].map(cluster_to_fold).astype(int)
    out["split"] = np.where(out["fold"] == holdout_fold, "test", "train_cv")
    return out


def _resolve_image_path(images_dir: Path, id_code: str) -> Path | None:
    for ext in (".png", ".jpg", ".jpeg"):
        candidate = images_dir / f"{id_code}{ext}"
        if candidate.exists():
            return candidate
    return None


def audit_aptos_directory(
    data_dir: Path,
    output_csv: Path | None = None,
    summary_json: Path | None = None,
    n_folds: int = 5,
    holdout_fold: int = 0,
    phash_threshold: int = 6,
    dhash_threshold: int = 6,
    seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Audit integritas berkas APTOS 2019, klaster duplikat, serta split berstrata."""
    data_dir = Path(data_dir)
    csv_path = data_dir / "train.csv"
    images_dir = data_dir / "train_images"
    if not csv_path.exists():
        raise FileNotFoundError(f"Berkas label tidak ditemukan: {csv_path}")

    labels_df = pd.read_csv(csv_path)
    records: list[dict[str, Any]] = []
    invalid_records: list[dict[str, Any]] = []

    for row in labels_df.itertuples(index=False):
        id_code = str(row.id_code)
        diagnosis = int(row.diagnosis)
        img_path = _resolve_image_path(images_dir, id_code)
        if img_path is None:
            invalid_records.append({"id_code": id_code, "diagnosis": diagnosis, "reason": "missing_file"})
            continue

        bgr = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
        if bgr is None or bgr.size == 0:
            invalid_records.append({"id_code": id_code, "diagnosis": diagnosis, "reason": "unreadable_image"})
            continue

        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        records.append(
            {
                "id_code": id_code,
                "diagnosis": diagnosis,
                "width": int(w),
                "height": int(h),
                "phash": str(compute_phash_64(gray)),
                "dhash": str(compute_dhash_64(gray)),
            }
        )

    valid_df = pd.DataFrame(records)
    clustered_df = cluster_near_duplicates(
        valid_df,
        phash_threshold=phash_threshold,
        dhash_threshold=dhash_threshold,
    )
    split_df = assign_stratified_group_splits(
        clustered_df,
        n_folds=n_folds,
        holdout_fold=holdout_fold,
        seed=seed,
    )

    duplicate_clusters = split_df[split_df["cluster_size"] > 1]
    conflict_clusters = split_df[split_df["has_label_conflict"]]
    summary: dict[str, Any] = {
        "total_rows_csv": int(len(labels_df)),
        "valid_images": int(len(split_df)),
        "invalid_images": int(len(invalid_records)),
        "invalid_details": invalid_records,
        "unique_clusters": int(split_df["cluster_id"].nunique()) if len(split_df) else 0,
        "images_in_duplicate_clusters": int(len(duplicate_clusters)),
        "num_duplicate_clusters": int(duplicate_clusters["cluster_id"].nunique()) if len(duplicate_clusters) else 0,
        "images_in_label_conflict_clusters": int(len(conflict_clusters)),
        "num_label_conflict_clusters": int(conflict_clusters["cluster_id"].nunique()) if len(conflict_clusters) else 0,
        "split_counts": split_df["split"].value_counts().to_dict() if len(split_df) else {},
        "diagnosis_by_split": (
            split_df.groupby(["split", "diagnosis"]).size().unstack(fill_value=0).to_dict(orient="index")
            if len(split_df)
            else {}
        ),
    }

    if output_csv is not None:
        output_csv = Path(output_csv)
        output_csv.parent.mkdir(parents=True, exist_ok=True)
        split_df.to_csv(output_csv, index=False)

    if summary_json is not None:
        summary_json = Path(summary_json)
        summary_json.parent.mkdir(parents=True, exist_ok=True)
        summary_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    return split_df, summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit dataset APTOS 2019 dan buat partisi bebas bocor.")
    parser.add_argument("--data-dir", type=Path, required=True, help="Direktori dataset yang memuat train.csv dan train_images/")
    parser.add_argument("--output-csv", type=Path, default=Path("outputs/aptos_splits.csv"))
    parser.add_argument("--summary-json", type=Path, default=Path("outputs/aptos_audit_summary.json"))
    parser.add_argument("--n-folds", type=int, default=5)
    parser.add_argument("--holdout-fold", type=int, default=0)
    parser.add_argument("--phash-threshold", type=int, default=6)
    parser.add_argument("--dhash-threshold", type=int, default=6)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    _, summary = audit_aptos_directory(
        data_dir=args.data_dir,
        output_csv=args.output_csv,
        summary_json=args.summary_json,
        n_folds=args.n_folds,
        holdout_fold=args.holdout_fold,
        phash_threshold=args.phash_threshold,
        dhash_threshold=args.dhash_threshold,
        seed=args.seed,
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
