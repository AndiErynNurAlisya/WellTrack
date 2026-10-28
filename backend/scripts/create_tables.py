"""
Script untuk membuat semua tabel WellTrack di database Neon.
Jalankan dari root folder backend:
    python -m scripts.create_tables
"""
from app.core.database import Base, engine
import app.models  # noqa: F401 (memuat semua 9 model agar terdaftar di Base.metadata)


def create_all_tables() -> None:
    print("Menghubungkan ke Neon dan membuat seluruh tabel...")
    Base.metadata.create_all(bind=engine)
    print("Semua tabel (9 entitas) berhasil dibuat di database Neon!")


if __name__ == "__main__":
    create_all_tables()
