import axios from 'axios';

// In local dev, VITE_API_URL is left empty and Vite's dev-server proxy quietly forwards
// /api and /socket.io to the backend on localhost:5000. In production, the frontend and
// backend are on separate real domains (Vercel + Render) with no proxy in between,
// so VITE_API_URL must be set to the backend's full URL for requests to reach it at all.
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

// Generous 60s timeout to comfortably accommodate free-tier Render server cold starts (30-50s)
const api = axios.create({ baseURL: API_BASE, timeout: 60000 });

api.interceptors.request.use((config) => {
  const isSuperAdminRoute = config.url?.startsWith('/super-admin');
  const token = isSuperAdminRoute
    ? localStorage.getItem('superAdminToken')
    : localStorage.getItem('organizerToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 402 && err.response?.data?.redirect === 'BUY_PASS') {
      window.location.href = '/organizer/renew';
    }
    return Promise.reject(err);
  }
);

export default api;