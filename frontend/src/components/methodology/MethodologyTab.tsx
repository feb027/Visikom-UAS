const PIPELINE_STEPS = [
  { step: "01", label: "Audit pHash+dHash" },
  { step: "02", label: "Quality Gate OpenCV" },
  { step: "03", label: "ONNX Inference" },
  { step: "04", label: "Grad-CAM++" },
];

const SPEC_SECTIONS = [
  {
    index: "01",
    title: "Audit Bebas Bocor",
    description:
      "Citra dipotong dengan circular_roi_crop lalu dipangkas 15% dari tepi sebelum dihitung kesamaan pHash dan dHash agar duplikat satu pasien tidak terpecah antar fold.",
    param: "pHash <= 4 & dHash <= 4 · 5 Fold",
  },
  {
    index: "02",
    title: "Gerbang Kualitas OpenCV",
    description:
      "Memeriksa luas wilayah retina, perbandingan spektrum merah-biru dan merah-hijau, serta variansi Laplacian pada radius dalam 85% cakram retina.",
    param: "ROI >= 15% · R/B >= 1.25 · Laplacian >= 25",
  },
  {
    index: "03",
    title: "Pelatihan & Kalibrasi",
    description:
      "Ablasi berurutan E1 (prapemrosesan), E2 (ResNet-50, EfficientNet-B0, ConvNeXt-V2-Tiny), dan E3 (loss ordinal & penyeimbangan tunggal), dilanjutkan Temperature Scaling.",
    param: "384 px · Temperature Scaling · ONNX",
  },
  {
    index: "04",
    title: "Batasan Riset Akademik",
    description:
      "Peta Grad-CAM++ memperlihatkan bagian yang paling memengaruhi penilaian model, bukan segmentasi lesi mikroaneurisma klinis. Bukan pengganti diagnosis dokter mata.",
    param: "UAS Visi Komputer & Robotika",
  },
];

export function MethodologyTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="m-0 font-bold tracking-[-0.02em] text-[var(--text-primary)]"
          style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
        >
          Metodologi &amp; Batasan
        </h1>
        <p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">
          Alur teknis pipeline visi komputer Paket B serta batasan pemakaian riset.
        </p>
      </div>

      {/* Skema vektor pipeline horizontal */}
      <div className="border-t border-[var(--border-hairline)] pt-5">
        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[22px] right-12 left-12 hidden h-px bg-[var(--border-hairline)] sm:block"
          />
          {PIPELINE_STEPS.map((item, idx) => (
            <div key={item.step} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 flex h-11 w-11 items-center justify-center border border-[var(--text-primary)] bg-[var(--bg-canvas)] text-sm font-bold tabular-nums text-[var(--text-primary)]">
                {item.step}
              </div>
              {idx < PIPELINE_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute top-[19px] -right-1 z-10 h-2 w-2 rounded-full bg-[var(--accent-signal)]"
                />
              ) : null}
              <p className="m-0 mt-2 text-xs font-semibold text-[var(--text-primary)]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4 bagian spesifikasi teknis bernomor 01..04 terpisah garis 1px */}
      <div className="grid grid-cols-1 gap-x-10 border-t border-[var(--border-hairline)] sm:grid-cols-2">
        {SPEC_SECTIONS.map((sec) => (
          <div key={sec.index} className="border-b border-[var(--border-hairline)] py-5">
            <div className="flex items-baseline gap-3">
              <span className="tabular-nums text-lg font-bold text-[var(--accent-signal)]">
                {sec.index}
              </span>
              <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">{sec.title}</h2>
            </div>
            <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {sec.description}
            </p>
            <p className="tabular-nums m-0 mt-3 border-t border-[var(--border-hairline)] pt-2 text-xs font-medium text-[var(--text-primary)]">
              {sec.param}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
