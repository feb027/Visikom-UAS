import { useState } from "react";
import type { PredictionResult } from "../../types/mydria";
import { ModalSheet } from "../common/ModalSheet";
import { ExplanationVisuals, type ExplanationTopic } from "./ExplanationVisuals";
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

const TOPIC_TITLES: Record<ExplanationTopic, string> = {
  grade: "Penjelasan Skala Grade 0 sampai 4",
  laplacian: "Laplacian (Ketajaman Foto)",
  roi: "ROI (Cakupan Area Retina)",
  rb: "R/B (Keseimbangan Warna Alami)",
};

export function TelemetryReadout({ prediction, networkError, onReset }: TelemetryReadoutProps) {
  const [helpTopic, setHelpTopic] = useState<ExplanationTopic | null>(null);

  if (networkError) {
    return (
      <div role="alert" className="divide-y divide-[var(--border-hairline)]">
        <div className="pb-4">
          <p className="m-0 text-xs font-semibold text-[var(--error-fg)]">Gangguan Koneksi</p>
          <p className="m-0 mt-1.5 text-base font-semibold text-[var(--text-primary)]">{networkError}</p>
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
        <div className="pb-4">
          <p className="m-0 text-xs font-medium text-[var(--text-secondary)]">Instrumen Skrining Fundus</p>
          <p
            className="m-0 mt-1 font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.5rem, 1.3rem + 1.2vw, 2.2rem)", lineHeight: 1.15 }}
          >
            Siap Analisis Retina
          </p>
          <p className="m-0 mt-1.5 max-w-md text-sm text-[var(--text-secondary)]">
            Ketuk salah satu lingkaran contoh mata atau tombol Unggah untuk mengukur Laplacian, ROI, dan tingkat
            retinopati Grade 0 sampai 4.
          </p>
        </div>

        <dl className="tabular-nums grid grid-cols-3 gap-3 py-3.5 sm:py-4">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Laplacian Min</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">&gt;= 25.0</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">ROI Min</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">&gt;= 15%</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">R/B Min</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">&gt;= 1.25</dd>
          </div>
        </dl>

        <div className="py-3.5 sm:py-4">
          <TactileSeverityRuler grade={null} />
        </div>
      </div>
    );
  }

  if (!prediction.accepted) {
    const q = prediction.quality;
    return (
      <div role="alert" className="divide-y divide-[var(--border-hairline)]">
        <div className="pb-4">
          <p className="m-0 text-xs font-semibold text-[var(--error-fg)]">Ditolak Gerbang Domain OpenCV</p>
          <p
            className="m-0 mt-1 font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.4rem, 1.2rem + 0.9vw, 1.85rem)", lineHeight: 1.15 }}
          >
            Bukan Foto Retina Valid
          </p>
          <p className="m-0 mt-1.5 text-sm text-[var(--text-secondary)]">{q.message_id}</p>
        </div>

        <dl className="tabular-nums grid grid-cols-3 gap-3 py-4">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Laplacian</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
              {q.laplacian_variance.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">ROI</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
              {(q.roi_area_ratio * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">R/B</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
              {q.red_blue_ratio.toFixed(2)}
            </dd>
          </div>
        </dl>

        <div className="pt-3.5">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 cursor-pointer border-b border-[var(--accent-signal)] text-sm font-semibold text-[var(--accent-signal)]"
          >
            Bersihkan dan pilih foto lain
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
      {/* Baris 1: Angka Grade + % + Label ilmiah klik-buka popup visual */}
      <div className="pb-3.5 sm:pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span
              className="tabular-nums font-bold tracking-[-0.025em] text-[var(--text-primary)]"
              style={{ fontSize: "clamp(2rem, 1.7rem + 1.8vw, 3.1rem)", lineHeight: 1 }}
            >
              Grade {grade}
            </span>
            <span
              className="tabular-nums font-semibold tracking-tight text-[var(--text-primary)]"
              style={{ fontSize: "clamp(1.6rem, 1.35rem + 1.3vw, 2.35rem)", lineHeight: 1 }}
            >
              {confidencePct}%
            </span>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="min-h-9 cursor-pointer text-xs font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
          >
            Atur ulang
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <button
            type="button"
            onClick={() => setHelpTopic("grade")}
            className="min-h-8 cursor-pointer font-semibold underline decoration-dotted underline-offset-4 hover:opacity-80"
            style={{ color: GRADE_FG[grade] ?? "var(--text-primary)" }}
          >
            {label}
          </button>
          <span className="text-[var(--border-hairline)]" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setHelpTopic("grade")}
            className="min-h-8 cursor-pointer font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 hover:opacity-80"
          >
            {prediction.referable_dr ? "Referable DR (>= Grade 2)" : "Non-Referable"}
          </button>
          {q.blur_warning ? (
            <>
              <span className="text-[var(--border-hairline)]" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => setHelpTopic("laplacian")}
                className="min-h-8 cursor-pointer text-xs font-semibold text-[var(--warning-fg)] underline decoration-dotted underline-offset-4"
              >
                Blur Warning
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Baris 2: Laplacian | ROI | R/B tetap memakai nama asli dan dapat diketuk */}
      <dl className="tabular-nums grid grid-cols-3 gap-3 py-3 sm:py-4">
        <div>
          <dt>
            <button
              type="button"
              onClick={() => setHelpTopic("laplacian")}
              className="cursor-pointer text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-4 hover:text-[var(--text-primary)]"
            >
              Laplacian
            </button>
          </dt>
          <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-2xl">
            {q.laplacian_variance.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt>
            <button
              type="button"
              onClick={() => setHelpTopic("roi")}
              className="cursor-pointer text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-4 hover:text-[var(--text-primary)]"
            >
              ROI
            </button>
          </dt>
          <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-2xl">
            {(q.roi_area_ratio * 100).toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt>
            <button
              type="button"
              onClick={() => setHelpTopic("rb")}
              className="cursor-pointer text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-4 hover:text-[var(--text-primary)]"
            >
              R/B
            </button>
          </dt>
          <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-2xl">
            {q.red_blue_ratio.toFixed(2)}
          </dd>
        </div>
      </dl>

      {/* Baris 3: Penggaris taktil 0..4 Braun */}
      <div className="py-3 sm:py-4">
        <TactileSeverityRuler grade={grade} />
      </div>

      {/* Baris 4: Distribusi 5 kelas tipis + runtime */}
      <div className="pt-3.5 space-y-2">
        <div className="tabular-nums flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Distribusi Probabilitas Terkalibrasi</span>
          <span>Referable: {referablePct}%</span>
        </div>

        <div className="space-y-1.5">
          {prediction.probabilities.map((item) => {
            const pct = Math.max(0, Math.min(100, item.probability * 100));
            const isPredicted = item.grade === grade;
            return (
              <div key={item.grade} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 text-xs">
                <div className="space-y-1">
                  <span
                    className={
                      isPredicted
                        ? "block font-semibold text-[var(--text-primary)]"
                        : "block text-[var(--text-secondary)]"
                    }
                  >
                    {item.grade}. {item.label}
                  </span>
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
          {prediction.inference_ms !== null ? `${prediction.inference_ms.toFixed(1)} ms` : "-"} ·{" "}
          {prediction.model_stage === "smoke" ? "Bobot uji smoke" : "Model final"} · Bukan diagnosis dokter.
        </p>
      </div>

      {/* Dialog penjelasan visual ketika Laplacian / ROI / R/B / Grade diketuk */}
      <ModalSheet
        open={helpTopic !== null}
        onClose={() => setHelpTopic(null)}
        title={helpTopic ? TOPIC_TITLES[helpTopic] : ""}
      >
        {helpTopic ? (
          <ExplanationVisuals
            topic={helpTopic}
            grade={grade}
            predictedLabel={label}
            quality={q}
            temperature={prediction.temperature}
            provider={prediction.active_provider}
          />
        ) : null}
      </ModalSheet>
    </div>
  );
}
