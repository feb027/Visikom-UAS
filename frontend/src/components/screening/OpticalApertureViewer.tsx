import { type ChangeEvent, type DragEvent, useId, useRef, useState } from "react";
import { Maximize2, Plus, ScanEye } from "lucide-react";
import type { DemoExample, PredictionResult, ViewerLayerKey } from "../../types/mydria";
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
  examples: DemoExample[];
  prediction: PredictionResult | null;
  selectedName: string;
  rejectedPreviewUrl: string | null;
  activeLayer: ViewerLayerKey;
  onSelectLayer: (layer: ViewerLayerKey) => void;
  onSelectFile: (file: File) => void;
  onSelectExample: (ex: DemoExample) => void;
  isLoading: boolean;
  loadingStep: number;
}

export function OpticalApertureViewer({
  examples,
  prediction,
  selectedName,
  rejectedPreviewUrl,
  activeLayer,
  onSelectLayer,
  onSelectFile,
  onSelectExample,
  isLoading,
  loadingStep,
}: OpticalApertureViewerProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sliderId = useId();

  const layers = prediction?.accepted ? prediction.viewer_layers : null;
  const originalImageUrl = layers?.original_crop ?? rejectedPreviewUrl;
  const processedImageUrl = layers ? layers[activeLayer] : null;
  const showSplit = Boolean(layers && activeLayer !== "original_crop");
  const activeLayerLabel = LAYER_OPTIONS.find((item) => item.key === activeLayer)?.label ?? "Pratinjau";

  const openFilePicker = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelectFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onSelectFile(file);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative mx-auto w-full max-w-[236px] sm:max-w-[360px]">
        {layers ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label="Perbesar citra fundus retina"
            className="absolute -top-1 -right-2 z-10 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-recessed)] hover:text-[var(--text-primary)]"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`braun-aperture-bezel relative flex items-center justify-center transition-opacity ${
            isDragging ? "opacity-80" : ""
          }`}
        >
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[#07080A]">
            {isLoading ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-5 text-center">
                <progress
                  aria-label="Memproses analisis citra fundus"
                  className="h-1.5 w-32 overflow-hidden rounded-full accent-[#FF6B35]"
                />
                <ol className="m-0 list-none space-y-1 p-0 text-left text-[11px]">
                  {LOADING_STEPS.map((step, i) => (
                    <li
                      key={step}
                      className={i <= loadingStep ? "font-semibold text-[#F2F1EC]" : "text-[#A6A49B]"}
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ) : layers && processedImageUrl && originalImageUrl ? (
              <>
                <img
                  src={originalImageUrl}
                  alt="Citra fundus retina asli"
                  className="pointer-events-none block h-full w-full select-none object-cover object-center"
                />
                {showSplit ? (
                  <>
                    <img
                      src={processedImageUrl}
                      alt={`Citra fundus mode ${activeLayerLabel}`}
                      className="pointer-events-none absolute inset-0 block h-full w-full select-none object-cover object-center"
                      style={{ clipPath: `inset(0 0 0 ${splitPercent}%)` }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/90"
                      style={{ left: `${splitPercent}%` }}
                    >
                      <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#07080A]/80" />
                    </div>
                    <label htmlFor={sliderId} className="sr-only-static">
                      Geser garis pembanding Asli dengan {activeLayerLabel}
                    </label>
                    <input
                      id={sliderId}
                      type="range"
                      min={4}
                      max={96}
                      value={splitPercent}
                      aria-valuetext={`${splitPercent}% Asli, ${100 - splitPercent}% ${activeLayerLabel}`}
                      onChange={(e) => setSplitPercent(Number(e.target.value))}
                      className="split-range-input absolute inset-0 z-20 h-full w-full"
                    />
                  </>
                ) : null}
              </>
            ) : originalImageUrl ? (
              <img
                src={originalImageUrl}
                alt="Pratinjau citra yang ditolak gerbang kualitas"
                className="block h-full w-full object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={openFilePicker}
                aria-label="Pilih atau jatuhkan berkas foto fundus"
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-5 text-center"
              >
                <ScanEye className="h-8 w-8 text-[#FF6B35]" aria-hidden="true" />
                <span className="max-w-[170px] text-xs font-medium text-[#F2F1EC]">
                  Ketuk atau jatuhkan foto fundus PNG/JPG
                </span>
                <span className="text-[11px] text-[#A6A49B]">atau pilih contoh di bawah</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rel 4 lingkaran proporsional: 3 contoh retina penuh + 1 tombol unggah berkas */}
      <div className="flex items-center justify-center gap-3 sm:gap-3.5">
        {examples.map((ex) => {
          const isSelected = selectedName === ex.label;
          return (
            <button
              key={ex.id}
              type="button"
              disabled={isLoading || !ex.available}
              onClick={() => onSelectExample(ex)}
              aria-label={`Uji ${ex.label}`}
              aria-pressed={isSelected}
              className={`h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[#07080A] p-0.5 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45 sm:h-14 sm:w-14 ${
                isSelected
                  ? "ring-2 ring-[var(--accent-signal)] ring-offset-2 ring-offset-[var(--bg-canvas)]"
                  : "border border-[var(--border-hairline)]"
              }`}
            >
              <img
                src={ex.image_url}
                alt={ex.short_label}
                className="h-full w-full rounded-full object-cover"
              />
            </button>
          );
        })}

        <button
          type="button"
          onClick={openFilePicker}
          disabled={isLoading}
          aria-label="Unggah berkas citra fundus PNG atau JPG"
          className="flex h-12 w-12 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full border border-dashed border-[var(--text-secondary)] bg-transparent text-[var(--text-primary)] transition-colors hover:border-[var(--accent-signal)] hover:text-[var(--accent-signal)] disabled:cursor-not-allowed disabled:opacity-45 sm:h-14 sm:w-14"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="mt-0.5 text-[10px] font-medium leading-none">Unggah</span>
        </button>

        <input
          ref={fileInputRef}
          id="fundus-file-input"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
      </div>

      {/* Pemilih lapisan segmen bergaya garis bawah Braun */}
      <div className="border-t border-[var(--border-hairline)] pt-1.5">
        <div
          role="tablist"
          aria-label="Lapisan visualisasi fundus"
          className="grid grid-cols-4 divide-x divide-[var(--border-hairline)]"
        >
          {LAYER_OPTIONS.map((opt, idx) => {
            const active = activeLayer === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={!layers}
                onClick={() => onSelectLayer(opt.key)}
                onKeyDown={(e) => handleRovingTabKeyDown(e, LAYER_OPTIONS, idx, (next) => onSelectLayer(next.key))}
                className={`relative min-h-10 cursor-pointer px-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs ${
                  active
                    ? "font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{opt.label}</span>
                {active && layers ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-[2px] bg-[var(--accent-signal)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <ModalSheet
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title={`${selectedName} (${activeLayerLabel})`}
      >
        {processedImageUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[14px] border border-[var(--border-hairline)] bg-[#07080A] p-2">
              <img
                src={processedImageUrl}
                alt={`Perbesaran fundus ${activeLayerLabel}`}
                className="mx-auto max-h-[60dvh] w-full max-w-[460px] object-contain"
              />
            </div>
            <p className="m-0 text-xs text-[var(--text-secondary)]">
              Resolusi analisis 384 x 384 piksel. Warna hangat pada mode Grad-CAM++ menandai area yang paling memengaruhi penilaian model.
            </p>
          </div>
        ) : null}
      </ModalSheet>
    </div>
  );
}
