import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import StatusMessage from '../../components/StatusMessage';
import { useAuth } from '../../context/AuthContext';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { loginSuperAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/superadmin/login', { email, password });
      loginSuperAdmin(data.token, data.email);
      navigate('/super-admin/dashboard');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Login failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F0F5FF] via-[#FAF5FC] to-[#F2FCF8] p-3.5 sm:p-6 py-8 sm:py-12">
      <form onSubmit={handleSubmit} className="card max-w-sm w-full space-y-4 shadow-xl border-mauve/30 bg-white">
        <div className="text-center">
          <span className="text-3xl block mb-1">⚡</span>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">Super Admin</h1>
          <p className="text-xs text-mauve-dark mt-0.5">Platform Oversight & Management</p>
        </div>
        <div>
          <label className="label-text">Email</label>
          <input required type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Password</label>
          <input required type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <StatusMessage type={status.type} message={status.message} />
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base font-bold shadow-lg shadow-mint/25">
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
