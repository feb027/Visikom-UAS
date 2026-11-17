# Riset Komputasi Perangkat Keras dan Arsitektur Antarmuka Mobile-First

Dokumen ini mencatat hasil audit kemampuan komputasi PC anggota (`Intel Core i5-12400F`, `AMD Radeon RX 6600`, RAM `15,8 GB`) terhadap dukungan resmi PyTorch di Windows serta rancangan tumpukan aplikasi web *mobile-first* bergaya Apple sebagai pengganti Streamlit.

---

## 1. Audit Komputasi: PC `i5-12400F + RX 6600` Melawan Cloud (`Kaggle` / `Colab`)

Pemeriksaan perangkat keras pada sistem Windows mendeteksi GPU `AMD Radeon RX 6600` (driver `32.0.21045.16010`) dan memori terpasang `15,8 GB` (~`16 GB`), dipadukan dengan prosesor `Intel Core i5-12400F`. Evaluasi terhadap dokumentasi resmi memperlihatkan pemisahan peran yang sangat jelas antara beban pelatihan (*training*) dan beban inferensi/aplikasi.

### 1.1 Mengapa Pelatihan PyTorch Berat Tidak Dianjurkan Langsung di RX 6600 Windows
1. **Batas Dukungan Resmi ROCm di Windows:** Matriks kompatibilitas resmi AMD `ROCm 7.2.1` untuk PyTorch di Windows hanya mendukung arsitektur RDNA 3 dan RDNA 4 (`gfx1100`, `gfx1101`, `gfx1200`, `gfx1201`), yakni seri RX 7000 dan RX 9000 `[S022]`. GPU seri RX 6000 (`gfx1032`, RDNA 2) seperti `RX 6600` belum masuk daftar dukungan PyTorch ROCm resmi pada Windows `[S022]`.
2. **Status `torch-directml`:** Microsoft menyediakan jembatan `torch-directml` berbasis DirectX 12 yang masih berstatus *public preview* `[S023]`. Pada praktiknya, *training* arsitektur modern (`ConvNeXt V2`, `EfficientNet`) dengan *mixed precision* FP16 di DirectML sering terkendala operator yang belum terakselerasi atau berjalan lambat dibanding CUDA.
3. **Kapasitas RAM Sistem (`15,8 GB`):** Membaca dan mengolah citra mentah beresolusi hingga `4288 x 2848` piksel `[S001]` sambil melatih jaringan konvolusi beresolusi `384 x 384` di Windows berisiko kehabisan memori jika jumlah *worker* `DataLoader` tidak dibatasi.

### 1.2 Strategi Hybrid yang Paling Praktis untuk Tim 5 Orang

Alih-alih memaksakan semua pekerjaan di satu tempat, tim dapat membagi beban kerja menjadi dua jalur:

| Tahap Pekerjaan | Perangkat yang Dipakai | Alasan Teknis |
| :--- | :--- | :--- |
| **Pelatihan Model PyTorch (`P4`)** | **Kaggle Notebook** (`T4` / `2x T4`) atau **Google Colab** (`T4 16 GB`) | Dataset APTOS 2019 (`~10,2 GB`) sudah tersimpan langsung di server Kaggle sehingga tidak perlu mengunggah ulang berkas besar; dukungan CUDA PyTorch berjalan tanpa penyesuaian driver `[S001]`. |
| **Deduplikasi `pHash`, Skrip OpenCV, dan Uji Gerbang Kualitas (`P2-P3`)** | **PC Lokal (`i5-12400F`, RAM `15,8 GB`)** | Operasi OpenCV, hashing perseptual, dan prapemrosesan `Circle Crop + Lab-CLAHE` berjalan di CPU 6-core secara cepat tanpa kuota waktu cloud. |
| **Inferensi Aplikasi dan Demo Presentasi (`P5-P6`)** | **PC Lokal (`i5-12400F` + `RX 6600`) via `onnxruntime-directml`** | Model PyTorch yang sudah selesai dilatih di Kaggle diekspor ke `.onnx`. Di Windows, `onnxruntime-directml` mengakselerasi inferensi `.onnx` langsung pada GPU DirectX 12 (termasuk `RX 6600`) dalam hitungan milidetik secara offline saat presentasi UAS `[S023]`. |

---

## 2. Alasan Mengganti Streamlit ke Web Mobile-First Modern

Outline awal mencantumkan Streamlit sebagai antarmuka aplikasi. Untuk target tampilan *mobile-first* bergaya Apple yang halus dan bebas AI slop, Streamlit memiliki tiga keterbatasan bawaan:

1. **Siklus *Rerun* Menyeluruh:** Setiap perpindahan tab atau tombol filter citra (`Asli` ke `Lab-CLAHE` ke `Grad-CAM++`) memicu eksekusi ulang skrip Python dari atas ke bawah sehingga terasa tersendat di ponsel.
2. **Kendala Tata Letak Mobile & Aksesibilitas:** Komponen bawaan Streamlit menggunakan *sidebar* desktop yang kaku, sulit diatur *safe-area-inset* bawah pada layar ponsel, dan tidak memiliki kontrol penuh atas `<dialog>` *bottom sheet* maupun animasi terukur.
3. **Keterbatasan Token Desain:** Kustomisasi gaya di Streamlit sering berakhir menjadi *CSS override* rapuh terhadap DOM internal Streamlit.

### Tumpukan Teknologi Aplikasi Pengganti

| Lapisan | Teknologi Terpilih | Peran Spesifik |
| :--- | :--- | :--- |
| **Frontend (Mobile-First PWA)** | `React` + `TypeScript` + `Vite` + `Tailwind CSS v4` | Mengimplementasikan token warna, tipografi `tabular-nums`, kontrol segmen iOS, `<dialog>` *bottom sheet*, serta responsivitas 3 tahap dari [DESIGN.md](../../DESIGN.md). |
| **Backend API & Pengolahan Citra** | `FastAPI` + `OpenCV` + `Pillow` + `pytorch-grad-cam` | Menjalankan validasi domain fundus, perhitungan skor blur Laplacian, pembuatan citra `Lab-CLAHE` dan `Ben Graham`, serta overlay `Grad-CAM++`. |
| **Mesin Inferensi Lokal** | `onnxruntime-directml` (cadangan `onnxruntime` CPU) | Mengeksekusi model `.onnx` hasil ekspor Kaggle/Colab secara lokal pada GPU `RX 6600` maupun CPU laptop anggota tim `[S023]`. |

---

## 3. Sintesis Riset Desain Gaya Apple untuk Instrumen Klinis

Penelusuran contoh `DESIGN.md` nyata dari `VoltAgent/awesome-design-md` `[S024]`, `Meliwat/awesome-ios-design-md` (`apple-fitness`, `oura`, `noom`) `[S025]`, dan *Apple Human Interface Guidelines* `[S026]` merumuskan lima prinsip yang langsung diterapkan pada [DESIGN.md](../../DESIGN.md):

1. **Hierarki Permukaan, Bukan Bayangan Berat:** Antarmuka mobile Apple memisahkan kartu konten (`#FFFFFF` di mode terang, `#16181F` di mode gelap) dari kanvas dasar (`#F2F2F7` terang, `#090A0F` gelap) lewat kontras warna permukaan dan garis tipis, bukan bayangan kabur besar di setiap kotak `[S025]`.
2. **Satu Fokus Optik dan Nol Gradien Hiasan:** Situs dan aplikasi Apple menghindari gradien ungu-biru dekoratif `[S024]`. Pada aplikasi retina, foto fundus berada dalam bingkai gelap optik `#050608` agar lesi kecil terlihat jelas, sementara sisa layar tetap tenang.
3. **Presisi Angka dengan `tabular-nums`:** Seluruh angka probabilitas lima kelas dan latensi inferensi (`ms`) memakai lebar digit seragam sehingga baris data tidak bergetar saat model diganti `[S025]`.
4. **Kepatuhan Etika HIG:** *Apple Human Interface Guidelines* melarang pemakaian elemen *Activity Rings* untuk tujuan di luar metrik *Move/Exercise/Stand* Apple `[S026]`. Oleh sebab itu, skor lima tingkat keparahan DR memakai komponen asli *5-Step Ordinal Severity Strip* yang mencantumkan label tingkat (`Grade 0` sampai `4`), kategori, dan status rujukan (`Non-Referable` vs `Referable DR`).
5. **Verifikasi Kontras WCAG AA Terukur:** Seluruh pasangan teks, aksen biru `#0066CC` / `#005BB5`, serta lima warna status klinis telah diuji memakai kalkulator kontras `antislop-human` dengan rasio antara `5,42:1` hingga `18,85:1`.
