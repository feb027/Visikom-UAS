"""Pipeline pelatihan, caching prapemrosesan, ablasi E1-E3, dan evaluasi E4."""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler

try:
    import albumentations as A
except ImportError:
    A = None

from visikom_dr.calibration_xai import (
    TemperatureScaler,
    export_model_to_onnx,
    raw_output_to_predictions,
)
from visikom_dr.losses import (
    CORNLoss,
    OptimizedRounder,
    compute_single_rebalance_weights,
    validate_rebalance_config,
)
from visikom_dr.metrics import compute_classification_metrics
from visikom_dr.models import RetinaGradingModel
from visikom_dr.preprocessing import preprocess_fundus

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def image_to_tensor(rgb_uint8: np.ndarray) -> torch.Tensor:
    arr = np.asarray(rgb_uint8, dtype=np.float32) / 255.0
    norm = (arr - IMAGENET_MEAN) / IMAGENET_STD
    return torch.from_numpy(np.transpose(norm, (2, 0, 1)).copy())


def _resolve_raw_image(raw_images_dir: Path, id_code: str) -> Path:
    for ext in (".png", ".jpg", ".jpeg"):
        candidate = raw_images_dir / f"{id_code}{ext}"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Berkas citra untuk id_code '{id_code}' tidak ditemukan di {raw_images_dir}")


def prepare_preprocessed_cache(
    split_df: pd.DataFrame,
    raw_images_dir: Path,
    cache_dir: Path,
    mode: str = "lab_clahe",
    size: int = 384,
) -> Path:
    """Proses dan simpan seluruh citra prapemrosesan ke disk lokal agar epoch berjalan cepat."""
    target_dir = Path(cache_dir) / f"{mode}_{size}"
    target_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = Path(raw_images_dir)

    for id_code in split_df["id_code"].astype(str):
        out_path = target_dir / f"{id_code}.png"
        if out_path.exists():
            continue
        src_path = _resolve_raw_image(raw_dir, id_code)
        bgr = cv2.imread(str(src_path), cv2.IMREAD_COLOR)
        if bgr is None:
            raise ValueError(f"Gagal membaca citra: {src_path}")
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        processed = preprocess_fundus(rgb, mode=mode, size=size)
        cv2.imwrite(str(out_path), cv2.cvtColor(processed, cv2.COLOR_RGB2BGR))

    return target_dir


def _build_train_augmenter():
    if A is None:
        return None
    return A.Compose(
        [
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.RandomRotate90(p=0.5),
            A.RandomBrightnessContrast(brightness_limit=0.12, contrast_limit=0.12, p=0.5),
        ]
    )


def _numpy_augment(rgb: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    img = rgb.copy()
    if rng.random() < 0.5:
        img = np.fliplr(img)
    if rng.random() < 0.5:
        img = np.flipud(img)
    k = int(rng.integers(0, 4))
    if k > 0:
        img = np.rot90(img, k=k)
    if rng.random() < 0.5:
        alpha = float(rng.uniform(0.9, 1.1))
        beta = float(rng.uniform(-10.0, 10.0))
        img = np.clip(img.astype(np.float32) * alpha + beta, 0, 255).astype(np.uint8)
    return img


class AptosFundusDataset(Dataset):
    """Dataset PyTorch dengan pembacaan cache prapemrosesan dan augmentasi aman retina."""

    def __init__(
        self,
        df: pd.DataFrame,
        raw_images_dir: Path,
        cache_subdir: Path | None = None,
        preprocess_mode: str = "lab_clahe",
        input_size: int = 384,
        is_train: bool = False,
        seed: int = 42,
    ) -> None:
        self.df = df.reset_index(drop=True)
        self.raw_images_dir = Path(raw_images_dir)
        self.cache_subdir = Path(cache_subdir) if cache_subdir is not None else None
        self.preprocess_mode = preprocess_mode
        self.input_size = int(input_size)
        self.is_train = is_train
        self.aug = _build_train_augmenter() if is_train else None
        self.rng = np.random.default_rng(seed)

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        row = self.df.iloc[idx]
        id_code = str(row["id_code"])
        label = int(row["diagnosis"])

        cached_path = (self.cache_subdir / f"{id_code}.png") if self.cache_subdir is not None else None
        if cached_path is not None and cached_path.exists():
            bgr = cv2.imread(str(cached_path), cv2.IMREAD_COLOR)
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        else:
            src_path = _resolve_raw_image(self.raw_images_dir, id_code)
            bgr = cv2.imread(str(src_path), cv2.IMREAD_COLOR)
            rgb = preprocess_fundus(
                cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB),
                mode=self.preprocess_mode,
                size=self.input_size,
            )

        if self.is_train:
            if self.aug is not None:
                rgb = self.aug(image=rgb)["image"]
            else:
                rgb = _numpy_augment(rgb, self.rng)

        return image_to_tensor(rgb), label


@dataclass
class TrainConfig:
    experiment_id: str = "custom"
    backbone: str = "efficientnet_b0"
    head_type: str = "ce"
    preprocess_mode: str = "lab_clahe"
    input_size: int = 384
    epochs: int = 15
    batch_size: int = 16
    lr: float = 3e-4
    weight_decay: float = 1e-4
    dropout: float = 0.2
    use_sampler: bool = False
    use_class_weights: bool = False
    rebalance_power: float = 0.5
    val_fold: int = 1
    patience: int = 5
    num_workers: int = 2
    seed: int = 42
    pretrained: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


EXPERIMENT_PRESETS: dict[str, dict[str, Any]] = {
    "E1a_raw": {"backbone": "efficientnet_b0", "preprocess_mode": "raw_resize", "head_type": "ce"},
    "E1b_crop": {"backbone": "efficientnet_b0", "preprocess_mode": "crop_only", "head_type": "ce"},
    "E1c_clahe": {"backbone": "efficientnet_b0", "preprocess_mode": "lab_clahe", "head_type": "ce"},
    "E1d_bengraham": {"backbone": "efficientnet_b0", "preprocess_mode": "ben_graham", "head_type": "ce"},
    "E2_resnet50": {"backbone": "resnet50", "preprocess_mode": "lab_clahe", "head_type": "ce", "lr": 2e-4},
    "E2_effb0": {"backbone": "efficientnet_b0", "preprocess_mode": "lab_clahe", "head_type": "ce", "lr": 3e-4},
    "E2_convnextv2": {"backbone": "convnextv2_tiny", "preprocess_mode": "lab_clahe", "head_type": "ce", "lr": 1e-4},
    "E3a_ce_plain": {"backbone": "convnextv2_tiny", "preprocess_mode": "lab_clahe", "head_type": "ce", "lr": 1e-4},
    "E3b_ce_single_weight": {
        "backbone": "convnextv2_tiny",
        "preprocess_mode": "lab_clahe",
        "head_type": "ce",
        "use_class_weights": True,
        "lr": 1e-4,
    },
    "E3c_corn": {"backbone": "convnextv2_tiny", "preprocess_mode": "lab_clahe", "head_type": "corn", "lr": 1e-4},
    "E3d_smooth_l1": {"backbone": "convnextv2_tiny", "preprocess_mode": "lab_clahe", "head_type": "smooth_l1", "lr": 1e-4},
}


def _set_seed(seed: int) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def _compute_batch_loss(
    criterion: nn.Module,
    outputs: torch.Tensor,
    targets: torch.Tensor,
    head_type: str,
) -> torch.Tensor:
    if head_type == "smooth_l1":
        return criterion(outputs.squeeze(1), targets.float())
    return criterion(outputs, targets)


def _collect_outputs(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    head_type: str,
    device: torch.device,
    use_amp: bool,
) -> tuple[float, np.ndarray, np.ndarray]:
    model.eval()
    total_loss = 0.0
    total_items = 0
    raw_list: list[np.ndarray] = []
    target_list: list[np.ndarray] = []

    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)
            with torch.amp.autocast(device_type="cuda", enabled=use_amp):
                outputs = model(images)
                loss = _compute_batch_loss(criterion, outputs, targets, head_type)
            bs = int(targets.shape[0])
            total_loss += float(loss.item()) * bs
            total_items += bs
            raw_list.append(outputs.float().cpu().numpy())
            target_list.append(targets.cpu().numpy())

    avg_loss = total_loss / max(total_items, 1)
    return avg_loss, np.concatenate(raw_list, axis=0), np.concatenate(target_list, axis=0)


def run_training_experiment(
    config: TrainConfig,
    split_df: pd.DataFrame,
    raw_images_dir: Path,
    output_dir: Path,
    cache_dir: Path | None = None,
    evaluate_test: bool = False,
    export_onnx: bool = False,
) -> dict[str, Any]:
    """Jalankan satu eksperimen pelatihan lengkap, kalibrasi validasi, dan ekspor opsional."""
    validate_rebalance_config(config.use_sampler, config.use_class_weights)
    _set_seed(config.seed)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_images_dir = Path(raw_images_dir)

    cv_df = split_df[split_df["split"] == "train_cv"].copy()
    train_df = cv_df[cv_df["fold"] != config.val_fold].reset_index(drop=True)
    val_df = cv_df[cv_df["fold"] == config.val_fold].reset_index(drop=True)
    if len(train_df) == 0 or len(val_df) == 0:
        raise ValueError(f"Partisi train ({len(train_df)}) atau val ({len(val_df)}) kosong pada val_fold={config.val_fold}")

    cache_subdir: Path | None = None
    if cache_dir is not None:
        cache_subdir = prepare_preprocessed_cache(
            split_df=split_df,
            raw_images_dir=raw_images_dir,
            cache_dir=Path(cache_dir),
            mode=config.preprocess_mode,
            size=config.input_size,
        )

    train_ds = AptosFundusDataset(
        train_df,
        raw_images_dir=raw_images_dir,
        cache_subdir=cache_subdir,
        preprocess_mode=config.preprocess_mode,
        input_size=config.input_size,
        is_train=True,
        seed=config.seed,
    )
    val_ds = AptosFundusDataset(
        val_df,
        raw_images_dir=raw_images_dir,
        cache_subdir=cache_subdir,
        preprocess_mode=config.preprocess_mode,
        input_size=config.input_size,
        is_train=False,
        seed=config.seed,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_amp = device.type == "cuda"
    pin_mem = device.type == "cuda"

    sampler = None
    shuffle = True
    if config.use_sampler:
        cls_weights = compute_single_rebalance_weights(
            train_df["diagnosis"].tolist(),
            num_classes=5,
            power=config.rebalance_power,
        )
        sample_weights = [float(cls_weights[int(y)]) for y in train_df["diagnosis"]]
        sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
        shuffle = False

    train_loader = DataLoader(
        train_ds,
        batch_size=config.batch_size,
        shuffle=shuffle,
        sampler=sampler,
        num_workers=config.num_workers,
        pin_memory=pin_mem,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=config.num_workers,
        pin_memory=pin_mem,
    )

    model = RetinaGradingModel(
        backbone=config.backbone,
        head_type=config.head_type,
        pretrained=config.pretrained,
        dropout=config.dropout,
    ).to(device)

    if config.head_type == "ce":
        weight_tensor = None
        if config.use_class_weights:
            cw = compute_single_rebalance_weights(
                train_df["diagnosis"].tolist(),
                num_classes=5,
                power=config.rebalance_power,
            )
            weight_tensor = torch.tensor(cw, dtype=torch.float32, device=device)
        criterion: nn.Module = nn.CrossEntropyLoss(weight=weight_tensor)
    elif config.head_type == "corn":
        criterion = CORNLoss(num_classes=5)
    elif config.head_type == "smooth_l1":
        criterion = nn.SmoothL1Loss(beta=0.5)
    else:
        raise ValueError(f"head_type tidak didukung: {config.head_type}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=config.lr, weight_decay=config.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(config.epochs, 1))
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    best_qwk = -float("inf")
    best_ckpt = output_dir / "best_model.pt"
    epochs_without_improve = 0
    history_rows: list[dict[str, Any]] = []

    for epoch in range(1, config.epochs + 1):
        t0 = time.perf_counter()
        model.train()
        running_loss = 0.0
        seen = 0

        for images, targets in train_loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast(device_type="cuda", enabled=use_amp):
                outputs = model(images)
                loss = _compute_batch_loss(criterion, outputs, targets, config.head_type)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            bs = int(targets.shape[0])
            running_loss += float(loss.item()) * bs
            seen += bs

        scheduler.step()
        train_loss = running_loss / max(seen, 1)
        val_loss, val_raw, val_targets = _collect_outputs(
            model, val_loader, criterion, config.head_type, device, use_amp
        )
        val_probs, val_preds = raw_output_to_predictions(val_raw, head_type=config.head_type)
        val_metrics_epoch = compute_classification_metrics(val_targets, val_preds, probs=val_probs)
        val_qwk = float(val_metrics_epoch["qwk"])
        elapsed = time.perf_counter() - t0

        history_rows.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "val_loss": val_loss,
                "val_qwk": val_qwk,
                "val_macro_f1": float(val_metrics_epoch["macro_f1"]),
                "val_accuracy": float(val_metrics_epoch["accuracy"]),
                "lr": float(optimizer.param_groups[0]["lr"]),
                "epoch_sec": elapsed,
            }
        )

        if val_qwk > best_qwk:
            best_qwk = val_qwk
            epochs_without_improve = 0
            torch.save(model.state_dict(), best_ckpt)
        else:
            epochs_without_improve += 1
            if epochs_without_improve >= config.patience:
                break

    pd.DataFrame(history_rows).to_csv(output_dir / "history.csv", index=False)

    model.load_state_dict(torch.load(best_ckpt, map_location=device, weights_only=True))
    _, val_raw_best, val_targets_best = _collect_outputs(
        model, val_loader, criterion, config.head_type, device, use_amp
    )

    fitted_thresholds: tuple[float, ...] = OptimizedRounder.DEFAULT_THRESHOLDS
    if config.head_type == "smooth_l1":
        rounder = OptimizedRounder()
        fitted_thresholds = rounder.fit(val_raw_best.ravel(), val_targets_best)

    temp_scaler = TemperatureScaler()
    cal_res = temp_scaler.fit(val_raw_best, val_targets_best, head_type=config.head_type)
    val_probs_cal, val_preds_cal = raw_output_to_predictions(
        val_raw_best,
        head_type=config.head_type,
        temperature=cal_res.temperature,
        thresholds=fitted_thresholds,
        smooth_sigma=cal_res.smooth_sigma,
    )
    val_metrics_final = compute_classification_metrics(val_targets_best, val_preds_cal, probs=val_probs_cal)

    summary: dict[str, Any] = {
        "config": config.to_dict(),
        "backend_tag": model.backend_tag,
        "device": str(device),
        "best_val_qwk_uncalibrated": best_qwk,
        "calibration": cal_res.to_dict(),
        "fitted_thresholds": list(fitted_thresholds),
        "val_metrics": val_metrics_final,
        "history_epochs": len(history_rows),
    }

    if evaluate_test:
        test_df = split_df[split_df["split"] == "test"].reset_index(drop=True)
        if len(test_df) > 0:
            test_ds = AptosFundusDataset(
                test_df,
                raw_images_dir=raw_images_dir,
                cache_subdir=cache_subdir,
                preprocess_mode=config.preprocess_mode,
                input_size=config.input_size,
                is_train=False,
                seed=config.seed,
            )
            test_loader = DataLoader(
                test_ds,
                batch_size=config.batch_size,
                shuffle=False,
                num_workers=config.num_workers,
                pin_memory=pin_mem,
            )
            _, test_raw, test_targets = _collect_outputs(
                model, test_loader, criterion, config.head_type, device, use_amp
            )
            test_probs, test_preds = raw_output_to_predictions(
                test_raw,
                head_type=config.head_type,
                temperature=cal_res.temperature,
                thresholds=fitted_thresholds,
                smooth_sigma=cal_res.smooth_sigma,
            )
            summary["test_metrics"] = compute_classification_metrics(test_targets, test_preds, probs=test_probs)

    if export_onnx:
        meta = export_model_to_onnx(
            model=model,
            output_onnx_path=output_dir / "model_best.onnx",
            meta_json_path=output_dir / "model_meta.json",
            preprocess_mode=config.preprocess_mode,
            input_size=config.input_size,
            temperature=cal_res.temperature,
            smooth_sigma=cal_res.smooth_sigma,
            thresholds=fitted_thresholds,
            extra_meta={"experiment_id": config.experiment_id, "val_qwk": float(val_metrics_final["qwk"])},
        )
        summary["onnx_meta"] = meta

    (output_dir / "metrics_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Latih dan evaluasi eksperimen Paket B APTOS 2019.")
    parser.add_argument("--preset", choices=sorted(EXPERIMENT_PRESETS.keys()), default="E1c_clahe")
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--splits-csv", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, default=None)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--val-fold", type=int, default=1)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--evaluate-test", action="store_true")
    parser.add_argument("--export-onnx", action="store_true")
    parser.add_argument("--no-pretrained", action="store_true")
    args = parser.parse_args()

    preset_kwargs = dict(EXPERIMENT_PRESETS[args.preset])
    cfg = TrainConfig(
        experiment_id=args.preset,
        epochs=args.epochs,
        batch_size=args.batch_size,
        val_fold=args.val_fold,
        num_workers=args.num_workers,
        pretrained=not args.no_pretrained,
        **preset_kwargs,
    )
    split_df = pd.read_csv(args.splits_csv)
    summary = run_training_experiment(
        config=cfg,
        split_df=split_df,
        raw_images_dir=args.data_dir / "train_images",
        output_dir=args.output_dir,
        cache_dir=args.cache_dir,
        evaluate_test=args.evaluate_test,
        export_onnx=args.export_onnx,
    )
    print(json.dumps({"experiment": args.preset, "val_metrics": summary["val_metrics"]}, indent=2))


if __name__ == "__main__":
    main()
