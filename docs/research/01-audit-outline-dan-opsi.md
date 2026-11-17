# Audit Teknis Outline Awal dan Opsi Implementasi Proyek

Dokumen ini mengaudit draf outline lima halaman (*Sistem Klasifikasi Tingkat Keparahan Retinopati Diabetik Menggunakan Deep Learning*, dataset APTOS 2019) terhadap bukti empiris pada 26 sumber literatur terverifikasi (`S001` sampai `S026`), lalu merumuskan paket eksekusi serta pembagian kerja untuk tim beranggotakan lima orang.

---

## 1. Bagian yang Sudah Tepat pada Outline Awal

Kerangka outline yang disusun oleh anggota tim sudah memiliki fondasi metodologis yang layak dipertahankan:

1. **Disiplin Partisi Evaluasi (`Bagian 4`):** Outline secara tegas melarang penggunaan *test set* kompetisi (`test.csv`, `1.928` citra tanpa label `[S001]`) sebagai data evaluasi berlabel, dan mengarahkan pemisahan data latih, validasi, serta uji secara terencana.
2. **Pemilihan Metrik Utama (`Bagian 8`):** Selain *Accuracy*, *Precision*, *Recall*, *F1-score*, dan *Confusion Matrix*, outline menyertakan *Quadratic Weighted Kappa* (QWK) dan mewajibkan pelaporan metrik per kelas. Langkah ini tepat karena distribusi APTOS 2019 sangat timpang dan kesalahan antarkelas berjauhan perlu dihukum kuadratik `[S019, S021]`.
3. **Kesadaran Pencegahan Kebocoran Data (`Bagian 6.2 & 13`):** Outline menekankan bahwa augmentasi hanya diterapkan pada data latih serta menyinggung risiko citra duplikat lintas partisi.
4. **Batasan Etika dan Klinis (`Ringkasan & Bagian 13`):** Dokumen memosisikan sistem sebagai prototipe akademik, bukan alat diagnosis medis, serta mengingatkan bahwa skor kepercayaan model bukan jaminan kebenaran prediksi.

---

## 2. Tujuh Celah Teknis dan Risiko Implementasi

Hasil riset literatur menemukan tujuh celah penting antara draf outline dengan praktik terbaik *Computer Vision* pada citra fundus retina.

### Celah 1: Bobot "Visi Komputer" Terlalu Tipis pada Tahap Prapemrosesan
Pada `Bagian 6.3`, prapemrosesan hanya merinci *resize* ke `224 x 224` piksel, normalisasi piksel, dan augmentasi dasar. Untuk proyek kelompok beranggotakan lima orang pada mata kuliah Visi Komputer dan Robotika, pendekatan tersebut terlalu bertumpu pada *pipeline* klasifikasi generik tanpa menunjukkan teknik pengolahan citra digital yang teruji.

- **Perbaikan yang dianjurkan:** Bangun modul prapemrosesan citra fundus terukur berbasis OpenCV yang membandingkan: (a) pemotongan wilayah lingkaran retina otomatis (*circular ROI crop*) untuk membuang tepi hitam yang mendominasi foto fundus, (b) koreksi pencahayaan lokal Gaussian ala Ben Graham `[S012]`, dan (c) peningkatan kontras adaptif pada kanal luminansi ruang warna CIELAB (`Lab-CLAHE`) agar warna alami pembuluh darah, perdarahan, dan eksudat tidak rusak `[S012, S013]`.

### Celah 2: Resolusi `224 x 224` Piksel Mengaburkan Mikroaneurisma Kelas 1 (*Mild DR*)
Citra asli pada APTOS 2019 memiliki ukuran bervariasi antara `474 x 358` hingga `4288 x 2848` piksel `[S001]`. Tanda awal *Mild DR* (Kelas 1, `370` citra) berupa titik mikroaneurisma berdiameter sangat kecil. Mengubah ukuran gambar langsung ke `224 x 224` sebelum membuang margin hitam sekeliling retina menyusutkan area aktif retina jauh di bawah `224` piksel sehingga lesi mikro sering hilang. Praktik pemenang kompetisi APTOS 2019 menggunakan masukan `384 x 384` hingga `512 x 512` piksel `[S019]`.

- **Perbaikan yang dianjurkan:** Lakukan *circular ROI crop* lebih dulu, lalu jalankan pelatihan pada resolusi minimal `320 x 320` atau `384 x 384` piksel (atau lakukan ablasi terkontrol `224 x 224` melawan `384 x 384` bila kapasitas GPU mencukupi).

### Celah 3: Duplikasi Citra dan Label Kontradiktif di Dalam `train.csv`
Audit komunitas terhadap `3.662` citra latih APTOS 2019 menemukan antara `143` hingga `268` citra duplikat (bergantung metode *hashing*), termasuk `64` citra duplikat atau nyaris identik yang diberi label dokter berbeda, seperti pasangan `14e3f84445f7` (berlabel `3`) dan `f0f89314e860` (berlabel `4`) `[S020]`. Pemisahan `StratifiedKFold` standar akan meletakkan dua salinan dari mata yang sama ke data latih dan data uji sekaligus.

- **Perbaikan yang dianjurkan:** Hitung *perceptual hash* (`pHash` dan `dHash`) untuk seluruh `3.662` citra sebelum membagi data, kelompokkan pasangan berjarak Hamming rendah ke satu ID klaster, lalu pisahkan partisi menggunakan `StratifiedGroupKFold` agar tidak ada klaster yang bocor antarpartisi.

### Celah 4: Jebakan *Double-Rebalancing* dan Pengabaian Urutan Kelas
Outline `Bagian 6.5` mempertimbangkan *class weighting* atau *sampling* pada data latih, namun tidak memperingatkan efek gabungan keduanya maupun sifat ordinal label `0 < 1 < 2 < 3 < 4`. Studi eksperimental Sahin `[S021]` membuktikan bahwa menggabungkan `WeightedRandomSampler` dengan `CrossEntropyLoss` berbobot frekuensi terbalik (*double rebalancing*) menekan bobot kelas terbesar kedua (*Moderate DR*, `999` citra atau `27,28%` `[S001]`) sehingga prediksi Kelas 2 runtuh menjadi `F1 = 0,00`.

Selain itu, `CrossEntropyLoss` standar memperlakukan salah klasifikasi `0` menjadi `4` sama bobotnya dengan `0` menjadi `1`. Formulasi sadar-urutan seperti `CORN` `[S014]` bekerja tanpa penalaan bobot kelas dan tidak mengalami kolaps kelas `[S021]`, sedangkan regresi `SmoothL1Loss` disertai penyesuaian ambang QWK menjadi kunci solusi peringkat pertama kompetisi `[S019]`.

- **Perbaikan yang dianjurkan:** Terapkan maksimal satu strategi penyeimbang (*single rebalancing*) pada *baseline* `CrossEntropyLoss`, lalu bandingkan secara adil dengan `CORN` `[S014]` atau regresi `SmoothL1Loss` + optimasi ambang batas QWK `[S019]`.

### Celah 5: Arsitektur Pembanding Terbatas pada Generasi 2016 sampai 2019
Membandingkan `ResNet-50` (`2016`, `[S003]`) dan `EfficientNet-B0` (`2019`, `[S004]`) sesuai dengan outline awal, tetapi belum mencerminkan perkembangan arsitektur Visi Komputer tahun 2022 sampai 2025. Kini tersedia arsitektur CNN modern seperti `ConvNeXt V2` (`2023`, `[S007]`) yang memadukan kernel konvolusi `7 x 7` dan *Global Response Normalization*, serta model fondasi retina ringan `RETFound-Green` (`2025`, `[S009]`) yang membutuhkan komputasi jauh lebih kecil daripada `RETFound` awal `[S008]`.

- **Perbaikan yang dianjurkan:** Pertahankan `ResNet-50` dan `EfficientNet-B0` sebagai jangkar outline, lalu tambahkan minimal satu arsitektur modern (`ConvNeXt-V2-Tiny` via pustaka `timm`, atau `RETFound-Green` bila memilih paket lanjut).

### Celah 6: Prototipe Aplikasi Rentan saat Uji Coba Langsung dan Minim Transparansi
Saat demo UAS di depan dosen, pengguna bisa saja mengunggah gambar non-retina (misalnya foto wajah atau benda acak) atau foto fundus yang sangat buram. Tanpa filter masukan, model klasifikasi lima kelas tetap memaksa memilih kelas `0` sampai `4` dengan kepercayaan tinggi karena softmax tidak mengenal penolakan di luar distribusi. Selain itu, skor probabilitas jaringan saraf modern sering mengalami *overconfidence* bila belum dikalibrasi `[S018]`.

- **Perbaikan yang dianjurkan:**
  1. Tambahkan gerbang kualitas citra OpenCV berbasis ketajaman (variansi Laplacian) dan proporsi warna/area lingkaran fundus (terinspirasi konsep *image quality assessment* pada `DeepDR` `[S011]`).
  2. Kalibrasi probabilitas pasca-pelatihan menggunakan *Temperature Scaling* `[S018]` dan laporkan nilai *Expected Calibration Error* (ECE).
  3. Tampilkan peta panas `Grad-CAM++` `[S016]` di aplikasi sambil mencantumkan batasan ilmiah bahwa kesesuaian spasial peta panas dengan anotasi lesi tidak selalu sempurna (`ECS 0,21` sampai `0,51` `[S017]`).
  4. Ekspor model terpilih ke format `ONNX Runtime` agar demo aplikasi berjalan cepat di laptop CPU tanpa memerlukan GPU.

### Celah 7: Jadwal Sekuensial Belum Menggambarkan Kerja Paralel Lima Anggota
Jadwal pada `Bagian 12` outline disusun berurutan minggu demi minggu tanpa pemetaan tanggung jawab antaranggota. Risiko proyek lima orang adalah hanya satu atau dua orang yang mengerjakan kode sementara anggota lain sekadar menyusun laporan.

---

## 3. Tiga Opsi Paket Implementasi untuk Dipilih Tim

Tabel berikut membandingkan tiga opsi paket kerja yang dapat dipilih sesuai target nilai dan ketersediaan GPU tim.

| Aspek Perbandingan | Paket A: Konservatif (Outline Diperbaiki) | Paket B: Rekomendasi Utama (Ideal 5 Orang) | Paket C: Riset Lanjut (Setara Publikasi) |
| :--- | :--- | :--- | :--- |
| **Fokus Utama** | Memenuhi seluruh poin outline dengan perbaikan cacat fatal data | Menjawab seluruh outline + penguatan Visi Komputer, ordinalitas, XAI, dan kalibrasi | Seluruh Paket B + adaptasi model fondasi retina dan uji lintas kamera |
| **Modul Visikom Klasik** | `Circle Crop` + `Lab-CLAHE` standar | Ablasi terukur: `Raw` vs `Circle Crop + Lab-CLAHE` vs `Circle Crop + Ben Graham` + Gerbang Kualitas OpenCV | Sama dengan Paket B + evaluasi sensitivitas terhadap gangguan kualitas citra |
| **Audit & Split Data** | Deduplikasi `pHash` + `StratifiedGroupKFold` | Deduplikasi `pHash` + `StratifiedGroupKFold` + dokumentasi klaster duplikat konflik | Sama dengan Paket B + kurasi *external zero-shot test set* (IDRiD atau Messidor-2) |
| **Arsitektur Model** | 2 model: `ResNet-50`, `EfficientNet-B0` | 3 model lintas generasi: `ResNet-50`, `EfficientNet-B0`, `ConvNeXt-V2-Tiny` | 4 model: Paket B + `RETFound-Green` (`Token Reconstruction` retina `[S009]`) |
| **Fungsi Loss & Imbalance** | *Single rebalancing* (`CrossEntropy`) | Komparasi terkontrol: `CE (single rebalancing)` vs `CORN` / `SmoothL1 + Threshold Tuning` | Sama dengan Paket B + evaluasi *Referable DR* (`>= 2`) lintas dataset |
| **Kalibrasi & XAI** | Confusion Matrix dasar | *Temperature Scaling* (ECE) + `Grad-CAM++` pada kasus benar dan salah | Sama dengan Paket B + analisis kesalahan lintas domain |
| **Aplikasi & Deployment** | Web *mobile-first* sederhana (`DESIGN.md`) + `ONNX Runtime` | Aplikasi web *mobile-first* bergaya Apple (`React + FastAPI`, sesuai `DESIGN.md`) + `onnxruntime-directml` + gerbang tolak non-fundus | Sama dengan Paket B + tab perbandingan model lokal vs *foundation model* |
| **Estimasi Komputasi** | Ringan (`1-2 jam` Colab/Kaggle T4 untuk training) | Sedang (`3-5 jam` training di Kaggle/Colab T4; pengembangan web & inferensi di PC `i5-12400F + RX 6600`) | Tinggi (`5-8 jam` training di Kaggle/Colab + unduhan bobot dan dataset eksternal) |

**Rekomendasi:** **Paket B** memberikan keseimbangan terbaik antara kelayakan eksekusi satu semester, bobot teknik Visi Komputer yang nyata bagi lima mahasiswa Informatika, serta ketahanan saat demo dan sesi tanya jawab dosen.

---

## 4. Usulan Pembagian Peran Lima Anggota Tim (Mengacu Paket B)

Setiap anggota memegang satu paket teknis dari hulu hingga pengujian, lalu menyumbangkan bagian metode dan analisisnya ke laporan akhir.

| Slot Anggota | Fokus Tanggung Jawab Teknis | Artefak Luaran yang Dimiliki | Bahan Penguasaan Tanya Jawab UAS |
| :--- | :--- | :--- | :--- |
| `[ANGGOTA 1]` | Kurasi data, audit duplikasi `pHash`, analisis label kontradiktif, dan partisi `StratifiedGroupKFold` | Skrip EDA & deduplikasi, tabel distribusi kelas, daftar klaster duplikat, berkas split permanen | Alasan memakai `StratifiedGroupKFold`, temuan pasangan duplikat beda label `[S020]`, dan pencegahan *data leakage* |
| `[ANGGOTA 2]` | Modul Visi Komputer klasik (`Circle Crop`, `Lab-CLAHE`, Ben Graham) dan gerbang validasi kualitas OpenCV | Modul `preprocessing.py`, skrip ablasi kualitas citra, fungsi skor blur Laplacian dan penolak non-fundus | Persamaan Ben Graham `[S012]`, alasan memilih kanal $L$ CIELAB dibanding RGB-CLAHE, dan mekanisme gerbang kualitas `[S011]` |
| `[ANGGOTA 3]` | Pelatihan dan eksperimen perbandingan arsitektur (`ResNet-50`, `EfficientNet-B0`, `ConvNeXt-V2-Tiny`) | Skrip pelatihan seragam (`timm`), log *training/validation*, kurva konvergensi, perbandingan FLOPs & waktu latih | Perbedaan induktif blok residual `[S003]`, `MBConv` `[S004]`, dan *Global Response Normalization* pada `ConvNeXt V2` `[S007]` |
| `[ANGGOTA 4]` | Komparasi fungsi *loss* (`CrossEntropy` vs ordinal `CORN`/`SmoothL1`), kalibrasi *Temperature Scaling*, dan XAI `Grad-CAM++` | Tabel perbandingan QWK & *Macro F1*, metrik *Referable DR* `[S002]`, nilai ECE `[S018]`, galeri visual `Grad-CAM++` `[S016]` | Fenomena *double-rebalancing* `[S021]`, cara kerja QWK & `CORN` `[S014]`, serta batas validitas `Grad-CAM++` `[S017]` |
| `[ANGGOTA 5]` | Ekspor `onnxruntime-directml`, spesifikasi `DESIGN.md`, pembangunan web *mobile-first* (`React + Vite + Tailwind v4 + FastAPI`), dan integrasi laporan akhir | Berkas `.onnx`, benchmark latensi GPU/CPU lokal, aplikasi web 3-state (`empty`, `loading`, `error`), draf laporan terpadu | Alur inferensi ujung ke ujung, jaminan prapemrosesan identik latih-uji, alasan penggantian Streamlit, dan kalibrasi skor di UI |
