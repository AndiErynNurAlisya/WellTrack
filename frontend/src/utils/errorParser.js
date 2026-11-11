/**
 * Mengekstrak pesan error dan map error per field dari response error FastAPI WellTrack.
 * Format backend:
 * - Error umum (400, 401, 404, 409, 500): { detail: "Pesan error dalam Bahasa Indonesia" }
 * - Error validasi (422): { detail: "Pesan utama", errors: [{ field: "nama_field", message: "Pesan spesifik field" }] }
 */
export function parseApiError(error, fallbackMessage = 'Terjadi kendala saat menghubungi server.') {
  if (!error) {
    return { message: fallbackMessage, fieldErrors: {}, status: null };
  }

  if (!error.response) {
    return {
      message: 'Tidak dapat terhubung ke server API WellTrack. Pastikan koneksi internet atau server backend aktif.',
      fieldErrors: {},
      status: 0,
    };
  }

  const { status, data } = error.response;
  const fieldErrors = {};

  if (data && Array.isArray(data.errors)) {
    data.errors.forEach((item) => {
      if (item?.field && item?.message) {
        fieldErrors[item.field] = item.message;
      }
    });
  }

  let message = fallbackMessage;
  if (data && typeof data.detail === 'string' && data.detail.trim()) {
    message = data.detail;
  } else if (Object.keys(fieldErrors).length > 0) {
    message = Object.values(fieldErrors)[0];
  }

  return {
    message,
    fieldErrors,
    status,
  };
}

