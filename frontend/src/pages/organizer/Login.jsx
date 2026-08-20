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
      const { data } = await api.post('/auth/organizer/login', { loginId, password });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-turf/5 to-ivory p-3.5 sm:p-6 py-8 sm:py-12">
      <form onSubmit={handleSubmit} className="card max-w-sm w-full space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl text-turf text-center">Organizer Login</h1>
        <div>
          <label className="label-text">Login ID</label>
          <input required className="input-field" value={loginId} onChange={e => setLoginId(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Password</label>
          <input required type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <StatusMessage type={status.type} message={status.message} />
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
        <p className="text-center text-xs sm:text-sm text-black/60 pt-1">
          No account yet?{' '}
          <Link to="/get-started" className="text-turf font-semibold underline underline-offset-2">
            Buy the software
          </Link>
        </p>
      </form>
    </div>
  );
}
