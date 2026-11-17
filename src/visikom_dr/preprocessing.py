"""Modul prapemrosesan citra fundus retina untuk pelatihan dan inferensi terpadu."""

from __future__ import annotations

import cv2
import numpy as np


def _pad_to_square(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    side = max(h, w)
    top = (side - h) // 2
    bottom = side - h - top
    left = (side - w) // 2
    right = side - w - left
    return cv2.copyMakeBorder(
        image,
        top,
        bottom,
        left,
        right,
        borderType=cv2.BORDER_CONSTANT,
        value=0,
    )


def circular_roi_crop(rgb: np.ndarray, tol: int = 7) -> tuple[np.ndarray, np.ndarray]:
    """Potong latar hitam menggunakan kontur retina terbesar lalu beri padding persegi 1:1."""
    if rgb.ndim != 3 or rgb.shape[2] != 3:
        raise ValueError(f"Masukan wajib berbentuk citra RGB 3 kanal, diterima {rgb.shape}")

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    thresh = (gray > tol).astype(np.uint8) * 255
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) >= 16.0:
            x, y, w, h = cv2.boundingRect(largest)
            cropped_rgb = rgb[y : y + h, x : x + w].copy()
            # Mengisi kontur penuh menjaga area lesi gelap di dalam cakram tidak ikut terhapus.
            mask = np.zeros((h, w), dtype=np.uint8)
            shifted = largest - np.array([[[x, y]]], dtype=largest.dtype)
            cv2.drawContours(mask, [shifted], -1, 255, thickness=-1)
            cropped_rgb[mask == 0] = 0
            return _pad_to_square(cropped_rgb), _pad_to_square(mask)

    fallback_mask = thresh
    return _pad_to_square(rgb.copy()), _pad_to_square(fallback_mask)


def resize_square(image: np.ndarray, size: int = 384) -> np.ndarray:
    """Ubah ukuran citra persegi atau masker ke dimensi sisi target."""
    if image.shape[0] == size and image.shape[1] == size:
        return image.copy()
    if image.ndim == 2:
        interp = cv2.INTER_NEAREST
    elif image.shape[0] >= size:
        interp = cv2.INTER_AREA
    else:
        interp = cv2.INTER_CUBIC
    return cv2.resize(image, (size, size), interpolation=interp)


def apply_lab_clahe(
    rgb_square: np.ndarray,
    mask: np.ndarray | None = None,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Tingkatkan kontras lokal hanya pada kanal luminansi L CIELAB agar warna lesi terjaga."""
    lab = cv2.cvtColor(rgb_square, cv2.COLOR_RGB2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    l_eq = clahe.apply(l_ch)
    merged = cv2.merge((l_eq, a_ch, b_ch))
    out = cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)
    if mask is not None:
        out[mask == 0] = 0
    return out


def apply_ben_graham(
    rgb_square: np.ndarray,
    mask: np.ndarray | None = None,
    sigma_ratio: float = 1.0 / 30.0,
    inner_mask_scale: float = 0.90,
) -> np.ndarray:
    """Terapkan pengurangan rerata lokal Gaussian (4*I - 4*G_sigma*I + 128) beserta masker tepi."""
    sigma = max(1.0, float(rgb_square.shape[0]) * sigma_ratio)
    img_f = rgb_square.astype(np.float32)
    blurred = cv2.GaussianBlur(img_f, (0, 0), sigmaX=sigma, sigmaY=sigma)
    enhanced = np.clip(4.0 * img_f - 4.0 * blurred + 128.0, 0.0, 255.0).astype(np.uint8)

    if mask is not None and np.any(mask > 0):
        ys, xs = np.where(mask > 0)
        pts = np.column_stack((xs, ys)).astype(np.float32)
        (cx, cy), radius = cv2.minEnclosingCircle(pts)
        inner_radius = max(1, int(round(radius * inner_mask_scale)))
        inner_circle = np.zeros_like(mask, dtype=np.uint8)
        cv2.circle(inner_circle, (int(round(cx)), int(round(cy))), inner_radius, 255, thickness=-1)
        valid_mask = (mask > 0) & (inner_circle > 0)
        enhanced[~valid_mask] = 0
    return enhanced


def preprocess_fundus(rgb: np.ndarray, mode: str = "lab_clahe", size: int = 384) -> np.ndarray:
    """Jalankan pipeline prapemrosesan terstandar untuk eksperimen E1 dan inferensi API."""
    if mode == "raw_resize":
        return resize_square(rgb, size=size)

    cropped, mask = circular_roi_crop(rgb)
    cropped_sq = resize_square(cropped, size=size)
    mask_sq = resize_square(mask, size=size)

    if mode == "crop_only":
        return cropped_sq
    if mode == "lab_clahe":
        return apply_lab_clahe(cropped_sq, mask=mask_sq)
    if mode == "ben_graham":
        return apply_ben_graham(cropped_sq, mask=mask_sq)
    raise ValueError(f"Mode prapemrosesan tidak dikenal: {mode}")
