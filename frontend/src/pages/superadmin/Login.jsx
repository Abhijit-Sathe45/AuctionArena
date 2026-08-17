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
    <div className="min-h-screen flex items-center justify-center bg-turf-dark p-6">
      <form onSubmit={handleSubmit} className="card max-w-sm w-full space-y-4">
        <h1 className="font-display text-3xl text-turf text-center">Super Admin</h1>
        <div>
          <label className="label-text">Email</label>
          <input required type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label-text">Password</label>
          <input required type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <StatusMessage type={status.type} message={status.message} />
        <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Logging in…' : 'Log In'}</button>
      </form>
    </div>
  );
}
