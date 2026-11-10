# ExamPortalApp

Portal web MVP untuk siswa mengikuti ujian online dan melihat hasil latihan. Tersedia daftar ujian contoh, halaman pengerjaan pilihan ganda dengan timer, autosimpan jawaban di browser, pengumpulan jawaban, dan hasil yang dihitung secara lokal.

## Teknologi

- React 18, TypeScript, dan Vite
- Lucide React untuk ikon
- `localStorage` browser untuk menyimpan progres latihan

## Menjalankan aplikasi

Persyaratan: Node.js 18 atau lebih baru.

```bash
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite. Untuk membuat build produksi:

```bash
npm run build
npm run preview
```

## Fitur MVP

- Beranda siswa dengan jadwal dan status ujian
- Alur pengerjaan kuis pilihan ganda, navigasi antarsoal, timer, dan indikator progres
- Autosimpan progres dan jawaban di browser
- Hasil serta pembahasan ringkas setelah pengumpulan
- Tampilan responsif untuk desktop dan ponsel

## Batasan

Ini adalah prototipe front-end dengan soal dan profil contoh. Belum ada backend, akun/login, sinkronisasi antarperangkat, verifikasi identitas, pengawasan ujian, atau pengamanan jawaban. Jawaban dan skor dihitung di sisi browser, sehingga tidak cocok untuk ujian resmi sampai backend dan kontrol keamanan ditambahkan.
