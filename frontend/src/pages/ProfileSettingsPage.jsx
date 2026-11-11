import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  Bell,
  BellRing,
  Calendar,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { authApi, reminderApi, userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  AVATAR_PRESETS,
  MEDICAL_DISCLAIMER,
  REMINDER_TYPE_META,
} from '../utils/constants';
import {
  ensureTimeWithSeconds,
  extractHHMM,
  formatDateIndo,
} from '../utils/dateUtils';
import { parseApiError } from '../utils/errorParser';
import UserAvatar from '../components/common/UserAvatar';
import ConfirmDialog from '../components/modals/ConfirmDialog';

export default function ProfileSettingsPage() {
  const { user, refreshProfile, logout, triggerDataRefresh } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'security' | 'reminders'

  // Sync URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'security', 'reminders'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // ================= STATE TAB 1: PROFIL =================
  const [name, setName] = useState(user?.name || '');
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhotoUrl(user.profile_photo_url || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setProfileError('');

    const trimmedName = name.trim();
    const trimmedUrl = photoUrl.trim();

    if (!trimmedName) {
      setProfileError('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (trimmedUrl) {
      if (trimmedUrl.length > 255) {
        setProfileError('URL foto profil maksimal 255 karakter.');
        return;
      }
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        setProfileError('URL foto profil harus diawali http:// atau https://.');
        return;
      }
    }

    try {
      setIsSavingProfile(true);
      await userApi.updateMe({
        name: trimmedName,
        profile_photo_url: trimmedUrl ? trimmedUrl : null,
      });
      await refreshProfile();
      showToast({
        type: 'success',
        title: 'Profil Diperbarui',
        message: 'Informasi nama dan foto profil Anda berhasil disimpan.',
      });
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memperbarui profil pengguna.');
      setProfileError(parsed.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ================= STATE TAB 2: UBAH KATA SANDI =================
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (isSavingPassword) return;
    setPasswordError('');

    if (!oldPassword) {
      setPasswordError('Kata sandi lama wajib diisi.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError('Kata sandi baru maksimal 72 byte.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak sama.');
      return;
    }
    if (newPassword === oldPassword) {
      setPasswordError('Kata sandi baru tidak boleh sama dengan kata sandi lama.');
      return;
    }

    try {
      setIsSavingPassword(true);
      const res = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast({
        type: 'success',
        title: 'Kata Sandi Diperbarui',
        message: res?.detail || 'Kata sandi akun Anda berhasil diubah.',
      });
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal mengubah kata sandi.');
      setPasswordError(parsed.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ================= STATE TAB 3: PENGINGAT (/api/v1/reminders) =================
  const [reminders, setReminders] = useState([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [reminderError, setReminderError] = useState('');

  // Form Tambah / Ubah Pengingat
  const [editingReminder, setEditingReminder] = useState(null);
  const [remType, setRemType] = useState('air');
  const [remTime, setRemTime] = useState('08:00');
  const [remFrequency, setRemFrequency] = useState('harian');
  const [remActive, setRemActive] = useState(true);
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  const [deletingReminder, setDeletingReminder] = useState(null);
  const [isDeletingReminder, setIsDeletingReminder] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Logout dialog
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchReminders = useCallback(async () => {
    setIsLoadingReminders(true);
    setReminderError('');
    try {
      const data = await reminderApi.list();
      setReminders(data || []);
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal memuat daftar pengingat.');
      setReminderError(parsed.message);
    } finally {
      setIsLoadingReminders(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    if (isSubmittingReminder) return;
    setReminderError('');

    try {
      setIsSubmittingReminder(true);
      const payload = {
        reminder_type: remType,
        reminder_time: ensureTimeWithSeconds(remTime),
        frequency: remFrequency,
        is_active: remActive,
      };

      if (editingReminder) {
        await reminderApi.update(editingReminder.id, payload);
        showToast({
          type: 'success',
          title: 'Pengingat Diperbarui',
          message: 'Jadwal pengingat berhasil diperbarui.',
        });
        setEditingReminder(null);
      } else {
        await reminderApi.create(payload);
        showToast({
          type: 'success',
          title: 'Pengingat Ditambahkan',
          message: `Pengingat ${REMINDER_TYPE_META[remType]?.label || remType} pukul ${remTime} WITA berhasil disimpan.`,
        });
      }

      setRemType('air');
      setRemTime('08:00');
      setRemFrequency('harian');
      setRemActive(true);
      await fetchReminders();
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal menyimpan pengingat.');
      setReminderError(parsed.message);
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const handleStartEditReminder = (rem) => {
    setEditingReminder(rem);
    setRemType(rem.reminder_type || 'air');
    setRemTime(extractHHMM(rem.reminder_time) || '08:00');
    setRemFrequency(rem.frequency || 'harian');
    setRemActive(Boolean(rem.is_active));
    setReminderError('');
  };

  const handleToggleReminder = async (rem) => {
    if (togglingId) return;
    try {
      setTogglingId(rem.id);
      await reminderApi.toggle(rem.id);
      await fetchReminders();
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal mengubah status pengingat.');
      showToast({ type: 'error', title: 'Gagal Mengubah Status', message: parsed.message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDeleteReminder = async () => {
    if (!deletingReminder || isDeletingReminder) return;
    try {
      setIsDeletingReminder(true);
      await reminderApi.remove(deletingReminder.id);
      showToast({
        type: 'success',
        title: 'Pengingat Dihapus',
        message: 'Jadwal pengingat telah dihapus.',
      });
      setDeletingReminder(null);
      await fetchReminders();
      triggerDataRefresh();
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal menghapus pengingat.');
      showToast({ type: 'error', title: 'Gagal Menghapus', message: parsed.message });
    } finally {
      setIsDeletingReminder(false);
    }
  };

  const handleRequestBrowserNotification = async () => {
    if (!('Notification' in window)) {
      showToast({
        type: 'info',
        title: 'Notifikasi In-App Aktif',
        message: 'Browser ini tidak mendukung Web Notification API, pengingat tetap muncul di dalam aplikasi.',
      });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showToast({
        type: 'success',
        title: 'Izin Notifikasi Aktif!',
        message: 'WellTrack akan menampilkan notifikasi pada jam pengingat yang Anda atur.',
      });
    } else {
      showToast({
        type: 'info',
        title: 'Pengingat In-App Aktif',
        message: 'Pengingat akan tetap muncul sebagai banner di dalam aplikasi WellTrack.',
      });
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setLogoutOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* ================= USER PROFILE HERO CARD (Sesuai Figma Profile & Settings) ================= */}
      <section className="card-surface p-6 sm:p-8 bg-gradient-to-r from-white via-[#F5FFF7] to-[#EFF4FF]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            <UserAvatar name={user?.name} photoUrl={photoUrl || user?.profile_photo_url} size="xl" />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#85F8C4]/60 px-3 py-0.5 text-[11px] font-extrabold text-[#005137]">
                  Pengguna Terdaftar
                </span>
                <span className="text-xs text-surface-sub flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-brand-600" />
                  Bergabung sejak {formatDateIndo(user?.created_at, { shortMonth: true })}
                </span>
              </div>

              <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-surface-ink">
                {user?.name || 'Pengguna WellTrack'}
              </h1>
              <p className="text-xs sm:text-sm text-surface-sub flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 text-surface-hint" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          {/* Gamification Mini Summary Box */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
            <div className="text-center px-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-surface-hint">
                Total Poin
              </p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold text-brand-700 flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-brand-600" />
                {(user?.total_points ?? 0).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="text-center px-2 border-x border-slate-100">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-surface-hint">
                Streak Aktif
              </p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold text-[#825100] flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 fill-[#A36700] text-[#A36700]" />
                {user?.current_streak ?? 0}h
              </p>
            </div>

            <div className="text-center px-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-surface-hint">
                Rekor Streak
              </p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold text-surface-ink flex items-center justify-center gap-1">
                <Award className="h-4 w-4 text-brand-600" />
                {user?.longest_streak ?? 0}h
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2-COLUMN SETTINGS LAYOUT (Sesuai Figma Settings) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column (4 cols) */}
        <div className="lg:col-span-4 card-surface p-4 space-y-1.5">
          {[
            {
              id: 'profile',
              label: 'Profil & Avatar',
              desc: 'Nama lengkap & foto profil',
              icon: User,
            },
            {
              id: 'security',
              label: 'Keamanan & Kata Sandi',
              desc: 'Ubah kata sandi akun',
              icon: KeyRound,
            },
            {
              id: 'reminders',
              label: 'Pengingat Pencatatan',
              desc: 'Jadwal pengingat harian & mingguan',
              icon: Bell,
              badge: reminders.filter((r) => r.is_active).length,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-all min-h-[54px] ${active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-surface-ink hover:bg-surface-soft'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/20 text-white' : 'bg-surface-soft text-brand-600'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold truncate">{item.label}</p>
                    <p
                      className={`text-[11px] truncate ${active ? 'text-emerald-100' : 'text-surface-sub'
                        }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>

                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${active ? 'bg-[#85F8C4] text-[#002114]' : 'bg-[#85F8C4]/60 text-[#005137]'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-left text-xs sm:text-sm font-extrabold text-[#BA1A1A] hover:bg-[#FFDAD6]/50 transition-colors min-h-[48px]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD6] text-[#BA1A1A]">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <p>Keluar Sesi</p>
                <p className="text-[11px] font-normal text-[#93000A]">
                  Hapus token sesi dari perangkat ini
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Right Content Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* ================= PANEL 1: PROFIL & AVATAR PRESET (FR-04, Q6) ================= */}
          {activeTab === 'profile' && (
            <section className="card-surface p-6 sm:p-7">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-extrabold text-surface-ink">
                  Informasi Akun & Profil Pengguna
                </h2>
                <p className="text-xs text-surface-sub mt-0.5">
                  Perbarui nama tampilan dan pilih avatar profil menarik atau gunakan tautan foto
                  Anda sendiri .
                </p>
              </div>

              {profileError && (
                <div className="mt-4 rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
                {/* Galeri Avatar Preset Menarik (Q6) */}
                <div>
                  <label className="block text-xs font-extrabold text-surface-ink mb-2">
                    Pilih Avatar Preset Cepat
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {AVATAR_PRESETS.map((preset) => {
                      const isSelected = photoUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setPhotoUrl(preset.url)}
                          className={`group relative flex flex-col items-center rounded-2xl p-2 border transition-all ${isSelected
                              ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                              : 'border-slate-200 bg-surface-soft/50 hover:bg-surface-soft'
                            }`}
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                          <span className="mt-1 text-[10px] font-bold text-surface-sub truncate w-full text-center">
                            {preset.label.split(' ')[0]}
                          </span>
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nama & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-name" className="block text-xs font-bold text-surface-ink mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Lengkap Anda"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-ink mb-1">
                      Alamat Email Terdaftar
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-field bg-slate-100 text-surface-hint cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* URL Foto Profil Custom */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="profile-photo-url" className="block text-xs font-bold text-surface-ink">
                      URL Foto Profil (http:// atau https://, maks. 255 karakter)
                    </label>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="text-[11px] font-bold text-[#BA1A1A] hover:underline"
                      >
                        Kosongkan Foto (Gunakan Inisial)
                      </button>
                    )}
                  </div>
                  <input
                    id="profile-photo-url"
                    type="url"
                    maxLength={255}
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Simpan Perubahan Profil</span>
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ================= PANEL 2: KEAMANAN & UBAH KATA SANDI (FR-05) ================= */}
          {activeTab === 'security' && (
            <section className="card-surface p-6 sm:p-7">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-extrabold text-surface-ink">
                  Keamanan & Ubah Kata Sandi
                </h2>
                <p className="text-xs text-surface-sub mt-0.5">
                  Pastikan kata sandi baru minimal 8 karakter dan berbeda dari kata sandi lama
                  Anda.
                </p>
              </div>

              {passwordError && (
                <div className="mt-4 rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="mt-5 space-y-4 max-w-lg">
                <div>
                  <label htmlFor="old-pass" className="block text-xs font-bold text-surface-ink mb-1">
                    Kata Sandi Lama
                  </label>
                  <div className="relative">
                    <input
                      id="old-pass"
                      type={showPasswords ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan kata sandi saat ini"
                      className="input-field pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-surface-hint hover:text-surface-ink"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-pass" className="block text-xs font-bold text-surface-ink mb-1">
                    Kata Sandi Baru (Minimal 8 Karakter)
                  </label>
                  <input
                    id="new-pass"
                    type={showPasswords ? 'text' : 'password'}
                    minLength={8}
                    maxLength={72}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirm-new-pass" className="block text-xs font-bold text-surface-ink mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <input
                    id="confirm-new-pass"
                    type={showPasswords ? 'text' : 'password'}
                    minLength={8}
                    maxLength={72}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="input-field"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold"
                  >
                    {isSavingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    <span>Perbarui Kata Sandi</span>
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ================= PANEL 3: PENGINGAT PENCATATAN (/api/v1/reminders — Q8) ================= */}
          {activeTab === 'reminders' && (
            <section className="card-surface p-6 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-surface-ink">
                    Preferensi Pengingat Pencatatan
                  </h2>
                  <p className="text-xs text-surface-sub mt-0.5">
                    Atur jadwal pengingat untuk minum air, pola tidur, aktivitas fisik, atau target
                    harian.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRequestBrowserNotification}
                  className="btn-secondary text-xs self-start sm:self-auto"
                >
                  <BellRing className="h-4 w-4" />
                  <span>Aktifkan Notifikasi Browser</span>
                </button>
              </div>

              {reminderError && (
                <div className="rounded-xl bg-[#FFDAD6] p-3 text-xs font-semibold text-[#93000A]">
                  {reminderError}
                </div>
              )}

              {/* Form Tambah / Ubah Pengingat */}
              <form
                onSubmit={handleSaveReminder}
                className="rounded-2xl bg-surface-soft p-4 sm:p-5 border border-surface-accent/60 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
                    {editingReminder ? 'Ubah Jadwal Pengingat' : 'Tambah Pengingat Baru'}
                  </h3>
                  {editingReminder && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReminder(null);
                        setRemType('air');
                        setRemTime('08:00');
                        setRemFrequency('harian');
                        setRemActive(true);
                      }}
                      className="text-xs font-bold text-surface-sub hover:text-surface-ink inline-flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Batal Edit</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-surface-ink mb-1">
                      Jenis Pengingat
                    </label>
                    <select
                      value={remType}
                      onChange={(e) => setRemType(e.target.value)}
                      className="input-field py-2 text-xs"
                    >
                      <option value="air">💧 Minum Air Putih</option>
                      <option value="tidur">🌙 Waktu Tidur / Istirahat</option>
                      <option value="aktivitas">🏃 Aktivitas Fisik / Olahraga</option>
                      <option value="target">🎯 Evaluasi Target Kesehatan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-ink mb-1">
                      Jam Pengingat (WITA)
                    </label>
                    <input
                      type="time"
                      value={remTime}
                      onChange={(e) => setRemTime(e.target.value)}
                      className="input-field py-2 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-ink mb-1">
                      Frekuensi
                    </label>
                    <select
                      value={remFrequency}
                      onChange={(e) => setRemFrequency(e.target.value)}
                      className="input-field py-2 text-xs"
                    >
                      <option value="harian">Setiap Hari (Harian)</option>
                      <option value="mingguan">Mingguan</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-surface-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remActive}
                      onChange={(e) => setRemActive(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Aktifkan pengingat ini sekarang</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmittingReminder}
                    className="btn-primary py-2 px-4 text-xs font-bold"
                  >
                    {isSubmittingReminder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>{editingReminder ? 'Simpan Perubahan' : 'Simpan Pengingat'}</span>
                  </button>
                </div>
              </form>

              {/* Daftar Pengingat Tersimpan */}
              {isLoadingReminders ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-surface-sub">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                  <p className="text-xs">Memuat daftar pengingat...</p>
                </div>
              ) : reminders.length === 0 ? (
                <div className="rounded-2xl bg-surface-soft p-8 text-center">
                  <Bell className="h-9 w-9 text-surface-hint mx-auto" />
                  <p className="mt-2 text-sm font-bold text-surface-ink">
                    Belum Ada Jadwal Pengingat
                  </p>
                  <p className="mt-1 text-xs text-surface-sub">
                    Tambahkan pengingat di atas agar Anda tidak lupa mencatat minum air, aktivitas,
                    atau waktu tidur.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((rem) => {
                    const meta = REMINDER_TYPE_META[rem.reminder_type] || {
                      label: rem.reminder_type,
                      desc: 'Pengingat kebiasaan sehat',
                    };
                    const timeHHMM = extractHHMM(rem.reminder_time);

                    return (
                      <div
                        key={rem.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 border transition-all ${rem.is_active
                            ? 'bg-white border-emerald-200 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 opacity-75'
                          }`}
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-extrabold text-xs ${rem.is_active
                                ? 'bg-[#85F8C4]/60 text-[#005137]'
                                : 'bg-slate-200 text-slate-600'
                              }`}
                          >
                            {timeHHMM}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-extrabold text-surface-ink">
                                {meta.label}
                              </h4>
                              <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase text-surface-sub">
                                {rem.frequency}
                              </span>
                            </div>
                            <p className="text-xs text-surface-sub mt-0.5">{meta.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            disabled={togglingId === rem.id}
                            onClick={() => handleToggleReminder(rem)}
                            role="switch"
                            aria-checked={rem.is_active}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rem.is_active ? 'bg-brand-600' : 'bg-slate-300'
                              }`}
                            title={rem.is_active ? 'Nonaktifkan Pengingat' : 'Aktifkan Pengingat'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${rem.is_active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditReminder(rem)}
                            className="rounded-xl bg-surface-soft hover:bg-surface-muted p-2 text-surface-ink min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Ubah Pengingat"
                          >
                            <Edit3 className="h-4 w-4 text-brand-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingReminder(rem)}
                            className="rounded-xl bg-[#FFDAD6]/60 hover:bg-[#FFDAD6] p-2 text-[#93000A] min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Hapus Pengingat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ================= DISCLAIMER MEDIS RESMI (NFR-22) ================= */}
          <section className="rounded-2xl bg-surface-soft border border-surface-accent p-5 flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
                Pernyataan Privasi & Disclaimer Medis
              </h3>
              <p className="mt-1 text-xs text-surface-sub leading-relaxed">
                <strong>{MEDICAL_DISCLAIMER}</strong> Seluruh data kesehatan Anda bersifat pribadi
                dan hanya dapat diakses oleh akun Anda sendiri.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Reminder Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingReminder)}
        onClose={() => setDeletingReminder(null)}
        onConfirm={handleConfirmDeleteReminder}
        title="Hapus Jadwal Pengingat?"
        description="Apakah Anda yakin ingin menghapus jadwal pengingat ini secara permanen?"
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeletingReminder}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Keluar dari Akun WellTrack?"
        description="Token autentikasi Anda akan dihapus sepenuhnya dari browser ini sesuai standar keamanan (NFR-07)."
        confirmText="Ya, Keluar Sekarang"
        cancelText="Batal"
        variant="danger"
        isLoading={isLoggingOut}
      />
    </div>
  );
}

