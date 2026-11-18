"""Pytest Playwright E2E Test Suite untuk Seluruh Fitur WellTrack.

Dapat dijalankan dengan perintah:
    python -m pytest tests/test_e2e_playwright.py -v --headed
"""

import time
import pytest

pytestmark = pytest.mark.e2e
BASE_URL = "http://localhost:5173"
TEST_EMAIL = "andi@gmail.com"
TEST_PASS = "andi12345"


@pytest.fixture(scope="module")
def browser_context(playwright):
    try:
        browser = playwright.chromium.launch(channel="chrome", headless=False, slow_mo=500)
    except Exception:
        browser = playwright.chromium.launch(channel="msedge", headless=False, slow_mo=500)
    context = browser.new_context(viewport={"width": 1366, "height": 768})
    yield context
    browser.close()


@pytest.fixture(scope="module")
def page(browser_context):
    return browser_context.new_page()


def test_01_autentikasi_dan_login(page):
    page.goto(f"{BASE_URL}/login", timeout=15000)
    if "/login" in page.url:
        page.fill("#login-email", TEST_EMAIL)
        page.fill("#login-password", TEST_PASS)
        page.click("button[type='submit']")
        page.wait_for_url("**/dashboard", timeout=12000)
    assert "/dashboard" in page.url


def test_02_dasbor_dan_interaksi_hidrasi(page):
    page.wait_for_selector("text=Selamat datang kembali", timeout=6000)
    tombol_air = page.locator("button:has-text('+ 250 ml')").first
    if tombol_air.is_visible():
        tombol_air.click()
        time.sleep(1)


def test_03_halaman_analitik_dan_filter_periode(page):
    page.click("text=Analitik & Progres")
    page.wait_for_url("**/analytics", timeout=8000)
    page.wait_for_selector("text=Analisis & Tren Kesehatan", timeout=6000)
    page.click("button:has-text('Mingguan')")
    page.click("button:has-text('Harian')")


def test_04_halaman_target_kesehatan(page):
    page.click("text=Kebiasaan & Target")
    page.wait_for_url("**/targets", timeout=8000)
    page.wait_for_selector("text=Manajemen Target & Resolusi", timeout=6000)


def test_05_gamifikasi_dan_koleksi_lencana(page):
    page.click("text=Gamifikasi & Prestasi")
    page.wait_for_url("**/gamification", timeout=8000)
    page.wait_for_selector("text=PENCAPAIAN & POIN VITALITAS", timeout=6000)
    assert page.is_visible("text=Progres Koleksi Lencana")


def test_06_pengaturan_dan_pengingat_notifikasi(page):
    page.click("text=Profil & Pengaturan")
    page.wait_for_url("**/settings", timeout=8000)
    tab_pengingat = page.locator("button:has-text('Pengingat Pencatatan')").first
    if tab_pengingat.is_visible():
        tab_pengingat.click()
        time.sleep(1)
        assert page.is_visible("text=Preferensi Pengingat Pencatatan")


def test_07_dialog_konfirmasi_logout(page):
    btn_keluar = page.locator("button:has-text('Keluar')").first
    if btn_keluar.is_visible():
        btn_keluar.click()
        time.sleep(1)
        assert page.is_visible("text=Keluar dari Akun WellTrack?")
        page.click("button:has-text('Batal')")
