import React, { createContext, useCallback, useContext, useState } from 'react';
import { Award, CheckCircle2, Flame, Info, Sparkles, X, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'success', title, message, duration = 4500, gamification = null }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message, gamification }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showGamificationFeedback = useCallback(
    (label, gamification) => {
      if (!gamification) {
        showToast({
          type: 'success',
          title: 'Catatan Tersimpan',
          message: `${label} berhasil disimpan.`,
        });
        return;
      }

      const { points_earned = 0, total_points = 0, current_streak = 0, new_badges = [] } = gamification;

      showToast({
        type: 'gamification',
        title: points_earned > 0 ? `+${points_earned} Poin Vitalitas!` : 'Catatan Tersimpan!',
        message: `${label} berhasil dicatat. Total Poin: ${total_points} • Streak: ${current_streak} hari.`,
        gamification,
        duration: new_badges.length > 0 ? 7500 : 5000,
      });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showGamificationFeedback, removeToast }}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[90] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((t) => {
          const isGamification = t.type === 'gamification';
          const isError = t.type === 'error';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-xl transition-all duration-300 ${
                isGamification
                  ? 'bg-gradient-to-br from-[#002114] via-[#005137] to-[#006948] text-white border-[#68DBA9]/40'
                  : isError
                  ? 'bg-[#FFDAD6] text-[#93000A] border-rose-300'
                  : isInfo
                  ? 'bg-[#E5EEFF] text-[#0B1C30] border-[#D3E4FE]'
                  : 'bg-white text-surface-ink border-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isGamification ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#85F8C4]/20 text-[#85F8C4]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  ) : isError ? (
                    <AlertCircle className="h-5 w-5 text-[#BA1A1A]" />
                  ) : isInfo ? (
                    <Info className="h-5 w-5 text-brand-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-brand-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {t.title && <p className="text-sm font-bold leading-snug">{t.title}</p>}
                  {t.message && (
                    <p
                      className={`mt-0.5 text-xs leading-relaxed ${
                        isGamification ? 'text-emerald-100' : isError ? 'text-[#93000A]/90' : 'text-surface-sub'
                      }`}
                    >
                      {t.message}
                    </p>
                  )}

                  {isGamification && t.gamification && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-[#85F8C4]">
                        <Flame className="h-3.5 w-3.5 text-amber-300" />
                        Streak {t.gamification.current_streak} Hari
                      </span>
                      {t.gamification.points_earned === 0 && (
                        <span className="text-[11px] text-emerald-200/90">
                          (Batas maks. 5 log berpoin/hari tercapai)
                        </span>
                      )}
                    </div>
                  )}

                  {isGamification &&
                    Array.isArray(t.gamification?.new_badges) &&
                    t.gamification.new_badges.length > 0 && (
                      <div className="mt-3 rounded-xl bg-amber-400/20 border border-amber-300/40 p-2.5">
                        <div className="flex items-center gap-2 text-amber-200 text-xs font-bold">
                          <Award className="h-4 w-4 shrink-0 text-amber-300" />
                          <span>Lencana Baru Terbuka!</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {t.gamification.new_badges.map((b) => (
                            <p key={b.id || b.name} className="text-xs font-semibold text-white">
                              🏆 {b.name} — <span className="font-normal text-emerald-100">{b.description}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className={`rounded-lg p-1 transition-colors ${
                    isGamification
                      ? 'text-emerald-200 hover:bg-white/10'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return ctx;
}

