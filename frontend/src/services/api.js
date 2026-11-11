import axios from 'axios';

const TOKEN_STORAGE_KEY = 'welltrack_access_token';
const USER_STORAGE_KEY = 'welltrack_user_cache';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const reqUrl = error.config?.url || '';
    const isAuthLogin = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register');

    if (status === 401 && !isAuthLogin) {
      clearAuthStorage();
      window.dispatchEvent(new CustomEvent('welltrack:unauthorized'));
    }
    return Promise.reject(error);
  }
);

function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      out[key] = val;
    }
  });
  return out;
}

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => apiClient.post('/auth/login', payload).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  changePassword: (payload) => apiClient.post('/auth/change-password', payload).then((r) => r.data),
};

export const userApi = {
  getMe: () => apiClient.get('/users/me').then((r) => r.data),
  updateMe: (payload) => apiClient.patch('/users/me', payload).then((r) => r.data),
};

export const activityApi = {
  create: (payload) => apiClient.post('/activity-logs', payload).then((r) => r.data),
  list: (params) => apiClient.get('/activity-logs', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => apiClient.get(`/activity-logs/${id}`).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/activity-logs/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/activity-logs/${id}`),
};

export const waterApi = {
  create: (payload) => apiClient.post('/water-logs', payload).then((r) => r.data),
  list: (params) => apiClient.get('/water-logs', { params: cleanParams(params) }).then((r) => r.data),
  getDailyTotal: (logDate) =>
    apiClient.get('/water-logs/daily-total', { params: cleanParams({ log_date: logDate }) }).then((r) => r.data),
  get: (id) => apiClient.get(`/water-logs/${id}`).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/water-logs/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/water-logs/${id}`),
};

export const sleepApi = {
  create: (payload) => apiClient.post('/sleep-logs', payload).then((r) => r.data),
  list: (params) => apiClient.get('/sleep-logs', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => apiClient.get(`/sleep-logs/${id}`).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/sleep-logs/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/sleep-logs/${id}`),
};

export const targetApi = {
  listTemplates: (params) =>
    apiClient.get('/targets/templates', { params: cleanParams(params) }).then((r) => r.data),
  createFromTemplate: (payload) => apiClient.post('/targets/from-template', payload).then((r) => r.data),
  createManual: (payload) => apiClient.post('/targets', payload).then((r) => r.data),
  list: (params) => apiClient.get('/targets', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => apiClient.get(`/targets/${id}`).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/targets/${id}`, payload).then((r) => r.data),
  cancel: (id) => apiClient.post(`/targets/${id}/cancel`).then((r) => r.data),
  remove: (id) => apiClient.delete(`/targets/${id}`),
};

export const dashboardApi = {
  getDashboard: () => apiClient.get('/dashboard').then((r) => r.data),
  getHistory: (params) => apiClient.get('/history', { params: cleanParams(params) }).then((r) => r.data),
};

export const chartApi = {
  getCharts: (params) => apiClient.get('/charts', { params: cleanParams(params) }).then((r) => r.data),
};

export const gamificationApi = {
  getSummary: () => apiClient.get('/gamification/summary').then((r) => r.data),
  getBadges: (params) => apiClient.get('/gamification/badges', { params: cleanParams(params) }).then((r) => r.data),
};

export const reminderApi = {
  list: (params) => apiClient.get('/reminders', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => apiClient.get(`/reminders/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/reminders', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/reminders/${id}`, payload).then((r) => r.data),
  toggle: (id) => apiClient.post(`/reminders/${id}/toggle`).then((r) => r.data),
  remove: (id) => apiClient.delete(`/reminders/${id}`),
};

export default apiClient;

