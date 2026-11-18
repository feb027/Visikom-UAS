const SPEC_SECTIONS = [
  {
    index: "01",
    title: "Audit Deduplikasi & Partisi Bebas Bocor",
    body: (
      <>
        Citra fundus dipotong memakai <code>circular_roi_crop</code> dan dipangkas 15% dari tepi untuk menghilangkan
        bingkai hitam kamera. Kemiripan dihitung melalui konjungsi <code>pHash &lt;= 4</code> dan{" "}
        <code>dHash &lt;= 4</code> agar salinan pasien yang sama masuk ke satu klaster utuh pada{" "}
        <code>StratifiedGroupKFold</code> (5 fold, fold 0 terkunci sebagai uji akhir).
      </>
    ),
  },
  {
    index: "02",
    title: "Gerbang Kualitas OpenCV Sebelum Inferensi",
    body: (
      <>
        Setiap unggahan diperiksa rasio cakram terang, rasio kanal merah terhadap biru (&gt;= 1,25) dan hijau
        (&gt;= 1,03), serta variansi Laplacian pada radius 85% cakram retina. Gambar bukan fundus langsung ditolak;
        citra buram tetap diberi peringatan kualitas rendah.
      </>
    ),
  },
  {
    index: "03",
    title: "Ablasi E1 hingga E4 & Ekspor ONNX",
    body: (
      <>
        Pipeline menguji empat metode prapemrosesan klasik (raw_resize, crop_only, lab_clahe, ben_graham), tiga
        arsitektur lintas generasi (ResNet-50, EfficientNet-B0, ConvNeXt-V2-Tiny), serta empat skema loss ordinal
        (CE polos, CE bobot tunggal tanpa penggandaan, CORN, Smooth L1) sebelum kalibrasi Temperature Scaling dan
        ekspor ONNX dua keluaran (<code>raw_output</code>, <code>cam_maps</code>).
      </>
    ),
  },
  {
    index: "04",
    title: "Batasan Klinis & Interpretabilitas Grad-CAM++",
    body: (
      <>
        Peta panas Grad-CAM++ memperlihatkan area yang paling memengaruhi keluaran jaringan saraf, bukan segmentasi
        mikroaneurisma atau eksudat berstandar klinis. Perangkat lunak Mydria dibuat untuk keperluan riset dan
        presentasi akademik UAS Visi Komputer, bukan alat diagnosis medis resmi.
      </>
    ),
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
          Spesifikasi teknis pipeline Paket B serta batasan penggunaan prototipe akademik.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-10 divide-y divide-[var(--border-hairline)] sm:grid-cols-2 sm:divide-y-0">
        {SPEC_SECTIONS.map((sec) => (
          <div key={sec.index} className="border-t border-[var(--border-hairline)] py-5">
            <div className="flex items-baseline gap-3">
              <span className="tabular-nums text-xs font-semibold text-[var(--accent-signal)]">
                {sec.index}
              </span>
              <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">{sec.title}</h2>
            </div>
            <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{sec.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
