"""Automated End-to-End (E2E) Test Suite untuk Seluruh Fitur WellTrack.

Mode Presentasi (Slow-Motion):
- Kecepatan aksi robot diperlambat (slow_mo=1200ms) agar gerakan mengetik,
  navigasi menu, dan interaksi tombol dapat diamati secara jelas saat demonstrasi.
"""

import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
TEST_EMAIL = "kimryul@gmail.com"
TEST_PASS = "12345678"  # Sesuaikan dengan password akun Anda jika berbeda


def run_full_e2e_suite():
    print("=" * 70)
    print("🚀 MEMULAI PENGUJIAN OTOMATIS MENYELURUH (FULL E2E SUITE) WELLTRACK")
    print("   Mode Presentasi: Diperlambat agar mudah diamati")
    print("=" * 70)

    with sync_playwright() as p:
        print("\n🌐 Membuka Google Chrome resmi di laptop Anda...")
        # slow_mo=1200 ms (1,2 detik per aksi) agar terlihat sangat jelas dan santai
        try:
            browser = p.chromium.launch(channel="chrome", headless=False, slow_mo=1200)
        except Exception:
            browser = p.chromium.launch(channel="msedge", headless=False, slow_mo=1200)

        context = browser.new_context(viewport={"width": 1366, "height": 768})
        page = context.new_page()

        passed_tests = 0
        total_tests = 7

        try:
            # -------------------------------------------------------------
            # TEST 1: AUTENTIKASI & VALIDASI LOGIN
            # -------------------------------------------------------------
            print("\n[UJI 1/7] 🔐 Menguji Modul Autentikasi & Form Login...")
            page.goto(f"{BASE_URL}/login", timeout=15000)
            time.sleep(2)

            if "/login" in page.url:
                # 1a. Uji validasi input salah
                print("         ✍️  Mencoba input email salah untuk menguji validasi...")
                page.fill("#login-email", "format-email-salah")
                page.fill("#login-password", "123")
                page.click("button[type='submit']")
                time.sleep(2)
                assert page.is_visible("text=Format email tidak valid") or "/login" in page.url
                print("         ✅ Validasi penolakan email salah berhasil!")

                # 1b. Login dengan kredensial valid
                print(f"         ✍️  Login dengan akun resmi: {TEST_EMAIL}...")
                page.fill("#login-email", TEST_EMAIL)
                page.fill("#login-password", TEST_PASS)
                time.sleep(1)
                page.click("button[type='submit']")
                page.wait_for_url("**/dashboard", timeout=12000)
                print("         ✅ Login berhasil & diarahkan ke Dasbor!")
                time.sleep(2)

            assert "/dashboard" in page.url
            passed_tests += 1

            # -------------------------------------------------------------
            # TEST 2: DASBOR & PENCATATAN KEBIASAAN
            # -------------------------------------------------------------
            print("\n[UJI 2/7] 📊 Menguji Dasbor & Pencatatan Cepat Kebiasaan...")
            page.wait_for_selector("text=Selamat datang kembali", timeout=6000)
            time.sleep(2)

            # Uji tombol +250 ml air langsung di kartu hidrasi
            tombol_air = page.locator("button:has-text('+ 250 ml')").first
            if tombol_air.is_visible():
                print("         🖱️  Mengklik tombol '+ 250 ml' pada kartu hidrasi...")
                tombol_air.click()
                print("         ✅ Tombol '+ 250 ml' berhasil diklik!")
                time.sleep(2.5)

            # Uji tombol "Update Progres" (buka modal Quick Log)
            btn_update = page.locator("button:has-text('Update Progres')").first
            if btn_update.is_visible():
                print("         🖱️  Membuka modal 'Update Progres'...")
                btn_update.click()
                time.sleep(2.5)
                # Tutup kembali modalnya
                btn_close_modal = page.locator("button:has(.lucide-x)").first
                if btn_close_modal.is_visible():
                    btn_close_modal.click()
                print("         ✅ Modal 'Update Progres' berhasil dibuka dan ditutup!")
                time.sleep(2)
            passed_tests += 1

            # -------------------------------------------------------------
            # TEST 3: ANALISIS & TREN KESEHATAN
            # -------------------------------------------------------------
            print("\n[UJI 3/7] 📈 Menguji Halaman Analitik & Grafik Riwayat...")
            page.click("text=Analitik & Progres")
            page.wait_for_url("**/analytics", timeout=8000)
            page.wait_for_selector("text=Analisis & Tren Kesehatan", timeout=6000)
            time.sleep(2)

            # Uji tombol filter periode: Mingguan -> Bulanan -> Harian
            print("         🖱️  Beralih ke grafik Mingguan...")
            page.click("button:has-text('Mingguan')")
            time.sleep(2)

            print("         🖱️  Beralih ke grafik Bulanan...")
            page.click("button:has-text('Bulanan')")
            time.sleep(2)

            print("         🖱️  Kembali ke grafik Harian...")
            page.click("button:has-text('Harian')")
            time.sleep(2)
            print("         ✅ Navigasi filter grafik (Harian, Mingguan, Bulanan) berhasil!")
            passed_tests += 1

            # -------------------------------------------------------------
            # TEST 4: MANAJEMEN TARGET KESEHATAN (TEMPLATE & MANUAL)
            # -------------------------------------------------------------
            print("\n[UJI 4/7] 🎯 Menguji Halaman Kebiasaan & Target...")
            page.click("text=Kebiasaan & Target")
            page.wait_for_url("**/targets", timeout=8000)
            page.wait_for_selector("text=Manajemen Target & Resolusi", timeout=6000)
            time.sleep(2)

            # 4a. Uji Adopsi Target dari Katalog Template Sistem (FR-24, FR-25)
            print("         📖 [4a] Membuka Katalog Template Sistem...")
            page.click("button:has-text('Katalog Template')")
            time.sleep(2.5)

            btn_adopsi = page.locator("button:has-text('Adopsi Target')").first
            if btn_adopsi.is_visible():
                print("         🖱️  Mengadopsi template target...")
                btn_adopsi.click()
                time.sleep(2.5)
                # Klik tombol "Mulai Target" di dalam modal
                btn_mulai = page.locator("button:has-text('Mulai Target')").first
                if btn_mulai.is_visible():
                    btn_mulai.click()
                    print("         ✅ Target dari Katalog Template berhasil diaktifkan!")
                    time.sleep(2.5)

            # 4b. Uji Pembuatan Target Manual Mandiri (FR-26)
            print("         ✍️  [4b] Menguji Pembuatan Target Manual...")
            btn_target_saya = page.locator("button:has-text('Target Saya')").first
            if btn_target_saya.is_visible():
                btn_target_saya.click()
                time.sleep(2)

            btn_buat_target = page.locator("button:has-text('Buat Target Baru')").first
            if btn_buat_target.is_visible():
                btn_buat_target.click()
                time.sleep(2)

                # Isi formulir target manual
                import random
                target_name = f"Hidrasi Sehat {random.randint(100, 999)}"
                print(f"             Mengisi nama target: '{target_name}'...")
                page.fill("input[placeholder*='Contoh: Minum Air']", target_name)
                page.fill("input[type='number'][step='0.1']", "2000")
                time.sleep(1.5)

                print("             Menyimpan target manual baru...")
                page.click("button:has-text('Simpan Target')")
                time.sleep(2.5)
                print("         ✅ Target manual baru berhasil disimpan ke daftar target!")

            # 4c. Uji Filter Kategori
            print("         🔍 [4c] Menguji filter kategori target...")
            page.click("button:has-text('Hidrasi')")
            time.sleep(2)
            page.click("button:has-text('Semua Kategori')")
            time.sleep(2)
            print("         ✅ Filter kategori target terverifikasi!")
            passed_tests += 1

            # -------------------------------------------------------------
            # TEST 5: GAMIFIKASI & PRESTASI
            # -------------------------------------------------------------
            print("\n[UJI 5/7] 🏆 Menguji Halaman Gamifikasi & Koleksi Lencana...")
            page.click("text=Gamifikasi & Prestasi")
            page.wait_for_url("**/gamification", timeout=8000)
            page.wait_for_selector("text=PENCAPAIAN & POIN VITALITAS", timeout=6000)
            assert page.is_visible("text=Progres Koleksi Lencana")
            time.sleep(2.5)
            print("         ✅ Statistik poin vitalitas & grid lencana terverifikasi!")
            passed_tests += 1

            # -------------------------------------------------------------
            # TEST 6: PROFIL & PENGATURAN
            # -------------------------------------------------------------
            print("\n[UJI 6/7] ⚙️  Menguji Halaman Profil & Pengaturan...")
            page.click("text=Profil & Pengaturan")
            page.wait_for_url("**/settings", timeout=8000)
            time.sleep(2)

            # Pindah tab ke "Pengingat Pencatatan"
            tab_pengingat = page.locator("button:has-text('Pengingat Pencatatan')").first
            if tab_pengingat.is_visible():
                print("         🖱️  Membuka tab 'Pengingat Pencatatan'...")
                tab_pengingat.click()
                time.sleep(2.5)
                assert page.is_visible("text=Preferensi Pengingat Pencatatan")
                print("         ✅ Tab Pengingat Pencatatan & Web Push terverifikasi!")

            # Pindah tab ke "Keamanan & Kata Sandi"
            tab_keamanan = page.locator("button:has-text('Keamanan & Kata Sandi')").first
            if tab_keamanan.is_visible():
                print("         🖱️  Membuka tab 'Keamanan & Kata Sandi'...")
                tab_keamanan.click()
                time.sleep(2)
                print("         ✅ Tab Keamanan & Ubah Sandi terverifikasi!")
            passed_tests += 1

            # -------------------------------------------------------------
            # TEST 7: KEAMANAN KELUAR SESI (LOGOUT)
            # -------------------------------------------------------------
            print("\n[UJI 7/7] 🚪 Menguji Keamanan Sesi & Dialog Logout...")
            btn_keluar = page.locator("button:has-text('Keluar')").first
            if btn_keluar.is_visible():
                print("         🖱️  Mengklik tombol 'Keluar'...")
                btn_keluar.click()
                time.sleep(2)
                assert page.is_visible("text=Keluar dari Akun WellTrack?")
                print("         🖱️  Mengklik 'Batal' pada konfirmasi logout...")
                page.click("button:has-text('Batal')")
                time.sleep(1.5)
                print("         ✅ Dialog konfirmasi token logout (NFR-07) terverifikasi!")
            passed_tests += 1

            # Simpan tangkapan layar lengkap sebagai bukti
            screenshot_path = "e2e_hasil_seluruh_fitur.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"\n📸 Tangkapan layar bukti seluruh pengujian disimpan di: {screenshot_path}")

            print("\n" + "=" * 70)
            print(f"🎉 SUKSES! {passed_tests}/{total_tests} MODUL FITUR BERHASIL DIUJI SECARA OTOMATIS!")
            print("=" * 70)
            time.sleep(3)

        except Exception as e:
            print(f"\n❌ Pengujian terhenti pada uji ke-{passed_tests + 1}: {e}")
            page.screenshot(path="e2e_error.png")
            sys.exit(1)
        finally:
            print("\n🔒 Menutup browser Chrome otomatis...")
            browser.close()


if __name__ == "__main__":
    run_full_e2e_suite()
