# ExamPortalApp

Portal web untuk siswa mengikuti ujian online. Front-end dibuat dengan React 18, TypeScript, Vite, dan Lucide React. Aplikasi ini menggunakan API bersama ExamEduApp (Node.js + Express + PostgreSQL) untuk akun, ujian, jawaban, dan hasil.

## Menjalankan secara lokal

Persyaratan: Node.js 20 atau lebih baru.

1. Jalankan backend pada repositori `ExamEduApp`:
   ```bash
   cd /path/ke/ExamEduApp/server
   npm install
   cp .env.example .env
   # Isi DATABASE_URL PostgreSQL/Supabase dan TEACHER_SIGNUP_CODE.
   npm run dev
   ```
2. Di terminal lain, dari akar repositori ini jalankan:
   ```bash
   npm install
   npm run dev -- --port 5174
   ```
3. Buka `http://localhost:5174`. Siswa dapat mendaftar dengan email dan kata sandi; guru harus menerbitkan ujian dari ExamEduApp.

Vite meneruskan `/api` ke backend lokal di port 8787. Untuk deployment, set `VITE_API_URL` dan konfigurasikan origin serta HTTPS/cookie pada backend bersama. Panduan backend ada di `ExamEduApp/server/README.md` dalam workspace yang berisi kedua repositori.

## Alur siswa

- Siswa masuk atau mendaftar, lalu melihat ujian yang sudah diterbitkan pengajar.
- Mulai ujian membuat percobaan yang terikat pada akun siswa; waktu mulai dan batas waktu ditetapkan server.
- Jawaban disimpan ke server, bukan hanya ke `localStorage`. Kunci jawaban dan pembahasan baru dikirim setelah pengumpulan.
- Skor dihitung oleh API dan hasilnya tersimpan di server.

## Batasan yang diketahui

Backend disiapkan untuk Render Free dan Supabase PostgreSQL; URL aktif dan environment harus dikonfigurasi pada hosting. Paket gratis dapat tidur/dijeda dan bukan untuk ujian produksi yang kritis. Aplikasi menyediakan penyimpanan dan penilaian dasar, bukan pengawasan ujian atau sistem anti-kecurangan. Sebelum penggunaan resmi, siapkan HTTPS, backup, kebijakan retensi, dan pengujian keamanan.

> **Akses kelas:** untuk MVP ini, semua akun siswa dapat melihat semua ujian terbit. Belum ada roster atau penugasan ujian per kelas; jangan gunakan untuk materi yang harus dibatasi sebelum fitur enrollment tersedia.

## Deploy frontend ke Cloudflare Pages

Buat Pages project dari repositori ini dengan build command `npm ci && npm run build` dan output directory `dist`. Biarkan `VITE_API_URL` tidak disetel atau kosong agar browser memakai proxy same-origin `/api`. Pada Pages **Settings → Variables and Secrets**, set runtime variable `API_ORIGIN` ke `https://yzntkqprdubjmkhzvmad.supabase.co/functions/v1/exam-api` (HTTPS wajib). Jangan membuat file `.env` berisi secret. Setelah dua project memiliki host produksi `*.pages.dev`, tambahkan kedua origin tersebut secara persis ke `APP_ORIGINS` pada backend Supabase; cookie sesi tetap host-only dan proxy tidak mengubahnya menjadi bearer token. Cloudflare Pages Free dapat dipakai tanpa kartu atau paket berbayar.
