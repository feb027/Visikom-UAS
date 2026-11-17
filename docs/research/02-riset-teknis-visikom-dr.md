# Riset Teknis Visi Komputer untuk Klasifikasi Retinopati Diabetik (APTOS 2019)

Dokumen ini merangkum rujukan teknis hasil penelusuran literatur (`S001` sampai `S026`) sebagai acuan implementasi kode pada fase `P2` hingga `P6`. Seluruh parameter eksperimen internal yang belum dijalankan dicatat dengan penanda eksplisit sampai log pelatihan tersedia.

---

## 1. Anatomi dan Karakteristik Dataset APTOS 2019

Dataset utama berasal dari kompetisi *APTOS 2019 Blindness Detection* yang dikumpulkan oleh Aravind Eye Hospital, India, melalui pengambilan citra fundus dari beberapa klinik menggunakan kamera berbeda selama rentang waktu panjang `[S001]`.

### 1.1 Distribusi Label pada `train.csv` (`3.662` Citra)

Kompetisi menyediakan `3.662` citra berlabel pada `train.csv`, `1.928` citra *public test* tanpa label pada `test.csv`, serta sekitar `10.925` hingga `13.000` citra *private test* tertutup di peladen Kaggle `[S001]`. Karena *ground truth* `test.csv` tidak dirilis ke publik, seluruh pembagian latih, validasi, dan uji berlabel wajib berasal dari `3.662` citra `train.csv`.

| Label | Kategori Klinis | Ciri Visual Ringkas | Jumlah Sampel `[S001]` | Persentase | Rasio terhadap Kelas Mayoritas |
| :---: | :--- | :--- | :---: | :---: | :---: |
| `0` | *No DR* | Tidak tampak lesi retinopati diabetik | `1.805` | `49,29%` | `1 : 1,00` |
| `1` | *Mild* | Mikroaneurisma tahap awal berdiameter sangat kecil | `370` | `10,10%` | `1 : 4,88` |
| `2` | *Moderate* | Mikroaneurisma lebih banyak, perdarahan retina, dan eksudat keras | `999` | `27,28%` | `1 : 1,81` |
| `3` | *Severe* | Perdarahan intraretina luas dan kelainan mikrovaskular (IRMA) | `193` | `5,27%` | `1 : 9,35` |
| `4` | *Proliferative DR* | Neovaskularisasi atau perdarahan vitreus tahap lanjut | `295` | `8,06%` | `1 : 6,12` |
| **Total** | | | **`3.662`** | **`100,00%`** | |

Selain lima kelas di atas, literatur klinis mendefinisikan kategori biner **Referable Diabetic Retinopathy** (*Referable DR*) sebagai gabungan kelas `2`, `3`, dan `4` melawan kelas `0` dan `1` `[S002]`. Pelaporan metrik biner *Referable DR* (AUROC, sensitivitas, spesifisitas) memberi nilai tambah klinis yang sangat berguna di samping metrik 5 kelas.

### 1.2 Masalah Kualitas Citra, Duplikasi, dan Derau Label

1. **Variasi Dimensi dan Bingkai Hitam:** Dimensi citra mentah bervariasi dari `474 x 358` piksel sampai `4288 x 2848` piksel `[S001]`. Banyak citra memiliki bidang hitam lebar di kiri dan kanan atau pemotongan vertikal pada kutub atas dan bawah cakram fundus.
2. **Derau Akuisisi:** Pengelola kompetisi secara eksplisit menyatakan bahwa citra dapat mengandung artefak optik, kabur (*out of focus*), pencahayaan berlebih (*overexposed*), maupun terlalu gelap (*underexposed*) `[S001]`.
3. **Duplikasi Lintas Sampel dan Konflik Label:** Audit berbasis *hash* perseptual pada `train.csv` menemukan antara `143` hingga `268` citra duplikat, termasuk `64` citra identik yang memiliki label dokter berbeda, misalnya `id_code` `14e3f84445f7` berlabel `3` dan `f0f89314e860` berlabel `4` `[S020]`. Oleh karena itu, pembagian partisi wajib menggunakan pengelompokan klaster duplikat (`StratifiedGroupKFold`) agar dua salinan dari mata yang sama tidak terpecah antara data latih dan data uji.

---

## 2. Pipeline Prapemrosesan Visi Komputer Klasik

Peningkatan kualitas citra sebelum masuk ke jaringan saraf menentukan apakah fitur lesi halus seperti mikroaneurisma tetap terbaca.

### 2.1 Pemotongan ROI Lingkaran Retina (*Circular ROI Crop*)

Langkah pertama menghilangkan piksel latar hitam yang tidak membawa informasi patologis:

1. Konversi citra RGB ke skala abu-abu (*grayscale*), lalu buat masker biner dengan ambang intensitas rendah (misalnya nilai piksel `> 7` atau memakai *Otsu thresholding* setelah perataan derau ringan).
2. Temukan kotak pembatas (*bounding box*) non-nol terbesar dari masker biner, lalu potong citra sesuai kotak tersebut.
3. Bila rasio aspek tidak persegi, tambahkan *padding* simetris bernilai nol sebelum dilakukan *resize* ke resolusi target (`320 x 320` atau `384 x 384` piksel) agar struktur bundar pembuluh darah dan cakram optik tidak mengalami distorsi elips.

### 2.2 Koreksi Iluminasi Lokal ala Ben Graham

Untuk menormalkan perbedaan warna kamera dan pencahayaan antarklinik, Macsik dkk. `[S012]` memformulasikan operasi pengurangan rerata lokal berbasis filter Gaussian sebagai berikut:

$$I_{\text{BG}}(x, y) = \alpha \cdot I(x, y) + \beta \cdot \left( G_{\sigma} * I \right)(x, y) + \gamma$$

dengan nilai parameter rujukan $\alpha = 4$, $\beta = -4$, $\sigma = 10$, dan $\gamma = 128$ (kemudian dipotong ke rentang `[0, 255]`) `[S012]`. Teknik ini menonjolkan detail berfrekuensi tinggi seperti pembuluh darah halus dan perdarahan titik sekaligus meratakan latar pencahayaan menjadi abu-abu netral. Sebagai catatan penting dari praktik kompetisi, penerapan masker lingkaran sekitar `90%` radius fundus membantu mencegah efek cincin terang di tepi perbatasan retina dan latar hitam.

### 2.3 Peningkatan Kontras `Lab-CLAHE`

Penerapan *Contrast Limited Adaptive Histogram Equalization* (CLAHE) langsung pada ketiga kanal RGB dapat menggeser keseimbangan warna merah dan kuning retina. Pendekatan yang lebih aman secara kromatik adalah mengubah citra ke ruang warna **CIELAB** (`cv2.COLOR_RGB2LAB`), lalu menerapkan CLAHE hanya pada kanal luminansi $L$ dengan `clipLimit = 2,0` dan `tileGridSize = (8, 8)`, sebelum mengembalikan ke RGB `[S012, S013]`.

### 2.4 Gerbang Kualitas Citra Masukan di Aplikasi

Studi `DeepDR` `[S011]` menunjukkan bahwa kualitas citra berdampak langsung pada akurasi skrining tahap awal: menyaring dan mengambil ulang citra berkualitas buruk menaikkan sensitivitas deteksi *Mild NPDR* dari `78,5%` menjadi `87,6%`. Untuk prototipe aplikasi, tim dapat memasang gerbang heuristik OpenCV ringan sebelum model dijalankan:

1. **Verifikasi domain fundus:** Periksa proporsi area lingkaran terang terhadap bingkai hitam serta dominasi spektrum kanal merah dibanding kanal biru; tolak atau beri peringatan keras bila pengguna mengunggah foto acak bukan retina.
2. **Deteksi ketajaman (*blur check*):** Hitung variansi operator Laplacian $\text{Var}(\nabla^2 I_{\text{gray}})$ hanya di dalam wilayah ROI retina (bukan latar hitam) untuk memberi peringatan otomatis bila citra masukan terlalu buram.

---

## 3. Evolusi dan Pembandingan Arsitektur Model (2016 sampai 2026)

Pembandingan model tidak perlu mengorbankan jangkar outline awal (`ResNet-50` dan `EfficientNet-B0`), melainkan memperluasnya dengan satu atau dua arsitektur mutakhir agar analisis mencakup evolusi desain jaringan saraf visual.

| Arsitektur | Tahun & Sumber | Keluarga Model | Perkiraan Skala / Karakteristik Utama | Kelebihan untuk Tugas DR | Keterbatasan Utama |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ResNet-50` | 2016 `[S003]` | CNN Residual | Arsitektur standar dengan *skip connection*; beban komputasi lebih tinggi | Baseline wajib outline; kompatibel penuh dengan `Grad-CAM++` | Konvolusi kernel `3x3` standar kurang efisien pada fitur skala halus |
| `EfficientNet-B0` | 2019 `[S004]` | CNN *Compound Scaling* | Model ringan berbasis blok `MBConv`; ukuran bobot kecil | Hemat memori, cocok untuk ekspor CPU `ONNX Runtime` | Sering tertinggal pada resolusi tinggi tanpa pelatihan progresif |
| `EfficientNetV2-S` | 2021 `[S005]` | CNN `Fused-MBConv` | Dioptimalkan lewat NAS sadar-waktu latih | Pelatihan `5x` sampai `11x` lebih cepat pada resolusi lebih besar | Parameter lebih besar daripada `B0` |
| `ConvNeXt-V2-Tiny` | 2023 `[S007]` | CNN Modern + GRN | Kernel `7x7`, `LayerNorm`, dan *Global Response Normalization* | Mengambil keunggulan *receptive field* lebar ala Transformer tanpa kehilangan efisiensi konvolusi | Membutuhkan *learning rate* kecil dan penjadwalan *cosine decay* yang rapi |
| `DINOv2` (*ViT-S/B/L*) | 2026 `[S010]` | *Self-Supervised ViT* | Dilatih pada `142` juta citra alami | AUC DR (`0,850-0,952`) bersaing atau melampaui `RETFound` besar `[S010]` | Memori besar dan peta atensi kurang terstruktur pada data sangat kecil |
| `RETFound` (*ViT-L*) | 2023 `[S008]` | *Retinal Foundation* | Dilatih pada `1,6` juta citra retina (`AUROC 0,943` di APTOS 2019) `[S008]` | Representasi domain spesifik retina yang sangat kaya | Ukuran bobot besar dan berat untuk dijalankan pada laptop tanpa GPU |
| `RETFound-Green` | 2025 `[S009]` | *Efficient Retinal Foundation* | Dilatih memakai `Token Reconstruction` pada `75.000` citra publik `[S009]` | Komputasi `400x` lebih ringan, unduhan `14x` lebih cepat, dan ekstraksi embedding `2,7x` lebih cepat dari `RETFound-MEH` | Membutuhkan penyesuaian pustaka bobot khusus di luar `timm` standar |

**Catatan Implementasi:** Untuk **Paket B**, kombinasi `ResNet-50` (`resnet50`), `EfficientNet-B0` (`efficientnet_b0`), dan `ConvNeXt-V2-Tiny` (`convnextv2_tiny`) semuanya tersedia langsung di pustaka `timm` dengan antarmuka pelatihan yang seragam.

---

## 4. Formulasi Fungsi *Loss*, Penanganan Ketimpangan Kelas, dan Metrik Evaluasi

### 4.1 Formulasi Matematis *Quadratic Weighted Kappa* (QWK)

QWK mengukur tingkat kesepakatan antara label aktual $i$ dan label prediksi $j$ untuk $K = 5$ kelas berurutan sambil menghukum kesalahan secara kuadratik `[S019, S021]`:

$$W_{ij} = \frac{(i - j)^2}{(K - 1)^2}, \qquad \kappa = 1 - \frac{\sum_{i=0}^{K-1}\sum_{j=0}^{K-1} W_{ij} O_{ij}}{\sum_{i=0}^{K-1}\sum_{j=0}^{K-1} W_{ij} E_{ij}}$$

dengan $O_{ij}$ merupakan elemen matriks kebingungan observasi yang ternormalisasi dan $E_{ij}$ adalah perkalian luar histogram kelas aktual dan prediksi yang diharapkan secara acak `[S019, S021]`.

### 4.2 Pencegahan Jebakan *Double-Rebalancing*

Eksperimen terkontrol pada APTOS 2019 oleh Sahin `[S021]` menemukan sebuah kegagalan tersembunyi yang harus dihindari oleh tim:

1. **Penyebab Kolaps Kelas 2:** Apabila `WeightedRandomSampler` dipakai bersamaan dengan *inverse-frequency class weights* di dalam `CrossEntropyLoss`, kelas terbesar kedua (*Moderate DR*, proporsi `27,28%`) menerima bobot loss kecil sekitar `0,73` sementara kelas tetangganya yang lebih jarang (*Severe* `~3,81` dan *Proliferative* `~2,50`) dinaikkan berlipat ganda. Akibatnya batas keputusan bergeser menjauhi Kelas 2 hingga F1 Kelas 2 anjlok ke `0,00` `[S021]`.
2. **Solusi Aman:** Gunakan **satu** mekanisme penyeimbang saja (misalnya hanya bobot kelas lembut atau hanya *sampler*, jangan digabungkan sekaligus), lalu bandingkan dengan metode ordinal.

### 4.3 Formulasi Sadar-Urutan: `CORN` vs Regresi `SmoothL1` + *Threshold Tuning*

- **CORN (*Conditional Ordinal Regression for Neural Networks*):** Memecah klasifikasi 5 tingkat menjadi $K-1 = 4$ tugas biner berurutan $P(y > r_k \mid y > r_{k-1})$ dan menghitung probabilitas tak bersyarat lewat aturan rantai probabilitas tanpa pembatasan *weight-sharing* seperti pada `CORAL` `[S014, S015]`. Keunggulan praktis `CORN` adalah tahan terhadap kolaps kelas tanpa perlu menyetel bobot kelas `[S021]`.
- **Regresi `SmoothL1Loss` + Optimasi Ambang Batas:** Model menghasilkan satu keluaran skalar kontinu $\hat{y} \in \mathbb{R}$, dilatih memakai `SmoothL1Loss` (seperti strategi juara pertama APTOS 2019 `[S019]`), kemudian dipetakan ke kelas bulat `{0, 1, 2, 3, 4}` memakai empat ambang batas `[t0, t1, t2, t3]` yang dioptimalkan pada data validasi (misalnya dengan metode *Nelder-Mead*, tidak boleh dituning di data uji).

---

## 5. Kalibrasi Probabilitas, XAI (`Grad-CAM++`), dan Tumpukan Teknologi

### 5.1 Kalibrasi Skor Kepercayaan (*Temperature Scaling*)

Jaringan saraf dalam modern sering menampilkan probabilitas softmax mendekati `0,99` bahkan saat prediksi meleset `[S018]`. Sesuai catatan risiko di `Bagian 13` outline tim, nilai kepercayaan yang tidak terkalibrasi dapat menyesatkan pengguna aplikasi.

- **Metode:** *Temperature Scaling* membagi vektor *logit* $z$ dengan satu parameter skalar $T > 0$ ($p = \text{softmax}(z / T)$) yang dioptimalkan dengan meminimalkan *Negative Log-Likelihood* pada data validasi `[S018]`. Metode ini mempertahankan kelas prediksi (`argmax` tidak berubah) sekaligus menurunkan *Expected Calibration Error* (ECE).

### 5.2 Transparansi Visual dengan `Grad-CAM++` dan Batas Interpretasinya

`Grad-CAM++` menggunakan kombinasi berbobot dari turunan parsial positif pada peta aktivasi konvolusional terakhir untuk melokalisasi kemunculan banyak lesi kecil dalam satu citra sekaligus `[S016]`. Namun, studi evaluasi sistematis oleh Van Craenendonck dkk. `[S017]` pada dataset IDRiD menunjukkan bahwa tingkat kesesuaian *heatmap* terhadap anotasi piksel dokter (*Explainability Consistency Score*, ECS) hanya berkisar antara `0,21` hingga `0,51`. Karena itu, antarmuka aplikasi harus menyajikan peta panas sebagai **indikator area fokus model**, bukan detektor batas lesi klinis yang pasti.

### 5.3 Rekomendasi Tumpukan Teknologi (*Tech Stack*)

Outline awal menyarankan memilih antara TensorFlow/Keras atau PyTorch. Untuk proyek ini, **PyTorch** jauh lebih unggul dalam dukungan riset modern:

| Komponen Sistem | Pilihan Pustaka yang Disarankan | Alasan Teknis |
| :--- | :--- | :--- |
| Kerangka *Deep Learning* & Model | `PyTorch` + `timm` (`pytorch-image-models`) | Mendukung bobot pra-latih `ResNet-50`, `EfficientNet-B0`, `ConvNeXt V2`, `DINOv2`, dan arsitektur terbaru dalam satu API seragam |
| Pengolahan Citra & Augmentasi | `OpenCV`, `Pillow`, `ImageHash`, `Albumentations` | Memudahkan implementasi `pHash`, *circular crop*, `Lab-CLAHE`, variansi Laplacian, serta augmentasi geometrik/fotometrik konsisten |
| Fungsi *Loss* Ordinal & Metrik | `PyTorch` (`SmoothL1Loss`, `CORN` / `coral-pytorch`), `scikit-learn`, `scipy` | `scikit-learn` menyediakan `cohen_kappa_score(..., weights="quadratic")`, matriks kebingungan, dan kurva ROC; `scipy.optimize` untuk ambang batas |
| Explainability (XAI) | `pytorch-grad-cam` | Implementasi teruji untuk `Grad-CAM++` pada CNN maupun *vision backbone* modern |
| Inferensi Cepat di Aplikasi | `onnxruntime-directml` (dengan cadangan `onnxruntime` CPU) | Menjalankan inferensi model `.onnx` secara lokal di PC `RX 6600` maupun laptop CPU tanpa ketergantungan koneksi internet saat demo `[S023]` |
| Antarmuka Aplikasi | `React` + `TypeScript` + `Vite` + `Tailwind CSS v4` + `FastAPI` | Menggantikan Streamlit untuk mendukung tata letak *mobile-first* bergaya Apple tanpa *full-page rerun* sesuai spesifikasi [DESIGN.md](../../DESIGN.md) |

*[DATA EKSPERIMEN: menunggu eksekusi Fase P2 sampai P5 setelah paket implementasi dikunci oleh tim.]*
