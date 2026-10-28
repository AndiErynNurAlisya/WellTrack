"""Script untuk membersihkan semua data akun testing di database Neon,
kecuali akun developer/dev (cobadev@gmail.com).
"""
import sys
from pathlib import Path

# Setup path ke backend dan venv
backend_dir = Path(__file__).resolve().parent.parent
venv_lib = backend_dir / ".venv" / "Lib" / "site-packages"
if venv_lib.exists() and str(venv_lib) not in sys.path:
    sys.path.insert(0, str(venv_lib))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import SessionLocal

KEEP_EMAIL = "cobadev@gmail.com"


def clean_accounts():
    print(f"Mempersiapkan pembersihan akun (kecuali: '{KEEP_EMAIL}')...")
    with SessionLocal() as db:
        # Cek apakah user dev ada
        dev_user = db.execute(
            text("SELECT id, name, email FROM users WHERE email = :email"),
            {"email": KEEP_EMAIL}
        ).fetchone()

        if not dev_user:
            print(f"[PERINGATAN] Akun dengan email '{KEEP_EMAIL}' tidak ditemukan!")
            confirm = input("Apakah Anda ingin tetap melanjutkan? (y/N): ")
            if confirm.lower() != 'y':
                print("Dibatalkan.")
                return

        # Hitung jumlah akun yang akan dihapus
        to_delete = db.execute(
            text("SELECT count(*) FROM users WHERE email != :email"),
            {"email": KEEP_EMAIL}
        ).scalar()

        print(f"Ditemukan {to_delete} akun testing yang akan dihapus.")
        
        # Eksekusi penghapusan
        # Karena foreign key diatur ON DELETE CASCADE, log/target user lain ikut terhapus bersih
        db.execute(
            text("DELETE FROM users WHERE email != :email"),
            {"email": KEEP_EMAIL}
        )
        db.commit()

        # Cek sisa user
        remaining = db.execute(text("SELECT id, name, email FROM users")).fetchall()
        print("\n✅ Pembersihan selesai! Akun yang tersisa di database:")
        for u in remaining:
            print(f" - [{u.name}] {u.email} (ID: {u.id})")


if __name__ == "__main__":
    clean_accounts()

