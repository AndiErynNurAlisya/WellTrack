import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Clock,
  Droplets,
  Loader2,
  Moon,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { activityApi, sleepApi, waterApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ACTIVITY_PRESETS,
  INTENSITY_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  WATER_PRESETS,
} from '../../utils/constants';
import {
  calculateSleepPreview,
  ensureTimeWithSeconds,
  getCurrentTimeString,
  getTodayDateString,
} from '../../utils/dateUtils';
import { parseApiError } from '../../utils/errorParser';

const UNIT_ML_MAP = {
  ml: 1,
  gelas: 250,
  l: 1000,
};

export default function QuickLogModal({ isOpen, onClose, initialTab = 'air' }) {
  const { syncUserStats, triggerDataRefresh } = useAuth();
  const { showGamificationFeedback, showToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // State Form Air
  const [waterAmount, setWaterAmount] = useState('250');
  const [waterUnit, setWaterUnit] = useState('ml');
  const [waterDate, setWaterDate] = useState(() => getTodayDateString());
  const [waterTimeMode, setWaterTimeMode] = useState('now'); // 'now' | '15m' | 'custom'
  const [waterCustomTime, setWaterCustomTime] = useState(() => getCurrentTimeString(false));
  const [waterNotes, setWaterNotes] = useState('');

  // State Form Tidur
  const [sleepDate, setSleepDate] = useState(() => getTodayDateString());
  const [sleepStartTime, setSleepStartTime] = useState('22:30');
  const [sleepEndTime, setSleepEndTime] = useState('06:30');
  const [sleepQuality, setSleepQuality] = useState('baik');
  const [sleepNotes, setSleepNotes] = useState('');

  // State Form Aktivitas
  const [selectedActivityPreset, setSelectedActivityPreset] = useState('Jalan Kaki');
  const [customActivityType, setCustomActivityType] = useState('');
  const [activityDate, setActivityDate] = useState(() => getTodayDateString());
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [intensity, setIntensity] = useState('sedang');
  const [activityNotes, setActivityNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'air');
      setErrorMsg('');
      setFieldErrors({});
      const today = getTodayDateString();
      setWaterDate(today);
      setSleepDate(today);
      setActivityDate(today);
      setWaterCustomTime(getCurrentTimeString(false));
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const todayMax = getTodayDateString();
  const sleepPreview = calculateSleepPreview(sleepStartTime, sleepEndTime);

  const computedWaterMl = (Number(waterAmount) || 0) * (UNIT_ML_MAP[waterUnit] || 1);

  const handleWaterPresetSelect = (preset) => {
    setWaterAmount(String(preset.amount));
    setWaterUnit(preset.unit);
    setErrorMsg('');
  };

  const handleActivityPresetSelect = (preset) => {
    setSelectedActivityPreset(preset.value);
    setDurationMinutes(String(preset.defaultMinutes));
    setIntensity(preset.defaultIntensity);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    setFieldErrors({});

    try {
      setIsSubmitting(true);

      if (activeTab === 'air') {
        const numAmount = Number(waterAmount);
        if (!numAmount || numAmount <= 0) {
          setErrorMsg('Jumlah konsumsi air harus lebih dari 0.');
          setIsSubmitting(false);
          return;
        }
        if (computedWaterMl > 5000) {
          setErrorMsg('Satu catatan air maksimal setara 5.000 ml.');
          setIsSubmitting(false);
          return;
        }
        if (waterDate > todayMax) {
          setErrorMsg('Tanggal tidak boleh di masa depan.');
          setIsSubmitting(false);
          return;
        }

        let resolvedTime = getCurrentTimeString(true, 0);
        if (waterTimeMode === '15m') {
          resolvedTime = getCurrentTimeString(true, -15);
        } else if (waterTimeMode === 'custom') {
          resolvedTime = ensureTimeWithSeconds(waterCustomTime);
        }

        const res = await waterApi.create({
          log_date: waterDate,
          log_time: resolvedTime,
          amount: numAmount,
          unit: waterUnit,
          notes: waterNotes.trim() || null,
        });

        syncUserStats(res.gamification);
        triggerDataRefresh();
        showGamificationFeedback(`Minum air ${numAmount} ${waterUnit}`, res.gamification);
        onClose();
      } else if (activeTab === 'tidur') {
        if (!sleepPreview.valid) {
          setErrorMsg(sleepPreview.error || 'Periksa waktu mulai tidur dan waktu bangun.');
          setIsSubmitting(false);
          return;
        }
        if (sleepDate > todayMax) {
          setErrorMsg('Tanggal tidur tidak boleh di masa depan.');
          setIsSubmitting(false);
          return;
        }

        const res = await sleepApi.create({
          sleep_date: sleepDate,
          sleep_start_time: ensureTimeWithSeconds(sleepStartTime),
          sleep_end_time: ensureTimeWithSeconds(sleepEndTime),
          quality: sleepQuality || null,
          notes: sleepNotes.trim() || null,
        });

        syncUserStats(res.gamification);
        triggerDataRefresh();
        showGamificationFeedback(`Pola tidur (${sleepPreview.text})`, res.gamification);
        onClose();
      } else if (activeTab === 'aktivitas') {
        const finalType =
          selectedActivityPreset === 'Lainnya'
            ? customActivityType.trim()
            : selectedActivityPreset;

        if (!finalType) {
          setErrorMsg('Pilih atau ketik jenis aktivitas fisik terlebih dahulu.');
          setIsSubmitting(false);
          return;
        }
        const mins = parseInt(durationMinutes, 10);
        if (Number.isNaN(mins) || mins < 1 || mins > 1440) {
          setErrorMsg('Durasi aktivitas harus antara 1 sampai 1.440 menit.');
          setIsSubmitting(false);
          return;
        }
        if (activityDate > todayMax) {
          setErrorMsg('Tanggal aktivitas tidak boleh di masa depan.');
          setIsSubmitting(false);
          return;
        }

        const res = await activityApi.create({
          activity_type: finalType,
          activity_date: activityDate,
          duration_minutes: mins,
          intensity,
          notes: activityNotes.trim() || null,
        });

        syncUserStats(res.gamification);
        triggerDataRefresh();
        showGamificationFeedback(`${finalType} (${mins} menit)`, res.gamification);
        onClose();
      }
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal menyimpan catatan kesehatan.');
      setErrorMsg(parsed.message);
      setFieldErrors(parsed.fieldErrors);
      showToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: parsed.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-log-modal-title"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500 animate-pulse" />
              <h2 id="quick-log-modal-title" className="text-lg sm:text-xl font-extrabold text-surface-ink">
                Catat Kebiasaan Cepat
              </h2>
            </div>
            <p className="text-xs text-surface-hint mt-0.5">
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-surface-sub hover:bg-surface-muted transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Tab Switcher (Sesuai Focused Modal Overlay Backdrop.svg) */}
        <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-soft p-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('air');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-bold transition-all min-h-[44px] ${activeTab === 'air'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-surface-sub hover:text-surface-ink'
              }`}
          >
            <Droplets className="h-4 w-4 shrink-0" />
            <span>Minum Air</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tidur');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-bold transition-all min-h-[44px] ${activeTab === 'tidur'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-surface-sub hover:text-surface-ink'
              }`}
          >
            <Moon className="h-4 w-4 shrink-0" />
            <span>Pola Tidur</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('aktivitas');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-bold transition-all min-h-[44px] ${activeTab === 'aktivitas'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-surface-sub hover:text-surface-ink'
              }`}
          >
            <Activity className="h-4 w-4 shrink-0" />
            <span>Aktivitas Fisik</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-[#FFDAD6] border border-rose-300 px-3.5 py-2.5 text-xs font-semibold text-[#93000A]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* ================= TAB 1: MINUM AIR ================= */}
          {activeTab === 'air' && (
            <>
              {/* Visual Display Card */}
              <div className="rounded-2xl bg-gradient-to-br from-surface-soft to-[#E5EEFF]/70 p-4 border border-surface-accent/60 text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#86F2E4] text-[#005049]">
                    <Droplets className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-surface-ink">
                        {waterAmount || 0}
                      </span>
                      <span className="text-sm font-bold text-brand-600">{waterUnit}</span>
                    </div>
                    <p className="text-xs text-surface-sub">
                      Setara <strong>{computedWaterMl.toLocaleString('id-ID')} ml</strong> air minum
                    </p>
                  </div>
                </div>
              </div>

              {/* Pintasan Cepat */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-sub mb-2">
                  1. Pintasan Cepat (Preset)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WATER_PRESETS.map((preset) => {
                    const isSelected =
                      Number(waterAmount) === preset.amount && waterUnit === preset.unit;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleWaterPresetSelect(preset)}
                        className={`flex items-center justify-center gap-1 rounded-xl px-2.5 py-2.5 text-xs font-bold border transition-all min-h-[44px] ${isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                            : 'bg-surface-soft text-surface-ink border-transparent hover:bg-surface-muted'
                          }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jumlah & Satuan Custom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="water-amount-input"
                    className="block text-xs font-semibold text-surface-ink mb-1"
                  >
                    Jumlah Air
                  </label>
                  <input
                    id="water-amount-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5000"
                    value={waterAmount}
                    onChange={(e) => setWaterAmount(e.target.value)}
                    placeholder="Contoh: 250"
                    className="input-field"
                    required
                  />
                  {fieldErrors.amount && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{fieldErrors.amount}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="water-unit-select"
                    className="block text-xs font-semibold text-surface-ink mb-1"
                  >
                    Satuan
                  </label>
                  <select
                    id="water-unit-select"
                    value={waterUnit}
                    onChange={(e) => setWaterUnit(e.target.value)}
                    className="input-field"
                  >
                    <option value="ml">Mililiter (ml)</option>
                    <option value="gelas">Gelas (250 ml)</option>
                    <option value="l">Liter (1.000 ml)</option>
                  </select>
                </div>
              </div>

              {/* Waktu & Tanggal Konsumsi */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-sub mb-2">
                  2. Waktu & Tanggal Konsumsi
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: 'now', label: 'Baru Saja' },
                    { id: '15m', label: '15 Mnt Lalu' },
                    { id: 'custom', label: 'Pilih Jam' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWaterTimeMode(opt.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition-all min-h-[44px] ${waterTimeMode === opt.id
                          ? 'bg-[#85F8C4] text-[#002114]'
                          : 'bg-surface-soft text-surface-sub hover:bg-surface-muted'
                        }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="water-date" className="block text-xs font-semibold text-surface-ink mb-1">
                      Tanggal Catatan
                    </label>
                    <input
                      id="water-date"
                      type="date"
                      max={todayMax}
                      value={waterDate}
                      onChange={(e) => setWaterDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  {waterTimeMode === 'custom' && (
                    <div>
                      <label htmlFor="water-time" className="block text-xs font-semibold text-surface-ink mb-1">
                        Jam Minum
                      </label>
                      <input
                        id="water-time"
                        type="time"
                        value={waterCustomTime}
                        onChange={(e) => setWaterCustomTime(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan Opsional */}
              <div>
                <label htmlFor="water-notes" className="block text-xs font-semibold text-surface-ink mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  id="water-notes"
                  type="text"
                  maxLength={500}
                  value={waterNotes}
                  onChange={(e) => setWaterNotes(e.target.value)}
                  placeholder="Contoh: Air hangat setelah bangun pagi / setelah olahraga"
                  className="input-field"
                />
              </div>
            </>
          )}

          {/* ================= TAB 2: POLA TIDUR ================= */}
          {activeTab === 'tidur' && (
            <>
              {/* Live Duration Preview Banner */}
              <div className="rounded-2xl bg-gradient-to-br from-surface-soft to-[#D3E4FE]/60 p-4 border border-surface-accent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D3E4FE] text-[#0B1C30]">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-surface-sub">

                      </p>
                      <p className="text-2xl font-extrabold text-surface-ink">
                        {sleepPreview.text}{' '}
                        <span className="text-xs font-normal text-surface-sub">
                          ({sleepPreview.minutes} menit)
                        </span>
                      </p>
                    </div>
                  </div>
                  {sleepPreview.isOvernight && (
                    <span className="rounded-lg bg-brand-100 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                      Lintas Hari (+1)
                    </span>
                  )}
                </div>
                {sleepPreview.error && (
                  <p className="mt-2 text-xs font-semibold text-[#BA1A1A]">{sleepPreview.error}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="sleep-date" className="block text-xs font-semibold text-surface-ink mb-1">
                    1. Tanggal Mulai Tidur
                  </label>
                  <input
                    id="sleep-date"
                    type="date"
                    max={todayMax}
                    value={sleepDate}
                    onChange={(e) => setSleepDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sleep-start" className="block text-xs font-semibold text-surface-ink mb-1">
                    2. Jam Mulai Tidur
                  </label>
                  <input
                    id="sleep-start"
                    type="time"
                    value={sleepStartTime}
                    onChange={(e) => setSleepStartTime(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sleep-end" className="block text-xs font-semibold text-surface-ink mb-1">
                    3. Jam Bangun
                  </label>
                  <input
                    id="sleep-end"
                    type="time"
                    value={sleepEndTime}
                    onChange={(e) => setSleepEndTime(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Kualitas Tidur */}
              <div>
                <label className="block text-xs font-semibold text-surface-ink mb-2">
                  4. Kualitas Tidur
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SLEEP_QUALITY_OPTIONS.map((q) => {
                    const isSelected = sleepQuality === q.value;
                    return (
                      <button
                        key={q.value}
                        type="button"
                        onClick={() => setSleepQuality(q.value)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all min-h-[44px] ${isSelected
                            ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                            : 'border-slate-200 bg-white hover:bg-surface-soft'
                          }`}
                      >
                        <span className="text-xs font-bold text-surface-ink">{q.label}</span>
                        <span className="text-[11px] text-surface-hint mt-0.5 line-clamp-1">
                          {q.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="sleep-notes" className="block text-xs font-semibold text-surface-ink mb-1">
                  Catatan Tidur (Opsional)
                </label>
                <input
                  id="sleep-notes"
                  type="text"
                  maxLength={500}
                  value={sleepNotes}
                  onChange={(e) => setSleepNotes(e.target.value)}
                  placeholder="Contoh: Tidur nyenyak tanpa terbangun"
                  className="input-field"
                />
              </div>
            </>
          )}

          {/* ================= TAB 3: AKTIVITAS FISIK ================= */}
          {activeTab === 'aktivitas' && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-sub mb-2">
                  1. Pilih Jenis Aktivitas Fisik
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_PRESETS.map((preset) => {
                    const active = selectedActivityPreset === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleActivityPresetSelect(preset)}
                        className={`rounded-xl px-3 py-2 text-xs font-bold border transition-all min-h-[40px] ${active
                            ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                            : 'bg-surface-soft text-surface-ink border-transparent hover:bg-surface-muted'
                          }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedActivityPreset('Lainnya')}
                    className={`rounded-xl px-3 py-2 text-xs font-bold border transition-all min-h-[40px] ${selectedActivityPreset === 'Lainnya'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-surface-soft text-surface-ink border-transparent hover:bg-surface-muted'
                      }`}
                  >
                    + Lainnya (Ketik)
                  </button>
                </div>
              </div>

              {selectedActivityPreset === 'Lainnya' && (
                <div>
                  <label htmlFor="custom-activity-type" className="block text-xs font-semibold text-surface-ink mb-1">
                    Nama Aktivitas Fisik
                  </label>
                  <input
                    id="custom-activity-type"
                    type="text"
                    maxLength={100}
                    value={customActivityType}
                    onChange={(e) => setCustomActivityType(e.target.value)}
                    placeholder="Masukkan jenis olahraga (mis. Basket, Pilates, Naik Tangga)"
                    className="input-field"
                    required
                  />
                </div>
              )}

              {/* Durasi & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="activity-duration" className="block text-xs font-semibold text-surface-ink mb-1">
                    2. Durasi (Menit)
                  </label>
                  <input
                    id="activity-duration"
                    type="number"
                    min="1"
                    max="1440"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="Contoh: 30"
                    className="input-field"
                    required
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    {[15, 30, 45, 60, 90].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(String(m))}
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${Number(durationMinutes) === m
                            ? 'bg-brand-600 text-white'
                            : 'bg-surface-soft text-surface-sub hover:bg-surface-muted'
                          }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="activity-date" className="block text-xs font-semibold text-surface-ink mb-1">
                    Tanggal Aktivitas
                  </label>
                  <input
                    id="activity-date"
                    type="date"
                    max={todayMax}
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Intensitas */}
              <div>
                <label className="block text-xs font-semibold text-surface-ink mb-2">
                  3. Tingkat Intensitas
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {INTENSITY_OPTIONS.map((opt) => {
                    const active = intensity === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntensity(opt.value)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all min-h-[44px] ${active
                            ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                            : 'border-slate-200 bg-white hover:bg-surface-soft'
                          }`}
                      >
                        <span className="text-xs font-bold text-surface-ink">{opt.label}</span>
                        <span className="text-[11px] text-surface-hint mt-0.5 line-clamp-1">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="activity-notes" className="block text-xs font-semibold text-surface-ink mb-1">
                  Catatan Aktivitas (Opsional)
                </label>
                <input
                  id="activity-notes"
                  type="text"
                  maxLength={500}
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="Contoh: Keliling lapangan Unhas 5 putaran"
                  className="input-field"
                />
              </div>
            </>
          )}

          {/* Submit Button with Anti Double-Submit (NFR-02) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan Catatan...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>
                    Simpan Catatan (
                    {activeTab === 'air' ? '+5 Poin' : '+10 Poin'}
                    <Sparkles className="inline h-3.5 w-3.5 ml-1 text-[#85F8C4]" />)
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

