import { type ChangeEvent, type DragEvent, useId, useState } from "react";
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
  const sliderId = useId();

  const layers = prediction?.accepted ? prediction.viewer_layers : null;
  const originalImageUrl = layers?.original_crop ?? rejectedPreviewUrl;
  const processedImageUrl = layers ? layers[activeLayer] : null;
  const showSplit = Boolean(layers && activeLayer !== "original_crop");
  const activeLayerLabel = LAYER_OPTIONS.find((item) => item.key === activeLayer)?.label ?? "Pratinjau";

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
    <div className="space-y-5">
      <div className="relative mx-auto w-full max-w-[288px] sm:max-w-[368px]">
        {layers ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label="Perbesar citra fundus retina"
            className="absolute top-0 right-0 z-10 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-recessed)] hover:text-[var(--text-primary)]"
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
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <progress
                  aria-label="Memproses analisis citra fundus"
                  className="h-1.5 w-36 overflow-hidden rounded-full accent-[#FF6B35]"
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
                  className="pointer-events-none block h-full w-full select-none object-contain"
                />
                {showSplit ? (
                  <>
                    <img
                      src={processedImageUrl}
                      alt={`Citra fundus mode ${activeLayerLabel}`}
                      className="pointer-events-none absolute inset-0 block h-full w-full select-none object-contain"
                      style={{ clipPath: `inset(0 0 0 ${splitPercent}%)` }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/90"
                      style={{ left: `${splitPercent}%` }}
                    >
                      <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#07080A]/80" />
                    </div>
                    <label htmlFor={sliderId} className="visually-hidden">
                      Geser garis pembanding Asli dengan {activeLayerLabel}
                    </label>
                    <input
                      id={sliderId}
                      type="range"
                      min={0}
                      max={100}
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
              <label
                htmlFor="fundus-file-input"
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center"
              >
                <ScanEye className="h-9 w-9 text-[#FF6B35]" aria-hidden="true" />
                <span className="max-w-[190px] text-xs font-medium text-[#F2F1EC]">
                  Ketuk atau jatuhkan citra fundus PNG/JPG
                </span>
                <span className="text-[11px] text-[#A6A49B]">atau pilih sampel di bawah</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Rel 4 lingkaran: 3 sampel APTOS 2019 nyata + lingkaran ke-4 unggah berkas */}
      <div className="flex items-center justify-center gap-3.5">
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
              className={`h-14 w-14 cursor-pointer overflow-hidden rounded-full bg-[#07080A] p-1 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45 ${
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

        <label
          htmlFor="fundus-file-input"
          className={`flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-full border border-dashed border-[var(--text-secondary)] bg-transparent text-[var(--text-primary)] transition-colors hover:border-[var(--accent-signal)] hover:text-[var(--accent-signal)] ${
            isLoading ? "pointer-events-none opacity-45" : ""
          }`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none mt-0.5">Unggah</span>
        </label>
        <input
          id="fundus-file-input"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="visually-hidden"
          disabled={isLoading}
        />
      </div>

      {/* Pemilih lapisan segmen bergaya garis bawah Braun */}
      <div className="border-t border-[var(--border-hairline)] pt-2">
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
        {showSplit ? (
          <p className="m-0 mt-1.5 text-center text-[11px] text-[var(--text-secondary)]">
            Geser garis di atas retina untuk membandingkan Asli (kiri) dengan {activeLayerLabel} (kanan).
          </p>
        ) : null}
      </div>

      <ModalSheet
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title={`${selectedName} (${activeLayerLabel})`}
      >
        {processedImageUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[#07080A] p-3">
              <img
                src={processedImageUrl}
                alt={`Perbesaran fundus ${activeLayerLabel}`}
                className="mx-auto aspect-square w-full max-w-[460px] rounded-full object-contain"
              />
            </div>
            <p className="m-0 text-xs text-[var(--text-secondary)]">
              Resolusi inferensi 384 x 384 piksel. Peta Grad-CAM++ menggambarkan fokus relatif model, bukan anotasi segmentasi lesi.
            </p>
          </div>
        ) : null}
      </ModalSheet>
    </div>
  );
}
