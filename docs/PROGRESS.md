# Progress Log Proyek UAS Visi Komputer dan Robotika

## 2026-11-17: P0 dan P1 Selesai (Setup Workspace Anti-Slop, Riset Literatur, dan Audit Outline)

- [x] Menyalin enam skill inti `antislop` (`antislop`, `antislop-code`, `antislop-copywriting`, `antislop-human`, `antislop-layoutmobile`, `antislop-ui`) dari repositori `g:\skripsi\.agents\skills\` ke `.agents/skills/`.
- [x] Menyusun skill penulisan Bahasa Indonesia bebas AI slop di `.agents/skills/visikom-anti-ai-writing/SKILL.md` beserta daftar padanan `references/banlist-dan-pengganti-id.md`.
- [x] Menyiapkan fondasi tata kelola repositori pada `AGENTS.md`, `.gitignore`, `README.md`, `docs/00-project-brief.md`, dan `docs/01-pre-plan.md`.
- [x] Menjalankan riset literatur dan teknis melalui `parallel_parallel-search`, lalu mencatat `21` sumber terverifikasi ke dalam `docs/research/source-ledger.md` dan `references/references.bib`.
- [x] Menyusun evaluasi draf outline 5 halaman anggota tim, tujuh celah teknis, tiga paket opsi implementasi (`Paket A`, `Paket B`, `Paket C`), serta usulan pembagian peran 5 anggota pada `docs/research/01-audit-outline-dan-opsi.md`.
- [x] Menyusun referensi teknis mendalam mengenai prapemrosesan citra fundus, perbandingan arsitektur 2016 sampai 2026, regresi ordinal, kalibrasi, `Grad-CAM++`, dan tumpukan teknologi di `docs/research/02-riset-teknis-visikom-dr.md`.
- [x] Membuat dan menjalankan `scripts/validate_docs.py` untuk verifikasi bebas *em dash*, keabsahan ID sumber, dan keutuhan tautan lokal.

## 2026-11-17 (Lanjutan): Riset Komputasi (`i5-12400F + RX 6600`), Penggantian Streamlit ke Web Mobile-First, dan Penyusunan `DESIGN.md`

- [x] Memeriksa perangkat keras PC lokal (`AMD Radeon RX 6600`, driver `32.0.21045.16010`, RAM terpasang `15,8 GB`, prosesor `Intel Core i5-12400F`) dan memverifikasi kompatibilitas resmi AMD `ROCm 7.2.1` Windows (`S022`) serta jalur DirectML Microsoft (`S023`).
- [x] Merumuskan strategi **Hybrid**: pelatihan PyTorch dijalankan di Kaggle Notebook atau Google Colab, sedangkan prapemrosesan OpenCV, pengembangan web, dan inferensi lokal via `onnxruntime-directml` dijalankan langsung di PC lokal.
- [x] Melaksanakan riset referensi desain `DESIGN.md` gaya Apple (`VoltAgent/awesome-design-md` `S024`, `Meliwat/awesome-ios-design-md` `S025`, Apple HIG `S026`) dan menyusun spesifikasi penuh di `DESIGN.md` (menggantikan Streamlit dengan `React + TypeScript + Vite + Tailwind CSS v4` dan `FastAPI`).
- [x] Memverifikasi rasio kontras WCAG AA untuk seluruh token warna mode terang (*Clinical Daylight*), mode gelap (*Ophthalmic Darkroom*), dan 5 lencana keparahan klinis (`5,42:1` sampai `18,85:1`) memakai utilitas `antislop-human`.
- [x] Menambahkan `S022` sampai `S026` ke `docs/research/source-ledger.md` dan `references/references.bib`, serta menyelaraskan dokumen proyek dan `scripts/validate_docs.py`.

## 2026-11-17 (Sesi 3): Penguncian Paket B, Nama Kerja `Mydria`, Cetak Biru Implementasi, dan Modul Inti `P2-P3`

- [x] Mengunci **Paket B** dan nama kerja sementara **`Mydria`** (dari istilah oftalmologi *midriasis*) pada `DESIGN.md` dan `docs/00-project-brief.md`.
- [x] Menyusun cetak biru implementasi terpadu pada `docs/02-detail-implementasi-paket-b.md` (struktur monorepo tanpa *train-serve skew*, matriks eksperimen `E1` sampai `E4`, kontrak API `/api/v1`, serta alur cabang Git 5 anggota).
- [x] Membangun paket Python bersama `pyproject.toml` + `src/visikom_dr/`: `audit_dataset.py` (`pHash`/`dHash` *Union-Find* + split klaster berstrata), `preprocessing.py` (`circular_roi_crop`, `Lab-CLAHE`, `Ben Graham`), dan `quality_gate.py` (penolak non-fundus + detektor buram Laplacian).
- [x] Membuat `tests/test_cv_pipeline.py` dan memverifikasi kelulusan seluruh uji unit serta `scripts/validate_docs.py`.

## 2026-11-18: Fondasi Pelatihan `P4-P5` (Opsi B), Notebook Colab/Kaggle, dan Ekspor ONNX Selesai

- [x] Membangun modul metrik (`src/visikom_dr/metrics.py`), fungsi *loss* ordinal (`src/visikom_dr/losses.py`: `CORNLoss`, `OptimizedRounder`, dan pencegah *double-rebalancing*), serta model terpadu (`src/visikom_dr/models.py`: `ResNet-50`, `EfficientNet-B0`, `ConvNeXt-V2-Tiny`).
- [x] Membangun modul kalibrasi, `Grad-CAM++`, ekspor `.onnx` dua keluaran, dan *engine* pelatihan terstruktur (`src/visikom_dr/calibration_xai.py` dan `src/visikom_dr/train.py`).
- [x] Menyusun notebook siap pakai Google Colab / Kaggle (`notebooks/paket_b_training_colab_kaggle.ipynb`) beserta panduan pembagian kerja GPU (`docs/03-panduan-training-colab-kaggle.md`).
- [x] Membangun `tests/test_training_suite.py` yang menguji kesesuaian numerik PyTorch melawan ONNX Runtime serta lulus seluruh rangkaian uji unit dan `scripts/validate_docs.py`.

## Daftar Periksa Sesi Berikutnya

- [x] Memperbarui `notebooks/paket_b_training_colab_kaggle.ipynb` dengan `REPO_URL` publik, dukungan *auto-resume* pada `outputs/full/`, serta ekstraksi aman `train_images` di Google Colab, lalu menginisialisasi Git dan mengunggah ke repositori publik `https://github.com/feb027/Visikom-UAS`.
- [x] Menambahkan pemrosesan paralel (`ThreadPoolExecutor`) dan log progres berkala pada `audit_aptos_directory` serta `prepare_preprocessed_cache`, menambahkan log per-epoch di `train.py`, memindahkan direktori sementara Kaggle ke `/tmp/visikom_work`, serta membuat `scripts/kaggle_job.py` untuk mengotomasi `push`, `status`, dan `output` ke GPU T4 Kaggle via CLI.
- [x] Menemukan temuan *smoke test* v1 di Kaggle (`febfrr/visikom-uas-paket-b-smoke`, status `ERROR`): `dHash` citra mentah berbingkai hitam menghasilkan `278.702` pasangan cocok dengan aturan `OR` (`phash <= 6 | dhash <= 6`), memicu *single-linkage chaining* menjadi klaster tunggal `3.274` citra di `fold=0`, dan biaya absolut pada `assign_stratified_group_splits` mengisi `fold=1` sebelum fold lain (`train=0`, `val=40`). Memperbaiki [src/visikom_dr/audit_dataset.py](../src/visikom_dr/audit_dataset.py) dengan pemotongan ROI fundus bagian dalam (`circular_roi_crop` + pemangkasan tepi `15%`), konjungsi `phash <= 4` dan `dhash <= 4`, biaya selisih marginal (`after - before`) pada penjadwalan fold, serta pemilihan sampel seimbang lintas semua fold pada mode *smoke test*.
- [ ] Menjalankan *smoke test* v2 dan pelatihan penuh pada `notebooks/paket_b_training_colab_kaggle.ipynb` di Kaggle GPU (`NvidiaTeslaT4`).
- [ ] Sambil menunggu proses GPU di Kaggle selesai, membangun aplikasi web *mobile-first* `Mydria` (`backend/` FastAPI + `onnxruntime-directml` dan `frontend/` React + TypeScript + Vite + Tailwind CSS v4) mengacu penuh pada `DESIGN.md`.
- [ ] Menempatkan `model_best.onnx` dan `model_meta.json` hasil pelatihan ke `models/weights/` serta mengisi nama asli kelima anggota kelompok pada `docs/00-project-brief.md`.
