"""Gerbang kualitas dan verifikasi domain citra fundus berbasis OpenCV."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import cv2
import numpy as np

from visikom_dr.preprocessing import circular_roi_crop, resize_square


@dataclass(frozen=True)
class FundusQualityReport:
    accepted: bool
    rejection_code: str | None
    blur_warning: bool
    laplacian_variance: float
    roi_area_ratio: float
    red_blue_ratio: float
    red_green_ratio: float
    message_id: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def assess_fundus_quality(
    rgb: np.ndarray,
    min_side: int = 128,
    blur_threshold: float = 25.0,
) -> FundusQualityReport:
    """Validasi apakah citra merupakan foto fundus retina yang layak diprediksi."""
    if not isinstance(rgb, np.ndarray) or rgb.ndim != 3 or rgb.shape[2] != 3:
        return FundusQualityReport(
            accepted=False,
            rejection_code="image_too_small_or_invalid",
            blur_warning=False,
            laplacian_variance=0.0,
            roi_area_ratio=0.0,
            red_blue_ratio=0.0,
            red_green_ratio=0.0,
            message_id="Format berkas tidak valid. Unggah citra RGB berkanal 3 (PNG atau JPG).",
        )

    h, w = rgb.shape[:2]
    if min(h, w) < min_side:
        return FundusQualityReport(
            accepted=False,
            rejection_code="image_too_small_or_invalid",
            blur_warning=False,
            laplacian_variance=0.0,
            roi_area_ratio=0.0,
            red_blue_ratio=0.0,
            red_green_ratio=0.0,
            message_id=f"Resolusi citra terlalu kecil ({w}x{h} piksel). Minimal sisi terpendek {min_side} piksel.",
        )

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    bright = (gray > 12).astype(np.uint8) * 255
    contours, _ = cv2.findContours(bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return FundusQualityReport(
            accepted=False,
            rejection_code="not_retinal_fundus",
            blur_warning=False,
            laplacian_variance=0.0,
            roi_area_ratio=0.0,
            red_blue_ratio=0.0,
            red_green_ratio=0.0,
            message_id="Citra terlalu gelap dan tidak memuat wilayah cakram fundus retina.",
        )

    largest = max(contours, key=cv2.contourArea)
    roi_area_ratio = float(cv2.contourArea(largest)) / float(h * w)
    contour_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(contour_mask, [largest], -1, 255, thickness=-1)
    roi_pixels = rgb[contour_mask > 0]

    if roi_area_ratio < 0.15 or roi_pixels.size == 0:
        return FundusQualityReport(
            accepted=False,
            rejection_code="not_retinal_fundus",
            blur_warning=False,
            laplacian_variance=0.0,
            roi_area_ratio=roi_area_ratio,
            red_blue_ratio=0.0,
            red_green_ratio=0.0,
            message_id="Proporsi wilayah terang terlalu kecil untuk citra fundus retina.",
        )

    mean_r = float(np.mean(roi_pixels[:, 0]))
    mean_g = float(np.mean(roi_pixels[:, 1]))
    mean_b = float(np.mean(roi_pixels[:, 2]))
    red_blue_ratio = mean_r / max(mean_b, 1.0)
    red_green_ratio = mean_r / max(mean_g, 1.0)

    if red_blue_ratio < 1.25 or red_green_ratio < 1.03:
        return FundusQualityReport(
            accepted=False,
            rejection_code="not_retinal_fundus",
            blur_warning=False,
            laplacian_variance=0.0,
            roi_area_ratio=roi_area_ratio,
            red_blue_ratio=red_blue_ratio,
            red_green_ratio=red_green_ratio,
            message_id=(
                "Citra tidak memenuhi ciri spektrum fundus retina (rasio kanal merah terhadap biru/hijau "
                "di luar ambang). Unggah foto retina atau pilih citra contoh APTOS 2019."
            ),
        )

    cropped, roi_mask = circular_roi_crop(rgb)
    cropped_384 = resize_square(cropped, size=384)
    mask_384 = resize_square(roi_mask, size=384)

    # Menyusutkan masker ke 85% radius mencegah tepi hitam-retina memalsukan skor ketajaman.
    ys, xs = np.where(mask_384 > 0)
    pts = np.column_stack((xs, ys)).astype(np.float32)
    (cx, cy), radius = cv2.minEnclosingCircle(pts)
    inner_mask = np.zeros_like(mask_384, dtype=np.uint8)
    cv2.circle(inner_mask, (int(round(cx)), int(round(cy))), max(1, int(round(radius * 0.85))), 255, thickness=-1)
    eval_mask = (mask_384 > 0) & (inner_mask > 0)

    gray_384 = cv2.cvtColor(cropped_384, cv2.COLOR_RGB2GRAY)
    lap = cv2.Laplacian(gray_384, cv2.CV_64F)
    lap_var = float(np.var(lap[eval_mask])) if np.any(eval_mask) else float(np.var(lap))
    blur_warning = lap_var < blur_threshold

    if blur_warning:
        msg = "Citra fundus diterima dengan peringatan: ketajaman rendah (indikasi buram)."
    else:
        msg = "Citra fundus valid dan memenuhi ambang ketajaman awal."

    return FundusQualityReport(
        accepted=True,
        rejection_code=None,
        blur_warning=blur_warning,
        laplacian_variance=lap_var,
        roi_area_ratio=roi_area_ratio,
        red_blue_ratio=red_blue_ratio,
        red_green_ratio=red_green_ratio,
        message_id=msg,
    )
