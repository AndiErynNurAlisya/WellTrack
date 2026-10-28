from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Badge, TargetTemplate

TEMPLATES = [
    dict(name="Hidrasi Seimbang 2 Liter", description="Minum air 2.000 ml per hari untuk menjaga hidrasi dan konsentrasi.",
         category="air", target_value=Decimal("2000"), unit="ml", frequency="harian", difficulty="mudah"),
    dict(name="Hidrasi Optimal 2,5 Liter", description="Minum air 2.500 ml per hari.",
         category="air", target_value=Decimal("2500"), unit="ml", frequency="harian", difficulty="sedang"),
    dict(name="Jalan Kaki 30 Menit", description="Aktivitas fisik ringan 30 menit setiap hari.",
         category="aktivitas", target_value=Decimal("30"), unit="menit", frequency="harian", difficulty="mudah"),
    dict(name="Olahraga 150 Menit per Minggu", description="Standar aktivitas fisik mingguan untuk kesehatan jantung.",
         category="aktivitas", target_value=Decimal("150"), unit="menit", frequency="mingguan", difficulty="sedang"),
    dict(name="Latihan Intens 300 Menit per Minggu", description="Latihan intensitas tinggi untuk meningkatkan stamina.",
         category="aktivitas", target_value=Decimal("300"), unit="menit", frequency="mingguan", difficulty="sulit"),
    dict(name="Tidur Cukup 7 Jam", description="Tidur minimal 7 jam setiap malam.",
         category="tidur", target_value=Decimal("420"), unit="menit", frequency="harian", difficulty="mudah"),
    dict(name="Tidur Teratur 8 Jam", description="Tidur 8 jam setiap malam untuk pemulihan optimal.",
         category="tidur", target_value=Decimal("480"), unit="menit", frequency="harian", difficulty="sedang"),
]

BADGES = [
    dict(name="First Step", description="Mencatat log kesehatan pertama.",
         criteria_type="total_logs", criteria_value=1),
    dict(name="Active User", description="Mencatat 30 log kesehatan.",
         criteria_type="total_logs", criteria_value=30),
    dict(name="Badge Expert", description="Mencatat 100 log kesehatan.",
         criteria_type="total_logs", criteria_value=100),
    dict(name="Consistent User", description="Streak 7 hari berturut-turut.",
         criteria_type="streak", criteria_value=7),
    dict(name="Streak Master", description="Streak 30 hari berturut-turut.",
         criteria_type="streak", criteria_value=30),
    dict(name="Target Achiever", description="Menyelesaikan 1 target kesehatan.",
         criteria_type="target_completed", criteria_value=1),
]


def seed() -> None:
    with SessionLocal() as db:
        existing_templates = set(db.scalars(select(TargetTemplate.name)))
        existing_badges = set(db.scalars(select(Badge.name)))

        new_templates = [TargetTemplate(**t) for t in TEMPLATES if t["name"] not in existing_templates]
        new_badges = [Badge(**b) for b in BADGES if b["name"] not in existing_badges]

        db.add_all(new_templates + new_badges)
        db.commit()
        print(f"Template baru: {len(new_templates)}, badge baru: {len(new_badges)}")


if __name__ == "__main__":
    seed()