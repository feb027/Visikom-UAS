# DESIGN.md: Sistem Desain Web Mobile-First Instrumen Skrining Retina

> Dokumen ini berfungsi sebagai spesifikasi visual dan komponen antarmuka (data rujukan untuk dibangun di React, Vite, dan Tailwind CSS v4) sesuai aturan `R-37` pada `antislop`.

## 1. Design Read dan Tiga Dial (`R-37`)

* **Design Read:** Reading this as: *mobile-first Progressive Web App* pemeriksaan dan edukasi visual citra fundus retinopati diabetik bagi mahasiswa, dosen penguji, dan peneliti mata kuliah Visi Komputer, dengan gaya visual **Apple Clinical Instrument** (kanvas berlapis tenang, kontras optik ruang gelap pada penampil retina, tipografi presisi `tabular-nums`, bebas gradien dan hiasan generik), dial `ENERGY 1 / RHYTHM 2 / MOTION 2`.
* **ENERGY 1 (*Calm Clinical Precision*):** Informasi klinis dan hasil prediksi disajikan jernih tanpa elemen promosi, tanpa warna mencolok berlebihan, dan tanpa kartu statistik tiruan.
* **RHYTHM 2 (*Structured with Optical Focal Contrast*):** Pada setiap layar pemeriksaan, penampil optik retina menjadi titik fokus tunggal, diikuti kartu tingkat keparahan ordinal dan ringkasan kualitas citra secara terstruktur.
* **MOTION 2 (*Tactile iOS Sheet and Segmented Transitions*):** Transisi hanya dipakai untuk perpindahan kontrol segmen, buka-tutup *bottom sheet* (`<dialog>`), dan perubahan status pemuatan tahapan nyata. Seluruh animasi wajib tunduk pada `@media (prefers-reduced-motion: reduce)` (`R-39`) dan tanpa perulangan tanpa henti (`R-19`).
* **Identitas Merek Sementara (`R-23`):** Nama kerja sementara aplikasi ini adalah **`Mydria`** (diambil dari istilah oftalmologi *midriasis*, yaitu pelebaran pupil sebelum pemotretan kamera fundus retina). Gunakan tipografi polos `Mydria` tanpa logo atau avatar fiktif sampai kelima anggota kelompok menetapkan nama serta identitas visual akhir.

---

## 2. Sistem Warna dan Kontras WCAG AA (`R-21`, `R-25`, `R-29`, `R-34`)

Aplikasi mendukung dua tema fungsional dengan tombol ganti tema yang bekerja penuh di setiap komponen (`R-34`).

### 2.1 Mode Terang Default (*Clinical Daylight*)
Alasan pemilihan (`R-01`, `R-21`): keterbacaan bersih untuk presentasi proyektor siang hari dan penggunaan layar ponsel di ruang kelas, terinspirasi struktur kartu berlapis pada *Apple Health* dan pedoman desain Apple `[S024, S025]`.

| Token | Nilai Hex | Peran Visual | Rasio Kontras Teruji |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#F2F2F7` | Kanvas dasar halaman bergrup | Dasar permukaan |
| `--bg-surface-1` | `#FFFFFF` | Kartu konten utama (dipisahkan lewat kontras kanvas, bukan bayangan kabur besar) | Dasar kartu |
| `--bg-surface-2` | `#E5E5EA` | Trek kontrol segmen iOS dan baris tertekan | Pemisah permukaan |
| `--border-hairline` | `#D1D1D6` | Garis pemisah tipis `1px` antarelemen | Struktural |
| `--text-primary` | `#111114` | Judul layar, hasil kelas utama, nilai metrik | `18,85:1` di `#FFFFFF`, `16,89:1` di `#F2F2F7` (`PASS` AA) |
| `--text-secondary` | `#52525B` | Label meta, keterangan sekunder, subjudul | `7,73:1` di `#FFFFFF`, `6,93:1` di `#F2F2F7` (`PASS` AA) |
| `--accent-primary` | `#0066CC` | Aksen tunggal tindakan utama (CTA unggah/analisis dan tab aktif) | `5,57:1` dengan teks `#FFFFFF` (`PASS` AA) |

### 2.2 Mode Gelap (*Ophthalmic Darkroom*)
Alasan pemilihan (`R-21`): pada praktik pencitraan fundus, pengamat sering mengamati lesi mikroaneurisma dan perdarahan halus di ruangan redup agar pantulan layar terang tidak menyilaukan mata.

| Token | Nilai Hex | Peran Visual | Rasio Kontras Teruji |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#090A0F` | Kanvas dasar gelap ruang pemeriksaan | Dasar permukaan |
| `--bg-surface-1` | `#16181F` | Kartu grup tingkat pertama | Dasar kartu |
| `--bg-surface-2` | `#242731` | Trek kontrol segmen dan tombol sekunder | Pemisah permukaan |
| `--border-hairline` | `#2A2E3B` | Garis pemisah tipis antarkartu | Struktural |
| `--text-primary` | `#F5F5F7` | Judul dan angka utama | `18,16:1` di `#090A0F`, `16,28:1` di `#16181F` (`PASS` AA) |
| `--text-secondary` | `#A1A1AA` | Label meta dan catatan sekunder | `6,92:1` di `#16181F` (`PASS` AA) |
| `--accent-link` | `#0A84FF` | Indikator tab aktif dan tautan interaktif | `5,42:1` di `#090A0F` (`PASS` AA) |
| `--accent-button-bg` | `#005BB5` | Latar tombol CTA utama pada mode gelap | `6,64:1` dengan teks `#FFFFFF` (`PASS` AA) |

### 2.3 Token Semantik Lima Tingkat Keparahan Retinopati Diabetik
Setiap lencana kelas wajib menampilkan warna, nomor tingkat (`Grade 0` sampai `Grade 4`), nama kategori, serta status rujukan (`Non-Referable` untuk `0-1`, `Referable DR` untuk `2-4`) agar tidak mengandalkan warna semata (`antislop-human`).

| Tingkat | Mode Terang (Latar / Teks) | Kontras Terang | Mode Gelap (Latar / Teks) | Kontras Gelap |
| :--- | :--- | :---: | :--- | :---: |
| `Grade 0` (*No DR*) | `#ECFDF3` / `#065F46` | `7,29:1` (`PASS`) | `#06281E` / `#6EE7B7` | `10,36:1` (`PASS`) |
| `Grade 1` (*Mild*) | `#EFF6FF` / `#1E40AF` | `8,01:1` (`PASS`) | `#0F2342` / `#93C5FD` | `8,69:1` (`PASS`) |
| `Grade 2` (*Moderate / Rujukan*) | `#FFFBEB` / `#92400E` | `6,84:1` (`PASS`) | `#2E2008` / `#FCD34D` | `10,98:1` (`PASS`) |
| `Grade 3` (*Severe*) | `#FFF7ED` / `#9A3412` | `6,88:1` (`PASS`) | `#321709` / `#FDBA74` | `9,87:1` (`PASS`) |
| `Grade 4` (*Proliferative DR*) | `#FEF2F2` / `#991B1B` | `7,60:1` (`PASS`) | `#311114` / `#FCA5A5` | `9,06:1` (`PASS`) |

---

## 3. Tipografi, Spasi, dan Tata Bahasa Radius (`R-06`, `R-10`, `R-11`, `R-12`, `R-13`)

* **Tumpukan Font dan Alasan (`R-06`):** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif`. Pemilihan keluarga font ini menjaga tampilan asli sistem iOS/macOS sekaligus menyediakan cadangan netral di Windows/Android `[S024, S025]`.
* **Angka Sejajar (`tabular-nums`):** Seluruh skor kepercayaan (`%`), jarak skor ordinal, variansi Laplacian, dan waktu inferensi ONNX (`ms`) wajib memakai `font-variant-numeric: tabular-nums` agar angka tidak bergeser saat berpindah model `[S025]`.
* **Skala Ukuran Fluida (`clamp()`):**
  * Judul layar (*Screen Title*): `clamp(1.5rem, 1.2rem + 1.4vw, 2rem)`, bobot `700`, *letter-spacing* `-0.02em`.
  * Judul hasil prediksi (*Result Headline*): `clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem)`, bobot `600`.
  * Angka sorotan (*Confidence Hero*): `clamp(2rem, 1.6rem + 1.5vw, 2.75rem)`, bobot `700`, *line-height* `1.05`.
  * Teks isi standar: `1rem` (`16px` dasar agar ramah perbesaran hingga `200%`), *line-height* `1.5`.
  * Label meta dan teks kecil: `0.875rem` (`14px`) dan `0.75rem` (`12px` hanya untuk label tab bawah).
* **Skala Spasi Berbasis `8px` (`[S024]`):** `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`. Margin luar layar ponsel `16px` kiri-kanan; jarak antarbagian kartu `16px`.
* **Tata Bahasa Radius Bertingkat (`R-11`, dilarang menyeragamkan seluruh elemen menjadi pil):**
  * `8px`: trek kontrol segmen iOS (`Asli | Lab-CLAHE | Ben Graham | Grad-CAM++`) dan kotak contoh mini.
  * `12px`: tombol aksi utama dan lencana status tingkat keparahan.
  * `18px`: kartu grup informasi (*Severity Card*, *Quality Gate Card*, *Model Comparison Card*).
  * `22px`: sudut atas `<dialog>` *bottom sheet* pada tampilan mobile.
  * `50%`: khusus bingkai apertur bundar citra fundus retina.
* **Batasan Efek Visual (`R-01`, `R-10`, `R-12`, `R-13`):**
  * *Glassmorphism (`R-10`):* `backdrop-filter: blur(20px)` hanya digunakan pada *Bottom Tab Bar* (dan *sticky top bar* tipis `48px`), dilarang dipakai pada kartu konten.
  * *Gradien & Glow (`R-01`, `R-13`):* nol gradien latar belakang ungu-biru dan nol efek *glow* dekoratif.
  * *Bayangan (`R-12`):* kartu duduk rata tanpa bayangan kabur besar; elevasi hanya dipakai ringan pada tombol *segmented pill* yang sedang aktif dan `<dialog>` *modal sheet*.

---

## 4. Motif Identitas dan Komponen Utama (`R-20`, `R-26`, `R-39`)

1. **Optical Aperture Retina Viewer:**
   * Kotak tampilan berlatar hitam optik `#050608` (tetap gelap pada kedua tema supaya lesi fundus dan overlay peta panas tetap kontras), disertai lingkaran pemusat citra retina dengan dimensi eksplisit (`aspect-ratio: 1 / 1`) untuk mencegah pergeseran tata letak (`R-40`).
   * Di bawah bingkai terdapat kontrol segmen 4 mode nyata: `Asli`, `Lab-CLAHE`, `Ben Graham`, dan `Grad-CAM++`. Ketuk citra membuka tampilan perbesar ringan atau membandingkan dua lapisan dengan kontrol keyboard/tombol yang dapat difokuskan (`R-32`, `R-39`).
2. **Image Quality and Domain Gate Card (`[S011]`):**
   * Menampilkan hasil pemeriksaan OpenCV sebelum atau bersama hasil prediksi: status verifikasi objek fundus (rasio bidang gelap dan spektrum warna retina) serta skor ketajaman Laplacian (`Jernih` / `Perlu Perhatian: Buram`).
3. **5-Step Ordinal Severity Strip:**
   * Menampilkan lima batang probabilitas berurutan (`0 No DR` sampai `4 Proliferative DR`) dalam persentase terkalibrasi *Temperature Scaling* `[S018]`. Menyajikan teks status rujukan (`Non-Referable` vs `Referable DR` `[S002]`) dan catatan batas *Grad-CAM++* (`[S017]`).
4. **Control & Navigation Rules (`R-24`, `R-26`, `R-39`):**
   * Hanya terdapat tiga tab navigasi yang benar-benar ada isinya: `Pemeriksaan`, `Komparasi Model`, dan `Metodologi & Batasan`.
   * Seluruh tombol aksi memakai `<button type="button">` asli dengan `cursor: pointer`, target sentuh minimal `44 x 44px`, dan garis fokus `:focus-visible` minimal kontras `3:1`. Rincian metrik atau penjelasan panjang dibuka memakai elemen `<dialog>` asli yang dapat ditutup lewat tombol `Escape`.

---

## 5. Tata Letak Responsif Tiga Tahap (`R-03`, `antislop-layoutmobile`)

Tata letak dirancang terlebih dahulu untuk layar ponsel sempit, lalu beradaptasi pada tablet dan desktop proyektor tanpa menjadi satu tumpukan yang melar.

1. **Phone (`< 640px`, Desain Utama):**
   * Satu kolom vertikal dalam genggaman ibu jari; header tipis `48px` memuat teks merek `Mydria` dan tombol alih tema.
   * Tombol unggah berkas dan pemilih contoh berada dalam jangkauan ibu jari (tinggi minimal `48px`).
   * *Bottom Tab Bar* tetap di bagian bawah setinggi `60px + env(safe-area-inset-bottom)` dengan 3 tab (`Pemeriksaan`, `Komparasi`, `Info`), diimbangi `padding-bottom` halaman `>= 88px` agar kartu terbawah tidak pernah tertutup bar navigasi.
2. **Tablet (`640px` sampai `1023px`, Tahap Tengah):**
   * Navigasi berpindah dari *bottom bar* ke *segmented bar* di bagian atas agar tinggi layar termanfaatkan lebih efisien.
   * Penampil optik retina berada di atas secara terpusat (`max-width: 480px`), sedangkan kartu *Quality Gate* dan *5-Step Ordinal Strip* tersusun dalam kisi dua kolom di bawahnya.
3. **Desktop (`>= 1024px`, Mode Presentasi UAS, `max-width: 1200px`):**
   * Tata letak *split-view* dua kolom: panel kiri (`42%` lebar) mengunci *Optical Aperture Retina Viewer* bersama kontrol segmen prapemrosesan/`Grad-CAM++`; panel kanan (`58%` lebar) menyajikan kartu diagnosis tingkat keparahan terkalibrasi, distribusi 5 tingkat ordinal, telemetri kecepatan `ONNX Runtime DirectML` (`ms`), serta panel pembanding model (`ResNet-50`, `EfficientNet-B0`, `ConvNeXt-V2-Tiny`).

---

## 6. Tiga Status Antarmuka Wajib (`R-27`, `R-38`)

1. **Empty State (Saat Aplikasi Pertama Dibuka):**
   * Penampil optik menampilkan instruksi singkat format yang diterima (`PNG`, `JPG`, `JPEG` citra fundus retina) dan tombol unggah utama (`Pilih Citra Fundus`).
   * Menyediakan **tiga tombol contoh citra nyata dari dataset APTOS 2019** (misalnya contoh `Grade 0`, `Grade 2`, dan `Grade 4` yang disiapkan saat Fase `P3`) agar penguji dapat mencoba seluruh alur dalam satu ketukan tanpa menyiapkan berkas gambar terlebih dahulu. Tidak ada angka prediksi tiruan pada layar kosong (`R-17`, `R-38`).
2. **Loading State (Selama Proses Berjalan):**
   * Menampilkan daftar langkah yang sedang diproses secara berurutan di backend: `1. Validasi domain fundus & ketajaman OpenCV -> 2. Prapemrosesan Circle Crop & Lab-CLAHE -> 3. Inferensi ONNX Runtime & pembuatan peta Grad-CAM++`. Bukan *spinner* kosong tanpa keterangan.
3. **Error / Rejected State (Citra Ditolak atau Gagal Diproses):**
   * Bila pengguna mengunggah foto bukan retina (misalnya tangkapan layar, foto wajah, atau foto objek umum) atau berkas korup, sistem menolak dengan pesan spesifik penyebab kegagalan serta saran tindakan berikutnya (`"Citra tidak memenuhi ciri foto fundus retina (rasio area gelap dan kanal merah di luar ambang). Unggah foto retina atau coba salah satu citra contoh APTOS 2019 di bawah."`).
   * Bila citra fundus lolos deteksi domain namun skor Laplacian di bawah ambang tajam, sistem tetap menampilkan peringatan kualitas kuning (*Blur Warning*) sambil memberi opsi melanjutkan atau mengganti gambar.

---

## 7. Ringkasan Kepatuhan Aturan `antislop`

- `R-01`, `R-13`, `R-29`: palet dibatasi pada kanvas netral, satu aksen biru optik, serta token semantik kelas keparahan yang terverifikasi; bebas gradien AI dan *glow*.
- `R-03`, `R-32`, `R-39`: target sentuh `>= 44px`, tiga *breakpoint* nyata, `tabular-nums`, navigasi keyboard lengkap, dan `prefers-reduced-motion`.
- `R-17`, `R-23`, `R-36`, `R-38`: nol statistik palsu, nol klaim diagnosis medis klinis, serta penetapan nama kerja sementara `Mydria` secara eksplisit tanpa aset gambar atau logo rekaan.
