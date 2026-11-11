export const MEDICAL_DISCLAIMER =
  'WellTrack bukan alat diagnosis medis dan tidak menggantikan konsultasi tenaga kesehatan.';

export const ACTIVITY_PRESETS = [
  { label: 'Jalan Kaki', value: 'Jalan Kaki', defaultMinutes: 30, defaultIntensity: 'rendah' },
  { label: 'Lari / Jogging', value: 'Lari / Jogging', defaultMinutes: 30, defaultIntensity: 'sedang' },
  { label: 'Bersepeda', value: 'Bersepeda', defaultMinutes: 45, defaultIntensity: 'sedang' },
  { label: 'Gym / Angkat Beban', value: 'Gym / Angkat Beban', defaultMinutes: 45, defaultIntensity: 'tinggi' },
  { label: 'Berenang', value: 'Berenang', defaultMinutes: 45, defaultIntensity: 'sedang' },
  { label: 'Yoga / Peregangan', value: 'Yoga / Peregangan', defaultMinutes: 20, defaultIntensity: 'rendah' },
  { label: 'Badminton', value: 'Badminton', defaultMinutes: 60, defaultIntensity: 'tinggi' },
  { label: 'Futsal / Sepak Bola', value: 'Futsal / Sepak Bola', defaultMinutes: 60, defaultIntensity: 'tinggi' },
  { label: 'Senam Aerobik', value: 'Senam Aerobik', defaultMinutes: 30, defaultIntensity: 'sedang' },
];

export const WATER_PRESETS = [
  { label: '+250 ml (1 Gelas)', amount: 250, unit: 'ml', mlEquivalent: 250 },
  { label: '+500 ml (2 Gelas)', amount: 500, unit: 'ml', mlEquivalent: 500 },
  { label: '+600 ml (Botol)', amount: 600, unit: 'ml', mlEquivalent: 600 },
  { label: '+1 Liter', amount: 1, unit: 'l', mlEquivalent: 1000 },
];

export const INTENSITY_OPTIONS = [
  { value: 'rendah', label: 'Rendah', desc: 'Santai, napas normal', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'sedang', label: 'Sedang', desc: 'Berkeringat, detak jantung naik', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'tinggi', label: 'Tinggi', desc: 'Intens, latihan berat', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const SLEEP_QUALITY_OPTIONS = [
  { value: 'baik', label: 'Baik', desc: 'Bangun segar & pulih', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'cukup', label: 'Cukup', desc: 'Cukup istirahat', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'buruk', label: 'Buruk', desc: 'Sering terbangun / kurang lelap', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
];

export const CATEGORY_META = {
  air: {
    label: 'Hidrasi',
    shortLabel: 'Konsumsi Air',
    bgLight: 'bg-teal-50',
    textColor: 'text-[#006A61]',
    borderColor: 'border-teal-200',
    pillBg: 'bg-[#86F2E4]/40 text-[#005049]',
    barColor: 'bg-[#006A61]',
    allowedUnits: [
      { value: 'ml', label: 'Mililiter (ml)' },
      { value: 'gelas', label: 'Gelas (250 ml)' },
      { value: 'l', label: 'Liter (1.000 ml)' },
    ],
  },
  tidur: {
    label: 'Pola Tidur',
    shortLabel: 'Pola Tidur',
    bgLight: 'bg-indigo-50/80',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-200',
    pillBg: 'bg-[#D3E4FE] text-[#0B1C30]',
    barColor: 'bg-[#006948]',
    allowedUnits: [
      { value: 'menit', label: 'Menit' },
      { value: 'jam', label: 'Jam (60 menit)' },
    ],
  },
  aktivitas: {
    label: 'Aktivitas Fisik',
    shortLabel: 'Aktivitas Fisik',
    bgLight: 'bg-emerald-50',
    textColor: 'text-brand-600',
    borderColor: 'border-emerald-200',
    pillBg: 'bg-[#85F8C4]/50 text-[#005137]',
    barColor: 'bg-brand-600',
    allowedUnits: [
      { value: 'menit', label: 'Menit' },
      { value: 'jam', label: 'Jam (60 menit)' },
    ],
  },
};

export const TARGET_STATUS_META = {
  aktif: { label: 'Sedang Berjalan', className: 'bg-[#85F8C4]/60 text-[#005137] border border-[#68DBA9]' },
  selesai: { label: 'Selesai', className: 'bg-emerald-600 text-white border border-emerald-700' },
  draft: { label: 'Draft (Belum Mulai)', className: 'bg-[#E5EEFF] text-[#0B1C30] border border-[#D3E4FE]' },
  dibatalkan: { label: 'Dibatalkan', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  terlewat: { label: 'Terlewat', className: 'bg-[#FFDAD6] text-[#93000A] border border-rose-200' },
};

export const DIFFICULTY_META = {
  mudah: { label: 'Mudah', className: 'bg-[#85F8C4]/50 text-[#005137]' },
  sedang: { label: 'Sedang', className: 'bg-[#86F2E4]/60 text-[#005049]' },
  sulit: { label: 'Sulit', className: 'bg-[#FFDDB8] text-[#825100]' },
};

export const AVATAR_PRESETS = [
  {
    id: 'emerald-pulse',
    label: 'Alif (Emerald)',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alif&backgroundColor=b6e3f4',
  },
  {
    id: 'sporty-teal',
    label: 'Nadia (Teal)',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia&backgroundColor=c0aede',
  },
  {
    id: 'runner-mint',
    label: 'Rizky (Runner)',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rizky&backgroundColor=d1d4f9',
  },
  {
    id: 'zen-green',
    label: 'Aulia (Zen)',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aulia&backgroundColor=ffd5dc',
  },
  {
    id: 'active-gold',
    label: 'Bima (Active)',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bima&backgroundColor=ffdfbf',
  },
  {
    id: 'fresh-aqua',
    label: 'Siti (Fresh)',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti&backgroundColor=b6e3f4',
  },
  {
    id: 'bottts-vital',
    label: 'VitalBot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WellTrack&backgroundColor=b6e3f4',
  },
  {
    id: 'fun-smile',
    label: 'Ceria',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Healthy',
  },
];

export const REMINDER_TYPE_META = {
  air: { label: 'Minum Air Putih', desc: 'Ingatkan untuk menjaga hidrasi harian' },
  tidur: { label: 'Waktu Istirahat / Tidur', desc: 'Ingatkan persiapan tidur tepat waktu' },
  aktivitas: { label: 'Aktivitas Fisik / Olahraga', desc: 'Ingatkan sesi gerak tubuh atau olahraga' },
  target: { label: 'Evaluasi Target Harian', desc: 'Ingatkan cek progres target kesehatan' },
};

