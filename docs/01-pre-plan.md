# Peta Fase dan Gerbang Kerja Proyek UAS

Setiap fase memiliki gerbang kelulusan biner. Tugas pada fase berikutnya baru dimulai setelah luaran fase aktif terverifikasi.

## P0: Setup Repositori, Aturan Anti-Slop, dan Validator (SELESAI 2026-11-17)

- Menyalin suite skill `antislop` ke `.agents/skills/` dan membuat skill penulisan Bahasa Indonesia `visikom-anti-ai-writing`.
- Menyusun `AGENTS.md`, `.gitignore`, `README.md`, dan skrip `scripts/validate_docs.py`.
- **Gerbang:** `python scripts/validate_docs.py` lulus dengan kode keluar `0`.

## P1: Riset Literatur Terverifikasi, Audit Teknis Outline, dan `DESIGN.md` (SELESAI 2026-11-17)

- Mengumpulkan `26` sumber terverifikasi pada `docs/research/source-ledger.md` dan `references/references.bib`.
- Menyusun audit outline serta tiga paket opsi implementasi di `docs/research/01-audit-outline-dan-opsi.md`, rujukan teknis di `docs/research/02-riset-teknis-visikom-dr.md`, serta riset komputasi dan antarmuka di `docs/research/03-riset-ui-mobile-apple-dan-komputasi.md`.
- Menyusun spesifikasi antarmuka *mobile-first* bergaya Apple di `DESIGN.md` dengan seluruh pasangan warna terverifikasi WCAG AA.
- **Gerbang:** Seluruh angka dan sitasi cocok dengan catatan penelusuran sumber dan validator dokumen lulus.

## P2: Penguncian Keputusan Tim, Modul Audit `pHash`, dan Partisi Data (MODUL SIAP, MENUNGGU RUN DATA)

- Mengunci `Paket B`, nama kerja sementara `Mydria`, alur komputasi *Hybrid* (`Kaggle/Colab` + PC `i5-12400F & RX 6600`), serta spesifikasi `DESIGN.md` dan cetak biru `docs/02-detail-implementasi-paket-b.md` (selesai `2026-11-17`).
- Membangun modul `src/visikom_dr/audit_dataset.py` untuk deteksi klaster duplikat `pHash` dan `dHash` serta pemisahan `StratifiedGroupKFold` bebas kebocoran (lulus uji unit sintetis pada `tests/test_cv_pipeline.py`).
- **Gerbang Akhir P2:** Menjalankan CLI `python -m visikom_dr.audit_dataset` pada salinan asli `3.662` citra APTOS 2019 dan mencatat statistik klaster duplikat nyata.

## P3: Pipeline Visi Komputer Klasik dan Gerbang Kualitas Citra (MODUL SIAP, MENUNGGU VALIDASI CITRA ASLI)

- Membangun `src/visikom_dr/preprocessing.py` (pemotongan ROI lingkaran retina, `resize_square`, `Lab-CLAHE`, dan pengurangan rerata lokal Ben Graham) serta `src/visikom_dr/quality_gate.py` (penolak citra non-fundus dan detektor buram Laplacian), lulus uji unit di `tests/test_cv_pipeline.py`.
- **Gerbang Akhir P3:** Inspeksi visual citra asli APTOS 2019 hasil prapemrosesan lintas lima tingkat kelas serta kalibrasi ambang buram pada foto fundus asli dan non-fundus.

## P4: Pelatihan Baseline, Penantang Modern, dan Ablasi Fungsi *Loss* (MODUL & NOTEBOOK SIAP, MENUNGGU RUN GPU)

- Membangun `src/visikom_dr/metrics.py`, `losses.py` (pelindung *double-rebalancing*, `CORNLoss`, `OptimizedRounder`), `models.py` (`ResNet-50`, `EfficientNet-B0`, `ConvNeXt-V2-Tiny`), `train.py` (*caching* `384 x 384`, `EXPERIMENT_PRESETS`), serta `notebooks/paket_b_training_colab_kaggle.ipynb`.
- **Gerbang Akhir P4:** Menjalankan pelatihan nyata pada APTOS 2019 di Kaggle/Colab (`SMOKE_TEST = False`), menyimpan `E1_comparison.csv`, `E2_comparison.csv`, `E3_comparison.csv`, serta log pelatihan lengkap.

## P5: Evaluasi Terkalibrasi, XAI `Grad-CAM++`, dan Ekspor ONNX DirectML (MODUL SIAP, MENUNGGU BOBOT TERLATIH)

- Membangun `src/visikom_dr/calibration_xai.py` (`TemperatureScaler`, `compute_gradcam_plusplus`, `overlay_heatmap_on_fundus`, dan `export_model_to_onnx` dengan keluaran ganda `raw_output` + `cam_maps`), lulus uji paritas numerik PyTorch vs ONNX Runtime di `tests/test_training_suite.py`.
- **Gerbang Akhir P5:** Mengeksekusi evaluasi sekali pada *held-out test* (`Fold 0`), menghasilkan `model_best.onnx` + `model_meta.json`, dan mengukur latensi inferensi lokal memakai `onnxruntime-directml` (`RX 6600`) serta cadangan CPU (`i5-12400F`).

## P6: Implementasi Aplikasi Web Mobile-First Sesuai `DESIGN.md`, Laporan, dan Presentasi

- Mengimplementasikan frontend `React + TypeScript + Vite + Tailwind CSS v4` dan backend `FastAPI` dengan mengacu penuh pada token, skala radius, tata letak 3 *breakpoint*, serta 3 status wajib (`empty`, `loading`, `error`) di `DESIGN.md`.
- Menyajikan pratinjau segmen (`Asli`, `Lab-CLAHE`, `Ben Graham`, `Grad-CAM++`), tiga contoh citra APTOS siap ketuk pada *empty state*, skor probabilitas terkalibrasi, peringatan kualitas citra, serta catatan non-diagnostik.
- Menyusun laporan proyek dan materi presentasi bagi lima anggota sesuai pembagian tugas.
- **Gerbang:** Uji klik menyeluruh pada layar mobile (`< 640px`), tablet, dan desktop berjalan bebas galat konsol serta validator dokumen lulus.
