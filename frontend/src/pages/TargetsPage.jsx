import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Calendar,
  CheckCircle2,
  Droplets,
  Edit3,
  Loader2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { targetApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CATEGORY_META,
  DIFFICULTY_META,
  TARGET_STATUS_META,
} from '../utils/constants';
import {
  formatDateIndo,
  formatNumberId,
  getTodayDateString,
} from '../utils/dateUtils';
import { parseApiError } from '../utils/errorParser';
import ConfirmDialog from '../components/modals/ConfirmDialog';

export default function TargetsPage() {
  const { refreshTick, triggerDataRefresh, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const outletCtx = useOutletContext() || {};
  const openQuickLog = outletCtx.openQuickLog || (() => { });

  // Main View Tab: 'targets' (Target Saya) | 'templates' (Katalog Template)
  const [activeView, setActiveView] = useState('targets');

  // Shared Category & Search Filters
  const [categoryFilter, setCategoryFilter] = useState(''); // '' | 'air' | 'tidur' | 'aktivitas'
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'aktif' | 'selesai' | 'draft' | 'dibatalkan' | 'terlewat'
  const [difficultyFilter, setDifficultyFilter] = useState(''); // '' | 'mudah' | 'sedang' | 'sulit'
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [targets, setTargets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Create Manual Target
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualCategory, setManualCategory] = useState('air');
  const [manualValue, setManualValue] = useState('2000');
  const [manualUnit, setManualUnit] = useState('ml');
  const [manualFrequency, setManualFrequency] = useState('harian');
  const [manualStartDate, setManualStartDate] = useState(() => getTodayDateString());
  const [manualDuration, setManualDuration] = useState('7');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');

  // Modal Adopt Template
  const [adoptTemplate, setAdoptTemplate] = useState(null);
  const [adoptStartDate, setAdoptStartDate] = useState(() => getTodayDateString());
  const [adoptDuration, setAdoptDuration] = useState('14');
  const [adoptFrequency, setAdoptFrequency] = useState('harian');
  const [adoptSubmitting, setAdoptSubmitting] = useState(false);
  const [adoptError, setAdoptError] = useState('');

  // Modal Edit Target
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editFrequency, setEditFrequency] = useState('harian');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Confirm Dialogs (Cancel / Delete)
  const [cancellingTarget, setCancellingTarget] = useState(null);
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchTargetsAndTemplates = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [targetsData, templatesData] = await Promise.all([
        targetApi.list({
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          limit: 50,
          offset: 0,
        }),
        targetApi.listTemplates({
          category: categoryFilter || undefined,
          difficulty: difficultyFilter || undefined,
        }),
      ]);
      setTargets(targetsData || []);
      setTemplates(templatesData || []);
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memuat data target kesehatan.');
      setErrorMsg(parsed.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, difficultyFilter]);

  useEffect(() => {
    fetchTargetsAndTemplates();
  }, [fetchTargetsAndTemplates, refreshTick]);

  // Saat kategori di form manual berubah, sesuaikan satuan default yang valid
  const handleManualCategoryChange = (newCat) => {
    setManualCategory(newCat);
    if (newCat === 'air') {
      setManualUnit('ml');
      setManualValue('2000');
    } else if (newCat === 'tidur') {
      setManualUnit('jam');
      setManualValue('8');
    } else {
      setManualUnit('menit');
      setManualValue('30');
    }
  };

  const handleOpenManualModal = () => {
    setManualName('');
    setManualDesc('');
    setManualCategory('air');
    setManualUnit('ml');
    setManualValue('2000');
    setManualFrequency('harian');
    setManualStartDate(getTodayDateString());
    setManualDuration('7');
    setManualError('');
    setManualModalOpen(true);
  };

  const handleCreateManualTarget = async (e) => {
    e.preventDefault();
    if (manualSubmitting) return;
    setManualError('');

    const val = Number(manualValue);
    const dur = parseInt(manualDuration, 10);
    if (!manualName.trim()) {
      setManualError('Nama target wajib diisi.');
      return;
    }
    if (!val || val <= 0) {
      setManualError('Nilai target harus lebih dari 0.');
      return;
    }
    if (Number.isNaN(dur) || dur < 1 || dur > 365) {
      setManualError('Durasi target harus antara 1 sampai 365 hari.');
      return;
    }

    try {
      setManualSubmitting(true);
      await targetApi.createManual({
        name: manualName.trim(),
        description: manualDesc.trim() || null,
        category: manualCategory,
        target_value: val,
        unit: manualUnit,
        frequency: manualFrequency,
        start_date: manualStartDate || getTodayDateString(),
        duration_days: dur,
      });

      showToast({
        type: 'success',
        title: 'Target Baru Dibuat!',
        message: `Target "${manualName.trim()}" berhasil diaktifkan.`,
      });
      setManualModalOpen(false);
      setActiveView('targets');
      triggerDataRefresh();
      refreshProfile();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal membuat target manual.');
      setManualError(parsed.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleOpenAdoptModal = (tpl) => {
    setAdoptTemplate(tpl);
    setAdoptStartDate(getTodayDateString());
    setAdoptDuration(tpl.frequency === 'mingguan' ? '14' : '7');
    setAdoptFrequency(tpl.frequency || 'harian');
    setAdoptError('');
  };

  const handleConfirmAdoptTemplate = async (e) => {
    e.preventDefault();
    if (!adoptTemplate || adoptSubmitting) return;
    setAdoptError('');

    const dur = parseInt(adoptDuration, 10);
    if (Number.isNaN(dur) || dur < 1 || dur > 365) {
      setAdoptError('Durasi target harus antara 1 sampai 365 hari.');
      return;
    }

    try {
      setAdoptSubmitting(true);
      await targetApi.createFromTemplate({
        template_id: adoptTemplate.id,
        start_date: adoptStartDate || getTodayDateString(),
        duration_days: dur,
        frequency: adoptFrequency,
      });

      showToast({
        type: 'success',
        title: 'Template Target Diadopsi!',
        message: `Target "${adoptTemplate.name}" sekarang sedang berjalan.`,
      });
      setAdoptTemplate(null);
      setActiveView('targets');
      triggerDataRefresh();
      refreshProfile();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal mengadopsi template target.');
      setAdoptError(parsed.message);
    } finally {
      setAdoptSubmitting(false);
    }
  };

  const handleOpenEditModal = (t) => {
    setEditTarget(t);
    setEditName(t.name || '');
    setEditDesc(t.description || '');
    setEditValue(String(t.target_value || ''));
    setEditFrequency(t.frequency || 'harian');
    setEditEndDate(t.end_date || '');
    setEditError('');
  };

  const handleSubmitEditTarget = async (e) => {
    e.preventDefault();
    if (!editTarget || editSubmitting) return;
    setEditError('');

    const val = Number(editValue);
    if (!editName.trim()) {
      setEditError('Nama target tidak boleh kosong.');
      return;
    }
    if (!val || val <= 0) {
      setEditError('Nilai target harus lebih dari 0.');
      return;
    }

    try {
      setEditSubmitting(true);
      await targetApi.update(editTarget.id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        target_value: val,
        frequency: editFrequency,
        end_date: editEndDate,
      });

      showToast({
        type: 'success',
        title: 'Target Diperbarui',
        message: `Perubahan pada target "${editName.trim()}" berhasil disimpan.`,
      });
      setEditTarget(null);
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memperbarui target.');
      setEditError(parsed.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmCancelTarget = async () => {
    if (!cancellingTarget || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await targetApi.cancel(cancellingTarget.id);
      showToast({
        type: 'info',
        title: 'Target Dibatalkan',
        message: `Status target "${cancellingTarget.name}" telah diubah menjadi dibatalkan.`,
      });
      setCancellingTarget(null);
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal membatalkan target.');
      showToast({ type: 'error', title: 'Gagal Membatalkan', message: parsed.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDeleteTarget = async () => {
    if (!deletingTarget || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await targetApi.remove(deletingTarget.id);
      showToast({
        type: 'success',
        title: 'Target Dihapus',
        message: `Target "${deletingTarget.name}" berhasil dihapus.`,
      });
      setDeletingTarget(null);
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal menghapus target.');
      showToast({ type: 'error', title: 'Gagal Menghapus', message: parsed.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredTargets = targets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  });

  const filteredTemplates = templates.filter((tpl) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tpl.name?.toLowerCase().includes(q) ||
      tpl.description?.toLowerCase().includes(q) ||
      tpl.category?.toLowerCase().includes(q)
    );
  });

  const todayMin = getTodayDateString();

  return (
    <div className="space-y-6">
      {/* ================= HEADER CARD (Sesuai Target Aktif.svg & Katalog Template.svg) ================= */}
      <section className="card-surface p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#85F8C4]/50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#005137]">
            <Target className="h-3.5 w-3.5" />
            PORTAL GAYA HIDUP SEHAT
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-surface-ink tracking-tight">
            Manajemen Target & Resolusi Kesehatan
          </h1>
          <p className="text-xs sm:text-sm text-surface-sub mt-0.5">
            Pilih template target teruji dari sistem atau buat target manual sesuai sasaran Anda.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenManualModal}
          className="btn-primary px-5 py-3 text-xs sm:text-sm font-bold shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Target Baru</span>
        </button>
      </section>

      {/* ================= CATEGORY CHIPS & SEARCH BAR ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: '', label: 'Semua Kategori' },
            { id: 'air', label: 'Hidrasi' },
            { id: 'tidur', label: 'Pola Tidur' },
            { id: 'aktivitas', label: 'Aktivitas Fisik' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all min-h-[40px] ${categoryFilter === c.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-surface-soft text-surface-ink hover:bg-surface-muted border border-surface-accent/50'
                }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama resolusi atau template..."
            className="input-field pl-10 py-2 text-xs min-h-[40px]"
          />
        </div>
      </div>

      {/* ================= VIEW SWITCHER: TARGET AKTIF vs KATALOG TEMPLATE ================= */}
      <div className="inline-flex rounded-2xl bg-surface-soft p-1.5 border border-surface-accent/60">
        <button
          type="button"
          onClick={() => setActiveView('targets')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all min-h-[44px] ${activeView === 'targets'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-surface-sub hover:text-surface-ink'
            }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Target Saya</span>
          <span className="rounded-full bg-[#85F8C4]/60 px-2 py-0.5 text-[11px] font-bold text-[#005137]">
            {targets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('templates')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all min-h-[44px] ${activeView === 'templates'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-surface-sub hover:text-surface-ink'
            }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Katalog Template</span>
          <span className="rounded-full bg-[#D3E4FE] px-2 py-0.5 text-[11px] font-bold text-[#0B1C30]">
            {templates.length}
          </span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-[#FFDAD6] border border-rose-300 px-4 py-3 text-xs font-semibold text-[#93000A]">
          {errorMsg}
        </div>
      )}

      {/* ================= TAB 1: DAFTAR TARGET SAYA (FR-27, FR-28, FR-29) ================= */}
      {activeView === 'targets' && (
        <section className="space-y-4">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-surface-sub mr-1">Filter Status:</span>
            {[
              { id: '', label: 'Semua Status' },
              { id: 'aktif', label: 'Aktif' },
              { id: 'selesai', label: 'Selesai' },
              { id: 'draft', label: 'Draft' },
              { id: 'terlewat', label: 'Terlewat' },
              { id: 'dibatalkan', label: 'Dibatalkan' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all min-h-[36px] ${statusFilter === st.id
                    ? 'bg-surface-ink text-white'
                    : 'bg-white text-surface-sub border border-slate-200 hover:bg-surface-soft'
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-surface-sub">
              <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
              <p className="text-xs font-medium">Memuat daftar target...</p>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="card-surface p-10 text-center">
              <Target className="h-11 w-11 text-brand-600 mx-auto" />
              <h3 className="mt-3 text-base font-extrabold text-surface-ink">
                Belum Ada Target Kesehatan pada Filter Ini
              </h3>
              <p className="mt-1 text-xs text-surface-sub max-w-md mx-auto">
                Anda dapat mengadopsi target dari Katalog Template sistem atau membuat target manual
                baru.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('templates')}
                  className="btn-secondary text-xs"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Lihat Katalog Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenManualModal}
                  className="btn-primary text-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Buat Target Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTargets.map((t) => {
                const pct = Math.min(100, Math.round(t.progress?.percentage || 0));
                const statusMeta = TARGET_STATUS_META[t.status] || TARGET_STATUS_META.aktif;
                const catMeta = CATEGORY_META[t.category] || CATEGORY_META.aktivitas;
                const canModify = t.status === 'aktif' || t.status === 'draft';

                return (
                  <div
                    key={t.id}
                    className="card-surface p-5 flex flex-col justify-between hover:shadow-card-hover transition-shadow"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${catMeta.pillBg}`}
                        >
                          {t.category === 'air' ? (
                            <Droplets className="h-5 w-5" />
                          ) : t.category === 'tidur' ? (
                            <Moon className="h-5 w-5" />
                          ) : (
                            <Activity className="h-5 w-5" />
                          )}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-brand-600">
                        {catMeta.label} • <span className="capitalize">{t.frequency}</span>
                      </p>
                      <h3 className="mt-1 text-base font-extrabold text-surface-ink leading-snug">
                        {t.name}
                      </h3>
                      {t.description && (
                        <p className="mt-1 text-xs text-surface-sub line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* Progress Box */}
                      <div className="mt-4 rounded-2xl bg-surface-soft p-3.5 border border-surface-accent/50">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xl font-extrabold text-surface-ink">
                              {formatNumberId(t.progress?.realized ?? 0)}
                            </span>
                            <span className="text-xs font-bold text-surface-sub ml-1">
                              / {formatNumberId(t.target_value)} {t.unit}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-brand-700">{pct}%</span>
                        </div>

                        <div className="mt-2 h-2.5 w-full rounded-full bg-white overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-surface-sub">
                          <span>
                            Periode tercapai: {t.progress?.periods_met ?? 0} /{' '}
                            {t.progress?.periods_total ?? 1}
                          </span>
                          <span>
                            {t.progress?.completed ? 'Periode Ini Selesai ✓' : 'Berjalan'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-surface-hint">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {formatDateIndo(t.start_date, { shortMonth: true })} –{' '}
                          {formatDateIndo(t.end_date, { shortMonth: true })}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {t.status === 'aktif' ? (
                        <button
                          type="button"
                          onClick={() => openQuickLog(t.category)}
                          className="btn-primary py-2 px-3 text-xs flex-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Catat {catMeta.shortLabel}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-surface-hint">
                          Status: <strong className="capitalize">{t.status}</strong>
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {canModify && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(t)}
                              className="rounded-xl bg-surface-soft hover:bg-surface-muted p-2 text-surface-ink transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                              title="Ubah Target"
                              aria-label="Ubah Target"
                            >
                              <Edit3 className="h-4 w-4 text-brand-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancellingTarget(t)}
                              className="rounded-xl bg-amber-50 hover:bg-amber-100 p-2 text-amber-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                              title="Batalkan Target"
                              aria-label="Batalkan Target"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeletingTarget(t)}
                          className="rounded-xl bg-[#FFDAD6]/60 hover:bg-[#FFDAD6] p-2 text-[#93000A] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Hapus Target"
                          aria-label="Hapus Target"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 2: KATALOG TEMPLATE SISTEM (FR-23, FR-24, FR-25) ================= */}
      {activeView === 'templates' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-surface-ink">
                Pilih & Sesuaikan Template Target Sistem
              </h2>
              <p className="text-xs text-surface-sub">
                Klik tombol &ldquo;+ Adopsi Target&rdquo; untuk mengatur tanggal mulai, durasi, dan
                frekuensi.
              </p>
            </div>

            {/* Difficulty Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: '', label: 'Semua Tingkat' },
                { id: 'mudah', label: 'Mudah' },
                { id: 'sedang', label: 'Sedang' },
                { id: 'sulit', label: 'Sulit' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficultyFilter(d.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all min-h-[36px] ${difficultyFilter === d.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-surface-sub border border-slate-200 hover:bg-surface-soft'
                    }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-surface-sub">
              <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
              <p className="text-xs font-medium">Memuat katalog template...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="card-surface p-10 text-center text-xs text-surface-sub">
              Tidak ada template target yang cocok dengan filter pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTemplates.map((tpl) => {
                const catMeta = CATEGORY_META[tpl.category] || CATEGORY_META.aktivitas;
                const diffMeta = DIFFICULTY_META[tpl.difficulty] || DIFFICULTY_META.mudah;

                return (
                  <div
                    key={tpl.id}
                    className="card-surface p-5 flex flex-col justify-between border-t-4 border-t-brand-500 hover:shadow-card-hover transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-extrabold capitalize ${diffMeta.className}`}
                        >
                          ● {diffMeta.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                          <Sparkles className="h-3 w-3" />
                          +20 / +100 Poin
                        </span>
                      </div>

                      <div className="mt-4 flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${catMeta.pillBg}`}
                        >
                          {tpl.category === 'air' ? (
                            <Droplets className="h-5 w-5" />
                          ) : tpl.category === 'tidur' ? (
                            <Moon className="h-5 w-5" />
                          ) : (
                            <Activity className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600">
                            {catMeta.label}
                          </p>
                          <h3 className="text-base font-extrabold text-surface-ink leading-snug">
                            {tpl.name}
                          </h3>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-surface-sub leading-relaxed">
                        {tpl.description}
                      </p>

                      <div className="mt-4 rounded-xl bg-surface-soft px-3.5 py-2.5 flex items-center justify-between text-xs">
                        <span className="text-surface-sub">
                          Sasaran:{' '}
                          <strong className="text-surface-ink">
                            {formatNumberId(tpl.target_value)} {tpl.unit}
                          </strong>
                        </span>
                        <span className="font-extrabold text-brand-700 capitalize">
                          Setiap {tpl.frequency === 'harian' ? 'Hari' : 'Minggu'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAdoptModal(tpl)}
                      className="btn-secondary w-full mt-5 py-2.5 text-xs font-extrabold"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Adopsi Target</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ================= MODAL 1: ADOPSI TEMPLATE TARGET (FR-24, FR-25) ================= */}
      {adoptTemplate && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600">
                  Adopsi Template Sistem
                </span>
                <h3 className="text-lg font-extrabold text-surface-ink mt-0.5">
                  {adoptTemplate.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdoptTemplate(null)}
                disabled={adoptSubmitting}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdoptTemplate} className="mt-4 space-y-4">
              {adoptError && (
                <div className="rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
                  {adoptError}
                </div>
              )}

              <div className="rounded-2xl bg-surface-soft p-3.5 text-xs text-surface-sub">
                Sasaran bawaan:{' '}
                <strong className="text-surface-ink">
                  {formatNumberId(adoptTemplate.target_value)} {adoptTemplate.unit}
                </strong>{' '}
                ({adoptTemplate.category})
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Tanggal Mulai (FR-25)
                </label>
                <input
                  type="date"
                  min={todayMin}
                  value={adoptStartDate}
                  onChange={(e) => setAdoptStartDate(e.target.value)}
                  className="input-field"
                  required
                />
                <p className="mt-1 text-[11px] text-surface-hint">
                  Pilih hari ini untuk langsung aktif, atau tanggal mendatang untuk status Draft.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Durasi Target (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={adoptDuration}
                  onChange={(e) => setAdoptDuration(e.target.value)}
                  className="input-field"
                  required
                />
                <div className="mt-2 flex gap-1.5">
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAdoptDuration(String(d))}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${Number(adoptDuration) === d
                          ? 'bg-brand-600 text-white'
                          : 'bg-surface-soft text-surface-sub'
                        }`}
                    >
                      {d} Hari
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Frekuensi Evaluasi
                </label>
                <select
                  value={adoptFrequency}
                  onChange={(e) => setAdoptFrequency(e.target.value)}
                  className="input-field"
                >
                  <option value="harian">Harian</option>
                  <option value="mingguan">Mingguan</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdoptTemplate(null)}
                  disabled={adoptSubmitting}
                  className="btn-secondary px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adoptSubmitting}
                  className="btn-primary px-5 py-2"
                >
                  {adoptSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Mulai Target</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: BUAT TARGET MANUAL (FR-26) ================= */}
      {manualModalOpen && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-surface-ink">
                  Buat Target Kesehatan Manual
                </h3>
                <p className="text-xs text-surface-sub">
                  Tentukan sasaran kustom sesuai kebutuhan pribadi Anda (FR-26).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                disabled={manualSubmitting}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualTarget} className="mt-4 space-y-4">
              {manualError && (
                <div className="rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
                  {manualError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1.5">
                  Kategori Kebiasaan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'air', label: '💧 Air' },
                    { id: 'tidur', label: '🌙 Tidur' },
                    { id: 'aktivitas', label: '🏃 Aktivitas' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleManualCategoryChange(c.id)}
                      className={`rounded-xl py-2.5 text-xs font-bold border transition-all min-h-[42px] ${manualCategory === c.id
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-200 bg-surface-soft text-surface-ink'
                        }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Nama Target
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Minum Air 8 Gelas Sehari / Lari Pagi 45 Menit"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Nilai Target
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Satuan
                  </label>
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="input-field"
                  >
                    {(CATEGORY_META[manualCategory]?.allowedUnits || []).map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Frekuensi
                  </label>
                  <select
                    value={manualFrequency}
                    onChange={(e) => setManualFrequency(e.target.value)}
                    className="input-field"
                  >
                    <option value="harian">Harian</option>
                    <option value="mingguan">Mingguan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    min={todayMin}
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Durasi (Hari)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Deskripsi / Catatan Motivasi (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Contoh: Menjaga fokus kuliah dan kebugaran tubuh"
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  disabled={manualSubmitting}
                  className="btn-secondary px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="btn-primary px-5 py-2"
                >
                  {manualSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Simpan Target</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: UBAH TARGET (FR-27) ================= */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-extrabold text-surface-ink">Ubah Target Kesehatan</h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={editSubmitting}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditTarget} className="mt-4 space-y-4">
              {editError && (
                <div className="rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Nama Target
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Nilai Target ({editTarget.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-ink mb-1">
                    Frekuensi
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="input-field"
                  >
                    <option value="harian">Harian</option>
                    <option value="mingguan">Mingguan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Tanggal Selesai (Minimal Hari Ini)
                </label>
                <input
                  type="date"
                  min={todayMin}
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-ink mb-1">
                  Deskripsi (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={editSubmitting}
                  className="btn-secondary px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-primary px-5 py-2"
                >
                  {editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Target Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancellingTarget)}
        onClose={() => setCancellingTarget(null)}
        onConfirm={handleConfirmCancelTarget}
        title="Batalkan Target Kesehatan?"
        description={
          cancellingTarget
            ? `Apakah Anda yakin ingin membatalkan target "${cancellingTarget.name}"? Status target akan berubah menjadi Dibatalkan, namun poin yang sudah Anda peroleh tetap tersimpan.`
            : ''
        }
        confirmText="Ya, Batalkan Target"
        cancelText="Kembali"
        variant="warning"
        isLoading={isActionLoading}
      />

      {/* Delete Target Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTarget)}
        onClose={() => setDeletingTarget(null)}
        onConfirm={handleConfirmDeleteTarget}
        title="Hapus Target Kesehatan?"
        description={
          deletingTarget
            ? `Apakah Anda yakin ingin menghapus target "${deletingTarget.name}" secara permanen?`
            : ''
        }
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
}

