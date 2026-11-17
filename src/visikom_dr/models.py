"""Definisi arsitektur model Paket B (ResNet-50, EfficientNet-B0, ConvNeXt-V2-Tiny)."""

from __future__ import annotations

import torch
import torch.nn as nn

try:
    import timm
except ImportError:
    timm = None

import torchvision.models as tvm

SUPPORTED_BACKBONES = ("resnet50", "efficientnet_b0", "convnextv2_tiny")
HEAD_OUT_DIMS = {"ce": 5, "corn": 4, "smooth_l1": 1}

_TIMM_MODEL_CANDIDATES: dict[str, tuple[str, ...]] = {
    "resnet50": ("resnet50.a1_in1k", "resnet50"),
    "efficientnet_b0": ("efficientnet_b0.ra_in1k", "efficientnet_b0"),
    "convnextv2_tiny": ("convnextv2_tiny.fcmae_ft_in22k_in1k_384", "convnextv2_tiny"),
}


def _build_torchvision_feature_extractor(backbone: str, pretrained: bool) -> tuple[nn.Module, int]:
    if backbone == "resnet50":
        weights = tvm.ResNet50_Weights.DEFAULT if pretrained else None
        net = tvm.resnet50(weights=weights)
        extractor = nn.Sequential(*list(net.children())[:-2])
        return extractor, 2048

    if backbone == "efficientnet_b0":
        weights = tvm.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        net = tvm.efficientnet_b0(weights=weights)
        return net.features, 1280

    if backbone == "convnextv2_tiny":
        # Torchvision menyediakan ConvNeXt-Tiny sebagai cadangan lokal bila timm belum terpasang.
        weights = tvm.ConvNeXt_Tiny_Weights.DEFAULT if pretrained else None
        net = tvm.convnext_tiny(weights=weights)
        return net.features, 768

    raise ValueError(f"Backbone tidak didukung: {backbone}")


def _build_feature_extractor(backbone: str, pretrained: bool) -> tuple[nn.Module, int, str]:
    if backbone not in SUPPORTED_BACKBONES:
        raise ValueError(f"Backbone '{backbone}' harus salah satu dari {SUPPORTED_BACKBONES}")

    if timm is not None:
        for candidate in _TIMM_MODEL_CANDIDATES[backbone]:
            try:
                model = timm.create_model(
                    candidate,
                    pretrained=pretrained,
                    num_classes=0,
                    global_pool="",
                )
                return model, int(model.num_features), f"timm:{candidate}"
            except Exception:
                continue

    extractor, feat_dim = _build_torchvision_feature_extractor(backbone, pretrained=pretrained)
    return extractor, feat_dim, f"torchvision:{backbone}"


class RetinaGradingModel(nn.Module):
    """Wrapper klasifikasi retina terpadu dengan penyadap fitur untuk Grad-CAM++ dan ONNX."""

    def __init__(
        self,
        backbone: str = "efficientnet_b0",
        head_type: str = "ce",
        pretrained: bool = True,
        dropout: float = 0.2,
    ) -> None:
        super().__init__()
        if head_type not in HEAD_OUT_DIMS:
            raise ValueError(f"head_type '{head_type}' harus salah satu dari {tuple(HEAD_OUT_DIMS)}")

        self.backbone_name = backbone
        self.head_type = head_type
        self.out_dim = HEAD_OUT_DIMS[head_type]

        self.features, self.feat_dim, self.backend_tag = _build_feature_extractor(
            backbone=backbone,
            pretrained=pretrained,
        )
        # Identity tap menyediakan satu titik hook seragam bagi seluruh arsitektur.
        self.feature_tap = nn.Identity()
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.flatten = nn.Flatten(1)
        self.dropout = nn.Dropout(p=dropout)
        self.head = nn.Linear(self.feat_dim, self.out_dim)

    def extract_spatial_features(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.features(x)
        return self.feature_tap(feat)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.extract_spatial_features(x)
        pooled = self.flatten(self.pool(feat))
        return self.head(self.dropout(pooled))

    def forward_with_cam(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        feat = self.extract_spatial_features(x)
        pooled = self.flatten(self.pool(feat))
        logits = self.head(self.dropout(pooled))
        cam_maps = torch.einsum("bchw,dc->bdhw", feat, self.head.weight)
        return logits, cam_maps
