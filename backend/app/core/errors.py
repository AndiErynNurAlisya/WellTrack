from collections.abc import Sequence
from typing import Any

FIELD_LABELS = {
    "name": "Nama", "email": "Email", "password": "Kata sandi",
    "confirm_password": "Konfirmasi kata sandi", "old_password": "Kata sandi lama",
    "new_password": "Kata sandi baru", "confirm_new_password": "Konfirmasi kata sandi baru",
    "profile_photo_url": "URL foto profil",
    "activity_type": "Jenis aktivitas", "activity_date": "Tanggal aktivitas",
    "duration_minutes": "Durasi", "intensity": "Intensitas", "notes": "Catatan",
    "log_date": "Tanggal", "log_time": "Waktu", "amount": "Jumlah", "unit": "Satuan",
    "sleep_date": "Tanggal tidur", "sleep_start_time": "Waktu tidur",
    "sleep_end_time": "Waktu bangun", "quality": "Kualitas tidur",
    "template_id": "Template", "start_date": "Tanggal mulai", "end_date": "Tanggal selesai",
    "duration_days": "Durasi (hari)", "frequency": "Frekuensi", "category": "Kategori",
    "target_value": "Nilai target", "description": "Deskripsi",
    "reminder_type": "Jenis pengingat", "reminder_time": "Jam pengingat",
    "is_active": "Status aktif", "limit": "Limit", "offset": "Offset",
    "period": "Periode", "metric": "Metrik", "type": "Jenis", "status": "Status",
}

_SKIP_LOC = {"body", "query", "path", "header", "cookie"}


def _cap(s: str) -> str:
    return s[:1].upper() + s[1:]


def _message(err: dict) -> str:
    """Pesan tanpa nama field (huruf kecil), kecuali value_error yang sudah kalimat utuh."""
    t = err.get("type", "")
    ctx = err.get("ctx") or {}

    if t == "missing":
        return "wajib diisi."
    if t == "string_too_short":
        return f"minimal {ctx.get('min_length')} karakter."
    if t == "string_too_long":
        return f"maksimal {ctx.get('max_length')} karakter."
    if t == "greater_than":
        return f"harus lebih besar dari {ctx.get('gt')}."
    if t == "greater_than_equal":
        return f"minimal {ctx.get('ge')}."
    if t == "less_than":
        return f"harus lebih kecil dari {ctx.get('lt')}."
    if t == "less_than_equal":
        return f"maksimal {ctx.get('le')}."
    if t in ("int_parsing", "int_type", "int_from_float"):
        return "harus berupa bilangan bulat."
    if t in ("decimal_parsing", "decimal_type", "float_parsing", "float_type"):
        return "harus berupa angka."
    if t == "decimal_max_places":
        return f"maksimal {ctx.get('decimal_places')} angka desimal."
    if t in ("decimal_max_digits", "decimal_whole_digits"):
        return "terlalu besar."
    if t == "literal_error":
        expected = str(ctx.get("expected", "")).replace(" or ", " atau ")
        return f"harus salah satu dari: {expected}."
    if t in ("date_parsing", "date_from_datetime_parsing", "date_type"):
        return "format tanggal tidak valid (gunakan YYYY-MM-DD)."
    if t in ("time_parsing", "time_type"):
        return "format waktu tidak valid (gunakan HH:MM:SS)."
    if t in ("uuid_parsing", "uuid_type"):
        return "format ID tidak valid."
    if t in ("bool_parsing", "bool_type"):
        return "harus berupa true atau false."
    if t == "string_type":
        return "harus berupa teks."
    if t == "json_invalid":
        return "format JSON tidak valid."
    return err.get("msg", "tidak valid.")


def format_error(err: dict) -> dict:
    loc = [p for p in err.get("loc", ()) if isinstance(p, str) and p not in _SKIP_LOC]
    field = ".".join(loc)
    last = loc[-1] if loc else ""

    if err.get("type") == "value_error":
        text = str(err.get("msg", "")).removeprefix("Value error, ")
        if "email address" in text:
            text = "Format email tidak valid."
        return {"field": field, "message": text}

    label = FIELD_LABELS.get(last, last) if last else "Data"
    return {"field": field, "message": _cap(f"{label} {_message(err)}")}


def build_validation_payload(raw_errors: Sequence[Any]) -> dict:
    items = [format_error(e) for e in raw_errors]
    return {
        "detail": items[0]["message"] if items else "Input tidak valid.",
        "errors": items,
    }