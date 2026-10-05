import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusMessage from '../../components/StatusMessage';
import { useAuth } from '../../context/AuthContext';

export default function OrganizerLogin() {
  const navigate = useNavigate();
  const { loginOrganizer } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      const { data } = await api.post('/auth/organizer/login', { loginId: loginId.trim(), password });
      loginOrganizer(data.token, data.organizer);
      navigate('/organizer/dashboard');
    } catch (err) {
      if (err.response?.data?.redirect === 'BUY_PASS') {
        navigate('/organizer/renew');
        return;
      }
      setStatus({ type: 'error', message: err.response?.data?.message || 'Login failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-3.5 sm:p-6 py-8 sm:py-12">
      <form onSubmit={handleSubmit} className="bg-slate-800 text-white max-w-sm w-full p-6 sm:p-8 rounded-3xl space-y-4 shadow-2xl border border-slate-700">
        <div className="text-center mb-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0F5132] text-white flex items-center justify-center text-2xl border border-emerald-500/40 shadow-lg mb-2">
            🏏
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-white font-bold tracking-wide">Organizer Login</h1>
          <p className="text-xs text-slate-400 mt-1">Manage your teams, players, and live auction</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Login ID (Email)</label>
          <input required className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold shadow-inner" value={loginId} onChange={e => setLoginId(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
          <input required type="password" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold shadow-inner" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <StatusMessage type={status.type} message={status.message} />
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base font-bold shadow-lg shadow-emerald-950 uppercase tracking-wide">
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
        <p className="text-center text-xs sm:text-sm text-slate-400 pt-2">
          No account yet?{' '}
          <Link to="/get-started" className="text-emerald-400 font-bold underline underline-offset-2 hover:text-emerald-300">
            Buy the software
          </Link>
        </p>
      </form>
    </div>
  );
}
