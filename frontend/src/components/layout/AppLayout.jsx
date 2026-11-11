import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Flame,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { reminderApi } from '../../services/api';
import { MEDICAL_DISCLAIMER, REMINDER_TYPE_META } from '../../utils/constants';
import { extractHHMM, formatDateIndo, getCurrentTimeString, getTodayDateString } from '../../utils/dateUtils';
import BrandLogo from '../common/BrandLogo';
import UserAvatar from '../common/UserAvatar';
import QuickLogModal from '../modals/QuickLogModal';
import ConfirmDialog from '../modals/ConfirmDialog';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard / Overview', shortLabel: 'Beranda', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics & Progress', shortLabel: 'Analitik', icon: BarChart3 },
  { to: '/targets', label: 'Habits & Goals', shortLabel: 'Target', icon: CheckCircle2 },
  { to: '/gamification', label: 'Gamification & Rewards', shortLabel: 'Prestasi', icon: Award },
  { to: '/settings', label: 'Profile & Settings', shortLabel: 'Profil', icon: Settings },
];

export default function AppLayout() {
  const { user, logout, refreshTick } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalTab, setQuickModalTab] = useState('air');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeReminders, setActiveReminders] = useState([]);

  const openQuickLog = (tab = 'air') => {
    setQuickModalTab(tab);
    setQuickModalOpen(true);
  };

  // Expose helper via custom event so child pages can open the QuickLogModal on a specific tab
  useEffect(() => {
    const handler = (e) => {
      const tab = e.detail?.tab || 'air';
      openQuickLog(tab);
    };
    window.addEventListener('welltrack:open-quick-log', handler);
    return () => window.removeEventListener('welltrack:open-quick-log', handler);
  }, []);

  // Load active reminders for client-side in-app notification watcher
  useEffect(() => {
    let mounted = true;
    reminderApi
      .list({ is_active: true })
      .then((list) => {
        if (mounted && Array.isArray(list)) {
          setActiveReminders(list);
        }
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  // Check active reminders against current WITA HH:MM every 30s
  useEffect(() => {
    if (!activeReminders.length) return;
    const interval = setInterval(() => {
      const nowHHMM = getCurrentTimeString(false);
      const todayStr = getTodayDateString();

      activeReminders.forEach((rem) => {
        if (!rem.is_active) return;
        const remHHMM = extractHHMM(rem.reminder_time);
        if (remHHMM === nowHHMM) {
          const firedKey = `welltrack_rem_${rem.id}_${todayStr}_${remHHMM}`;
          if (!sessionStorage.getItem(firedKey)) {
            sessionStorage.setItem(firedKey, '1');
            const meta = REMINDER_TYPE_META[rem.reminder_type] || {
              label: `Pengingat ${rem.reminder_type}`,
              desc: 'Saatnya mencatat kebiasaan sehat Anda di WellTrack!',
            };
            showToast({
              type: 'info',
              title: `🔔 ${meta.label} (${remHHMM} WITA)`,
              message: meta.desc,
              duration: 8000,
            });
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`WellTrack: ${meta.label}`, { body: meta.desc });
              } catch {
                // ignore browser notification errors
              }
            }
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [activeReminders, showToast]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setLogoutConfirmOpen(false);
    showToast({
      type: 'info',
      title: 'Berhasil Keluar',
      message: 'Sesi Anda telah diakhiri dan token autentikasi dihapus.',
    });
    navigate('/login', { replace: true });
  };

  const todayFormatted = formatDateIndo(getTodayDateString(), { withDayName: true, shortMonth: true });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-bg text-surface-ink overflow-x-hidden">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200/80 z-30 select-none">
        <div className="p-6 flex items-center justify-between">
          <BrandLogo size="md" />
        </div>

        {/* Tombol Utama + Update Progres (Sesuai Figma) */}
        <div className="px-5 mb-4">
          <button
            type="button"
            onClick={() => openQuickLog('air')}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 text-sm shadow-md shadow-brand-600/20 transition-all active:scale-[0.99] min-h-[48px]"
          >
            <PlusCircle className="h-5 w-5 shrink-0" />
            <span>Update Progres</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto" aria-label="Menu Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all min-h-[46px] ${isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-surface-sub hover:bg-surface-soft hover:text-surface-ink'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Disclaimer Medis (NFR-22) di Sidebar Bawah */}
        <div className="px-4 py-3">
          <div className="rounded-2xl bg-surface-soft p-3.5 border border-surface-accent/60">
            <div className="flex items-center gap-2 text-brand-700 font-bold text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Disclaimer Medis</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-surface-sub">
              {MEDICAL_DISCLAIMER}
            </p>
          </div>
        </div>

        {/* Tombol Keluar (Logout) */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#BA1A1A] hover:bg-[#FFDAD6]/50 transition-colors min-h-[44px]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="flex-1 flex flex-col md:pl-64 lg:pl-72 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Mobile Brand Logo / Desktop Date Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden">
                <BrandLogo size="sm" />
              </div>
              <div className="hidden md:flex items-center gap-2 rounded-xl bg-surface-soft px-3.5 py-2 text-xs font-semibold text-surface-ink border border-surface-accent/50">
                <Calendar className="h-4 w-4 text-brand-600 shrink-0" />
                <span>{todayFormatted}</span>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded-md">
                  WITA
                </span>
              </div>
            </div>

            {/* Right Status Pills & User Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Streak Pill */}
              <button
                type="button"
                onClick={() => navigate('/gamification')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFDDB8]/70 hover:bg-[#FFDDB8] px-2.5 sm:px-3.5 py-2 text-xs font-extrabold text-[#825100] transition-colors min-h-[40px]"
                title="Streak Harian Saat Ini"
              >
                <Flame className="h-4 w-4 text-[#A36700] fill-[#A36700] shrink-0" />
                <span>{user?.current_streak ?? 0}</span>
                <span className="hidden sm:inline">Hari Streak</span>
              </button>

              {/* Total Points Pill */}
              <button
                type="button"
                onClick={() => navigate('/gamification')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#85F8C4]/45 hover:bg-[#85F8C4]/70 px-2.5 sm:px-3.5 py-2 text-xs font-extrabold text-[#005137] transition-colors min-h-[40px]"
                title="Total Poin Vitalitas"
              >
                <Sparkles className="h-4 w-4 text-brand-600 shrink-0" />
                <span>{(user?.total_points ?? 0).toLocaleString('id-ID')}</span>
                <span className="hidden sm:inline">Poin</span>
              </button>

              {/* Reminders Bell Shortcut */}
              <button
                type="button"
                onClick={() => navigate('/settings?tab=reminders')}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-surface-sub hover:bg-surface-muted hover:text-surface-ink transition-colors"
                title="Pengingat Pencatatan"
                aria-label="Pengingat Pencatatan"
              >
                <Bell className="h-4 w-4" />
                {activeReminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {activeReminders.length}
                  </span>
                )}
              </button>

              {/* User Profile Card */}
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2.5 rounded-2xl bg-surface-soft hover:bg-surface-muted pl-2 pr-3 py-1.5 border border-surface-accent/50 transition-colors min-h-[44px]"
                title="Profil & Pengaturan Akun"
              >
                <UserAvatar name={user?.name} photoUrl={user?.profile_photo_url} size="sm" />
                <div className="hidden lg:block text-left max-w-[140px]">
                  <p className="text-xs font-bold text-surface-ink truncate leading-tight">
                    {user?.name || 'Pengguna'}
                  </p>
                  <p className="text-[11px] font-medium text-brand-600 truncate leading-tight">
                    Pengguna Aktif
                  </p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-10 max-w-7xl w-full mx-auto">
          <Outlet context={{ openQuickLog }} />
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR (NFR-12, NFR-13, NFR-14) ================= */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_20px_rgba(11,28,48,0.06)]"
      >
        <div className="grid grid-cols-6 items-center gap-1 max-w-md mx-auto">
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 min-h-[48px] transition-colors ${isActive ? 'text-brand-600 font-bold' : 'text-surface-hint hover:text-surface-ink'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 truncate">{item.shortLabel}</span>
              </NavLink>
            );
          })}

          {/* Tombol Tengah Quick Log (+) */}
          <div className="col-span-2 flex justify-center">
            <button
              type="button"
              onClick={() => openQuickLog('air')}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 text-white font-bold px-3.5 py-2.5 text-xs shadow-lg shadow-brand-600/30 active:scale-95 transition-transform min-h-[46px] w-full"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Catat</span>
            </button>
          </div>

          {NAV_ITEMS.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 min-h-[48px] transition-colors ${isActive ? 'text-brand-600 font-bold' : 'text-surface-hint hover:text-surface-ink'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 truncate">{item.shortLabel}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Global Quick Log Modal */}
      <QuickLogModal
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        initialTab={quickModalTab}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Keluar dari Akun WellTrack?"
        description="Token sesi Anda akan dihapus dari perangkat ini sesuai standar keamanan (NFR-07). Anda dapat masuk kembali kapan saja."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        isLoading={isLoggingOut}
      />
    </div>
  );
}

