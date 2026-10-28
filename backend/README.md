# WellTrack API

Backend aplikasi pelacak dan manajemen kesehatan pribadi (Kelompok 10).
FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL (Neon), JWT.

## Struktur
```
app/
  api/v1/endpoints/   router (HTTP)
  core/               config, database, security, dependencies, timeutils, errors
  crud/               logika bisnis dan query
  models/             tabel SQLAlchemy (9 tabel)
  schemas/            validasi request dan bentuk response (Pydantic)
alembic/              migrasi skema
scripts/              seed.py, smoke_test.sh
tests/                pytest dan isolation_check.sh
```

## Menjalankan lokal
```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env               # isi DATABASE_URL dan SECRET_KEY
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```
Dokumentasi interaktif: http://127.0.0.1:8000/docs

Membuat SECRET_KEY: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

## Environment variable
| Nama | Keterangan |
|---|---|
| DATABASE_URL | URL PostgreSQL dari Neon (`postgresql://...?sslmode=require`) |
| SECRET_KEY | Kunci JWT, minimal 32 karakter |
| ALGORITHM | Default HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Default 1440 (24 jam) |
| APP_TIMEZONE | Default Asia/Jakarta, dipakai untuk "hari ini" (streak, dashboard, grafik) |
| CORS_ORIGINS | Daftar domain frontend, format JSON: `["https://app.vercel.app"]` |
| DEBUG | true mencetak SQL ke log |

## Pengujian
```bash
pytest tests -v                  # uji unit dan validasi (tanpa data di database)
bash tests/isolation_check.sh    # isolasi data antar pengguna (server harus hidup)
BASE=https://.../api/v1 bash scripts/smoke_test.sh   # uji setelah deploy
```

## Endpoint (prefix /api/v1)
| Modul | Endpoint |
|---|---|
| Auth | POST /auth/register, /auth/login, /auth/logout, /auth/change-password |
| Profil | GET, PATCH /users/me |
| Aktivitas | POST, GET /activity-logs; GET, PATCH, DELETE /activity-logs/{id} |
| Air | POST, GET /water-logs; GET /water-logs/daily-total; GET, PATCH, DELETE /water-logs/{id} |
| Tidur | POST, GET /sleep-logs; GET, PATCH, DELETE /sleep-logs/{id} |
| Target | GET /targets/templates; POST /targets/from-template; POST, GET /targets; GET, PATCH, DELETE /targets/{id}; POST /targets/{id}/cancel |
| Pengingat | POST, GET /reminders; GET, PATCH, DELETE /reminders/{id}; POST /reminders/{id}/toggle |
| Gamifikasi | GET /gamification/summary, /gamification/badges |
| Dashboard | GET /dashboard, /history |
| Grafik | GET /charts?period=harian\|mingguan\|bulanan&metric=aktivitas\|air\|tidur |
| Health | GET /health, /health/db (tanpa prefix /api/v1) |

## Pemetaan kebutuhan SRS
| FR | Implementasi |
|---|---|
| 01-05 | /auth/*, /users/me |
| 06-09 | /activity-logs |
| 10-13 | /water-logs (+ daily-total) |
| 14-17 | /sleep-logs (durasi otomatis, termasuk lewat tengah malam) |
| 18-19 | /dashboard, /history |
| 20-22 | /charts (has_data dan message "Data belum tersedia.") |
| 23-29 | /targets (progres dihitung real-time, tidak disimpan) |
| 30-32 | /reminders (konfigurasi saja, lihat batasan) |
| 33-38 | /gamification dan hasil POST log |

## Kontrak response untuk frontend
- Token: kirim `Authorization: Bearer <token>`. Logout = hapus token di client.
- Error selalu berisi `detail` (string, bisa langsung ditampilkan). Error validasi (422) juga berisi `errors: [{field, message}]`.
- POST `/activity-logs`, `/water-logs`, `/sleep-logs` mengembalikan `{ data, gamification }`. Khusus air juga `daily_total`.
  `gamification` berisi `points_earned`, `total_points`, `current_streak`, `longest_streak`, `new_badges`.
- Angka desimal (jumlah air, nilai target) dikirim sebagai angka JSON.
- Waktu `sleep_start` dan `sleep_end` membawa offset zona waktu. Konversi ke waktu lokal di frontend.
- DELETE berhasil mengembalikan 204 tanpa body.

## Aturan bisnis utama
- `sleep_date` = tanggal mulai tidur. Jam bangun <= jam tidur dihitung hari berikutnya. Durasi 1 menit sampai 20 jam. Tidur yang bertabrakan ditolak (409).
- Air: satuan ml, l, gelas (1 gelas = 250 ml). Satu catatan maksimal 5.000 ml. Total harian selalu dalam ml.
- Poin: aktivitas 10, air 5, tidur 10 (maksimal 5 log berpoin per jenis per hari). Periode target tercapai +20, seluruh target tercapai +100.
- Streak dihitung dari tanggal saat log dikirim (zona Asia/Jakarta), bukan dari tanggal yang diinput.
- Badge: kriteria `streak`, `total_logs`, `target_completed`. Badge tidak dicabut saat log diedit atau dihapus.
- Target: periode `harian` per hari, `mingguan` per blok 7 hari. Status: draft, aktif, selesai, dibatalkan, terlewat (diperbarui saat dibaca).
- Data milik pengguna lain dijawab 404 (bukan 403) agar keberadaannya tidak bocor.

## Batasan
- Pengingat hanya disimpan. Pengiriman notifikasi dilakukan frontend (Notification API) atau tahap tambahan di server.
- JWT stateless: token yang bocor tetap berlaku sampai kedaluwarsa. Tidak ada daftar cabut token.
- Belum ada pembatasan laju login (rate limiting).
- Foto profil hanya berupa URL, belum ada unggah file.
- Series "persentase target" pada grafik (FR-20) belum tersedia di /charts. Progres target ada di /targets dan /dashboard.
- Server gratis dapat tidur saat sepi, sehingga request pertama bisa lambat.