import type { PredictionResult } from "../../types/mydria";
import { TactileSeverityRuler } from "./TactileSeverityRuler";

interface TelemetryReadoutProps {
  prediction: PredictionResult | null;
  networkError: string | null;
  onReset: () => void;
}

const GRADE_FG: Record<number, string> = {
  0: "var(--grade-0-fg)",
  1: "var(--grade-1-fg)",
  2: "var(--grade-2-fg)",
  3: "var(--grade-3-fg)",
  4: "var(--grade-4-fg)",
};

export function TelemetryReadout({ prediction, networkError, onReset }: TelemetryReadoutProps) {
  if (networkError) {
    return (
      <div role="alert" className="divide-y divide-[var(--border-hairline)]">
        <div className="pb-5">
          <p className="m-0 text-xs font-medium uppercase tracking-wider text-[var(--error-fg)]">
            Gangguan Koneksi
          </p>
          <p className="m-0 mt-2 text-base font-semibold text-[var(--text-primary)]">{networkError}</p>
        </div>
        <div className="pt-4">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 cursor-pointer border-b border-[var(--accent-signal)] text-sm font-semibold text-[var(--accent-signal)]"
          >
            Muat ulang status pemeriksaan
          </button>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="divide-y divide-[var(--border-hairline)]">
        <div className="pb-6">
          <p className="m-0 text-xs font-medium text-[var(--text-secondary)]">
            Instrumen Skrining Fundus
          </p>
          <p
            className="m-0 mt-2 font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.65rem, 1.35rem + 1.4vw, 2.35rem)", lineHeight: 1.15 }}
          >
            Siap Analisis Retina
          </p>
          <p className="m-0 mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Ketuk salah satu dari tiga lingkaran sampel APTOS 2019 atau unggah citra fundus untuk mengukur
            kualitas OpenCV dan probabilitas ordinal Grade 0 sampai 4.
          </p>
        </div>

        <dl className="tabular-nums grid grid-cols-3 gap-4 py-5">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Ambang Tajam</dt>
            <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">&gt;= 25.0</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">ROI Minimum</dt>
            <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">&gt;= 15%</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Rasio R/B</dt>
            <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">&gt;= 1.25</dd>
          </div>
        </dl>

        <div className="py-5">
          <TactileSeverityRuler grade={null} />
        </div>
      </div>
    );
  }

  if (!prediction.accepted) {
    const q = prediction.quality;
    return (
      <div role="alert" className="divide-y divide-[var(--border-hairline)]">
        <div className="pb-5">
          <p className="m-0 text-xs font-semibold text-[var(--error-fg)]">
            Ditolak Gerbang Domain OpenCV
          </p>
          <p
            className="m-0 mt-2 font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.5rem, 1.25rem + 1vw, 2rem)", lineHeight: 1.15 }}
          >
            Bukan Citra Fundus Valid
          </p>
          <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">{q.message_id}</p>
        </div>

        <dl className="tabular-nums grid grid-cols-3 gap-4 py-5">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Laplacian</dt>
            <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {q.laplacian_variance.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">ROI</dt>
            <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {(q.roi_area_ratio * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">R/B</dt>
            <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {q.red_blue_ratio.toFixed(2)}
            </dd>
          </div>
        </dl>

        <div className="pt-4">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 cursor-pointer border-b border-[var(--accent-signal)] text-sm font-semibold text-[var(--accent-signal)]"
          >
            Bersihkan dan pilih citra baru
          </button>
        </div>
      </div>
    );
  }

  const grade = prediction.predicted_grade ?? 0;
  const label = prediction.predicted_label ?? "No DR";
  const confidencePct = ((prediction.confidence ?? 0) * 100).toFixed(1);
  const referablePct = ((prediction.referable_probability ?? 0) * 100).toFixed(1);
  const q = prediction.quality;

  return (
    <div className="divide-y divide-[var(--border-hairline)]">
      {/* Baris 1: Angka raksasa Grade + % + Referable status */}
      <div className="pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span
              className="tabular-nums font-bold tracking-[-0.025em] text-[var(--text-primary)]"
              style={{ fontSize: "clamp(2.25rem, 1.8rem + 2vw, 3.25rem)", lineHeight: 1 }}
            >
              Grade {grade}
            </span>
            <span
              className="tabular-nums font-semibold tracking-tight text-[var(--text-primary)]"
              style={{ fontSize: "clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem)", lineHeight: 1 }}
            >
              {confidencePct}%
            </span>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="min-h-10 cursor-pointer text-xs font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
          >
            Atur ulang
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold" style={{ color: GRADE_FG[grade] ?? "var(--text-primary)" }}>
            {label}
          </span>
          <span className="text-[var(--border-hairline)]" aria-hidden="true">|</span>
          <span className="font-medium text-[var(--text-primary)]">
            {prediction.referable_dr ? "Referable DR (>= Grade 2)" : "Non-Referable"}
          </span>
          {q.blur_warning ? (
            <>
              <span className="text-[var(--border-hairline)]" aria-hidden="true">|</span>
              <span className="font-semibold text-[var(--warning-fg)]">Perhatian: Ketajaman rendah</span>
            </>
          ) : null}
        </div>

        <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">{prediction.guidance_id}</p>
      </div>

      {/* Baris 2: Telemetri kualitas OpenCV 3 kolom sejajar */}
      <dl className="tabular-nums grid grid-cols-3 gap-4 py-4 sm:py-5">
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">Laplacian</dt>
          <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {q.laplacian_variance.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">ROI</dt>
          <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {(q.roi_area_ratio * 100).toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">R/B</dt>
          <dd className="m-0 mt-1 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {q.red_blue_ratio.toFixed(2)}
          </dd>
        </div>
      </dl>

      {/* Baris 3: Penggaris taktil 0..4 Braun */}
      <div className="py-4 sm:py-5">
        <TactileSeverityRuler grade={grade} />
      </div>

      {/* Baris 4: Distribusi 5 tingkat tipis + runtime */}
      <div className="pt-4 space-y-2.5">
        <div className="tabular-nums flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Distribusi Probabilitas Terkalibrasi</span>
          <span>Peluang Referable: {referablePct}%</span>
        </div>

        <div className="space-y-2">
          {prediction.probabilities.map((item) => {
            const pct = Math.max(0, Math.min(100, item.probability * 100));
            const isPredicted = item.grade === grade;
            return (
              <div key={item.grade} className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span
                      className={
                        isPredicted
                          ? "font-semibold text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }
                    >
                      {item.grade}. {item.label}
                    </span>
                  </div>
                  <div className="h-[3px] w-full bg-[var(--bg-recessed)]">
                    <div
                      className="mydria-smooth-pos h-full"
                      style={{
                        width: `${pct.toFixed(1)}%`,
                        backgroundColor: isPredicted ? "var(--accent-signal)" : "var(--text-secondary)",
                        opacity: isPredicted ? 1 : 0.45,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`tabular-nums text-right ${
                    isPredicted ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>

        <p className="tabular-nums m-0 pt-2 text-[11px] text-[var(--text-secondary)]">
          {prediction.backbone ?? "-"} · {prediction.active_provider?.replace("ExecutionProvider", "") ?? "CPU"} ·{" "}
          {prediction.inference_ms !== null ? `${prediction.inference_ms.toFixed(1)} ms` : "-"} · T={" "}
          {prediction.temperature !== null ? prediction.temperature.toFixed(2) : "-"}
        </p>
        <p className="m-0 text-[11px] text-[var(--text-secondary)]">{prediction.disclaimer}</p>
      </div>
    </div>
  );
}
