import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Edit3,
  Filter,
  Loader2,
  Moon,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import {
  formatDateIndo,
  formatMinutesToHours,
  formatNumberId,
  getTodayDateString,
} from '../utils/dateUtils';
import { parseApiError } from '../utils/errorParser';
import EditLogModal from '../components/modals/EditLogModal';
import ConfirmDialog from '../components/modals/ConfirmDialog';

const PAGE_LIMIT = 10;

export default function AnalyticsPage() {
  const { refreshTick, triggerDataRefresh } = useAuth();
  const { showToast } = useToast();
  const outletCtx = useOutletContext() || {};
  const openQuickLog = outletCtx.openQuickLog || (() => {});

  // Chart Filters
  const [period, setPeriod] = useState('mingguan'); // 'harian' | 'mingguan' | 'bulanan'
  const [metric, setMetric] = useState(''); // '' (semua) | 'aktivitas' | 'air' | 'tidur'
  const [chartRes, setChartRes] = useState(null);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartError, setChartError] = useState('');

  // History Filters & Pagination
  const [historyType, setHistoryType] = useState(''); // '' | 'aktivitas' | 'air' | 'tidur'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [historyRes, setHistoryRes] = useState({ items: [], total: 0, limit: PAGE_LIMIT, offset: 0 });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  // Edit & Delete Modal States
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Chart
  const fetchChart = useCallback(async () => {
    setIsLoadingChart(true);
    setChartError('');
    try {
      const data = await chartApi.getCharts({
        period,
        metric: metric || undefined,
      });
      setChartRes(data);
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memuat grafik perkembangan.');
      setChartError(parsed.message);
    } finally {
      setIsLoadingChart(false);
    }
  }, [period, metric]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart, refreshTick]);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setHistoryError('Tanggal mulai (Dari) tidak boleh setelah tanggal selesai (Sampai).');
      return;
    }
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await dashboardApi.getHistory({
        type: historyType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: PAGE_LIMIT,
        offset,
      });
      setHistoryRes(data);
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memuat daftar riwayat pencatatan.');
      setHistoryError(parsed.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyType, dateFrom, dateTo, offset]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTick]);

  const handleResetHistoryFilter = () => {
    setHistoryType('');
    setDateFrom('');
    setDateTo('');
    setOffset(0);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem || isDeleting) return;
    try {
      setIsDeleting(true);
      if (deletingItem.type === 'aktivitas') {
        await activityApi.remove(deletingItem.id);
      } else if (deletingItem.type === 'air') {
        await waterApi.remove(deletingItem.id);
      } else if (deletingItem.type === 'tidur') {
        await sleepApi.remove(deletingItem.id);
      }
      showToast({
        type: 'success',
        title: 'Catatan Dihapus',
        message: `${deletingItem.title} berhasil dihapus dari riwayat.`,
      });
      setDeletingItem(null);
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal menghapus catatan.');
      showToast({ type: 'error', title: 'Gagal Menghapus', message: parsed.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Hitung kartu ringkasan dari series grafik periode aktif
  const summaryStats = (() => {
    let totalAirMl = 0;
    let totalAktivitasMenit = 0;
    let avgTidurMenit = 0;

    if (chartRes?.series) {
      chartRes.series.forEach((s) => {
        const lower = s.name.toLowerCase();
        const nonZeroPoints = s.points.filter((p) => p.value > 0);
        const sumVal = s.points.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

        if (lower.includes('air')) {
          totalAirMl = sumVal;
        } else if (lower.includes('aktivitas')) {
          totalAktivitasMenit = sumVal;
        } else if (lower.includes('tidur')) {
          avgTidurMenit =
            nonZeroPoints.length > 0
              ? Math.round(sumVal / nonZeroPoints.length)
              : 0;
        }
      });
    }
    return { totalAirMl, totalAktivitasMenit, avgTidurMenit };
  })();

  // Transformasi data untuk Recharts
  const formattedChartData = (() => {
    if (!chartRes?.series?.length) return [];
    const basePoints = chartRes.series[0]?.points || [];
    return basePoints.map((pt, idx) => {
      const row = {
        label: pt.label,
        period_start: pt.period_start,
      };
      chartRes.series.forEach((s) => {
        const val = s.points[idx]?.value ?? 0;
        const lower = s.name.toLowerCase();
        if (lower.includes('aktivitas')) {
          row.aktivitas = val;
        } else if (lower.includes('air')) {
          row.air = val;
        } else if (lower.includes('tidur')) {
          row.tidur = val;
        }
      });
      return row;
    });
  })();

  const totalItems = historyRes.total || 0;
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT));

  return (
    <div className="space-y-6">
      {/* ================= PAGE HEADER & PERIOD SWITCHER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#85F8C4]/50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#005137]">
            <BarChart3 className="h-3.5 w-3.5" />
            LAPORAN PERFORMA & RIWAYAT
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-surface-ink tracking-tight">
            Analisis & Tren Kesehatan
          </h1>
          <p className="text-xs sm:text-sm text-surface-sub mt-0.5">
            Pantau grafik perkembangan kebiasaan dan kelola seluruh riwayat catatan Anda.
          </p>
        </div>

        {/* Period Switcher (FR-21: harian | mingguan | bulanan) */}
        <div className="inline-flex rounded-2xl bg-surface-soft p-1.5 border border-surface-accent/60 self-start sm:self-auto">
          {[
            { id: 'harian', label: 'Harian' },
            { id: 'mingguan', label: 'Mingguan' },
            { id: 'bulanan', label: 'Bulanan' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all min-h-[40px] ${
                period === p.id
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-surface-sub hover:text-surface-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= 3 METRIC SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#86F2E4]/40 text-[#006A61]">
              <Droplets className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-[#86F2E4]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#005049] capitalize">
              Periode {period}
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-surface-sub">
            Total Konsumsi Air
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-surface-ink">
            {formatNumberId(summaryStats.totalAirMl / 1000, 2)}{' '}
            <span className="text-sm font-bold text-surface-hint">Liter</span>
          </p>
          <p className="mt-1 text-xs text-surface-sub">
            Setara {formatNumberId(summaryStats.totalAirMl, 0)} ml tercatat
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D3E4FE] text-[#0B1C30]">
              <Moon className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-[#D3E4FE] px-2.5 py-0.5 text-[11px] font-bold text-[#0B1C30] capitalize">
              Periode {period}
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-surface-sub">
            Rata-Rata Durasi Tidur
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-surface-ink">
            {formatMinutesToHours(summaryStats.avgTidurMenit)}
          </p>
          <p className="mt-1 text-xs text-surface-sub">
            Rata-rata {summaryStats.avgTidurMenit} menit per hari tercatat
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#85F8C4]/50 text-[#005137]">
              <Activity className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-[#85F8C4]/50 px-2.5 py-0.5 text-[11px] font-bold text-[#005137] capitalize">
              Periode {period}
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-surface-sub">
            Akumulasi Aktivitas Fisik
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-surface-ink">
            {formatNumberId(summaryStats.totalAktivitasMenit, 0)}{' '}
            <span className="text-sm font-bold text-surface-hint">Menit</span>
          </p>
          <p className="mt-1 text-xs text-surface-sub">
            Setara {formatMinutesToHours(summaryStats.totalAktivitasMenit)} latihan aktif
          </p>
        </div>
      </div>

      {/* ================= CHART VISUALIZATION CARD (FR-20, FR-21, FR-22) ================= */}
      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-surface-ink flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              <span>Grafik Perkembangan Kebiasaan</span>
            </h2>
            {chartRes?.start_date && chartRes?.end_date && (
              <p className="text-xs text-surface-sub mt-0.5">
                Rentang waktu: {formatDateIndo(chartRes.start_date, { shortMonth: true })} –{' '}
                {formatDateIndo(chartRes.end_date, { shortMonth: true })}
              </p>
            )}
          </div>

          {/* Metric Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: '', label: 'Semua Metrik' },
              { id: 'aktivitas', label: 'Aktivitas (Menit)' },
              { id: 'air', label: 'Konsumsi Air (ml)' },
              { id: 'tidur', label: 'Durasi Tidur (Menit)' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-all min-h-[38px] ${
                  metric === m.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-surface-soft text-surface-sub hover:bg-surface-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {chartError && (
          <div className="mt-4 rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
            {chartError}
          </div>
        )}

        {isLoadingChart ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-surface-sub">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
            <p className="text-xs font-medium">Memuat grafik perkembangan...</p>
          </div>
        ) : !chartRes?.has_data ? (
          /* Wajib menampilkan pesan "Data belum tersedia." sesuai FR-22 */
          <div className="my-6 rounded-2xl bg-surface-soft border border-dashed border-surface-accent p-10 text-center">
            <BarChart3 className="h-11 w-11 text-brand-600 mx-auto" />
            <h3 className="mt-3 text-base font-extrabold text-surface-ink">
              {chartRes?.message || 'Data belum tersedia.'}
            </h3>
            <p className="mt-1 text-xs text-surface-sub max-w-md mx-auto">
              Belum ada catatan kesehatan pada periode <strong>{period}</strong> ini. Tambahkan
              catatan pertama Anda untuk menampilkan visualisasi grafik.
            </p>
            <button
              type="button"
              onClick={() => openQuickLog(metric || 'air')}
              className="btn-primary mt-4 text-xs px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Kebiasaan Sekarang</span>
            </button>
          </div>
        ) : metric ? (
          /* Single Metric Area Chart */
          <div className="mt-6 h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSingleMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006948" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#006948" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#3D4A42', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6D7A72' }}
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  name={
                    metric === 'air'
                      ? 'Konsumsi Air (ml)'
                      : metric === 'tidur'
                      ? 'Rata-rata Tidur (menit)'
                      : 'Aktivitas Fisik (menit)'
                  }
                  stroke="#006948"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSingleMetric)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Multi-Metric Grouped Bar Chart */
          <div className="mt-6 h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#3D4A42', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6D7A72' }}
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar
                  dataKey="aktivitas"
                  name="Aktivitas Fisik (menit)"
                  fill="#006948"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="tidur"
                  name="Durasi Tidur (menit)"
                  fill="#006A61"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="air"
                  name="Konsumsi Air (ml)"
                  fill="#825100"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ================= RIWAYAT GABUNGAN & KELOLA CATATAN (FR-19, Q9) ================= */}
      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-surface-ink">
              Daftar Riwayat Kesehatan Terpadu
            </h2>
            <p className="text-xs text-surface-sub mt-0.5">
              Filter berdasarkan jenis catatan atau tanggal, serta ubah atau hapus catatan Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openQuickLog(historyType || 'air')}
            className="btn-primary text-xs self-start lg:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Catatan Baru</span>
          </button>
        </div>

        {/* Filter Bar: Jenis Catatan + Rentang Tanggal */}
        <div className="mt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-surface-soft/80 p-4 rounded-2xl border border-surface-accent/50">
          {/* Type Pills */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-sub mb-1.5">
              Jenis Catatan
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: '', label: 'Semua' },
                { id: 'air', label: 'Konsumsi Air' },
                { id: 'tidur', label: 'Pola Tidur' },
                { id: 'aktivitas', label: 'Aktivitas Fisik' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setHistoryType(t.id);
                    setOffset(0);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition-all min-h-[40px] ${
                    historyType === t.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-white text-surface-sub hover:text-surface-ink border border-slate-200/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Pickers */}
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <label htmlFor="hist-from" className="block text-[11px] font-bold text-surface-sub mb-1">
                Dari Tanggal
              </label>
              <input
                id="hist-from"
                type="date"
                max={getTodayDateString()}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setOffset(0);
                }}
                className="input-field py-1.5 text-xs min-h-[40px]"
              />
            </div>

            <div>
              <label htmlFor="hist-to" className="block text-[11px] font-bold text-surface-sub mb-1">
                Sampai Tanggal
              </label>
              <input
                id="hist-to"
                type="date"
                max={getTodayDateString()}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setOffset(0);
                }}
                className="input-field py-1.5 text-xs min-h-[40px]"
              />
            </div>

            {(historyType || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={handleResetHistoryFilter}
                className="btn-secondary py-2 px-3 text-xs min-h-[40px]"
                title="Reset Filter"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {historyError && (
          <div className="mt-4 rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
            {historyError}
          </div>
        )}

        {/* History List / Table */}
        {isLoadingHistory ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2 text-surface-sub">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <p className="text-xs font-medium">Memuat daftar riwayat...</p>
          </div>
        ) : historyRes.items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-surface-soft p-10 text-center">
            <Filter className="h-9 w-9 text-surface-hint mx-auto" />
            <h3 className="mt-2.5 text-sm font-bold text-surface-ink">
              Tidak Ada Catatan Riwayat Ditemukan
            </h3>
            <p className="mt-1 text-xs text-surface-sub">
              Belum ada catatan yang sesuai dengan filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {historyRes.items.map((item) => {
              const isAir = item.type === 'air';
              const isTidur = item.type === 'tidur';

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white hover:bg-surface-soft/60 p-4 border border-slate-200/80 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isAir
                          ? 'bg-[#86F2E4]/50 text-[#005049]'
                          : isTidur
                          ? 'bg-[#D3E4FE] text-[#0B1C30]'
                          : 'bg-[#85F8C4]/60 text-[#005137]'
                      }`}
                    >
                      {isAir ? (
                        <Droplets className="h-5 w-5" />
                      ) : isTidur ? (
                        <Moon className="h-5 w-5" />
                      ) : (
                        <Activity className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-surface-ink truncate">
                          {item.title}
                        </h3>
                        <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase text-surface-sub">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-surface-sub mt-0.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-surface-hint" />
                        <span>{formatDateIndo(item.log_date, { withDayName: true })}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-extrabold text-brand-700">
                        {isTidur
                          ? `${formatMinutesToHours(item.value)} (${formatNumberId(item.value, 0)} mnt)`
                          : `${formatNumberId(item.value)} ${item.unit}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-surface-soft hover:bg-surface-muted px-3 py-2 text-xs font-bold text-surface-ink transition-colors min-h-[40px]"
                        title="Ubah Catatan"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-brand-600" />
                        <span>Ubah</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#FFDAD6]/60 hover:bg-[#FFDAD6] px-3 py-2 text-xs font-bold text-[#93000A] transition-colors min-h-[40px]"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-sub">
            <p>
              Menampilkan <strong>{offset + 1}</strong> –{' '}
              <strong>{Math.min(offset + historyRes.items.length, totalItems)}</strong> dari total{' '}
              <strong>{totalItems}</strong> catatan (Halaman {currentPage} dari {totalPages})
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset === 0 || isLoadingHistory}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_LIMIT))}
                className="btn-secondary px-3 py-1.5 text-xs min-h-[38px]"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Sebelumnya</span>
              </button>
              <button
                type="button"
                disabled={offset + PAGE_LIMIT >= totalItems || isLoadingHistory}
                onClick={() => setOffset((prev) => prev + PAGE_LIMIT)}
                className="btn-secondary px-3 py-1.5 text-xs min-h-[38px]"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Edit Log Modal */}
      <EditLogModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSaved={fetchHistory}
      />

      {/* Delete Confirmation Dialog (FR-09, FR-13, FR-17) */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Catatan Kesehatan?"
        description={
          deletingItem
            ? `Apakah Anda yakin ingin menghapus catatan "${deletingItem.title}" pada tanggal ${formatDateIndo(
                deletingItem.log_date
              )}? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmText="Ya, Hapus Catatan"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

