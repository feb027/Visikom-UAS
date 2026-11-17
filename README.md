# Proyek UAS Visi Komputer dan Robotika: Klasifikasi Retinopati Diabetik (APTOS 2019)

Repositori kerja tim beranggotakan lima orang (Semester 7) untuk perancangan, eksperimen, evaluasi, dan penyajian aplikasi prototipe klasifikasi lima tingkat keparahan retinopati diabetik pada dataset **APTOS 2019 Blindness Detection**.

> Prototipe ini disusun untuk tujuan akademik dan pembelajaran mata kuliah Visi Komputer dan Robotika, bukan alat diagnosis medis klinis.

## Status Proyek

- **Fase aktif:** `P1` sampai fondasi kode `P2-P5` (audit data, prapemrosesan, gerbang kualitas, model lintas generasi, loss ordinal, kalibrasi, `Grad-CAM++`, ekspor ONNX, serta *notebook* pelatihan Colab/Kaggle) sudah siap dan lulus seluruh uji unit.
- **Langkah eksekusi berikutnya:** Menjalankan [paket_b_training_colab_kaggle.ipynb](notebooks/paket_b_training_colab_kaggle.ipynb) di Kaggle Notebook atau Google Colab (mengacu [03-panduan-training-colab-kaggle.md](docs/03-panduan-training-colab-kaggle.md)), lalu sambil menunggu pelatihan GPU selesai, membangun aplikasi web *mobile-first* **`Mydria`** (`backend/` FastAPI + `frontend/` React/Vite).

## Peta Dokumen dan Kode

- [AGENTS.md](AGENTS.md) : Aturan kerja agen, integrasi `antislop`, dan kewajiban dokumentasi.
- [DESIGN.md](DESIGN.md) : Spesifikasi desain antarmuka *mobile-first* **Mydria** bergaya Apple klinis (warna teruji WCAG AA, tipografi, radius, 3 tahap responsif, dan 3 status antarmuka).
- [docs/00-project-brief.md](docs/00-project-brief.md) : Identitas proyek, ringkasan outline awal tim, pembagian peran 5 anggota, dan keputusan arsitektur terkunci.
- [docs/01-pre-plan.md](docs/01-pre-plan.md) : Peta fase kerja `P0` sampai `P6` beserta gerbang kelulusan tiap tahap.
- [docs/02-detail-implementasi-paket-b.md](docs/02-detail-implementasi-paket-b.md) : Cetak biru teknis Paket B (struktur monorepo tanpa *train-serve skew*, matriks eksperimen `E1-E4`, kontrak API `FastAPI`, dan alur cabang Git 5 anggota).
- [docs/03-panduan-training-colab-kaggle.md](docs/03-panduan-training-colab-kaggle.md) : Panduan langkah demi langkah menjalankan notebook pelatihan di Google Colab/Kaggle dan pembagian kerja paralel antaranggota.
- [docs/PROGRESS.md](docs/PROGRESS.md) : Catatan progres kronologis dan daftar periksa sesi berikutnya.
- [docs/research/source-ledger.md](docs/research/source-ledger.md) : Daftar `26` sumber terverifikasi (`S001` sampai `S026`) hasil penelusuran literatur.
- [docs/research/01-audit-outline-dan-opsi.md](docs/research/01-audit-outline-dan-opsi.md) : Evaluasi teknis terhadap draf outline tim, tujuh celah implementasi, tiga paket opsi, dan matriks kerja 5 anggota.
- [docs/research/02-riset-teknis-visikom-dr.md](docs/research/02-riset-teknis-visikom-dr.md) : Referensi teknis mendalam mengenai anatomi APTOS 2019, prapemrosesan citra fundus, evolusi arsitektur 2016 sampai 2026, fungsi *loss* ordinal, kalibrasi probabilitas, dan `Grad-CAM++`.
- [docs/research/03-riset-ui-mobile-apple-dan-komputasi.md](docs/research/03-riset-ui-mobile-apple-dan-komputasi.md) : Audit perangkat keras (`i5-12400F + RX 6600`) melawan Kaggle/Colab serta arsitektur web `React + FastAPI` pengganti Streamlit.
- [pyproject.toml](pyproject.toml) dan `src/visikom_dr/` : Paket Python inti (`audit_dataset.py`, `preprocessing.py`, `quality_gate.py`, `metrics.py`, `losses.py`, `models.py`, `calibration_xai.py`, `train.py`).
- [notebooks/paket_b_training_colab_kaggle.ipynb](notebooks/paket_b_training_colab_kaggle.ipynb) : Notebook terpadu eksekusi `P2` hingga `E4` di Google Colab / Kaggle.
- [tests/test_cv_pipeline.py](tests/test_cv_pipeline.py) dan [tests/test_training_suite.py](tests/test_training_suite.py) : Uji unit otomatis untuk seluruh modul Python dan kesesuaian numerik ekspor ONNX.
- [references/references.bib](references/references.bib) : Berkas BibTeX resmi yang disinkronkan dengan `source-ledger.md`.
- [scripts/validate_docs.py](scripts/validate_docs.py) : Validator otomatis anti-AI-slop, konsistensi ID sumber, dan keutuhan tautan berkas.
- [.agents/skills/visikom-anti-ai-writing/SKILL.md](.agents/skills/visikom-anti-ai-writing/SKILL.md) : Panduan penulisan Bahasa Indonesia bebas AI slop dan jujur terhadap bukti.

## Perintah Cepat

```powershell
python scripts/validate_docs.py
$env:PYTHONPATH="src"; python -m unittest discover -s tests -v
```
