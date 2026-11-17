---
name: visikom-anti-ai-writing
description: >-
  Aturan penulisan dokumentasi riset, catatan eksperimen, dan laporan proyek
  UAS Visi Komputer dan Robotika dalam Bahasa Indonesia yang bebas AI slop,
  mematuhi EYD V, dan menjaga integritas bukti serta sitasi. Aktifkan selalu
  saat menulis atau menyunting berkas dokumentasi dan laporan proyek.
---

# Penulisan Dokumentasi dan Laporan Proyek Visi Komputer Bebas AI Slop

Skill ini melengkapi `antislop` (`antislop` core dan `antislop-copywriting`) dengan kaidah penulisan teknis dan akademik Bahasa Indonesia untuk proyek UAS Visi Komputer dan Robotika.

## Hierarki Prinsip Wajib

1. **Integritas Bukti dan Sitasi (`Zero Fabrication`):**
   1. Setiap klaim literatur, statistik dataset, atau perbandingan performa metode wajib merujuk sumber terverifikasi di [docs/research/source-ledger.md](file:///g:/semester%207/Visikom-UAS/docs/research/source-ledger.md) menggunakan penanda `[S###]` serta entri `references/references.bib` menggunakan kunci `[@bibkey]`.
   2. Angka hasil penelitian terdahulu tidak boleh dicampur seolah diukur pada protokol pemisahan data yang identik bila sumber aslinya memakai partisi atau metrik berbeda.
   3. Apabila eksperimen sendiri belum dijalankan atau angka belum diukur langsung dari log eksekusi, wajib menggunakan penanda eksplisit `[DATA EKSPERIMEN: menunggu eksekusi]`. Dilarang mengisi angka dari perkiraan atau ingatan.
   4. Identitas anggota kelompok yang belum diisikan oleh pengguna tidak boleh dikarang; gunakan slot eksplisit `[ANGGOTA 1]` sampai `[ANGGOTA 5]`.

2. **Kaidah EYD V dan Register Penulisan:**
   1. Gunakan bentuk baku KBBI/EYD V: `analisis`, `praktik`, `risiko`, `sistem`, `aktivitas`, `standardisasi`.
   2. Tulis awalan *di-* secara serangkai untuk kata kerja pasif (`dilatih`, `dievaluasi`, `diunggah`, `diekspor`), dan terpisah hanya untuk penunjuk tempat (`di atas`, `di perangkat`).
   3. Gunakan tanda koma untuk angka desimal dalam narasi Bahasa Indonesia (`0,936`; `49,29%`), kecuali penamaan versi perangkat lunak atau nama baku pustaka (`Python 3.11`, `ConvNeXt V2`).
   4. Cetak miring (*italic*) istilah asing yang belum diserap baku (`*transfer learning*`, `*class weighting*`, `*overfitting*`, `*thresholding*`).
   5. Catatan pembeda format: daftar berpoin dan tabel diperbolehkan pada dokumen kerja dan catatan riset di dalam folder `docs/`. Untuk dokumen laporan akhir UAS, sesuaikan format daftar, sudut pandang kata ganti, dan sitasi dengan pedoman dosen pengampu.

3. **Penangkal Ciri Teks AI (*Anti-AI-Slop*):**
   1. Dilarang mutlak memakai karakter *em dash* (U+2014) maupun pemisah kalimat tanda hubung ganda di seluruh teks dokumentasi, laporan, dan teks antarmuka. Gunakan titik, koma, titik dua, atau tanda kurung.
   2. Variasikan panjang kalimat (*burstiness*) dengan mencampurkan kalimat pernyataan langsung (8 sampai 14 kata) dan kalimat penjelasan teknis (15 sampai 25 kata). Pecah kalimat yang melampaui 28 kata atau menumpuk lebih dari dua anak kalimat.
   3. Batasi konjungsi pembuka paragraf (`Selain itu,`, `Lebih lanjut,`, `Oleh karena itu,`) maksimal satu kali per bagian. Awali mayoritas paragraf langsung dengan subjek teknis, nama metode, atau hasil pengamatan.
   4. Buang pembuka klise, *negative parallelism* (`"bukan hanya X, melainkan juga Y"`), daftar tiga kata sifat beruntun (*Rule of Three*), penggelembung klaim tanpa uji statistik (`"krusial"`, `"revolusioner"`, `"signifikan"`), dan kata kerja bernyawa untuk benda mati (`"model memahami"`).
   5. Periksa daftar padanan lengkap pada [references/banlist-dan-pengganti-id.md](references/banlist-dan-pengganti-id.md).

4. **Gerbang Verifikasi Sebelum Menutup Tugas:**
   1. Periksa ulang berkas yang ditulis agar tidak menyisakan angka tanpa sumber atau janji fitur yang belum dibuat.
   2. Jalankan skrip validator otomatis dari direktori utama repositori:
      ```powershell
      python scripts/validate_docs.py
      ```
   3. Pastikan seluruh pemeriksaan lulus (`exit code 0`) sebelum menyatakan pekerjaan dokumentasi selesai.
