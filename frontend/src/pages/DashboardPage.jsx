import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  Flame,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  activityApi,
  chartApi,
  dashboardApi,
  sleepApi,
  waterApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ACTIVITY_PRESETS, CATEGORY_META } from '../utils/constants';
import {
  calculateSleepPreview,
  ensureTimeWithSeconds,
  extractHHMM,
  formatDateIndo,
  formatMinutesToHours,
  formatNumberId,
  getCurrentTimeString,
  getTodayDateString,
  setServerToday,
} from '../utils/dateUtils';
import { parseApiError } from '../utils/errorParser';

export default function DashboardPage() {
  const { user, refreshTick, syncUserStats, triggerDataRefresh } = useAuth();
  const { showGamificationFeedback, showToast } = useToast();
  const outletCtx = useOutletContext() || {};
  const openQuickLog = outletCtx.openQuickLog || (() => {});
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [dailyChart, setDailyChart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Add Water buttons state on Water Card
  const [quickWaterLoading, setQuickWaterLoading] = useState(null); // 250 | 500 | null

  // Inline Widget "Catat Cepat Cerdas" state
  const [widgetTab, setWidgetTab] = useState('air'); // 'air' | 'tidur' | 'aktivitas'
  const [widgetSubmitting, setWidgetSubmitting] = useState(false);
  const [widgetWaterMl, setWidgetWaterMl] = useState(250);
  const [widgetSleepStart, setWidgetSleepStart] = useState('22:30');
  const [widgetSleepEnd, setWidgetSleepEnd] = useState('06:30');
  const [widgetSleepQuality, setWidgetSleepQuality] = useState('baik');
  const [widgetActivityType, setWidgetActivityType] = useState('Jalan Kaki');
  const [widgetActivityMins, setWidgetActivityMins] = useState(30);
  const [widgetActivityIntensity, setWidgetActivityIntensity] = useState('sedang');

  const fetchDashboardData = useCallback(async () => {
    setErrorMsg('');
    try {
      const [dashRes, histRes, chartRes] = await Promise.all([
        dashboardApi.getDashboard(),
        dashboardApi.getHistory({ limit: 5, offset: 0 }),
        chartApi.getCharts({ period: 'harian' }),
      ]);
      if (dashRes?.today) {
        setServerToday(dashRes.today);
      }
      setDashboard(dashRes);
      setRecentHistory(histRes?.items || []);
      setDailyChart(chartRes);
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memuat ringkasan dashboard.');
      setErrorMsg(parsed.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTick]);

  // Handler tombol +250ml / +500ml langsung di kartu Hidrasi Harian
  const handleInstantWaterCard = async (mlAmount) => {
    if (quickWaterLoading || widgetSubmitting) return;
    try {
      setQuickWaterLoading(mlAmount);
      const res = await waterApi.create({
        log_date: dashboard?.today || getTodayDateString(),
        log_time: getCurrentTimeString(true),
        amount: mlAmount,
        unit: 'ml',
        notes: 'Catat cepat dari Dashboard',
      });
      syncUserStats(res.gamification);
      showGamificationFeedback(`Minum air +${mlAmount} ml`, res.gamification);
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal mencatat konsumsi air.');
      showToast({ type: 'error', title: 'Gagal Mencatat Air', message: parsed.message });
    } finally {
      setQuickWaterLoading(null);
    }
  };

  // Handler Widget "Catat Cepat Cerdas" (Inline di Dashboard)
  const handleWidgetSubmit = async (e) => {
    e.preventDefault();
    if (widgetSubmitting) return;
    const todayDate = dashboard?.today || getTodayDateString();

    try {
      setWidgetSubmitting(true);
      if (widgetTab === 'air') {
        const res = await waterApi.create({
          log_date: todayDate,
          log_time: getCurrentTimeString(true),
          amount: Number(widgetWaterMl),
          unit: 'ml',
          notes: 'Dicatat via Catat Cepat ',
        });
        syncUserStats(res.gamification);
        showGamificationFeedback(`Minum air ${widgetWaterMl} ml`, res.gamification);
      } else if (widgetTab === 'tidur') {
        const preview = calculateSleepPreview(widgetSleepStart, widgetSleepEnd);
        if (!preview.valid) {
          showToast({
            type: 'error',
            title: 'Waktu Tidur Tidak Valid',
            message: preview.error || 'Periksa jam tidur dan bangun.',
          });
          setWidgetSubmitting(false);
          return;
        }
        const res = await sleepApi.create({
          sleep_date: todayDate,
          sleep_start_time: ensureTimeWithSeconds(widgetSleepStart),
          sleep_end_time: ensureTimeWithSeconds(widgetSleepEnd),
          quality: widgetSleepQuality,
          notes: 'Dicatat via Catat Cepat ',
        });
        syncUserStats(res.gamification);
        showGamificationFeedback(`Tidur (${preview.text})`, res.gamification);
      } else if (widgetTab === 'aktivitas') {
        const mins = Number(widgetActivityMins) || 30;
        const res = await activityApi.create({
          activity_type: widgetActivityType,
          activity_date: todayDate,
          duration_minutes: mins,
          intensity: widgetActivityIntensity,
          notes: 'Dicatat via Catat Cepat ',
        });
        syncUserStats(res.gamification);
        showGamificationFeedback(`${widgetActivityType} (${mins} mnt)`, res.gamification);
      }
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal menyimpan catatan cepat.');
      showToast({ type: 'error', title: 'Gagal Menyimpan', message: parsed.message });
    } finally {
      setWidgetSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-3xl bg-slate-200/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-52 rounded-2xl bg-slate-200/70" />
          <div className="h-52 rounded-2xl bg-slate-200/70" />
          <div className="h-52 rounded-2xl bg-slate-200/70" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-slate-200/70" />
          <div className="h-80 rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    );
  }

  const activeTargets = dashboard?.active_targets || [];
  const waterTotalMl = Number(dashboard?.water_today?.total_ml || 0);
  const waterCount = dashboard?.water_today?.count || 0;
  const activityTotalMins = dashboard?.activity_today?.total_minutes || 0;
  const activityCount = dashboard?.activity_today?.count || 0;
  const lastSleep = dashboard?.last_sleep || null;

  // Cari target harian aktif untuk referensi persentase kartu ringkasan
  const activeWaterTarget = activeTargets.find((t) => t.category === 'air' && t.frequency === 'harian');
  const waterGoalMl = activeWaterTarget
    ? activeWaterTarget.unit === 'l'
      ? Number(activeWaterTarget.target_value) * 1000
      : activeWaterTarget.unit === 'gelas'
      ? Number(activeWaterTarget.target_value) * 250
      : Number(activeWaterTarget.target_value)
    : 2000;
  const waterPct = Math.min(100, Math.round((waterTotalMl / (waterGoalMl || 2000)) * 100));

  const activeActivityTarget = activeTargets.find(
    (t) => t.category === 'aktivitas' && t.frequency === 'harian'
  );
  const activityGoalMins = activeActivityTarget
    ? activeActivityTarget.unit === 'jam'
      ? Number(activeActivityTarget.target_value) * 60
      : Number(activeActivityTarget.target_value)
    : 30;
  const activityPct = Math.min(100, Math.round((activityTotalMins / (activityGoalMins || 30)) * 100));

  const completedTargetsCount = activeTargets.filter((t) => t.progress?.completed).length;

  // Siapkan data grafik harian 7 hari terakhir
  const chartData = (() => {
    if (!dailyChart?.series?.length) return [];
    const labels = dailyChart.series[0]?.points?.map((p) => p.label) || [];
    return labels.map((label, idx) => {
      const row = { label };
      dailyChart.series.forEach((s) => {
        if (s.name.toLowerCase().includes('aktivitas')) {
          row.aktivitas = s.points[idx]?.value || 0;
        } else if (s.name.toLowerCase().includes('air')) {
          row.air = Math.round((s.points[idx]?.value || 0) / 100); // skala ratusan ml agar sebanding di mini chart
          row.airRaw = s.points[idx]?.value || 0;
        } else if (s.name.toLowerCase().includes('tidur')) {
          row.tidur = s.points[idx]?.value || 0;
        }
      });
      return row;
    });
  })();

  const widgetSleepPreview = calculateSleepPreview(widgetSleepStart, widgetSleepEnd);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-[#FFDAD6] border border-rose-300 px-4 py-3 text-xs font-semibold text-[#93000A]">
          {errorMsg}
        </div>
      )}

      {/* ================= HERO GREETING BANNER (Sesuai Figma Dashboard) ================= */}
      <section className="rounded-3xl bg-gradient-to-r from-[#E6F9EE] via-[#EFF4FF] to-[#E6F9EE] border border-emerald-200/70 p-5 sm:p-7 shadow-card relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-xl">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#85F8C4] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#002114]">
                WELLTRACK V1.0
              </span>
              <span className="text-xs font-semibold text-surface-sub flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-brand-600" />
                {formatDateIndo(dashboard?.today || getTodayDateString(), { withDayName: true })}
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-surface-ink tracking-tight">
              Selamat datang kembali, {user?.name?.split(' ')[0] || 'Teman Sehat'}!
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-surface-sub leading-relaxed">
              &ldquo;Konsistensi kecil hari ini adalah pondasi energi tak terbatas esok hari.&rdquo;
              Pantau dan lengkapi kebiasaan sehat Anda hari ini.
            </p>
          </div>

          {/* Streak & Points Summary Card */}
          <div className="rounded-2xl bg-white/95 backdrop-blur-xs p-4 sm:p-5 border border-emerald-100 shadow-sm flex items-center justify-between gap-4 lg:min-w-[340px]">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFDDB8] text-[#825100]">
                <Flame className="h-6 w-6 fill-[#A36700] text-[#A36700]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-extrabold text-[#825100]">
                    {dashboard?.current_streak ?? 0} Hari Beruntun!
                  </span>
                  <span className="rounded-md bg-[#FFDDB8]/70 px-2 py-0.5 text-[11px] font-bold text-[#825100]">
                    Rekor: {dashboard?.longest_streak ?? 0}h
                  </span>
                </div>
                <p className="text-xs text-surface-sub mt-0.5">
                  Total Poin Vitalitas:{' '}
                  <strong className="text-brand-700">
                    {(dashboard?.total_points ?? 0).toLocaleString('id-ID')} Poin
                  </strong>
                </p>
              </div>
            </div>

            <Link
              to="/gamification"
              className="btn-primary px-3.5 py-2 text-xs shrink-0"
            >
              <Award className="h-4 w-4" />
              <span>Prestasi</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 3 DAILY SUMMARY CARDS ================= */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Hidrasi Harian */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#86F2E4]/40 text-[#006A61]">
                <Droplets className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#85F8C4]/50 px-3 py-1 text-xs font-extrabold text-[#005137]">
                {waterPct}% Tercapai
              </span>
            </div>

            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-surface-sub">
              Hidrasi Harian ({waterCount} Catatan)
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-surface-ink">
                  {formatNumberId(waterTotalMl / 1000, 2)}
                </span>
                <span className="text-sm font-bold text-surface-hint ml-1">
                  / {formatNumberId(waterGoalMl / 1000, 1)} L
                </span>
              </div>
              <span className="text-xs font-bold text-[#006A61]">
                {formatNumberId(waterTotalMl, 0)} ml
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full rounded-full bg-surface-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-[#006A61] transition-all duration-500"
                style={{ width: `${waterPct}%` }}
              />
            </div>

            <p className="mt-2 text-xs font-semibold text-brand-600">
              {waterTotalMl >= waterGoalMl
                ? 'Target hidrasi harian telah tercapai!'
                : `Kurang ${formatNumberId(Math.max(0, waterGoalMl - waterTotalMl), 0)} ml lagi`}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={Boolean(quickWaterLoading)}
              onClick={() => handleInstantWaterCard(250)}
              className="btn-secondary py-2 text-xs font-bold"
            >
              {quickWaterLoading === 250 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                '+ 250 ml'
              )}
            </button>
            <button
              type="button"
              disabled={Boolean(quickWaterLoading)}
              onClick={() => handleInstantWaterCard(500)}
              className="btn-secondary py-2 text-xs font-bold"
            >
              {quickWaterLoading === 500 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                '+ 500 ml'
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Kualitas & Pola Tidur Terakhir */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D3E4FE]/70 text-[#0B1C30]">
                <Moon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#85F8C4]/50 px-3 py-1 text-xs font-extrabold text-[#005137] capitalize">
                {lastSleep?.quality ? `Kualitas: ${lastSleep.quality}` : 'Pola Tidur'}
              </span>
            </div>

            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-surface-sub">
              Catatan Tidur Terakhir
            </p>

            {lastSleep ? (
              <>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-surface-ink">
                    {formatMinutesToHours(lastSleep.duration_minutes)}
                  </span>
                  <span className="text-xs font-bold text-brand-600">
                    ({lastSleep.duration_minutes} menit)
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-medium text-surface-sub">
                  🕒 {extractHHMM(lastSleep.sleep_start)} – {extractHHMM(lastSleep.sleep_end)} WITA •{' '}
                  {formatDateIndo(lastSleep.sleep_date, { shortMonth: true })}
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-surface-soft overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((lastSleep.duration_minutes / 480) * 100))}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-xl bg-surface-soft p-3 text-xs text-surface-sub">
                Belum ada catatan tidur. Catat jam mulai tidur & jam bangun Anda hari ini.
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => openQuickLog('tidur')}
              className="btn-secondary w-full py-2 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Jam Tidur</span>
            </button>
          </div>
        </div>

        {/* Card 3: Aktivitas Fisik Hari Ini */}
        <div className="card-surface p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#85F8C4]/50 text-[#005137]">
                <Activity className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#85F8C4]/50 px-3 py-1 text-xs font-extrabold text-[#005137]">
                {activityPct}% Target
              </span>
            </div>

            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-surface-sub">
              Aktivitas Fisik Hari Ini ({activityCount} Sesi)
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-surface-ink">
                {formatNumberId(activityTotalMins, 0)}
              </span>
              <span className="text-sm font-bold text-surface-hint">
                / {formatNumberId(activityGoalMins, 0)} menit
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full rounded-full bg-surface-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${activityPct}%` }}
              />
            </div>

            <p className="mt-2 text-xs font-semibold text-surface-sub">
              {activityTotalMins >= activityGoalMins
                ? 'Target durasi aktivitas fisik hari ini tercapai!'
                : `${Math.max(0, activityGoalMins - activityTotalMins)} menit lagi menuju sasaran harian`}
            </p>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => openQuickLog('aktivitas')}
              className="btn-secondary w-full py-2 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Aktivitas Fisik</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= MIDDLE ROW: ACTIVE TARGETS + INLINE QUICK LOG WIDGET ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Target & Rutinitas Hari Ini */}
        <div className="lg:col-span-7 card-surface p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-extrabold text-surface-ink">
                    Target & Rutinitas Aktif
                  </h2>
                  <span className="rounded-full bg-[#85F8C4]/50 px-2.5 py-0.5 text-xs font-bold text-[#005137]">
                    {completedTargetsCount} / {activeTargets.length} Tercapai
                  </span>
                </div>
                <p className="text-xs text-surface-sub mt-0.5">
                  Progres target dihitung otomatis secara real-time dari catatan harian Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/targets')}
                className="btn-secondary px-3.5 py-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Target</span>
              </button>
            </div>

            {activeTargets.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-surface-soft border border-dashed border-surface-accent p-8 text-center">
                <Target className="h-10 w-10 text-brand-600 mx-auto" />
                <h3 className="mt-3 text-sm font-bold text-surface-ink">
                  Belum Ada Target Kesehatan Aktif
                </h3>
                <p className="mt-1 text-xs text-surface-sub max-w-sm mx-auto">
                  Pilih target dari template rekomendasi sistem atau buat target manual sesuai
                  kebutuhan Anda.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/targets')}
                  className="btn-primary mt-4 text-xs px-4 py-2"
                >
                  Jelajahi Template Target
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {activeTargets.slice(0, 5).map((t) => {
                  const pct = Math.min(100, Math.round(t.progress?.percentage || 0));
                  const isDone = Boolean(t.progress?.completed);
                  const catMeta = CATEGORY_META[t.category] || CATEGORY_META.aktivitas;

                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl p-4 border transition-all ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : 'bg-surface-soft/70 border-surface-accent/50 hover:bg-surface-soft'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                              isDone
                                ? 'bg-brand-600 text-white'
                                : 'bg-white text-brand-600 border border-slate-200'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : t.category === 'air' ? (
                              <Droplets className="h-4 w-4" />
                            ) : t.category === 'tidur' ? (
                              <Moon className="h-4 w-4" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-sm font-extrabold truncate ${
                                  isDone ? 'line-through text-surface-sub' : 'text-surface-ink'
                                }`}
                              >
                                {t.name}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catMeta.pillBg}`}
                              >
                                {pct}%
                              </span>
                            </div>
                            <p className="text-xs text-surface-sub mt-0.5">
                              Frekuensi <span className="capitalize font-semibold">{t.frequency}</span> •
                              Periode terpenuhi: {t.progress?.periods_met ?? 0}/
                              {t.progress?.periods_total ?? 1} • s.d.{' '}
                              {formatDateIndo(t.end_date, { shortMonth: true })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-extrabold text-surface-ink">
                            {formatNumberId(t.progress?.realized ?? 0)} /{' '}
                            {formatNumberId(t.target_value)} {t.unit}
                          </p>
                          <p
                            className={`text-[11px] font-bold ${
                              isDone ? 'text-brand-600' : 'text-surface-hint'
                            }`}
                          >
                            {isDone ? 'Periode Selesai ✓' : 'Sedang Berjalan'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 w-full rounded-full bg-white overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-600 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {activeTargets.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-surface-hint">
                Menampilkan {Math.min(5, activeTargets.length)} dari {activeTargets.length} target aktif
              </span>
              <Link
                to="/targets"
                className="font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <span>Kelola Semua Target</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Right (5 cols): Widget "Catat Cepat " (Sesuai Figma Dashboard) */}
        <div className="lg:col-span-5 card-surface p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                <h2 className="text-base sm:text-lg font-extrabold text-surface-ink">
                  Catat Cepat 
                </h2>
              </div>
              <span className="rounded-lg bg-surface-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-surface-sub">
                INSTAN
              </span>
            </div>

            {/* 3 Pill Tabs */}
            <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface-soft p-1">
              {[
                { id: 'air', label: 'Air', icon: Droplets },
                { id: 'tidur', label: 'Tidur', icon: Moon },
                { id: 'aktivitas', label: 'Latihan', icon: Activity },
              ].map((t) => {
                const Icon = t.icon;
                const active = widgetTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setWidgetTab(t.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all min-h-[40px] ${
                      active
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-surface-sub hover:text-surface-ink'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inline Quick Form */}
            <form onSubmit={handleWidgetSubmit} className="mt-4 space-y-4">
              {widgetTab === 'air' && (
                <>
                  <div className="rounded-2xl bg-surface-soft p-3.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-sub">Takaran Sekali Minum:</span>
                    <span className="text-lg font-extrabold text-brand-600">
                      {widgetWaterMl} ml
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[200, 250, 500].map((ml) => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setWidgetWaterMl(ml)}
                        className={`rounded-xl py-2.5 text-xs font-bold transition-all min-h-[42px] ${
                          widgetWaterMl === ml
                            ? 'bg-[#85F8C4] text-[#002114]'
                            : 'bg-surface-soft text-surface-ink hover:bg-surface-muted'
                        }`}
                      >
                        {ml} ml
                      </button>
                    ))}
                  </div>
                </>
              )}

              {widgetTab === 'tidur' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-surface-sub mb-1">
                        Mulai Tidur
                      </label>
                      <input
                        type="time"
                        value={widgetSleepStart}
                        onChange={(e) => setWidgetSleepStart(e.target.value)}
                        className="input-field py-2 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-surface-sub mb-1">
                        Waktu Bangun
                      </label>
                      <input
                        type="time"
                        value={widgetSleepEnd}
                        onChange={(e) => setWidgetSleepEnd(e.target.value)}
                        className="input-field py-2 text-xs"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-surface-soft px-3 py-2 text-xs">
                    <span className="text-surface-sub">Durasi otomatis:</span>
                    <strong className="text-brand-700">{widgetSleepPreview.text}</strong>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['baik', 'cukup', 'buruk'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setWidgetSleepQuality(q)}
                        className={`rounded-xl py-2 text-xs font-bold capitalize min-h-[38px] ${
                          widgetSleepQuality === q
                            ? 'bg-[#85F8C4] text-[#002114]'
                            : 'bg-surface-soft text-surface-sub'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {widgetTab === 'aktivitas' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-surface-sub mb-1">
                      Jenis Olahraga / Aktivitas
                    </label>
                    <select
                      value={widgetActivityType}
                      onChange={(e) => setWidgetActivityType(e.target.value)}
                      className="input-field py-2 text-xs"
                    >
                      {ACTIVITY_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-surface-sub mb-1">
                        Durasi (Menit)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={widgetActivityMins}
                        onChange={(e) => setWidgetActivityMins(e.target.value)}
                        className="input-field py-2 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-surface-sub mb-1">
                        Intensitas
                      </label>
                      <select
                        value={widgetActivityIntensity}
                        onChange={(e) => setWidgetActivityIntensity(e.target.value)}
                        className="input-field py-2 text-xs"
                      >
                        <option value="rendah">Rendah</option>
                        <option value="sedang">Sedang</option>
                        <option value="tinggi">Tinggi</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={widgetSubmitting}
                className="btn-primary w-full py-3 text-xs sm:text-sm font-bold"
              >
                {widgetSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Simpan Instan</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => openQuickLog(widgetTab)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ingin memilih tanggal H-1 atau menambah catatan? Buka Form Lengkap →
            </button>
          </div>
        </div>
      </section>

      {/* ================= BOTTOM ROW: WEEKLY CHART + RECENT LOGS & BADGES ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Tren Kepatuhan 7 Hari Terakhir */}
        <div className="lg:col-span-7 card-surface p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-surface-ink">
                  Tren Kebiasaan 7 Hari Terakhir
                </h2>
                <p className="text-xs text-surface-sub">
                  Perbandingan aktivitas fisik (menit) dan durasi tidur harian (menit)
                </p>
              </div>
              <Link
                to="/analytics"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <span>Lihat Rincian Analitik</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {!dailyChart?.has_data ? (
              <div className="mt-6 rounded-2xl bg-surface-soft p-8 text-center">
                <TrendingUp className="h-9 w-9 text-surface-hint mx-auto" />
                <p className="mt-2 text-sm font-bold text-surface-ink">
                  {dailyChart?.message || 'Data belum tersedia.'}
                </p>
                <p className="mt-1 text-xs text-surface-sub">
                  Mulai catat aktivitas, air, atau tidur untuk melihat grafik perkembangan Anda.
                </p>
              </div>
            ) : (
              <div className="mt-5 h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#3D4A42', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6D7A72' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="aktivitas"
                      name="Aktivitas (menit)"
                      fill="#006948"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="tidur"
                      name="Tidur (menit)"
                      fill="#006A61"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right (5 cols): Aktivitas Terkini & Badge Terbaru */}
        <div className="lg:col-span-5 card-surface p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-surface-ink">Aktivitas Terkini</h2>
              <span className="text-xs font-bold text-brand-600">Riwayat Terbaru</span>
            </div>

            {recentHistory.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-surface-soft p-6 text-center text-xs text-surface-sub">
                Belum ada riwayat pencatatan kesehatan.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentHistory.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft/70 px-3.5 py-2.5 border border-surface-accent/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          item.type === 'air'
                            ? 'bg-[#86F2E4]/50 text-[#005049]'
                            : item.type === 'tidur'
                            ? 'bg-[#D3E4FE] text-[#0B1C30]'
                            : 'bg-[#85F8C4]/60 text-[#005137]'
                        }`}
                      >
                        {item.type === 'air' ? (
                          <Droplets className="h-4 w-4" />
                        ) : item.type === 'tidur' ? (
                          <Moon className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-surface-ink truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-surface-sub">
                          {formatDateIndo(item.log_date, { shortMonth: true })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-brand-700 shrink-0">
                      {item.type === 'tidur'
                        ? formatMinutesToHours(item.value)
                        : `${formatNumberId(item.value)} ${item.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Badges Section */}
          {Array.isArray(dashboard?.recent_badges) && dashboard.recent_badges.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-extrabold uppercase tracking-wider text-surface-sub mb-2">
                Lencana Terbaru Diperoleh
              </p>
              <div className="flex flex-wrap gap-2">
                {dashboard.recent_badges.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFDDB8]/60 px-3 py-1.5 text-xs font-bold text-[#825100]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#A36700]" />
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 text-center">
            <Link
              to="/analytics"
              className="text-xs font-bold text-surface-sub hover:text-brand-600 inline-flex items-center gap-1"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Lihat Semua Riwayat & Kelola Catatan</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

