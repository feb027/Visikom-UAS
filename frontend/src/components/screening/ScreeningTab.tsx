import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { DemoExample, PredictionResult, ViewerLayerKey } from "../../types/mydria";
import { OpticalApertureViewer } from "./OpticalApertureViewer";
import { QualityGateCard } from "./QualityGateCard";
import { SeverityDistributionCard } from "./SeverityDistributionCard";
import { UploadControls } from "./UploadControls";

interface ScreeningTabProps {
  examples: DemoExample[];
  prediction: PredictionResult | null;
  selectedName: string;
  rejectedPreviewUrl: string | null;
  activeLayer: ViewerLayerKey;
  onSelectLayer: (layer: ViewerLayerKey) => void;
  isLoading: boolean;
  loadingStep: number;
  networkError: string | null;
  onSelectFile: (file: File) => void;
  onSelectExample: (ex: DemoExample) => void;
  onReset: () => void;
}

export function ScreeningTab({
  examples,
  prediction,
  selectedName,
  rejectedPreviewUrl,
  activeLayer,
  onSelectLayer,
  isLoading,
  loadingStep,
  networkError,
  onSelectFile,
  onSelectExample,
  onReset,
}: ScreeningTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1
          className="m-0 font-bold tracking-[-0.02em] text-[var(--text-primary)]"
          style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
        >
          Skrining Citra Fundus Retina
        </h1>
        <p className="m-0 text-sm text-[var(--text-secondary)]">
          Pemeriksaan bertingkat Grade 0 sampai Grade 4 beserta verifikasi kualitas OpenCV dan peta aktivasi Grad-CAM++.
        </p>
      </div>

      {/* Tablet (<1024px) terpusat; Desktop (>=1024px) split-view 42% / 58% */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] lg:items-start">
        <div className="mx-auto w-full max-w-[480px] space-y-4 lg:max-w-none lg:sticky lg:top-16">
          <OpticalApertureViewer
            prediction={prediction}
            selectedName={selectedName}
            rejectedPreviewUrl={rejectedPreviewUrl}
            activeLayer={activeLayer}
            onSelectLayer={onSelectLayer}
            isLoading={isLoading}
            loadingStep={loadingStep}
          />
          <UploadControls
            examples={examples}
            isLoading={isLoading}
            hasResult={prediction !== null || networkError !== null}
            onSelectFile={onSelectFile}
            onSelectExample={onSelectExample}
            onReset={onReset}
          />
        </div>

        <div className="space-y-4">
          {networkError ? (
            <section
              role="alert"
              className="rounded-[18px] border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-[var(--error-fg)]"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="m-0 text-sm font-semibold">Koneksi Server Bermasalah</h2>
                  <p className="m-0 mt-1 text-sm">{networkError}</p>
                </div>
              </div>
            </section>
          ) : null}

          {prediction ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <QualityGateCard quality={prediction.quality} />
              {prediction.accepted ? (
                <SeverityDistributionCard prediction={prediction} />
              ) : (
                <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
                  <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
                    Inferensi Dihentikan oleh Gerbang Kualitas
                  </h2>
                  <p className="m-0 mt-1.5 text-sm text-[var(--text-secondary)]">
                    Model klasifikasi tidak dijalankan pada gambar non-fundus untuk mencegah prediksi palsu di luar domain.
                    Unggah foto kamera retina atau gunakan salah satu contoh APTOS 2019 di panel sebelah.
                  </p>
                </section>
              )}
            </div>
          ) : !networkError ? (
            <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-5">
              <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
                Siap Memeriksa Citra Retina
              </h2>
              <p className="m-0 mt-1.5 text-sm text-[var(--text-secondary)]">
                Belum ada hasil prediksi yang ditampilkan. Sistem mengeksekusi tiga tahap terukur untuk setiap gambar yang masuk:
              </p>
              <ol className="m-0 mt-3 list-none space-y-2 p-0 text-sm text-[var(--text-primary)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-link)]" aria-hidden="true" />
                  <span>Pemeriksaan domain retina (proporsi cakram gelap, spektrum merah/biru, serta ketajaman Laplacian OpenCV).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-link)]" aria-hidden="true" />
                  <span>Pemotongan ROI bundar retina diikuti perbandingan mode asli, Lab-CLAHE, dan Ben Graham.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-link)]" aria-hidden="true" />
                  <span>Inferensi model ONNX terkalibrasi (Temperature Scaling) beserta overlay aktivasi Grad-CAM++.</span>
                </li>
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
