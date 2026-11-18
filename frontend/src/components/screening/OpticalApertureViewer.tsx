import { useState } from "react";
import { Maximize2, ScanEye } from "lucide-react";
import type { PredictionResult, ViewerLayerKey } from "../../types/mydria";
import { LOADING_STEPS } from "../../hooks/useScreening";
import { handleRovingTabKeyDown } from "../../utils/tabKeyboard";
import { ModalSheet } from "../common/ModalSheet";

const LAYER_OPTIONS: Array<{ key: ViewerLayerKey; label: string }> = [
  { key: "original_crop", label: "Asli" },
  { key: "lab_clahe", label: "Lab-CLAHE" },
  { key: "ben_graham", label: "Ben Graham" },
  { key: "gradcam_overlay", label: "Grad-CAM++" },
];

interface OpticalApertureViewerProps {
  prediction: PredictionResult | null;
  selectedName: string;
  rejectedPreviewUrl: string | null;
  activeLayer: ViewerLayerKey;
  onSelectLayer: (layer: ViewerLayerKey) => void;
  isLoading: boolean;
  loadingStep: number;
}

export function OpticalApertureViewer({
  prediction,
  selectedName,
  rejectedPreviewUrl,
  activeLayer,
  onSelectLayer,
  isLoading,
  loadingStep,
}: OpticalApertureViewerProps) {
  const [zoomOpen, setZoomOpen] = useState(false);

  const activeImageUrl = prediction?.accepted && prediction.viewer_layers
    ? prediction.viewer_layers[activeLayer]
    : rejectedPreviewUrl;

  const activeLayerLabel =
    LAYER_OPTIONS.find((item) => item.key === activeLayer)?.label ?? "Pratinjau";

  return (
    <section className="optical-aperture-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-xs font-medium text-[#A1A1AA]">Penampil Optik Retina</p>
          <p className="m-0 truncate text-sm font-semibold text-[#F5F5F7]">
            {selectedName || "Belum ada citra terpilih"}
          </p>
        </div>

        {prediction?.accepted && activeImageUrl ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label="Perbesar citra fundus retina"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[12px] border border-[#2A2E3B] bg-[#16181F] text-[#F5F5F7] hover:bg-[#242731]"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="optical-aperture-frame relative">
        {isLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <progress
              aria-label="Memproses analisis citra fundus"
              className="h-2 w-48 overflow-hidden rounded-full accent-[#0A84FF]"
            />
            <ol className="m-0 list-none space-y-1.5 p-0 text-left text-xs">
              {LOADING_STEPS.map((step, i) => (
                <li
                  key={step}
                  className={i <= loadingStep ? "font-semibold text-[#F5F5F7]" : "text-[#A1A1AA]"}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : activeImageUrl ? (
          <img
            src={activeImageUrl}
            alt={`Citra fundus retina mode ${activeLayerLabel}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <ScanEye className="h-10 w-10 text-[#0A84FF]" aria-hidden="true" />
            <p className="m-0 max-w-[240px] text-xs text-[#A1A1AA]">
              Unggah foto kamera fundus retina (PNG atau JPG) atau pilih salah satu contoh APTOS 2019 di bawah.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div
          role="tablist"
          aria-label="Lapisan visualisasi fundus"
          className="grid grid-cols-4 gap-1 rounded-[8px] bg-[#16181F] p-1"
        >
          {LAYER_OPTIONS.map((opt, idx) => {
            const active = activeLayer === opt.key;
            const disabled = !prediction?.accepted;
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onSelectLayer(opt.key)}
                onKeyDown={(e) => handleRovingTabKeyDown(e, LAYER_OPTIONS, idx, (next) => onSelectLayer(next.key))}
                className={`min-h-10 cursor-pointer rounded-[6px] px-1.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs ${
                  active
                    ? "bg-[#242731] text-[#F5F5F7]"
                    : "text-[#A1A1AA] hover:text-[#F5F5F7]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {prediction?.accepted && activeLayer === "gradcam_overlay" ? (
          <p className="m-0 mt-2 text-[11px] text-[#A1A1AA]">
            Peta Grad-CAM++ menyorot wilayah aktivasi model; bukan segmentasi batas lesi klinis piksel-presisi.
          </p>
        ) : null}
      </div>

      <ModalSheet
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title={`${selectedName} (${activeLayerLabel})`}
      >
        {activeImageUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[12px] border border-[#2A2E3B] bg-[#050608]">
              <img
                src={activeImageUrl}
                alt={`Perbesaran fundus ${activeLayerLabel}`}
                className="mx-auto aspect-square w-full max-w-[540px] object-contain"
              />
            </div>
            <p className="m-0 text-xs text-[var(--text-secondary)]">
              Resolusi inferensi 384 x 384 piksel setelah pemotongan bidang bundar retina.
            </p>
          </div>
        ) : null}
      </ModalSheet>
    </section>
  );
}
