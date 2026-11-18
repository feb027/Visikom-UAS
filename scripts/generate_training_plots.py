"""Generator grafik hasil audit dataset, kurva pelatihan E1-E3, confusion matrix E4, dan galeri Grad-CAM++."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_JSON = REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "aptos_audit_summary.json"
FULL_DIR = REPO_ROOT / "outputs" / "kaggle_full" / "outputs" / "full"
PLOTS_DIR = REPO_ROOT / "docs" / "assets" / "plots"

# Palet Braun Paper & Graphite agar selaras dengan antarmuka Mydria
BG_PAPER = "#F4F3EE"
BG_PANEL = "#ECEAE2"
BORDER_HAIR = "#D2CFC5"
INK_DARK = "#141413"
INK_MUTED = "#575651"
SIGNAL_ORANGE = "#BD3A08"
EMERALD = "#166534"
COBALT = "#1D4ED8"
AMBER = "#92400E"

CLASS_NAMES = ["0: No DR", "1: Mild", "2: Moderate", "3: Severe", "4: Prolif."]


def _apply_braun_rc() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": BG_PAPER,
            "axes.facecolor": BG_PAPER,
            "axes.edgecolor": BORDER_HAIR,
            "axes.labelcolor": INK_DARK,
            "axes.titlecolor": INK_DARK,
            "xtick.color": INK_MUTED,
            "ytick.color": INK_MUTED,
            "text.color": INK_DARK,
            "font.family": "sans-serif",
            "font.sans-serif": ["DejaVu Sans", "Arial", "Helvetica"],
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": True,
            "grid.color": BORDER_HAIR,
            "grid.linewidth": 0.6,
            "grid.alpha": 0.7,
        }
    )


def plot_dataset_audit() -> Path:
    audit = json.loads(AUDIT_JSON.read_text(encoding="utf-8"))
    by_split = audit["diagnosis_by_split"]
    grades = ["0", "1", "2", "3", "4"]
    train_counts = [by_split["train_cv"][g] for g in grades]
    test_counts = [by_split["test"][g] for g in grades]
    totals = [tr + te for tr, te in zip(train_counts, test_counts)]

    x = np.arange(len(grades))
    width = 0.36

    fig, ax = plt.subplots(figsize=(9.5, 4.6), dpi=220)
    b1 = ax.bar(x - width / 2, train_counts, width, label=f"Train-CV Fold 1-4 ({sum(train_counts):,})", color=INK_DARK)
    b2 = ax.bar(x + width / 2, test_counts, width, label=f"Held-Out Test Fold 0 ({sum(test_counts):,})", color=SIGNAL_ORANGE)

    for rect, tr, tot in zip(b1, train_counts, totals):
        ax.text(
            rect.get_x() + rect.get_width() / 2,
            rect.get_height() + 24,
            f"{tr}",
            ha="center",
            va="bottom",
            fontsize=8.5,
            fontweight="bold",
            color=INK_DARK,
        )
    for rect, te in zip(b2, test_counts):
        ax.text(
            rect.get_x() + rect.get_width() / 2,
            rect.get_height() + 24,
            f"{te}",
            ha="center",
            va="bottom",
            fontsize=8.5,
            fontweight="bold",
            color=SIGNAL_ORANGE,
        )

    ax.set_xticks(x)
    ax.set_xticklabels(CLASS_NAMES, fontsize=9.5)
    ax.set_ylabel("Jumlah Citra Fundus", fontsize=10)
    ax.set_ylim(0, max(train_counts) * 1.18)
    ax.set_title(
        "Distribusi Kelas APTOS 2019 Pasca-Audit Bebas Kebocoran Duplikat\n"
        f"3.662 citra valid · 3.423 klaster unik · {audit['num_duplicate_clusters']} duplikat · "
        f"{audit['num_label_conflict_clusters']} konflik label",
        loc="left",
        fontsize=10.5,
        fontweight="bold",
        pad=12,
    )
    ax.legend(frameon=False, loc="upper right", fontsize=9)
    fig.tight_layout()

    out = PLOTS_DIR / "01-aptos-dataset-audit.png"
    fig.savefig(out, dpi=220, facecolor=BG_PAPER)
    plt.close(fig)
    return out


def plot_training_curves() -> Path:
    fig, axes = plt.subplots(1, 3, figsize=(15.0, 4.6), dpi=220, sharey=True)

    e1_series = [
        ("E1d_bengraham", "ben_graham (0.8942)", SIGNAL_ORANGE, 2.4, "-"),
        ("E1c_clahe", "lab_clahe (0.8938)", EMERALD, 1.9, "-"),
        ("E1b_crop", "crop_only (0.8828)", COBALT, 1.7, "--"),
        ("E1a_raw", "raw_resize (0.8786)", INK_MUTED, 1.6, ":"),
    ]
    for folder, label, color, lw, ls in e1_series:
        df = pd.read_csv(FULL_DIR / folder / "history.csv")
        axes[0].plot(df["epoch"], df["val_qwk"], label=label, color=color, linewidth=lw, linestyle=ls, marker="o", markersize=3)
    axes[0].set_title("01 / E1: Ablasi Prapemrosesan\n(EfficientNet-B0 · 15 Epoch)", loc="left", fontsize=10, fontweight="bold")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Validation QWK")
    axes[0].legend(frameon=False, fontsize=8, loc="lower right")

    e2_series = [
        ("E2_convnextv2", "ConvNeXt-V2-Tiny (0.8914)", SIGNAL_ORANGE, 2.4, "-"),
        ("E2_effb0", "EfficientNet-B0 (0.8740)", COBALT, 1.9, "-"),
        ("E2_resnet50", "ResNet-50 (0.8730)", INK_DARK, 1.8, "--"),
    ]
    for folder, label, color, lw, ls in e2_series:
        df = pd.read_csv(FULL_DIR / folder / "history.csv")
        axes[1].plot(df["epoch"], df["val_qwk"], label=label, color=color, linewidth=lw, linestyle=ls, marker="o", markersize=3)
    axes[1].set_title("02 / E2: Perbandingan 3 Arsitektur\n(Ben Graham · 384 x 384 px)", loc="left", fontsize=10, fontweight="bold")
    axes[1].set_xlabel("Epoch")
    axes[1].legend(frameon=False, fontsize=8, loc="lower right")

    e3_series = [
        ("E3d_smooth_l1", "SmoothL1 + Nelder-Mead (0.9082)", SIGNAL_ORANGE, 2.4, "-"),
        ("E3c_corn", "CORN Ordinal (0.9037)", EMERALD, 1.9, "-"),
        ("E3a_ce_plain", "CrossEntropy Polos (0.8889)", COBALT, 1.7, "--"),
        ("E3b_ce_single_weight", "CE Single-Weight (0.8861)", INK_MUTED, 1.6, ":"),
    ]
    for folder, label, color, lw, ls in e3_series:
        df = pd.read_csv(FULL_DIR / folder / "history.csv")
        axes[2].plot(df["epoch"], df["val_qwk"], label=label, color=color, linewidth=lw, linestyle=ls, marker="o", markersize=3)
    axes[2].set_title("03 / E3: Ablasi Fungsi Loss\n(ConvNeXt-V2-Tiny · Fold 1-4)", loc="left", fontsize=10, fontweight="bold")
    axes[2].set_xlabel("Epoch")
    axes[2].legend(frameon=False, fontsize=8, loc="lower right")

    for ax in axes:
        ax.set_xlim(1, 15.3)
        ax.set_xticks([1, 3, 5, 7, 9, 11, 13, 15])
        ax.set_ylim(0.68, 0.93)

    fig.suptitle(
        "Kurva Konvergensi Validation QWK Pelatihan Penuh Kaggle GPU T4 (E1, E2, dan E3)",
        x=0.015,
        ha="left",
        fontsize=12,
        fontweight="bold",
        y=0.99,
    )
    fig.tight_layout(rect=[0, 0, 1, 0.94])

    out = PLOTS_DIR / "02-training-validation-qwk-curves.png"
    fig.savefig(out, dpi=220, facecolor=BG_PAPER)
    plt.close(fig)
    return out


def plot_loss_and_e4_evaluation() -> tuple[Path, Path]:
    # Grafik tambahan Loss E2 (ResNet-50 vs EfficientNet-B0 vs ConvNeXt-V2-Tiny) + Loss E3d
    fig_loss, ax_loss = plt.subplots(figsize=(9.5, 4.4), dpi=220)
    loss_runs = [
        ("E2_convnextv2", "ConvNeXt-V2-Tiny", SIGNAL_ORANGE, "-"),
        ("E2_effb0", "EfficientNet-B0", COBALT, "-"),
        ("E2_resnet50", "ResNet-50", INK_DARK, "--"),
    ]
    for folder, label, color, ls in loss_runs:
        df = pd.read_csv(FULL_DIR / folder / "history.csv")
        ax_loss.plot(df["epoch"], df["train_loss"], color=color, linestyle=":", linewidth=1.4, alpha=0.75, label=f"{label} Train")
        ax_loss.plot(df["epoch"], df["val_loss"], color=color, linestyle=ls, linewidth=2.2, marker="o", markersize=3, label=f"{label} Val")

    ax_loss.set_title(
        "Kurva Cross-Entropy Loss Train vs Validasi Lintas Arsitektur (E2 · Ben Graham 384 px)",
        loc="left",
        fontsize=11,
        fontweight="bold",
        pad=10,
    )
    ax_loss.set_xlabel("Epoch")
    ax_loss.set_ylabel("Loss")
    ax_loss.set_xticks([1, 3, 5, 7, 9, 11, 13, 15])
    ax_loss.legend(frameon=False, ncol=3, fontsize=8, loc="upper right")
    fig_loss.tight_layout()
    loss_out = PLOTS_DIR / "03-e2-train-val-loss-curves.png"
    fig_loss.savefig(loss_out, dpi=220, facecolor=BG_PAPER)
    plt.close(fig_loss)

    # Confusion Matrix & Per-Class Metrics E4 (Held-Out Fold 0, 733 citra)
    e4 = json.loads((FULL_DIR / "E4_heldout_test_metrics.json").read_text(encoding="utf-8"))
    cm = np.asarray(e4["confusion_matrix"], dtype=np.float64)
    cm_row_norm = cm / np.maximum(cm.sum(axis=1, keepdims=True), 1.0)

    fig_e4, (ax_cm, ax_bar) = plt.subplots(1, 2, figsize=(13.5, 5.2), dpi=220, gridspec_kw={"width_ratios": [1.05, 1.0]})

    im = ax_cm.imshow(cm_row_norm, cmap="Oranges", vmin=0.0, vmax=1.0)
    short_labels = ["0 No DR", "1 Mild", "2 Mod.", "3 Sev.", "4 Prolif."]
    ax_cm.set_xticks(np.arange(5))
    ax_cm.set_yticks(np.arange(5))
    ax_cm.set_xticklabels(short_labels, fontsize=9)
    ax_cm.set_yticklabels(short_labels, fontsize=9)
    ax_cm.set_xlabel("Prediksi Model", fontsize=9.5, fontweight="bold")
    ax_cm.set_ylabel("Label Aktual Dokter", fontsize=9.5, fontweight="bold")
    ax_cm.grid(False)
    for r in range(5):
        for c in range(5):
            val = int(cm[r, c])
            pct = cm_row_norm[r, c] * 100.0
            txt_color = "#FFFFFF" if cm_row_norm[r, c] > 0.55 else INK_DARK
            ax_cm.text(c, r, f"{val}\n({pct:.0f}%)", ha="center", va="center", fontsize=8.5, fontweight="bold", color=txt_color)

    ref = e4["referable_dr"]
    ax_cm.set_title(
        "Confusion Matrix Held-Out Test (Fold 0 · 733 Citra)\n"
        f"QWK = {e4['qwk']:.4f} | Referable AUROC = {ref['auroc']:.4f} (Sens {ref['sensitivity']*100:.1f}%, Spec {ref['specificity']*100:.1f}%)",
        loc="left",
        fontsize=10,
        fontweight="bold",
        pad=10,
    )
    cbar = fig_e4.colorbar(im, ax=ax_cm, fraction=0.044, pad=0.03)
    cbar.ax.tick_params(labelsize=8)
    cbar.set_label("Proporsi per Kelas Aktual", fontsize=8.5)

    grades = ["0", "1", "2", "3", "4"]
    prec = [e4["per_class"][g]["precision"] for g in grades]
    rec = [e4["per_class"][g]["recall"] for g in grades]
    f1 = [e4["per_class"][g]["f1"] for g in grades]
    supp = [e4["per_class"][g]["support"] for g in grades]

    x = np.arange(5)
    w = 0.25
    ax_bar.bar(x - w, prec, w, label="Precision", color=INK_DARK)
    ax_bar.bar(x, rec, w, label="Recall", color=COBALT)
    bars_f1 = ax_bar.bar(x + w, f1, w, label="F1-Score", color=SIGNAL_ORANGE)
    for rect, val in zip(bars_f1, f1):
        ax_bar.text(rect.get_x() + rect.get_width() / 2, val + 0.02, f"{val:.2f}", ha="center", va="bottom", fontsize=7.8, fontweight="bold", color=SIGNAL_ORANGE)

    ax_bar.set_xticks(x)
    ax_bar.set_xticklabels([f"{lbl}\n(n={n})" for lbl, n in zip(short_labels, supp)], fontsize=8.5)
    ax_bar.set_ylim(0, 1.12)
    ax_bar.set_ylabel("Skor Metrik (0 - 1)")
    ax_bar.set_title(
        "Evaluasi Per Kelas Model Final (ConvNeXt-V2-Tiny + SmoothL1)\n"
        f"Accuracy = {e4['accuracy']*100:.2f}% | Macro-F1 = {e4['macro_f1']:.4f} | Weighted-F1 = {e4['weighted_f1']:.4f}",
        loc="left",
        fontsize=10,
        fontweight="bold",
        pad=10,
    )
    ax_bar.legend(frameon=False, loc="upper right", fontsize=8.5)

    fig_e4.tight_layout()
    e4_out = PLOTS_DIR / "04-e4-confusion-matrix-and-per-class.png"
    fig_e4.savefig(e4_out, dpi=220, facecolor=BG_PAPER)
    plt.close(fig_e4)
    return loss_out, e4_out


def plot_gradcam_strip() -> Path:
    samples = [
        ("grade_0_0125fbd2e791_gradcam.png", "Grade 0: No DR\n(0125fbd2e791)", INK_MUTED),
        ("grade_1_04ac765f91a1_gradcam.png", "Grade 1: Mild\n(04ac765f91a1)", COBALT),
        ("grade_2_000c1434d8d7_gradcam.png", "Grade 2: Moderate\n(000c1434d8d7)", SIGNAL_ORANGE),
        ("grade_3_0104b032c141_gradcam.png", "Grade 3: Severe\n(0104b032c141)", SIGNAL_ORANGE),
        ("grade_4_0083ee8054ee_gradcam.png", "Grade 4: Prolif. DR\n(0083ee8054ee)", SIGNAL_ORANGE),
    ]
    fig, axes = plt.subplots(1, 5, figsize=(15.0, 3.6), dpi=220)
    for ax, (fname, title, color) in zip(axes, samples):
        img = Image.open(FULL_DIR / "gradcam_samples" / fname).convert("RGB")
        ax.imshow(img)
        ax.set_title(title, fontsize=9, fontweight="bold", color=color, pad=6)
        ax.axis("off")

    fig.suptitle(
        "Galeri Aktivasi Spasial Grad-CAM++ Model Final (ConvNeXt-V2-Tiny · 5 Sampel Held-Out Fold 0)",
        x=0.015,
        ha="left",
        fontsize=11,
        fontweight="bold",
        y=0.97,
    )
    fig.tight_layout(rect=[0, 0, 1, 0.90])
    out = PLOTS_DIR / "05-gradcam-grade0-to-grade4.png"
    fig.savefig(out, dpi=220, facecolor=BG_PAPER)
    plt.close(fig)
    return out


def main() -> None:
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    _apply_braun_rc()
    p1 = plot_dataset_audit()
    p2 = plot_training_curves()
    p3, p4 = plot_loss_and_e4_evaluation()
    p5 = plot_gradcam_strip()
    for p in (p1, p2, p3, p4, p5):
        print(f"Tersimpan: {p.relative_to(REPO_ROOT).as_posix()}")


if __name__ == "__main__":
    main()
