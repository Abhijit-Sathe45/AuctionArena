import axios from 'axios';

// In local dev, VITE_API_URL is left empty and Vite's dev-server proxy quietly forwards
// /api and /socket.io to the backend on localhost:5000. In production, the frontend and
// backend are on separate real domains (Vercel + Render) with no proxy in between,
let rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
if (rawApiUrl.endsWith('/api')) {
  rawApiUrl = rawApiUrl.slice(0, -4).replace(/\/+$/, '');
}

if (!rawApiUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.warn('[AuctionArena] VITE_API_URL is not configured in Vercel environment variables. API calls may fail. Please set VITE_API_URL in your Vercel Project Settings to your Render URL and redeploy.');
}

const API_BASE = rawApiUrl ? `${rawApiUrl}/api` : '/api';

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