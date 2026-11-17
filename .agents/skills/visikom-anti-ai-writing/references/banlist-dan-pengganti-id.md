# Daftar Kata dan Pola AI Slop serta Padanan Akademik Indonesia (`EYD V`)

Gunakan daftar ini sebagai rujukan penyuntingan untuk seluruh dokumentasi teknis, catatan riset, dan laporan proyek Visi Komputer dan Robotika. Ganti bentuk di kolom kiri dengan bahasa teknis yang langsung menyebut objek, ukuran, atau mekanisme.

## 1. Pembuka Klise dan Penyambung Mekanis

| Pola Dilarang / Dibatasi | Masalah Gaya | Pengganti / Perbaikan Lugas |
| :--- | :--- | :--- |
| `"Di era digital/modern saat ini..."` / `"Seiring pesatnya perkembangan teknologi..."` | Pembuka generik LLM tanpa informasi topik | Mulai langsung dengan masalah inti: `"Skrining retinopati diabetik memerlukan klasifikasi citra fundus yang konsisten untuk..."` |
| `"Tidak dapat dipungkiri bahwa..."` / `"Perlu diketahui bahwa..."` / `"Penting untuk dicatat bahwa..."` | Pemanas kalimat hampa | Hapus frasa pembuka; nyatakan klaim atau faktanya secara langsung |
| `"Selain itu,"` / `"Lebih lanjut,"` / `"Di sisi lain,"` di awal > 1 paragraf per bagian | Monotoni penghubung antarkalimat ala LLM | Awali paragraf dengan subjek tematis (mis. `"Pada tahap prapemrosesan,"`, `"Ketidakseimbangan kelas pada APTOS 2019 menyebabkan..."`, atau nama studi) |
| `"Dengan demikian, dapat disimpulkan bahwa..."` di akhir subbab ringkasan | Penutup berulang | Akhiri subbab dengan poin temuan terukur atau kalimat transisi teknis ke subbab berikutnya |

## 2. Penggelembung Klaim (*Significance Inflation*) dan Retorika Mesin

| Pola Dilarang | Pengganti Akademik Tepat |
| :--- | :--- |
| `"memegang peranan yang sangat penting / krusial"` | Sebutkan fungsi nyatanya: `"menentukan kejelasan fitur lesi mikroaneurisma bagi model"` |
| `"sangat signifikan"` (tanpa uji statistik) | Hapus kata *signifikan*, atau tuliskan nilai perubahan beserta interval kepercayaan atau nilai *p* bila ada uji statistik |
| `"komprehensif / menyeluruh / mendalam"` (tanpa cakupan) | Rincikan variabel yang benar-benar diuji (`"tiga arsitektur pada dua teknik prapemrosesan dan dua fungsi loss"`) |
| `"menjembatani kesenjangan"` / `"lanskap penelitian"` / `"paradigma baru"` | `"mengisi celah evaluasi pada..."` / `"literatur klasifikasi retinopati diabetik..."` / sebut metode spesifiknya |
| `"bukan sekadar X, melainkan juga Y"` (*negative parallelism*) | Nyatakan langsung fungsi X dan Y dalam satu proposisi jernih |
| Daftar tiga kata sifat beruntun (`"cepat, akurat, dan efisien"`) | Pilih satu atau dua sifat yang benar-benar terukur pada metrik (mis. `"menekan ukuran model menjadi 5,3 juta parameter dengan latensi inferensi CPU di bawah satu detik"`) |
| Abstraksi berperilaku manusia (`"model ini memahami..."`, `"data menceritakan..."`) | `"model memprediksi..."`, `"pengukuran menunjukkan..."` |
| Penyebutan kabur (`"banyak peneliti"`, `"sejumlah studi terbaru"`) tanpa rujukan | Cantumkan rujukan nyata `[S###]` atau `[@bibkey]` beserta temuan ringkasnya |

## 3. Koreksi Sintaksis dan Diksi Akademik Indonesia (`EYD V`)

| Kesalahan Umum | Perbaikan Sesuai Kaidah |
| :--- | :--- |
| `"saya"`, `"kami"`, `"kita"`, `"mereka"`, `"penulis"` (dalam isi laporan akhir formal) | Ganti menjadi `"Penelitian ini..."`, `"Tim pelaksana..."` (di log internal), atau konstruksi pasif objektif (`"Model dievaluasi..."`) |
| `"Dalam penelitian ini menganalisis..."` / `"Berdasarkan Tabel 2 menunjukkan..."` | Hilangkan preposisi pembuka atau pecah: `"Penelitian ini menganalisis..."` / `"Tabel 2 menunjukkan..."` |
| `"sistem di mana citra fundus..."` / `"metode yang mana memakai..."` | `"sistem dengan citra fundus..."` / `"metode yang memakai..."` (hindari `"di mana"`/`"yang mana"` untuk bukan lokasi) |
| `"Karena ..., sehingga ..."` / `"Meskipun ..., namun ..."` | Pakai salah satu konjungsi saja |
| `"analisa"`, `"praktek"`, `"resiko"`, `"sistim"`, `"aktifitas"`, `"standarisasi"` | Bentuk baku KBBI/EYD V: `analisis`, `praktik`, `risiko`, `sistem`, `aktivitas`, `standardisasi` |
| `"di ekspor"`, `"di latih"`, `"di tampilkan"`, `"di unggah"` | Awalan *di-* ditulis serangkai: `diekspor`, `dilatih`, `ditampilkan`, `diunggah` (*di* terpisah hanya untuk kata tempat: `di atas`, `di perangkat`) |
| `0.85` / `61.3%` dalam narasi prosa Indonesia | Gunakan tanda koma desimal (`0,85` / `61,3%`), kecuali nama teknis versi perangkat lunak (`Python 3.11`, `ResNet-50`) |
