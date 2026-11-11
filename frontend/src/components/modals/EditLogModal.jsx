import React, { useEffect, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { activityApi, sleepApi, waterApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { INTENSITY_OPTIONS, SLEEP_QUALITY_OPTIONS } from '../../utils/constants';
import {
  calculateSleepPreview,
  ensureTimeWithSeconds,
  extractHHMM,
  getTodayDateString,
} from '../../utils/dateUtils';
import { parseApiError } from '../../utils/errorParser';

export default function EditLogModal({ isOpen, onClose, item, onSaved }) {
  const { triggerDataRefresh } = useAuth();
  const { showToast } = useToast();

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fields
  const [activityType, setActivityType] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [intensity, setIntensity] = useState('sedang');

  const [waterDate, setWaterDate] = useState('');
  const [waterTime, setWaterTime] = useState('08:00');
  const [waterAmount, setWaterAmount] = useState('');
  const [waterUnit, setWaterUnit] = useState('ml');

  const [sleepDate, setSleepDate] = useState('');
  const [sleepStartTime, setSleepStartTime] = useState('22:30');
  const [sleepEndTime, setSleepEndTime] = useState('06:30');
  const [sleepQuality, setSleepQuality] = useState('baik');

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !item?.id || !item?.type) return;

    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoadingDetail(true);
      setErrorMsg('');
      try {
        if (item.type === 'aktivitas') {
          const data = await activityApi.get(item.id);
          if (!isMounted) return;
          setActivityType(data.activity_type || '');
          setActivityDate(data.activity_date || '');
          setDurationMinutes(String(data.duration_minutes || ''));
          setIntensity(data.intensity || 'sedang');
          setNotes(data.notes || '');
        } else if (item.type === 'air') {
          const data = await waterApi.get(item.id);
          if (!isMounted) return;
          setWaterDate(data.log_date || '');
          setWaterTime(extractHHMM(data.log_time) || '08:00');
          setWaterAmount(String(data.amount || ''));
          setWaterUnit(data.unit || 'ml');
          setNotes(data.notes || '');
        } else if (item.type === 'tidur') {
          const data = await sleepApi.get(item.id);
          if (!isMounted) return;
          setSleepDate(data.sleep_date || '');
          setSleepStartTime(extractHHMM(data.sleep_start) || '22:30');
          setSleepEndTime(extractHHMM(data.sleep_end) || '06:30');
          setSleepQuality(data.quality || 'baik');
          setNotes(data.notes || '');
        }
      } catch (err) {
        if (!isMounted) return;
        const parsed = parseApiError(err, 'Gagal memuat detail catatan.');
        setErrorMsg(parsed.message);
      } finally {
        if (isMounted) setIsLoadingDetail(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const todayMax = getTodayDateString();
  const sleepPreview = calculateSleepPreview(sleepStartTime, sleepEndTime);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    try {
      setIsSubmitting(true);

      if (item.type === 'aktivitas') {
        const mins = parseInt(durationMinutes, 10);
        if (!activityType.trim()) {
          setErrorMsg('Jenis aktivitas wajib diisi.');
          setIsSubmitting(false);
          return;
        }
        if (Number.isNaN(mins) || mins < 1 || mins > 1440) {
          setErrorMsg('Durasi harus antara 1 sampai 1.440 menit.');
          setIsSubmitting(false);
          return;
        }
        await activityApi.update(item.id, {
          activity_type: activityType.trim(),
          activity_date: activityDate,
          duration_minutes: mins,
          intensity,
          notes: notes.trim() || null,
        });
      } else if (item.type === 'air') {
        const amt = Number(waterAmount);
        if (!amt || amt <= 0) {
          setErrorMsg('Jumlah air harus lebih dari 0.');
          setIsSubmitting(false);
          return;
        }
        await waterApi.update(item.id, {
          log_date: waterDate,
          log_time: ensureTimeWithSeconds(waterTime),
          amount: amt,
          unit: waterUnit,
          notes: notes.trim() || null,
        });
      } else if (item.type === 'tidur') {
        if (!sleepPreview.valid) {
          setErrorMsg(sleepPreview.error || 'Waktu tidur tidak valid.');
          setIsSubmitting(false);
          return;
        }
        await sleepApi.update(item.id, {
          sleep_date: sleepDate,
          sleep_start_time: ensureTimeWithSeconds(sleepStartTime),
          sleep_end_time: ensureTimeWithSeconds(sleepEndTime),
          quality: sleepQuality || null,
          notes: notes.trim() || null,
        });
      }

      triggerDataRefresh();
      showToast({
        type: 'success',
        title: 'Catatan Diperbarui',
        message: 'Perubahan catatan kesehatan berhasil disimpan.',
      });
      onSaved?.();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memperbarui catatan.');
      setErrorMsg(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleLabel =
    item.type === 'aktivitas'
      ? 'Ubah Catatan Aktivitas Fisik'
      : item.type === 'air'
      ? 'Ubah Catatan Konsumsi Air'
      : 'Ubah Catatan Pola Tidur';

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-extrabold text-surface-ink">{titleLabel}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoadingDetail ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-surface-sub">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
            <p className="text-xs font-medium">Memuat detail catatan...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="rounded-xl bg-[#FFDAD6] border border-rose-300 px-3.5 py-2.5 text-xs font-semibold text-[#93000A]">
                {errorMsg}
              </div>
            )}

            {item.type === 'aktivitas' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-surface-ink mb-1">
                    Jenis Aktivitas
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Tanggal Aktivitas
                    </label>
                    <input
                      type="date"
                      max={todayMax}
                      value={activityDate}
                      onChange={(e) => setActivityDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Durasi (Menit)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-ink mb-1.5">
                    Intensitas
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {INTENSITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntensity(opt.value)}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all min-h-[44px] ${
                          intensity === opt.value
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 bg-white text-surface-sub'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {item.type === 'air' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Jumlah Air
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5000"
                      value={waterAmount}
                      onChange={(e) => setWaterAmount(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Satuan
                    </label>
                    <select
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Tanggal Catatan
                    </label>
                    <input
                      type="date"
                      max={todayMax}
                      value={waterDate}
                      onChange={(e) => setWaterDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Waktu Minum
                    </label>
                    <input
                      type="time"
                      value={waterTime}
                      onChange={(e) => setWaterTime(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {item.type === 'tidur' && (
              <>
                <div className="rounded-xl bg-surface-soft p-3 text-xs text-surface-sub flex items-center justify-between">
                  <span>Durasi terhitung otomatis:</span>
                  <strong className="text-sm text-surface-ink">
                    {sleepPreview.text} ({sleepPreview.minutes} mnt)
                  </strong>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Tanggal Tidur
                    </label>
                    <input
                      type="date"
                      max={todayMax}
                      value={sleepDate}
                      onChange={(e) => setSleepDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Jam Mulai Tidur
                    </label>
                    <input
                      type="time"
                      value={sleepStartTime}
                      onChange={(e) => setSleepStartTime(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-ink mb-1">
                      Jam Bangun
                    </label>
                    <input
                      type="time"
                      value={sleepEndTime}
                      onChange={(e) => setSleepEndTime(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-ink mb-1.5">
                    Kualitas Tidur
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SLEEP_QUALITY_OPTIONS.map((q) => (
                      <button
                        key={q.value}
                        type="button"
                        onClick={() => setSleepQuality(q.value)}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all min-h-[44px] ${
                          sleepQuality === q.value
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 bg-white text-surface-sub'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-surface-ink mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan keterangan catatan..."
                className="input-field"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-secondary px-4 py-2"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-5 py-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

