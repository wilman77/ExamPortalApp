# ExamPortalApp

Portal web untuk siswa mengikuti ujian online. Frontend menggunakan React 18, TypeScript, Vite, dan Lucide React. Akun, ujian, jawaban, serta hasil menggunakan API bersama ExamEduApp: Supabase Edge Functions dan PostgreSQL pada produksi, atau Node.js/Express dan PostgreSQL untuk pengembangan lokal.

## Akses online

- **Portal siswa:** https://examportalapp-wilman77.pages.dev
- **Panel guru:** https://exameduapp-wilman77.pages.dev

Frontend menggunakan Cloudflare Pages Free; API dan database menggunakan Supabase Free, tanpa kartu atau paket berbayar. Siswa dapat mendaftar dengan email dan kata sandi. Guru perlu menyiapkan akun pengajar dan menerbitkan ujian dari panel guru; pendaftaran pengajar tetap memerlukan kode privat backend.

## Menjalankan secara lokal

Persyaratan: Node.js 20 atau lebih baru dan PostgreSQL.

1. Jalankan backend pada repositori `ExamEduApp`:
   ```bash
   cd /path/ke/ExamEduApp/server
   npm install
   cp .env.example .env
   # Isi DATABASE_URL atau field PG*, serta TEACHER_SIGNUP_CODE.
   npm run dev
   ```
2. Dari akar repositori ini, pada terminal lain:
   ```bash
   npm install
   npm run dev -- --port 5174
   ```
3. Buka `http://localhost:5174`.

Vite meneruskan `/api` ke backend lokal di port 8787. Panduan API bersama tersedia di direktori `server` dan `supabase` pada repositori `ExamEduApp`.

## Alur siswa

- Siswa masuk atau mendaftar, lalu melihat ujian yang telah diterbitkan pengajar.
- Memulai ujian membuat percobaan yang terikat pada akun; waktu mulai dan batas waktu ditetapkan server.
- Jawaban disimpan ke server. Kunci jawaban dan pembahasan baru dikirim setelah pengumpulan.
- Skor dihitung oleh API dan hasilnya tersimpan di PostgreSQL.

## Deployment Cloudflare Pages

Gunakan branch `main`, build command `npm run build`, dan output directory `dist`. Pages memasang dependensi secara otomatis. Biarkan `VITE_API_URL` tidak disetel agar browser memakai proxy same-origin `/api`.

Set runtime variable `API_ORIGIN` ke `https://yzntkqprdubjmkhzvmad.supabase.co/functions/v1/exam-api`. Backend `APP_ORIGINS` harus berisi persis `https://exameduapp-wilman77.pages.dev,https://examportalapp-wilman77.pages.dev`. Cookie sesi tetap host-only, HttpOnly, Secure, dan SameSite=Lax; password database tidak dikirim ke frontend.

## Batasan yang diketahui

Paket gratis memiliki kuota dan proyek Supabase dapat dijeda karena tidak aktif. Setup ini bukan untuk ujian kritis, bukan sistem pengawasan ujian, dan bukan anti-kecurangan. Sebelum penggunaan resmi, siapkan backup, kebijakan retensi, dan pengujian keamanan.

> **Akses kelas:** semua akun siswa saat ini dapat melihat semua ujian terbit. Belum ada roster atau penugasan ujian per kelas; jangan gunakan untuk materi yang harus dibatasi sebelum fitur enrollment tersedia.
