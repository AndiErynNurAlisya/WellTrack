# WellTrack Frontend (React 18 + Tailwind CSS 3 + Vite)

Antarmuka web responsif (*mobile-first*) untuk aplikasi **WellTrack: Aplikasi Pelacak dan Manajemen Kesehatan Pribadi** (Kelompok 10 — Program Studi Sistem Informasi, Universitas Hasanuddin).

## Fitur Utama (Sesuai SRS, PRD v1.0, & Kontrak Aktual `welltrack_backend`)

1. **Autentikasi & Keamanan (`FR-01` s.d. `FR-05`, `NFR-05` s.d. `NFR-07`)**:
   - Registrasi (`/register`), Login (`/login`), Logout (`POST /api/v1/auth/logout` + pembersihan token di `localStorage`), dan Ubah Kata Sandi (`POST /api/v1/auth/change-password`).
   - Interceptor JWT Bearer otomatis dan auto-logout saat menerima `401 Unauthorized`.
2. **Dashboard Ringkasan Harian (`FR-18`)**:
   - Terintegrasi dengan `GET /api/v1/dashboard`.
   - Kartu ringkasan Hidrasi Harian (dengan tombol cepat `+250ml` dan `+500ml`), Pola Tidur Terakhir, dan Aktivitas Fisik Hari Ini.
   - Daftar Target & Rutinitas Aktif beserta progres real-time (`0% - 100%`), Widget **Catat Cepat Cerdas** inline, tren grafik 7 hari, riwayat terbaru, dan badge terkini.
3. **Modul Pencatatan Cepat 3 Kebiasaan (`FR-06` s.d. `FR-17`, `NFR-11`)**:
   - Modal overlay global **Catat Kebiasaan Cepat** dengan 3 tab (*Minum Air*, *Pola Tidur*, *Aktivitas Fisik*) yang dapat diselesaikan dalam 3–4 langkah.
   - Pencegahan *double-submit* (`isSubmitting` state sesuai `NFR-02`) dan umpan balik gamifikasi instan (`+points_earned`, `current_streak`, dan `new_badges`).
4. **Target Kesehatan (`FR-23` s.d. `FR-29`)**:
   - Katalog Template Sistem (`GET /api/v1/targets/templates` & `POST /api/v1/targets/from-template`) serta pembuatan Target Manual (`POST /api/v1/targets`).
   - Filter status (`aktif`, `selesai`, `draft`, `terlewat`, `dibatalkan`) dan kategori (`air`, `tidur`, `aktivitas`), serta fitur Ubah (`PATCH`), Batalkan (`POST /cancel`), dan Hapus (`DELETE`).
5. **Analitik, Grafik & Riwayat Terpusat (`FR-19` s.d. `FR-22`, `NFR-03`)**:
   - Visualisasi grafik perkembangan (`GET /api/v1/charts`) dengan filter periode (`harian`, `mingguan`, `bulanan`), metrik (`aktivitas`, `air`, `tidur`), dan penanganan empty state *"Data belum tersedia."* (`FR-22`).
   - Tabel Riwayat Terpadu (`GET /api/v1/history`) dengan filter jenis catatan, rentang tanggal (`date_from`, `date_to`), paginasi, serta modal **Ubah** & **Hapus** (dengan konfirmasi) catatan.
6. **Gamifikasi & Koleksi Lencana (`FR-33` s.d. `FR-38`)**:
   - Terintegrasi dengan `GET /api/v1/gamification/summary` & `/gamification/badges`.
   - Menampilkan Total Poin Vitalitas, Streak Saat Ini, Rekor Streak Terpanjang, Tanggal Pencatatan Terakhir, serta galeri Lencana Terbuka (`earned: true`) & Terkunci (`earned: false`).
7. **Profil, Pengaturan & Pengingat (`FR-04`, `FR-05`, `FR-30` s.d. `FR-32`, `NFR-22`)**:
   - Ubah nama & foto profil (`PATCH /api/v1/users/me`) lengkap dengan **Galeri Avatar Preset**.
   - Pengelolaan penuh **Pengingat Pencatatan** (`/api/v1/reminders`) beserta *in-app reminder watcher*.
   - Menampilkan **Disclaimer Medis Resmi (`NFR-22`)**.

## Menjalankan Secara Lokal

1. Pastikan backend FastAPI (`welltrack_backend`) berjalan di `http://127.0.0.1:8000`:
   ```bash
   cd ../welltrack_backend
   source .venv/bin/activate
   uvicorn app.main:app --reload
   ```
2. Jalankan aplikasi frontend (`welltrack_frontend`):
   ```bash
   cd ../welltrack_frontend
   npm install
   npm run dev
   ```
3. Buka `http://localhost:5173` di browser.

