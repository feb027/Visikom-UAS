# Project Brief: Klasifikasi Tingkat Keparahan Retinopati Diabetik (APTOS 2019)

## 1. Identitas Proyek

- **Mata Kuliah:** Visi Komputer dan Robotika (Semester 7)
- **Tim Pelaksana:** Kelompok beranggotakan 5 orang
  - `[ANGGOTA 1]`: Kurasi dataset, audit duplikasi (`pHash`), dan partisi bebas kebocoran data
  - `[ANGGOTA 2]`: Modul Visi Komputer klasik (pemotongan ROI lingkaran retina, *Lab-CLAHE*, Ben Graham, gerbang kualitas OpenCV)
  - `[ANGGOTA 3]`: Pelatihan baseline dan pembanding arsitektur (`ResNet-50`, `EfficientNet-B0`, dan kandidat modern)
  - `[ANGGOTA 4]`: Eksperimen fungsi *loss* (penanganan ketimpangan kelas dan regresi ordinal), kalibrasi probabilitas, dan `Grad-CAM++`
  - `[ANGGOTA 5]`: Ekspor model (`ONNX Runtime` / `onnxruntime-directml`), spesifikasi [DESIGN.md](../DESIGN.md), pembangunan web *mobile-first* (`React + FastAPI`), integrasi sistem, dan kompilasi laporan
- **Dataset Utama:** APTOS 2019 Blindness Detection (`3.662` citra berlabel pada `train.csv` dalam lima kelas: `0 No DR`, `1 Mild`, `2 Moderate`, `3 Severe`, `4 Proliferative DR`) `[S001]`.
- **Batasan Etika dan Akademik:** Sistem berstatus prototipe pembelajaran dan penelitian akademik, bukan alat diagnosis klinis maupun pengganti pemeriksaan dokter mata.

## 2. Ringkasan Draf Outline Awal Tim (5 Halaman)

Draf outline awal mengusulkan judul *"Implementasi dan Perbandingan Arsitektur ResNet50 dan EfficientNetB0 untuk Klasifikasi Tingkat Keparahan Retinopati Diabetik Menggunakan Dataset APTOS 2019"* dengan rincian rencana berikut:

1. **Rumusan Masalah dan Tujuan:** Membangun model klasifikasi lima kelas menggunakan *transfer learning*, membandingkan performa `ResNet-50` dan `EfficientNet-B0` secara terukur, mengevaluasi performa per kelas, dan menyajikan hasil lewat aplikasi Streamlit sederhana.
2. **Metodologi:** Persiapan dataset, pembagian *stratified*, *resize* ke `224 x 224` piksel, normalisasi piksel, augmentasi hanya pada data latih, *class weighting* atau *sampling*, *early stopping*, serta evaluasi memakai *Accuracy*, *Precision*, *Recall*, *F1-score*, *Confusion Matrix*, dan *Quadratic Weighted Kappa* (QWK).
3. **Jadwal Awal (7 Minggu):** Studi literatur (Minggu 1), eksplorasi dan prapemrosesan (Minggu 2), pelatihan dua model (Minggu 3 sampai 4), evaluasi (Minggu 5), integrasi aplikasi (Minggu 6), dan laporan (Minggu 7).

## 3. Keputusan Arsitektur yang Telah Dikunci (`2026-11-17`)

Berdasarkan temuan teknis pada [01-audit-outline-dan-opsi.md](research/01-audit-outline-dan-opsi.md) dan [03-riset-ui-mobile-apple-dan-komputasi.md](research/03-riset-ui-mobile-apple-dan-komputasi.md), tim telah menyepakati paket arsitektur berikut (rincian eksekusi pada [02-detail-implementasi-paket-b.md](02-detail-implementasi-paket-b.md)):

1. **Pilihan Paket Ruang Lingkup (`Paket B`):** Menjalankan perbaikan penuh outline awal berupa ablasi prapemrosesan Visi Komputer (`Raw` vs `Circle Crop` vs `Lab-CLAHE` vs `Ben Graham`), pembandingan 3 arsitektur lintas generasi (`ResNet-50`, `EfficientNet-B0`, `ConvNeXt-V2-Tiny`), pembandingan *loss* ordinal (`CORN` dan `SmoothL1Loss`) melawan `CrossEntropy`, kalibrasi *Temperature Scaling*, `Grad-CAM++`, gerbang kualitas OpenCV, serta ekspor ONNX.
2. **Nama Kerja Sementara Aplikasi (`Mydria`):** Ditetapkan sebagai nama kerja sementara yang berakar dari istilah oftalmologi *midriasis* hingga lima anggota kelompok menyepakati nama akhir bersama (`R-23`).
3. **Strategi Komputasi Hybrid:** Pelatihan model PyTorch dijalankan di Kaggle Notebook atau Google Colab (karena GPU lokal `AMD Radeon RX 6600` belum didukung pada matriks resmi PyTorch ROCm Windows `[S022]`), sedangkan olah data OpenCV, pengembangan web, dan inferensi lokal melalui `onnxruntime-directml` `[S023]` berjalan di PC lokal (`Intel Core i5-12400F`, `RX 6600`, RAM `15,8 GB`).
4. **Arsitektur Antarmuka Aplikasi (`Web Mobile-First`):** Menggantikan Streamlit dengan aplikasi web progresif *mobile-first* bergaya Apple (`React + TypeScript + Vite + Tailwind CSS v4` bersama backend `FastAPI`) berpanduan [DESIGN.md](../DESIGN.md).
