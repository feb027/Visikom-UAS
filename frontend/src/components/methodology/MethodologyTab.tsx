export function MethodologyTab() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1
          className="m-0 font-bold tracking-[-0.02em] text-[var(--text-primary)]"
          style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
        >
          Metodologi &amp; Batasan Sistem
        </h1>
        <p className="m-0 text-sm text-[var(--text-secondary)]">
          Ringkasan alur riset visi komputer Paket B, kalibrasi kepercayaan, serta ruang lingkup akademik proyek UAS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
          <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
            1. Audit Deduplikasi &amp; Pemisahan Bebas Bocor
          </h2>
          <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
            Citra fundus dipotong dulu memakai <code>circular_roi_crop</code> serta dipangkas 15% dari tepi untuk
            membuang bingkai hitam kamera. Kemiripan dihitung lewat konjungsi <code>pHash &lt;= 4</code> dan{" "}
            <code>dHash &lt;= 4</code> agar salinan pasien yang sama dikelompokkan dalam satu klaster utuh sebelum masuk ke{" "}
            <code>StratifiedGroupKFold</code> (5 fold, fold 0 terkunci sebagai uji akhir).
          </p>
        </section>

        <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
          <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
            2. Gerbang Kualitas OpenCV Sebelum Inferensi
          </h2>
          <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
            Setiap unggahan diperiksa rasio cakram terang, rasio kanal merah terhadap biru (&gt;= 1,25) dan hijau
            (&gt;= 1,03), serta variansi Laplacian pada radius 85% cakram retina. Gambar bukan fundus langsung ditolak;
            citra buram tetap diperingatkan.
          </p>
        </section>

        <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
          <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
            3. Ablasi Terstruktur E1 hingga E4 &amp; ONNX
          </h2>
          <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
            Pipeline menguji prapemrosesan klasik (raw_resize, crop_only, lab_clahe, ben_graham), membandingkan tiga
            arsitektur (ResNet-50, EfficientNet-B0, ConvNeXt-V2-Tiny), menguji <em>loss</em> ordinal (CE, CE berbobot
            tunggal tanpa penggandaan, CORN, dan Smooth L1), lalu mengekspor model terkalibrasi <em>Temperature Scaling</em>{" "}
            ke format ONNX berkeluaran ganda (<code>raw_output</code>, <code>cam_maps</code>).
          </p>
        </section>

        <section className="rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-surface-1)] p-4 sm:p-5">
          <h2 className="m-0 text-base font-semibold text-[var(--text-primary)]">
            4. Batasan Klinis &amp; Interpretabilitas Grad-CAM++
          </h2>
          <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
            Peta panas Grad-CAM++ menggambarkan wilayah yang paling memengaruhi skor keluaran jaringan saraf, bukan
            anotasi segmentasi lesi mikroaneurisma berstandar klinis. Sistem Mydria dibangun semata untuk riset dan
            demonstrasi akademik UAS Visi Komputer, bukan pengganti diagnosis dokter spesialis mata.
          </p>
        </section>
      </div>
    </div>
  );
}
