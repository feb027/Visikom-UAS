import { useState } from "react";
import type { PredictionResult } from "../../types/mydria";
import { ModalSheet } from "../common/ModalSheet";
import { TactileSeverityRuler } from "./TactileSeverityRuler";

interface TelemetryReadoutProps {
  prediction: PredictionResult | null;
  networkError: string | null;
  onReset: () => void;
}

const PLAIN_GRADE_SUMMARY: Record<number, { short: string; color: string; explain: string }> = {
  0: {
    short: "Normal (Tidak tampak gangguan)",
    color: "var(--grade-0-fg)",
    explain:
      "Tidak ditemukan tanda gangguan pembuluh darah retina akibat gula darah (retinopati diabetik) pada gambar ini. Pemeriksaan mata tahunan tetap dianjurkan.",
  },
  1: {
    short: "Ringan (Perlu pantau berkala)",
    color: "var(--grade-1-fg)",
    explain:
      "Ditemukan tanda awal sangat halus pada pembuluh darah kecil retina (tahap Mild). Biasanya belum mengganggu penglihatan, namun perlu dipantau dokter secara rutin.",
  },
  2: {
    short: "Sedang · Disarankan periksa dokter",
    color: "var(--grade-2-fg)",
    explain:
      "Gangguan pembuluh retina mulai jelas (tahap Moderate / masuk batas rujukan medis). Sebaiknya jadwalkan pemeriksaan langsung ke dokter spesialis mata.",
  },
  3: {
    short: "Berat · Segera ke dokter mata",
    color: "var(--grade-3-fg)",
    explain:
      "Terdapat sumbatan atau kebocoran pembuluh retina di beberapa area (tahap Severe). Perlu penanganan dokter spesialis mata dalam waktu dekat.",
  },
  4: {
    short: "Sangat Berat · Prioritas rujukan dokter",
    color: "var(--grade-4-fg)",
    explain:
      "Tahap lanjut (Proliferative DR) saat pembuluh darah baru yang rapuh dapat memicu perdarahan. Segera lakukan pemeriksaan oftalmologi langsung.",
  },
};

type HelpTopic = "grade" | "laplacian" | "roi" | "rb" | null;

const HELP_CONTENT: Record<Exclude<HelpTopic, null>, { title: string; body: string }> = {
  grade: {
    title: "Arti Tingkat Keparahan (Grade 0 sampai 4)",
    body: "Skala internasional 0 sampai 4 mengukur tingkat gangguan retina akibat diabetes: 0 (Normal), 1 (Ringan), 2 (Sedang, mulai perlu pemeriksaan dokter / Referable DR), 3 (Berat), dan 4 (Sangat Berat / Proliferative). Angka persentase menunjukkan seberapa yakin model terhadap tingkat terpilih setelah dikalibrasi.",
  },
  laplacian: {
    title: "Skor Ketajaman Fokus Foto (Laplacian)",
    body: "Mengukur seberapa tajam detail pembuluh darah pada bagian dalam lingkaran retina. Nilai di bawah 25,0 menandakan foto agak buram sehingga hasil pembacaan perlu diperhatikan ulang atau diulangi dengan foto lebih fokus.",
  },
  roi: {
    title: "Cakupan Area Retina (ROI)",
    body: "Persentase luas bagian terang retina dibanding bingkai foto. Nilai minimal 15% memastikan gambar benar-benar memuat cakram mata yang utuh.",
  },
  rb: {
    title: "Keseimbangan Warna Alami Retina (R/B)",
    body: "Perbandingan intensitas warna merah terhadap biru di dalam lingkaran retina (ambang minimal 1,25). Ini menyaring gambar non-mata seperti tangkapan layar atau foto benda biasa agar model tidak menebak gambar yang salah.",
  },
};

export function TelemetryReadout({ prediction, networkError, onReset }: TelemetryReadoutProps) {
  const [helpTopic, setHelpTopic] = useState<HelpTopic>(null);

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
          <p className="m-0 text-xs font-medium text-[var(--text-secondary)]">Pemeriksaan Retina</p>
          <p
            className="m-0 mt-1 font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.5rem, 1.3rem + 1.2vw, 2.2rem)", lineHeight: 1.15 }}
          >
            Siap Menganalisis Foto
          </p>
          <p className="m-0 mt-1.5 max-w-md text-sm text-[var(--text-secondary)]">
            Ketuk salah satu lingkaran contoh mata atau tombol Unggah untuk melihat perkiraan tingkat gangguan serta fokus foto.
          </p>
        </div>

        <dl className="tabular-nums grid grid-cols-3 gap-3 py-3.5 sm:py-4">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Ketajaman Min</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">&gt;= 25.0</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Area Retina</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">&gt;= 15%</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Warna Alami</dt>
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
          <p className="m-0 text-xs font-semibold text-[var(--error-fg)]">Foto Tidak Memenuhi Syarat Retina</p>
          <p
            className="m-0 mt-1 font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.4rem, 1.2rem + 0.9vw, 1.85rem)", lineHeight: 1.15 }}
          >
            Bukan Foto Retina Mata
          </p>
          <p className="m-0 mt-1.5 text-sm text-[var(--text-secondary)]">{q.message_id}</p>
        </div>

        <dl className="tabular-nums grid grid-cols-3 gap-3 py-4">
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Ketajaman</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
              {q.laplacian_variance.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Area Retina</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
              {(q.roi_area_ratio * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-secondary)]">Warna Alami</dt>
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
  const plainInfo = PLAIN_GRADE_SUMMARY[grade] ?? PLAIN_GRADE_SUMMARY[0];
  const confidencePct = ((prediction.confidence ?? 0) * 100).toFixed(1);
  const referablePct = ((prediction.referable_probability ?? 0) * 100).toFixed(1);
  const q = prediction.quality;

  return (
    <div className="divide-y divide-[var(--border-hairline)]">
      {/* Baris 1: Angka raksasa Grade + % + status sederhana yang dapat diklik untuk popup */}
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

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => setHelpTopic("grade")}
            className="min-h-8 cursor-pointer text-left text-sm font-semibold underline decoration-dotted underline-offset-4 hover:opacity-80"
            style={{ color: plainInfo.color }}
          >
            {plainInfo.short}
          </button>
          {q.blur_warning ? (
            <button
              type="button"
              onClick={() => setHelpTopic("laplacian")}
              className="min-h-8 cursor-pointer text-xs font-medium text-[var(--warning-fg)] underline decoration-dotted underline-offset-4"
            >
              Foto agak buram
            </button>
          ) : null}
        </div>
      </div>

      {/* Baris 2: Pembacaan 3 metrik sederhana yang dapat diklik untuk penjelasan awam */}
      <dl className="tabular-nums grid grid-cols-3 gap-3 py-3 sm:py-4">
        <div>
          <dt>
            <button
              type="button"
              onClick={() => setHelpTopic("laplacian")}
              className="cursor-pointer text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-4 hover:text-[var(--text-primary)]"
            >
              Ketajaman
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
              Area Retina
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
              Warna Alami
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

      {/* Baris 4: Distribusi 5 tingkat tipis + catatan ringkas */}
      <div className="pt-3.5 space-y-2">
        <div className="tabular-nums flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Sebaran Peluang 5 Tingkat</span>
          <span>Peluang perlu cek dokter: {referablePct}%</span>
        </div>

        <div className="space-y-1.5">
          {prediction.probabilities.map((item) => {
            const pct = Math.max(0, Math.min(100, item.probability * 100));
            const isPredicted = item.grade === grade;
            const labelMap = ["0 · Normal", "1 · Ringan", "2 · Sedang", "3 · Berat", "4 · Sangat Berat"];
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
                    {labelMap[item.grade] ?? item.label}
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
          Model: {prediction.backbone ?? "-"} ({prediction.model_stage === "smoke" ? "bobot uji awal" : "penuh"}) ·{" "}
          {prediction.inference_ms !== null ? `${prediction.inference_ms.toFixed(1)} ms` : "-"} · Prototipe riset, bukan pengganti diagnosis dokter.
        </p>
      </div>

      {/* Dialog penjelasan ramah awam bila teks istilah diketuk */}
      <ModalSheet
        open={helpTopic !== null}
        onClose={() => setHelpTopic(null)}
        title={helpTopic ? HELP_CONTENT[helpTopic].title : ""}
      >
        {helpTopic ? (
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            {helpTopic === "grade" ? (
              <p className="m-0 font-medium text-[var(--text-primary)]">{plainInfo.explain}</p>
            ) : null}
            <p className="m-0 leading-relaxed">{HELP_CONTENT[helpTopic].body}</p>
            <p className="m-0 border-t border-[var(--border-hairline)] pt-3 text-xs text-[var(--text-secondary)]">
              Catatan teknis: nilai Grade {grade} ({prediction.predicted_label}) ditentukan dengan kalibrasi suhu T ={" "}
              {prediction.temperature?.toFixed(2) ?? "-"} melalui mesin {prediction.active_provider?.replace("ExecutionProvider", "") ?? "CPU"}.
            </p>
          </div>
        ) : null}
      </ModalSheet>
    </div>
  );
}
