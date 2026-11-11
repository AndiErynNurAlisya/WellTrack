const WITA_TZ = import.meta.env.VITE_APP_TIMEZONE || 'Asia/Makassar';

// Simpan tanggal server terbaru dari /dashboard agar tidak pernah meleset
// jika server memakai Asia/Jakarta sementara client Asia/Makassar
let cachedServerToday = null;

export function setServerToday(dateStr) {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    cachedServerToday = dateStr;
  }
}

export function formatDateInZone(dateObj, timeZone = WITA_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dateObj);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD.
 * Menggunakan tanggal server jika sudah tersedia, atau minimum antara WITA dan WIB
 * agar tidak pernah ditolak sebagai "masa depan" oleh validator backend pada pukul 00:00-00:59 WITA.
 */
export function getTodayDateString() {
  if (cachedServerToday) {
    return cachedServerToday;
  }
  const now = new Date();
  const witaDate = formatDateInZone(now, WITA_TZ);
  const wibDate = formatDateInZone(now, 'Asia/Jakarta');
  return witaDate < wibDate ? witaDate : wibDate;
}

/**
 * Mengembalikan waktu saat ini di zona WITA dalam format HH:MM:SS atau HH:MM
 */
export function getCurrentTimeString(includeSeconds = false, offsetMinutes = 0) {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WITA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(target);

  const hour = parts.find((p) => p.type === 'hour')?.value || '08';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  const second = parts.find((p) => p.type === 'second')?.value || '00';
  return includeSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
}

/**
 * Memastikan string waktu dikirim dalam format HH:MM:SS sesuai skema Pydantic time
 */
export function ensureTimeWithSeconds(timeStr) {
  if (!timeStr) return '08:00:00';
  const clean = timeStr.trim();
  if (/^\d{2}:\d{2}$/.test(clean)) {
    return `${clean}:00`;
  }
  return clean;
}

/**
 * Mengambil HH:MM dari string waktu HH:MM:SS atau ISO datetime
 */
export function extractHHMM(timeOrIso) {
  if (!timeOrIso) return '';
  if (/^\d{2}:\d{2}(:\d{2})?/.test(timeOrIso)) {
    return timeOrIso.slice(0, 5);
  }
  try {
    const dt = new Date(timeOrIso);
    if (Number.isNaN(dt.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: WITA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dt);
  } catch {
    return '';
  }
}

/**
 * Format tanggal YYYY-MM-DD menjadi Bahasa Indonesia, misal: "Rabu, 28 Oktober 2026"
 */
export function formatDateIndo(dateInput, options = { withDayName: false, shortMonth: false }) {
  if (!dateInput) return '-';
  try {
    let dt;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    } else {
      dt = new Date(dateInput);
    }
    if (Number.isNaN(dt.getTime())) return String(dateInput);

    const fmtOptions = {
      timeZone: WITA_TZ,
      day: 'numeric',
      month: options.shortMonth ? 'short' : 'long',
      year: 'numeric',
    };
    if (options.withDayName) {
      fmtOptions.weekday = 'long';
    }
    return new Intl.DateTimeFormat('id-ID', fmtOptions).format(dt);
  } catch {
    return String(dateInput);
  }
}

/**
 * Menghitung pratinjau durasi tidur (menit & teks jam+menit) dari jam mulai dan jam bangun.
 * Menangani lintas tengah malam persis seperti compute_sleep_window di backend.
 */
export function calculateSleepPreview(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) {
    return { valid: false, minutes: 0, text: '-', isOvernight: false, error: null };
  }
  const [sh, sm] = startTimeStr.slice(0, 5).split(':').map(Number);
  const [eh, em] = endTimeStr.slice(0, 5).split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) {
    return { valid: false, minutes: 0, text: '-', isOvernight: false, error: 'Format waktu belum lengkap.' };
  }

  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (startTotal === endTotal) {
    return {
      valid: false,
      minutes: 0,
      text: '0j 0m',
      isOvernight: false,
      error: 'Waktu tidur dan waktu bangun tidak boleh sama.',
    };
  }

  let isOvernight = false;
  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
    isOvernight = true;
  }

  const minutes = endTotal - startTotal;
  if (minutes > 20 * 60) {
    return {
      valid: false,
      minutes,
      text: formatMinutesToHours(minutes),
      isOvernight,
      error: 'Durasi tidur melebihi 20 jam. Periksa kembali jam tidur dan bangun.',
    };
  }

  return {
    valid: true,
    minutes,
    text: formatMinutesToHours(minutes),
    isOvernight,
    error: null,
  };
}

export function formatMinutesToHours(totalMinutes) {
  const mins = Number(totalMinutes) || 0;
  if (mins <= 0) return '0 mnt';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} mnt`;
  if (m === 0) return `${h} jam`;
  return `${h}j ${m}m`;
}

export function formatNumberId(num, maxFraction = 1) {
  const n = Number(num);
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: maxFraction,
  }).format(n);
}

