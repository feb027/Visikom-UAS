import type { QualityReport } from "../../types/mydria";

export type ExplanationTopic = "grade" | "laplacian" | "roi" | "rb";

interface ExplanationVisualsProps {
  topic: ExplanationTopic;
  grade: number;
  predictedLabel: string;
  quality: QualityReport;
  temperature: number | null;
  provider: string | null;
}

const PLAIN_GRADE_DESC: Record<number, string> = {
  0: "Tidak terlihat tanda gangguan pembuluh retina akibat diabetes. Tetap lakukan pemeriksaan mata berkala sesuai jadwal.",
  1: "Mulai muncul bintik halus awal pada kapiler retina (Mild). Belum mengganggu penglihatan, namun perlu pantau rutin.",
  2: "Perdarahan mikro atau bercak eksudat mulai jelas (Moderate). Sudah melewati batas rujukan sehingga disarankan cek dokter mata.",
  3: "Sumbatan pembuluh darah retina meluas di beberapa kuadran (Severe). Perlu evaluasi spesialis mata segera.",
  4: "Tahap lanjut (Proliferative DR) dengan pertumbuhan pembuluh rapuh baru yang rawan perdarahan. Prioritas rujukan dokter mata.",
};

function RetinaProgressionSvg({ activeGrade }: { activeGrade: number }) {
  const grades = [
    { g: 0, label: "No DR", spots: 0, branch: false },
    { g: 1, label: "Mild", spots: 1, branch: false },
    { g: 2, label: "Moderate", spots: 4, branch: false },
    { g: 3, label: "Severe", spots: 7, branch: false },
    { g: 4, label: "Prolif.", spots: 6, branch: true },
  ];
  const dotCoords = [
    [20, 22],
    [16, 30],
    [25, 18],
    [29, 32],
    [14, 21],
    [22, 36],
    [28, 25],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {grades.map((item) => {
          const isCurrent = item.g === activeGrade;
          return (
            <div key={item.g} className="flex flex-col items-center gap-1.5 text-center">
              <div
                className={`flex h-13 w-13 items-center justify-center rounded-full border p-1 sm:h-15 sm:w-15 ${
                  isCurrent
                    ? "border-2 border-[var(--accent-signal)] bg-[var(--bg-recessed)]"
                    : "border-[var(--border-hairline)] bg-transparent"
                }`}
              >
                <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
                  <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
                  <circle cx="35" cy="24" r="4" fill="var(--accent-signal)" fillOpacity="0.45" />
                  <path
                    d="M35 24 Q24 14 10 15 M35 24 Q22 24 8 27 M35 24 Q25 33 13 37"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.55"
                    strokeWidth="1.2"
                  />
                  {dotCoords.slice(0, item.spots).map(([x, y], idx) => (
                    <circle key={idx} cx={x} cy={y} r="1.7" fill="var(--accent-signal)" />
                  ))}
                  {item.branch ? (
                    <path
                      d="M33 20 Q28 11 22 10 M30 28 Q26 37 20 39"
                      fill="none"
                      stroke="var(--accent-signal)"
                      strokeWidth="1.3"
                      strokeDasharray="2 1.5"
                    />
                  ) : null}
                </svg>
              </div>
              <span
                className={`tabular-nums text-[11px] leading-tight ${
                  isCurrent ? "font-bold text-[var(--accent-signal)]" : "font-medium text-[var(--text-secondary)]"
                }`}
              >
                Grade {item.g}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Garis penanda ambang Referable (>= Grade 2) */}
      <div className="grid grid-cols-5 items-center text-[10px] font-medium text-[var(--text-secondary)]">
        <div className="col-span-2 pr-2 text-center">Non-Referable (0–1)</div>
        <div className="col-span-3 border-t-2 border-[var(--accent-signal)] pt-1 text-center font-semibold text-[var(--accent-signal)]">
          Referable DR (&gt;= Grade 2)
        </div>
      </div>
    </div>
  );
}

function LaplacianVisual({ variance }: { variance: number }) {
  const pct = Math.min(96, Math.max(4, (variance / 150) * 100));
  const thresholdPct = (25 / 150) * 100;
  const isSharp = variance >= 25;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 border-b border-[var(--border-hairline)] pb-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[#07080A]">
            <svg viewBox="0 0 80 80" className="h-full w-full" style={{ filter: "blur(2.2px)" }} aria-hidden="true">
              <circle cx="40" cy="40" r="36" fill="#5D351E" />
              <circle cx="58" cy="40" r="7" fill="#D4884A" />
              <path
                d="M58 40 Q38 22 14 26 M58 40 Q36 42 12 46 M58 40 Q40 58 20 64"
                fill="none"
                stroke="#2A0E08"
                strokeWidth="2.4"
              />
            </svg>
          </div>
          <span className="tabular-nums text-xs font-medium text-[var(--text-secondary)]">
            Buram (&lt; 25)
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[#07080A]">
            <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
              <circle cx="40" cy="40" r="36" fill="#7D4523" />
              <circle cx="58" cy="40" r="7" fill="#F6B067" />
              <path
                d="M58 40 Q38 22 14 26 M40 28 Q30 16 20 14 M58 40 Q36 42 12 46 M58 40 Q40 58 20 64 M38 52 Q28 60 18 57"
                fill="none"
                stroke="#3A1109"
                strokeWidth="1.9"
              />
            </svg>
          </div>
          <span className="tabular-nums text-xs font-semibold text-[var(--text-primary)]">
            Tajam (&gt;= 25)
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="tabular-nums flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Ambang fokus: 25.0</span>
          <span className="font-semibold" style={{ color: isSharp ? "var(--grade-0-fg)" : "var(--warning-fg)" }}>
            Foto ini: {variance.toFixed(1)} ({isSharp ? "Tajam" : "Agak buram"})
          </span>
        </div>
        <div className="relative h-2.5 w-full rounded-full bg-[var(--bg-recessed)]">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-[var(--text-primary)]"
            style={{ left: `${thresholdPct}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-canvas)] bg-[var(--accent-signal)]"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        Laplacian mengukur ketajaman tepi pembuluh darah pada bagian dalam cakram retina (85% radius). Nilai di bawah
        25.0 berarti gambar agak buram sehingga detail lesi kecil berisiko tersamarkan.
      </p>
    </div>
  );
}

function RoiVisual({ ratio }: { ratio: number }) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const rVisual = Math.max(12, Math.min(34, Math.sqrt(ratio) * 38));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-6 border-b border-[var(--border-hairline)] pb-4">
        <svg viewBox="0 0 88 88" className="h-24 w-24 shrink-0" aria-hidden="true">
          <rect x="4" y="4" width="80" height="80" rx="6" fill="#07080A" stroke="var(--border-hairline)" />
          <circle cx="44" cy="44" r="15" fill="none" stroke="var(--text-secondary)" strokeDasharray="3 2" strokeWidth="1" />
          <circle cx="44" cy="44" r={rVisual} fill="var(--accent-signal)" fillOpacity="0.65" stroke="#FFFFFF" strokeWidth="1.2" />
        </svg>
        <div className="tabular-nums space-y-1 text-xs">
          <p className="m-0 text-base font-bold text-[var(--text-primary)]">{pct.toFixed(1)}% area retina</p>
          <p className="m-0 text-[var(--text-secondary)]">Batas minimal lolos: &gt;= 15.0%</p>
          <p className="m-0 text-[var(--text-secondary)]">Lingkaran putus-putus menandai batas minimal.</p>
        </div>
      </div>

      <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        ROI (Region of Interest) membandingkan luas bagian cakram retina terang terhadap keseluruhan bingkai foto agar
        gambar terlalu gelap atau potongan kecil yang rusak tidak ikut dinilai oleh model.
      </p>
    </div>
  );
}

function RbRatioVisual({ rb, rg }: { rb: number; rg: number }) {
  const markerPct = Math.min(96, Math.max(4, (rb / 6) * 100));
  const minPct = (1.25 / 6) * 100;

  return (
    <div className="space-y-4">
      <div className="space-y-2 border-b border-[var(--border-hairline)] pb-4">
        <div className="tabular-nums flex justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Ambang non-retina (&lt; 1.25)</span>
          <span className="font-semibold text-[var(--text-primary)]">R/B: {rb.toFixed(2)} | R/G: {rg.toFixed(2)}</span>
        </div>
        <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-[var(--bg-recessed)]">
          <div
            aria-hidden="true"
            className="h-full border-r-2 border-[var(--bg-canvas)] bg-[#2563EB]"
            style={{ width: `${minPct}%` }}
          />
          <div
            aria-hidden="true"
            className="h-full flex-1 bg-[#BD3A08]"
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#141413]"
            style={{ left: `${markerPct}%` }}
          />
        </div>
      </div>

      <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        Rasio kanal Merah terhadap Biru (R/B) memastikan spektrum foto benar-benar berasal dari jaringan fundus retina
        yang kaya pembuluh darah (R/B &gt;= 1,25 dan R/G &gt;= 1,03), bukan tangkapan layar atau foto benda umum.
      </p>
    </div>
  );
}

export function ExplanationVisuals({
  topic,
  grade,
  predictedLabel,
  quality,
  temperature,
  provider,
}: ExplanationVisualsProps) {
  return (
    <div className="space-y-4">
      {topic === "grade" ? (
        <>
          <RetinaProgressionSvg activeGrade={grade} />
          <p className="m-0 text-sm leading-relaxed text-[var(--text-primary)]">
            {PLAIN_GRADE_DESC[grade] ?? PLAIN_GRADE_DESC[0]}
          </p>
        </>
      ) : null}

      {topic === "laplacian" ? <LaplacianVisual variance={quality.laplacian_variance} /> : null}
      {topic === "roi" ? <RoiVisual ratio={quality.roi_area_ratio} /> : null}
      {topic === "rb" ? <RbRatioVisual rb={quality.red_blue_ratio} rg={quality.red_green_ratio} /> : null}

      <p className="tabular-nums m-0 border-t border-[var(--border-hairline)] pt-3 text-xs text-[var(--text-secondary)]">
        Grade {grade} ({predictedLabel}) · Kalibrasi suhu T={temperature?.toFixed(2) ?? "-"} ·{" "}
        {provider?.replace("ExecutionProvider", "") ?? "CPU"}
      </p>
    </div>
  );
}
