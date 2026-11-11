import asyncio
import logging
from datetime import datetime

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.timeutils import now_local
from app.crud.reminder import send_push_to_subscription
from app.models.push_subscription import PushSubscription
from app.models.reminder import Reminder

logger = logging.getLogger("welltrack.scheduler")

REMINDER_MESSAGES = {
    "air": ("Minum Air Putih", "Saatnya minum segelas air untuk menjaga hidrasi tubuh Anda! 💧"),
    "tidur": ("Waktu Istirahat / Tidur", "Sudah waktunya beristirahat untuk pemulihan optimal malam ini. 🌙"),
    "aktivitas": ("Aktivitas Fisik", "Ayo luangkan waktu sejenak untuk bergerak atau berolahraga! 🏃"),
    "target": ("Target Kesehatan", "Cek progres target harian Anda hari ini di WellTrack. 🎯"),
}


def _check_reminders_sync() -> None:
    now = now_local()
    current_time_norm = now.time().replace(second=0, microsecond=0)

    with SessionLocal() as db:
        # Cari pengingat aktif yang cocok dengan jam dan menit saat ini
        stmt = (
            select(Reminder, PushSubscription)
            .join(PushSubscription, PushSubscription.user_id == Reminder.user_id)
            .where(
                Reminder.is_active == True,  # noqa: E712
                Reminder.reminder_time == current_time_norm,
            )
        )
        matches = db.execute(stmt).all()
        if not matches:
            return

        logger.info(
            "Ditemukan %d pengingat pada jam %s",
            len(matches),
            current_time_norm.strftime("%H:%M"),
        )
        for reminder, subscription in matches:
            title_prefix, default_desc = REMINDER_MESSAGES.get(
                reminder.reminder_type,
                (f"Pengingat {reminder.reminder_type}", "Waktunya mencatat kebiasaan sehat Anda!"),
            )
            time_str = current_time_norm.strftime("%H:%M")
            payload = {
                "title": f"WellTrack: {title_prefix} ({time_str}) 🔔",
                "body": default_desc,
                "url": "/dashboard",
                "reminder_type": reminder.reminder_type,
            }
            send_push_to_subscription(db, subscription, payload)


async def check_and_send_due_reminders() -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _check_reminders_sync)


async def reminder_scheduler_loop() -> None:
    logger.info("Background reminder scheduler loop dimulai.")
    while True:
        try:
            await check_and_send_due_reminders()
        except asyncio.CancelledError:
            logger.info("Background reminder scheduler loop dihentikan.")
            break
        except Exception as e:
            logger.exception("Error pada reminder scheduler loop: %s", e)

        # Hitung detik sampai menit berikutnya tepat di detik :00
        now = datetime.now()
        seconds_to_wait = 60 - now.second - (now.microsecond / 1_000_000)
        if seconds_to_wait <= 0:
            seconds_to_wait = 60
        await asyncio.sleep(seconds_to_wait)

