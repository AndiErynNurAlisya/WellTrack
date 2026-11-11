import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Flame,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { gamificationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/dateUtils';
import { parseApiError } from '../utils/errorParser';

const CRITERIA_LABELS = {
  total_logs: 'Total Catatan Kesehatan',
  streak: 'Rantai Streak Harian',
  target_completed: 'Target Kesehatan Selesai',
};

function getBadgeIcon(criteriaType) {
  if (criteriaType === 'streak') return Flame;
  if (criteriaType === 'target_completed') return Target;
  return Activity;
}

export default function GamificationPage() {
  const { refreshTick } = useAuth();
  const outletCtx = useOutletContext() || {};
  const openQuickLog = outletCtx.openQuickLog || (() => {});

  const [summary, setSummary] = useState(null);
  const [filterEarned, setFilterEarned] = useState('all'); // 'all' | 'earned' | 'locked'
  const [filterCriteria, setFilterCriteria] = useState(''); // '' | 'total_logs' | 'streak' | 'target_completed'
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchGamification = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await gamificationApi.getSummary();
      setSummary(data);
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memuat data gamifikasi & pencapaian.');
      setErrorMsg(parsed.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGamification();
  }, [fetchGamification, refreshTick]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-3xl bg-slate-200/70" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="h-52 rounded-2xl bg-slate-200/70" />
          <div className="h-52 rounded-2xl bg-slate-200/70" />
          <div className="h-52 rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    );
  }

  const allBadges = summary?.badges || [];
  const earnedBadges = allBadges.filter((b) => b.earned);
  const lockedBadges = allBadges.filter((b) => !b.earned);
  const completionPct =
    allBadges.length > 0 ? Math.round((earnedBadges.length / allBadges.length) * 100) : 0;

  const displayedBadges = allBadges.filter((b) => {
    if (filterEarned === 'earned' && !b.earned) return false;
    if (filterEarned === 'locked' && b.earned) return false;
    if (filterCriteria && b.criteria_type !== filterCriteria) return false;
    return true;
  });

  const currentStreak = summary?.current_streak ?? 0;
  const longestStreak = summary?.longest_streak ?? 0;
  const totalPoints = summary?.total_points ?? 0;
  const lastLogDate = summary?.last_log_date;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-[#FFDAD6] border border-rose-300 px-4 py-3 text-xs font-semibold text-[#93000A]">
          {errorMsg}
        </div>
      )}

      {/* ================= HERO GAMIFICATION BANNER (Sesuai Figma Gamifikasi & Prestasi) ================= */}
      <section className="rounded-3xl bg-gradient-to-br from-[#E6F9EE] via-[#EFF4FF] to-[#E6F9EE] border border-emerald-200/80 p-6 sm:p-8 shadow-card relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left (7 cols): Total Poin & Aturan Perolehan Poin */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#85F8C4]/70 px-3.5 py-1 text-xs font-extrabold text-[#002114]">
              <Trophy className="h-4 w-4 text-brand-700" />
              <span>PENCAPAIAN & POIN VITALITAS</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-brand-700 tracking-tight">
                {totalPoints.toLocaleString('id-ID')}
              </span>
              <span className="text-lg font-extrabold text-surface-ink">Poin Terkumpul</span>
            </div>

            <p className="text-xs sm:text-sm text-surface-sub leading-relaxed max-w-xl">
              Poin diperoleh secara otomatis setiap kali Anda mencatat kebiasaan harian dan
              menyelesaikan target kesehatan yang sedang berjalan.
            </p>

            {/* Progress Koleksi Lencana */}
            <div className="rounded-2xl bg-white/90 p-4 border border-emerald-100 max-w-xl">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-surface-ink">Progres Koleksi Lencana</span>
                <span className="text-brand-700">
                  {earnedBadges.length} / {allBadges.length} Lencana ({completionPct}%)
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full rounded-full bg-surface-soft overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>

              {/* Info Ringkas Aturan Poin (Sesuai Backend) */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] font-semibold text-surface-sub">
                <span className="rounded-lg bg-surface-soft px-2.5 py-1">
                  🏃 Aktivitas: <strong className="text-brand-700">+10 Poin</strong>
                </span>
                <span className="rounded-lg bg-surface-soft px-2.5 py-1">
                  💧 Air: <strong className="text-brand-700">+5 Poin</strong>
                </span>
                <span className="rounded-lg bg-surface-soft px-2.5 py-1">
                  🌙 Tidur: <strong className="text-brand-700">+10 Poin</strong>
                </span>
                <span className="rounded-lg bg-surface-soft px-2.5 py-1">
                  🎯 Target: <strong className="text-brand-700">+20 / +100 Poin</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right (5 cols): Kartu Streak Saat Ini, Streak Terpanjang, & Tanggal Catatan Terakhir (FR-37, FR-38) */}
          <div className="lg:col-span-5 rounded-3xl bg-white p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFDDB8] text-[#825100]">
                  <Flame className="h-6 w-6 fill-[#A36700] text-[#A36700]" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-surface-sub">
                    STREAK SAAT INI
                  </p>
                  <p className="text-2xl font-extrabold text-[#825100]">
                    {currentStreak} Hari Beruntun
                  </p>
                </div>
              </div>

              <span className="rounded-xl bg-surface-soft px-3 py-1.5 text-xs font-extrabold text-surface-ink border border-surface-accent">
                Rekor: {longestStreak} Hari
              </span>
            </div>

            {/* 7-Day Visual Streak Indicator */}
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayLabel, idx) => {
                const isLit = idx < Math.min(7, currentStreak);
                return (
                  <div key={dayLabel} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-surface-sub">{dayLabel}</span>
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isLit
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-surface-soft text-surface-hint border border-slate-200'
                      }`}
                    >
                      {isLit ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Last Log Date Info (FR-38) */}
            <div className="rounded-xl bg-surface-soft px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-surface-sub flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-brand-600" />
                <span>Pencatatan Terakhir:</span>
              </span>
              <strong className="text-surface-ink">
                {lastLogDate ? formatDateIndo(lastLogDate, { shortMonth: true }) : 'Belum ada catatan'}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => openQuickLog('air')}
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              <Zap className="h-4 w-4" />
              <span>Catat Kebiasaan Hari Ini & Jaga Streak</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= GALLERY BADGE / LENCANA (FR-35, FR-36) ================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600">
              PENCAPAIAN HIDUP SEHAT
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-surface-ink">
              Koleksi Lencana & Prestasi
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 text-brand-700">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
              {earnedBadges.length} Terbuka
            </span>
            <span className="inline-flex items-center gap-1.5 text-surface-sub">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D3E4FE]" />
              {lockedBadges.length} Terkunci
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: `Semua Lencana (${allBadges.length})` },
              { id: 'earned', label: `Sudah Diperoleh (${earnedBadges.length})` },
              { id: 'locked', label: `Belum Diperoleh (${lockedBadges.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterEarned(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all min-h-[40px] ${
                  filterEarned === tab.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white text-surface-sub hover:bg-surface-soft border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: '', label: 'Semua Kategori' },
              { id: 'total_logs', label: 'Jumlah Catatan' },
              { id: 'streak', label: 'Konsistensi Streak' },
              { id: 'target_completed', label: 'Penyelesaian Target' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCriteria(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all min-h-[36px] ${
                  filterCriteria === cat.id
                    ? 'bg-surface-ink text-white'
                    : 'bg-surface-soft text-surface-sub hover:bg-surface-muted'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Badge Grid */}
        {displayedBadges.length === 0 ? (
          <div className="card-surface p-10 text-center">
            <Award className="h-10 w-10 text-surface-hint mx-auto" />
            <h3 className="mt-2.5 text-sm font-bold text-surface-ink">
              Tidak Ada Lencana pada Filter Ini
            </h3>
            <p className="mt-1 text-xs text-surface-sub">
              Ubah pilihan filter di atas atau terus catat kebiasaan sehat Anda untuk membuka
              lencana baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedBadges.map((badge) => {
              const IconComp = getBadgeIcon(badge.criteria_type);
              const isEarned = Boolean(badge.earned);
              const criteriaLabel =
                CRITERIA_LABELS[badge.criteria_type] || badge.criteria_type;

              return (
                <div
                  key={badge.id}
                  className={`rounded-3xl p-6 transition-all flex flex-col justify-between relative overflow-hidden ${
                    isEarned
                      ? 'bg-white border-2 border-emerald-200 shadow-card hover:shadow-card-hover'
                      : 'bg-surface-soft/70 border border-slate-300/80 opacity-90'
                  }`}
                >
                  {/* Status Corner Pill */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                        isEarned
                          ? 'bg-[#85F8C4]/60 text-[#005137]'
                          : 'bg-[#D3E4FE] text-[#0B1C30]'
                      }`}
                    >
                      {criteriaLabel}
                    </span>

                    {isEarned ? (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white"
                        title="Sudah Diperoleh"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    ) : (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600"
                        title="Masih Terkunci"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Center Icon & Title */}
                  <div className="my-5 flex flex-col items-center text-center">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-xs ${
                        isEarned
                          ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white'
                          : 'bg-[#D3E4FE]/70 text-slate-600 border border-slate-300'
                      }`}
                    >
                      <IconComp className="h-8 w-8" />
                    </div>

                    <h3 className="mt-4 text-base font-extrabold text-surface-ink">
                      {badge.name}
                    </h3>
                    <p className="mt-1 text-xs text-surface-sub leading-relaxed">
                      {badge.description}
                    </p>
                  </div>

                  {/* Footer Badge Status */}
                  {isEarned ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-center text-xs font-bold text-brand-700 flex items-center justify-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Diraih {badge.earned_at ? formatDateIndo(badge.earned_at, { shortMonth: true }) : 'Tercapai'}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/80 border border-slate-200 px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-surface-sub">Syarat Buka:</span>
                      <strong className="text-surface-ink">
                        {badge.criteria_type === 'streak'
                          ? `Streak ${badge.criteria_value} Hari`
                          : badge.criteria_type === 'target_completed'
                          ? `${badge.criteria_value} Target Selesai`
                          : `${badge.criteria_value} Total Catatan`}
                      </strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

