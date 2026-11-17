# Detail Implementasi Paket B: Arsitektur Sistem, Matriks Eksperimen, dan Kontrak API

Dokumen ini menjadi panduan teknis bersama bagi kelima anggota tim dalam mengeksekusi **Paket B** untuk prototipe **Mydria** (*nama kerja sementara*, merujuk pada istilah oftalmologi *midriasis*). Seluruh rancangan menjaga konsistensi penuh antara tahap pelatihan di Kaggle/Colab dan inferensi lokal pada PC `Intel Core i5-12400F + AMD Radeon RX 6600`.

---

## 1. Struktur Direktori Monorepo dan Prinsip *Zero Train-Serve Skew*

Kesalahan umum dalam proyek klasifikasi citra adalah menulis kode prapemrosesan di dalam *notebook* pelatihan lalu menulis ulang versi berbeda di backend aplikasi. Untuk mencegah *train-serve skew*, seluruh logika audit data, pemotongan ROI retina, peningkatan kontras, dan gerbang kualitas dikemas ke dalam satu paket Python bersama `src/visikom_dr/`:

```text
Visikom-UAS/
|-- DESIGN.md                     # Sistem desain antarmuka mobile-first Mydria
|-- pyproject.toml                # Konfigurasi paket visikom-dr dan dependensi
|-- src/visikom_dr/               # Paket inti dipakai bersama saat train & serve
|   |-- __init__.py
|   |-- audit_dataset.py          # [P2] Deduplikasi pHash/dHash & split bebas bocor
|   |-- preprocessing.py          # [P3] Circle crop, resize 384px, Lab-CLAHE, Ben Graham
|   |-- quality_gate.py           # [P3] Penolak non-fundus & detektor buram Laplacian
|   |-- models.py                 # [P4] Definisi timm ResNet-50, EfficientNet-B0, ConvNeXt-V2
|   |-- losses.py                 # [P4] CrossEntropy single-rebalance, CORN, SmoothL1Loss
|   `-- calibration_xai.py        # [P5] Temperature Scaling, Grad-CAM++, ekspor ONNX
|-- notebooks/                    # [P4] Skrip/notebook pelatihan untuk Kaggle / Colab
|-- backend/                      # [P6] Server FastAPI + onnxruntime-directml
|-- frontend/                     # [P6] Aplikasi PWA React + TypeScript + Vite + Tailwind v4
|-- tests/                        # Uji unit otomatis untuk seluruh modul Python
`-- docs/                         # Dokumentasi riset, log progres, dan laporan akhir
```

---

## 2. Protokol Partisi Tetap dan Matriks Eksperimen (`E1` sampai `E4`)

### 2.1 Protokol Audit dan Pemisahan Data (`P2`)
Seluruh `3.662` citra berlabel pada `train.csv` APTOS 2019 `[S001]` diproses lebih dahulu oleh `visikom_dr.audit_dataset` sebelum pelatihan dimulai:

1. **Deteksi Duplikat Lintas Sampel:** Menghitung *perceptual hash* 64-bit (`pHash` berbasis DCT `32 x 32` dan `dHash` gradien `9 x 8`) pada citra abu-abu. Pasangan dengan jarak Hamming `pHash <= 6` atau `dHash <= 6` digabungkan ke satu klaster *Union-Find* untuk menangkap salinan identik maupun foto mata yang berbeda label dokter `[S020]`.
2. **Partisi Berstrata Berbasis Klaster:** Klaster utuh dibagi menjadi `5` *fold* berstrata sehingga `cluster_id` yang sama tidak pernah berada di data latih dan data uji sekaligus. `Fold 0` (`~20%` data, sekitar `732` citra) dikunci permanen sebagai *held-out test set*; `Fold 1` sampai `4` (`~80%`) dipakai sebagai data pelatihan dan validasi silang.
3. **Resolusi Masukan:** Seluruh eksperimen utama memakai resolusi `384 x 384` piksel setelah pemotongan margin hitam retina (`circular_roi_crop`) agar lesi mikroaneurisma Kelas 1 tetap terbaca `[S001, S019]`.

### 2.2 Matriks Eksperimen `E1` sampai `E4`

| ID Eksperimen | Variabel yang Diuji | Konfigurasi Kontrol Tetap | Metrik Penentu & Tujuan |
| :--- | :--- | :--- | :--- |
| **`E1` (Ablasi Visikom Klasik)** | `E1a` *Raw resize* vs `E1b` `Circle Crop` vs `E1c` `Circle Crop + Lab-CLAHE` `[S012, S013]` vs `E1d` `Circle Crop + Ben Graham` `[S012]` | Backbone `EfficientNet-B0`, *loss* `CrossEntropy` standar, resolusi `384 x 384` (`E1a` pada `384 x 384` tanpa crop) | QWK validasi, *Macro F1*, dan *Recall* Kelas 1 (*Mild DR*) |
| **`E2` (Komparasi 3 Arsitektur)** | `ResNet-50` `[S003]` vs `EfficientNet-B0` `[S004]` vs `ConvNeXt-V2-Tiny` `[S007]` | Prapemrosesan terbaik dari `E1`, split `Fold 1-4`, resolusi `384 x 384` | QWK, *Macro F1*, jumlah parameter, dan kecepatan konvergensi per *epoch* |
| **`E3` (Ablasi *Loss* & *Imbalance*)** | `E3a` `CrossEntropy` polos vs `E3b` `CE + Single Rebalancing` vs `E3c` `CORN` `[S014]` vs `E3d` `SmoothL1Loss` + ambang *Nelder-Mead* `[S019]` | Arsitektur terbaik dari `E2`, prapemrosesan terbaik dari `E1` | QWK, F1 per kelas (memastikan Kelas 2 tidak kolaps ke `0,00` `[S021]`), dan *Referable DR AUC* `[S002]` |
| **`E4` (Kalibrasi, XAI, & Hardware)** | *Temperature Scaling* `[S018]` (sebelum vs sesudah), uji `Grad-CAM++` `[S016]`, dan benchmark ONNX `RX 6600 DirectML` vs `i5-12400F CPU` | Model final terbaik dari `E3` dievaluasi sekali pada *held-out test* (`Fold 0`) | *Expected Calibration Error* (ECE), QWK test, latensi inferensi (`ms/citra`), serta inspeksi kualitatif peta panas |

*[DATA EKSPERIMEN: hasil numerik E1 sampai E4 akan diisi setelah pelatihan di Kaggle/Colab pada Fase P4 selesai.]*

---

## 3. Kontrak API Backend (`FastAPI`) dan Aplikasi Web `Mydria`

Agar antarmuka *mobile-first* di ponsel maupun desktop terasa responsif tanpa *reload* berulang, backend mengolah seluruh varian visual dalam satu permintaan inferensi dan mengirimkan berkas pratinjau ukuran `384 x 384` piksel langsung ke frontend.

### 3.1 Daftar *Endpoint* REST (`/api/v1`)

1. **`GET /api/v1/health`**
   - Mengembalikan status kesiapan server, nama model ONNX aktif, nilai suhu kalibrasi $T$, serta penyedia eksekusi aktif (`DmlExecutionProvider` pada GPU RX 6600 atau cadangan `CPUExecutionProvider` pada i5-12400F `[S023]`).
2. **`GET /api/v1/samples`**
   - Mengembalikan daftar tiga citra contoh nyata APTOS 2019 (mewakili tingkat ringan, rujukan sedang, dan berat) beserta URL gambar pratinjau agar penguji dapat mencoba sistem lewat satu ketukan pada *Empty State* di [DESIGN.md](../DESIGN.md).
3. **`POST /api/v1/inspect`**
   - Menerima unggahan citra multipart (`PNG`, `JPG`, `JPEG`) atau `sample_id` contoh.
   - **Langkah 1 (Gerbang Kualitas):** Menjalankan `assess_fundus_quality` (`visikom_dr.quality_gate`). Apabila gambar terlalu kecil, rusak, atau tidak memenuhi rasio warna/area fundus retina, API segera mengembalikan HTTP `422 Unprocessable Entity` dengan kode `rejected_non_fundus` dan rincian metrik agar UI menampilkan *Error State* yang jelas.
   - **Langkah 2 (Prapemrosesan & Inferensi):** Apabila diterima, backend menjalankan `circular_roi_crop`, menghasilkan varian `original_crop`, `lab_clahe`, dan `ben_graham`, menjalankan inferensi ONNX terkalibrasi *Temperature Scaling*, lalu menyusun overlay `Grad-CAM++`.
   - **Struktur Respons Sukses (`HTTP 200`):** Memuat objek `quality_report` (`blur_warning`, `laplacian_variance`, `roi_area_ratio`), objek `prediction` (`grade_id` `0..4`, `grade_label`, `referable_dr` boolean, `calibrated_probabilities` 5 elemen, `confidence`), objek `telemetry` (`model_name`, `execution_provider`, `latency_ms`), dan objek `visuals` (4 data URI PNG/WebP untuk kontrol segmen `Asli`, `Lab-CLAHE`, `Ben Graham`, `Grad-CAM++`).

---

## 4. Alur Kerja Git Paralel Lima Anggota Tim

Setiap anggota bekerja pada cabang (*branch*) fitur terpisah dari `main` agar tidak saling menimpa kode:

1. `[ANGGOTA 1]` (`feat/p2-data-audit`): menjalankan `python -m visikom_dr.audit_dataset` pada salinan lokal/Kaggle dataset APTOS 2019, lalu meng-commit artefak ringkasan JSON/CSV tanpa meng-commit citra mentah (`data/` diabaikan `.gitignore`).
2. `[ANGGOTA 2]` (`feat/p3-cv-preprocessing`): memvalidasi parameter `preprocessing.py` dan `quality_gate.py` terhadap contoh citra APTOS berderau serta foto non-retina.
3. `[ANGGOTA 3]` (`feat/p4-model-benchmark`): mengeksekusi eksperimen `E1` dan `E2` di Kaggle Notebook memakai paket `visikom_dr`.
4. `[ANGGOTA 4]` (`feat/p4-loss-calibration-xai`): mengeksekusi `E3`, *Temperature Scaling*, evaluasi akhir *held-out test*, dan galeri `Grad-CAM++`.
5. `[ANGGOTA 5]` (`feat/p6-mydria-app`): mengonversi bobot terbaik ke `.onnx`, menjalankan server `FastAPI` + `onnxruntime-directml`, membangun frontend `Mydria` sesuai [DESIGN.md](../DESIGN.md), serta memverifikasi tiga *breakpoint* layar.

**Gerbang Wajib Sebelum *Merge* ke `main`:**
```powershell
python scripts/validate_docs.py
$env:PYTHONPATH="src"; python -m unittest discover -s tests -v
```
Kedua perintah harus keluar dengan kode `0` sebelum cabang digabungkan.
