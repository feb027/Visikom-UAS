# Panduan Eksekusi Pelatihan Paket B di Google Colab dan Kaggle Notebook

Dokumen ini menjelaskan cara menjalankan seluruh eksperimen `E1` sampai `E4` menggunakan [paket_b_training_colab_kaggle.ipynb](../notebooks/paket_b_training_colab_kaggle.ipynb), cara membagi pekerjaan GPU ke beberapa akun anggota kelompok secara paralel, serta berkas keluaran yang harus diunduh untuk aplikasi **Mydria**.

---

## 1. Persiapan Akun dan Repositori

1. **Prasyarat Kaggle:** Pastikan akun Kaggle Anda sudah menekan tombol *Join Competition* dan menyetujui aturan pada halaman *APTOS 2019 Blindness Detection* `[S001]`.
2. **Bila Menjalankan di Kaggle Notebook (Disarankan):**
   - Aktifkan **GPU T4** pada panel kanan *Notebook Settings*.
   - Tambahkan dataset kompetisi `aptos2019-blindness-detection` ke panel *Input* sehingga berkas `~10,2 GB` terbaca langsung di `/kaggle/input/aptos2019-blindness-detection` tanpa unduhan ulang.
3. **Bila Menjalankan di Google Colab:**
   - Pilih runtime **T4 GPU** (*Runtime -> Change runtime type*).
   - Siapkan berkas `kaggle.json` (dari *Kaggle -> Settings -> Create New Token*) dan folder `Visikom-UAS-Mydria` di Google Drive untuk menyimpan bobot pelatihan secara otomatis.

---

## 2. Langkah Uji Cepat (*Smoke Test*) dan Pelatihan Penuh

1. Buka langsung [paket_b_training_colab_kaggle.ipynb](../notebooks/paket_b_training_colab_kaggle.ipynb) di Google Colab melalui tautan GitHub publik: `https://colab.research.google.com/github/feb027/Visikom-UAS/blob/main/notebooks/paket_b_training_colab_kaggle.ipynb`.
2. Jalankan pertama kali dengan **`SMOKE_TEST = True`** (pada Sel 2). Langkah ini memeriksa deteksi Drive, unduhan dataset, pembuatan split bebas bocor `P2`, *cache* citra `384 x 384`, pelatihan singkat `2` epoch, serta ekspor `model_best.onnx` ke folder `outputs/smoke/` dalam beberapa menit.
3. Setelah *smoke test* lulus tanpa galat, ubah **`SMOKE_TEST = False`** (`EPOCHS = 15`), lalu jalankan semua sel secara berurutan (`Run All`). Seluruh hasil penuh tersimpan terpisah di Google Drive pada `outputs/full/` dengan mekanisme *auto-resume* (eksperimen yang sudah selesai tidak diulang jika sesi Colab terputus).

---

## 3. Strategi Membagi Pekerjaan GPU Antaranggota Secara Paralel

Agar waktu tunggu pelatihan tidak menumpuk di satu akun saja, `[ANGGOTA 1]`, `[ANGGOTA 3]`, dan `[ANGGOTA 4]` dapat membagi eksperimen menggunakan berkas **`aptos_splits.csv` yang sama persis** (`seed=42`, `holdout_fold=0`):

1. **Akun 1 (Fase `P2` + `E1`):** Jalankan Sel 1 sampai Sel 6 (`E1a_raw`, `E1b_crop`, `E1c_clahe`, `E1d_bengraham`), lalu bagikan berkas `aptos_splits.csv`, `aptos_audit_summary.json`, dan `E1_comparison.csv` ke anggota lain melalui Google Drive atau Git.
2. **Akun 2 (Fase `E2`):** Muat `aptos_splits.csv` hasil Akun 1 dan mode prapemrosesan pemenang `E1`, lalu jalankan Sel 7 (`E2_resnet50`, `E2_effb0`, `E2_convnextv2`).
3. **Akun 3 (Fase `E3` + `E4`):** Muat `aptos_splits.csv` dan *backbone* pemenang `E2`, jalankan Sel 8 (`E3a` sampai `E3d`) dan Sel 9 (`E4` evaluasi *held-out test* serta ekspor `model_best.onnx`).

---

## 4. Berkas Keluaran yang Harus Diunduh ke PC Lokal

Setelah pelatihan selesai, unduh berkas berikut ke repositori lokal di `g:\semester 7\Visikom-UAS\`:

| Berkas dari Colab / Kaggle | Lokasi Tujuan di PC Lokal | Kegunaan |
| :--- | :--- | :--- |
| `model_best.onnx` | `models/weights/model_best.onnx` (di-ignore Git) | Model inferensi utama untuk backend `FastAPI` + `onnxruntime-directml` |
| `model_meta.json` | `models/weights/model_meta.json` | Menyimpan `backbone`, `head_type`, `preprocess_mode`, suhu $T$, dan ambang batas kalibrasi |
| `aptos_audit_summary.json` | `outputs/aptos_audit_summary.json` | Bukti angka audit duplikat `pHash` dan sebaran kelas untuk laporan |
| `E1_comparison.csv`, `E2_comparison.csv`, `E3_comparison.csv`, `E4_heldout_test_metrics.json` | `outputs/` | Tabel perbandingan metrik lengkap untuk laporan UAS dan halaman *Komparasi Model* di aplikasi |
| `gradcam_samples/` | `outputs/gradcam_samples/` | Contoh citra `Grad-CAM++` pada 5 tingkat kelas untuk materi presentasi |
