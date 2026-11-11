import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Droplets,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Moon,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MEDICAL_DISCLAIMER } from '../utils/constants';
import { parseApiError } from '../utils/errorParser';
import BrandLogo from '../components/common/BrandLogo';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    setFieldErrors({});

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    if (!password) {
      setErrorMsg('Kata sandi wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const profile = await login(trimmedEmail, password);
      showToast({
        type: 'success',
        title: `Selamat datang kembali, ${profile?.name || 'Pengguna'}!`,
        message: 'Berhasil masuk ke akun WellTrack Anda.',
      });
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal melakukan login. Periksa email dan kata sandi Anda.');
      setErrorMsg(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-bg overflow-x-hidden">
      {/* Left Hero Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#002114] via-[#005137] to-[#006948] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#85F8C4]/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-[#86F2E4]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/15">
            <Activity className="h-5 w-5 text-[#85F8C4]" />
            <span className="font-extrabold tracking-tight text-lg">WellTrack</span>
            <span className="text-xs bg-[#85F8C4] text-[#002114] font-bold px-2 py-0.5 rounded-md">
              v1.0
            </span>
          </div>

          <h1 className="mt-10 text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            Konsistensi Kecil Hari Ini adalah{' '}
            <span className="text-[#85F8C4]">Fondasi Energi</span> Esok Hari.
          </h1>
          <p className="mt-4 text-emerald-100/90 text-base leading-relaxed max-w-xl">
            Pantau tiga kebiasaan utama kesehatan pribadi Anda dalam satu ruang terpadu:
            aktivitas fisik, konsumsi air harian, dan pola tidur. Tetapkan target dan raih
            pencapaian setiap hari.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
            <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-4 border border-white/10">
              <Droplets className="h-6 w-6 text-[#86F2E4]" />
              <p className="mt-2 font-bold text-sm">Konsumsi Air</p>
              <p className="text-xs text-emerald-100/80 mt-0.5">Target hidrasi harian akurat</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-4 border border-white/10">
              <Moon className="h-6 w-6 text-[#D3E4FE]" />
              <p className="mt-2 font-bold text-sm">Pola Tidur</p>
              <p className="text-xs text-emerald-100/80 mt-0.5">Hitung durasi lintas malam otomatis</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-4 border border-white/10">
              <Award className="h-6 w-6 text-[#FFDDB8]" />
              <p className="mt-2 font-bold text-sm">Poin & Streak</p>
              <p className="text-xs text-emerald-100/80 mt-0.5">Motivasi lewat badge & target</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-14 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <BrandLogo size="lg" showTagline />
            <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-surface-ink">
              Masuk ke Akun Anda
            </h2>
            <p className="mt-1.5 text-sm text-surface-sub">
              Masukkan email dan kata sandi untuk melanjutkan pencatatan kesehatan harian.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 rounded-2xl bg-[#FFDAD6] border border-rose-300 px-4 py-3 text-xs font-semibold text-[#93000A]"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-surface-ink mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="input-field pl-10"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-[#BA1A1A]">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-surface-ink mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="input-field pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-surface-hint hover:text-surface-ink rounded-lg"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-[#BA1A1A]">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-bold shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke WellTrack</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-surface-sub pt-1">
              Belum memiliki akun WellTrack?{' '}
              <Link
                to="/register"
                className="font-bold text-brand-600 hover:text-brand-700 underline underline-offset-4"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </form>

          {/* Disclaimer Medis untuk Mobile & Tablet (NFR-22) */}
          <div className="mt-6 rounded-2xl bg-surface-soft border border-surface-accent/70 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-xs text-surface-sub leading-relaxed">
              <strong className="text-surface-ink">Disclaimer:</strong> {MEDICAL_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

