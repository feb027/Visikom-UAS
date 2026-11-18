# DESIGN.md: Sistem Desain Instrumen Skrining Retina Mydria (Braun Paper & Graphite)

> Spesifikasi visual dan komponen antarmuka untuk aplikasi web *mobile-first* Mydria (React, TypeScript, Vite, Tailwind CSS v4) mengacu pada `antislop` R-37 dan konsep visual **Opsi 1 (*Braun Paper & Graphite*)** yang disetujui melalui sesi `/grill-me`.

---

## 1. Design Read dan Tiga Dial (`R-37`)

* **Design Read:** Instrumen skrining dan edukasi visual citra fundus retinopati diabetik (*mobile-first PWA*) berkarakter **perangkat keras optik Braun / Dieter Rams dan *Apple Health***: permukaan kertas batu hangat (`#F4F3EE`) tanpa kotak *card* bertumpuk (*anti-carditis*), pemisahan hierarki murni melalui garis tipis `1px` dan ruang napas lega, angka metrik berukuran besar `tabular-nums`, *split-comparison swipe slider* langsung di atas cakram retina, pita *filmstrip thumbnail* bundar, serta penunjuk skala taktil `0` hingga `4`.
* **ENERGY 1 (*Calm Hardware Precision*):** Tampilan fokus hanya pada citra retina dan pembacaan numerik penting. Bebas gradien dekoratif, bebas *glow*, bebas *chip* status tiruan.
* **RHYTHM 3 (*Asymmetric Optical Stage + Typographic Hairline Readout*):** Sisi optik (apertur hitam bundar `#07080A`, rel 4 lingkaran sampel/unggah, segmen teks bergaris bawah) berdampingan dengan sisi telemetri numerik (*Grade* raksasa, matriks kualitas 3 kolom OpenCV, penggaris taktil `0..4`, dan distribusi 5 tingkat bergaris tipis) terpisah garis `1px`.
* **MOTION 2 (*Direct Manipulation Split-Slider & Floating Capsule Dock*):** Interaksi geser langsung (`<input type="range">`) pada perbandingan lapisan citra, perpindahan penunjuk penggaris `0..4`, serta transisi halus `<dialog>` modal zoom; tunduk penuh pada `@media (prefers-reduced-motion)` (`R-39`, `R-19`).
* **Identitas Kerja (`R-23`):** Tipografi polos `Mydria` tanpa logo atau avatar rekaan sampai kelima anggota kelompok menetapkan identitas final.

---

## 2. Sistem Warna & Rasio Kontras WCAG AA Teruji

Aplikasi mendukung dua tema fungsional penuh tanpa efek kilas (*anti-FOUC* lewat `<meta name="color-scheme">` dan sinkronisasi lintas tab).

### 2.1 Mode Terang Default (*Braun Warm Paper*)
| Token | Nilai Hex | Peran Visual | Rasio Kontras Teruji |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#F4F3EE` | Kanvas tunggal kertas batu hangat (*tanpa kartu kotak putih*) | Dasar permukaan |
| `--bg-recessed` | `#E6E4DC` | Rel tombol *dock*, penahan *hover*, trek pengukur | `1,15:1` pemisah halus |
| `--border-hairline` | `#D2CFC5` | Garis pemisah tipis `1px` vertikal & horizontal antarzona | Struktural |
| `--text-primary` | `#141413` | Judul, angka raksasa `Grade` & metrik OpenCV | `16,59:1` di `#F4F3EE` (`PASS`) |
| `--text-secondary` | `#575651` | Label meta, keterangan sekunder, subjudul | `6,62:1` di `#F4F3EE` (`PASS`) |
| `--accent-signal` | `#BD3A08` | Oranye sinyal tunggal ala Braun (garis tab aktif, penunjuk penggaris `0..4`, CTA) | `5,01:1` di `#F4F3EE`, `5,57:1` teks `#FFFFFF` (`PASS`) |

### 2.2 Mode Gelap (*Braun Graphite Darkroom*)
Dirancang menyerupai instrumen ruang gelap beranodisasi matte untuk pengamatan fundus di ruang redup (`R-21`).

| Token | Nilai Hex | Peran Visual | Rasio Kontras Teruji |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#111110` | Kanvas tunggal grafit matte gelap | Dasar permukaan |
| `--bg-recessed` | `#252522` | Permukaan aktif segmen dan jalur bar | Pemisah permukaan |
| `--border-hairline` | `#2E2D29` | Garis pemisah struktural `1px` | Struktural |
| `--text-primary` | `#F2F1EC` | Teks dan angka metrik utama | `16,71:1` di `#111110` (`PASS`) |
| `--text-secondary` | `#A6A49B` | Label dan catatan metodologi | `7,56:1` di `#111110` (`PASS`) |
| `--accent-signal` | `#FF6B35` | Oranye sinyal taktil pada mode gelap | `6,66:1` di `#111110`, `6,66:1` teks `#111110` (`PASS`) |

### 2.3 Token Semantik Lima Tingkat Keparahan (`Grade 0` sampai `Grade 4`)
Setiap status tingkat menampilkan label angka (`Grade 0..4`), nama kelas, dan keterangan rujukan klinis (`Non-Referable` vs `Referable DR >= 2`).

---

## 3. Komponen Khas & Penghapusan *Carditis* (`R-05`, `R-11`, `R-20`)

1. **Zero Boxed Cards Policy:** Tidak ada kotak `border rounded-xl` yang membungkus blok hasil, unggahan, kualitas, maupun komparasi. Seluruh bagian duduk langsung di atas kanvas (`--bg-canvas`) dan dipisahkan garis `1px` (`--border-hairline`).
2. **Optical Aperture dengan *Split-Comparison Slider*:**
   * Lingkaran hitam pekat `#07080A` (`aspect-ratio: 1 / 1`, `border-radius: 50%`) menampung citra retina.
   * Mendukung `drag & drop` berkas langsung di atas lingkaran maupun klik tombol zoom kanan-atas untuk memperbesar dalam `<dialog>` native.
   * Bila mode lapisan selain `Asli` aktif (`Lab-CLAHE`, `Ben Graham`, atau `Grad-CAM++`), penampil menampilkan penggeser vertikal tengah (`<input type="range">`) yang membelah **Asli (kiri)** melawan **Lapisan Terproses / Grad-CAM++ (kanan)**.
3. **Filmstrip Thumbnail Bundar + Circle Upload (`4` Lingkaran Sebaris):**
   * Tepat di bawah apertur berjajar `3` *thumbnail* fundus nyata `APTOS 2019` berbentuk bundar (`160x160` ringan dari `/api/examples/{id}/image?thumb=1`) diikuti lingkaran ke-4 tombol `+ Unggah` (`<label htmlFor="fundus-file-input">`).
   * Di bawahnya terdapat pemilih 4 mode bergaya garis bawah sinyal: `Asli | Lab-CLAHE | Ben Graham | Grad-CAM++`.
4. **Telemetri Terbuka Bergaris Tipis (`TelemetryReadout`):**
   * Baris 1: Angka raksasa `Grade {n}` + `{persen}%` `tabular-nums`, lencana rujukan ringkas, serta 1 kalimat arahan.
   * Baris 2: Pembacaan OpenCV 3 kolom sejajar (`Laplacian`, `ROI`, `R/B`).
   * Baris 3: **Braun Tactile Severity Ruler (`0` sampai `4`)**, penggaris 41 garis tik vertikal dengan penunjuk segitiga oranye pada tingkat prediksi.
   * Baris 4: Distribusi 5 kelas probabilitas berjalur tipis (`2px`–`3px`), telemetri runtime ONNX (`Backbone · Provider · ms · T`), serta catatan non-diagnostik.

---

## 4. Tata Letak Responsif & Navigasi (`R-03`, `antislop-layoutmobile`)

* **Desktop (`>= 1024px`, `max-width: 1120px`):** Dua kolom tanpa kotak: sisi kiri (`44%`) mengunci panggung optik bundar dengan pembatas vertikal kanan `1px`; sisi kanan (`56%`) menampilkan pembacaan numerik *Braun hairline*. Header tipis `48px` memuat wordmark `Mydria`, tab teks bergaris bawah di tengah (`Periksa`, `Komparasi`, `Info`), dan *toggle* tema di kanan.
* **Tablet (`640px` sampai `1023px`):** Panggung optik berada terpusat di atas (`max-width: 390px`), pembacaan numerik berada penuh di bawahnya dipisahkan garis `1px`; navigasi berada di header atas.
* **Ponsel (`< 640px`):** Kolom vertikal tunggal dengan panggung optik `max-width: 236px` agar angka `Grade`, metrik `Laplacian / ROI / R/B`, dan penggaris `0..4` terbaca utuh tanpa tertutup navigasi; navigasi menggunakan **Opsi Dock C (*Frosted Segmented Island*)** berbentuk kapsul batu berpil aktif tanpa titik merah (`bottom: calc(12px + env(safe-area-inset-bottom))`, `border-radius: 9999px`) disertai bantalan bawah halaman `>= 96px`.
* **Popup Penjelasan Visual (`<dialog>`):** Mengetuk label ilmiah (`Laplacian`, `ROI`, `R/B`, `Referable DR`, maupun kategori `Grade`) membuka dialog penjelasan berisi diagram visual (`buram vs tajam`, cakram `ROI`, spektrum `R/B`, dan progresi retina `Grade 0..4`) beserta keterangan ringkas berbahasa Indonesia yang mudah dipahami.
* **Tab Komparasi & Info:** Tab `Komparasi` memakai bilah sinyal horizontal presisi tanpa tabel gulir sempit di ponsel; tab `Info` memakai diagram skema vektor `01 -> 02 -> 03 -> 04` beserta 4 lembar spesifikasi bernomor.
