import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  User,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MEDICAL_DISCLAIMER } from '../utils/constants';
import { parseApiError } from '../utils/errorParser';
import BrandLogo from '../components/common/BrandLogo';

export default function RegisterPage() {
  const { isAuthenticated, register, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Format alamat email tidak valid.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Kata sandi minimal 8 karakter.');
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setErrorMsg('Kata sandi maksimal 72 byte.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak sama.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        confirm_password: confirmPassword,
      });

      // Login otomatis setelah registrasi berhasil agar pengalaman pengguna mulus
      await login(trimmedEmail, password);

      showToast({
        type: 'success',
        title: 'Registrasi Berhasil!',
        message: `Selamat bergabung di WellTrack, ${trimmedName}!`,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, 'Gagal mendaftarkan akun baru.');
      setErrorMsg(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-bg overflow-x-hidden">
      {/* Left Hero Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#002114] via-[#005137] to-[#006948] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <BrandLogo size="lg" />
          <h1 className="mt-10 text-3xl xl:text-4xl font-extrabold leading-tight">
            Mulai Perjalanan Hidup Sehat Anda Hari Ini.
          </h1>
          <p className="mt-3 text-emerald-100/90 text-sm leading-relaxed">
            Dengan mendaftar akun WellTrack, Anda mendapatkan akses penuh ke seluruh fitur inti:
          </p>

          <ul className="mt-6 space-y-3.5 text-sm text-emerald-50">
            {[
              'Pencatatan cepat Aktivitas Fisik, Konsumsi Air, & Pola Tidur.',
              'Katalog Template Target Kesehatan bawaan sistem & Target Manual.',
              'Visualisasi Grafik Perkembangan Harian, Mingguan, & Bulanan.',
              'Sistem motivasi Gamifikasi: Poin Vitalitas, Streak Harian, & Koleksi Lencana.',
              'Pengingat waktu pencatatan sesuai rutinitas harian Anda.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-[#85F8C4] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Register Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-14 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6">
            <div className="lg:hidden mb-4">
              <BrandLogo size="md" showTagline />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-ink">
              Buat Akun Baru
            </h2>
            <p className="mt-1 text-sm text-surface-sub">
              Isi data diri di bawah ini untuk mulai mencatat kebiasaan sehat Anda.
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

          <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-4" noValidate>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-bold text-surface-ink mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-name"
                  type="text"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Alif Pratama"
                  className="input-field pl-10"
                  required
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-[#BA1A1A]">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-bold text-surface-ink mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-email"
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
              <label htmlFor="reg-password" className="block text-xs font-bold text-surface-ink mb-1">
                Kata Sandi <span className="font-normal text-surface-hint">(Min. 8 karakter)</span>
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="input-field pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-surface-hint hover:text-surface-ink rounded-lg"
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-[#BA1A1A]">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-bold text-surface-ink mb-1">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-surface-hint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi"
                  className="input-field pl-10"
                  required
                />
              </div>
              {fieldErrors.confirm_password && (
                <p className="mt-1 text-xs text-[#BA1A1A]">{fieldErrors.confirm_password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-bold shadow-md mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Daftar & Masuk Sekarang</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-surface-sub pt-1">
              Sudah memiliki akun?{' '}
              <Link
                to="/login"
                className="font-bold text-brand-600 hover:text-brand-700 underline underline-offset-4"
              >
                Masuk di sini
              </Link>
            </p>
          </form>

          <div className="mt-5 rounded-2xl bg-surface-soft border border-surface-accent/70 p-3.5 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-xs text-surface-sub leading-relaxed">{MEDICAL_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

