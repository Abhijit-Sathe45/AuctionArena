import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import ImageUpload from '../../components/ImageUpload';
import StatusMessage from '../../components/StatusMessage';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const PLANS = [
  { planType: '1_MONTH', label: '1 Month Pass', blurb: 'Great for a single one-off tournament.' },
  { planType: '4_MONTH', label: '4 Month Pass', blurb: 'Best for a season with multiple auctions.' },
  { planType: '12_MONTH', label: '12 Month Pass', blurb: 'For clubs running auctions all year round.' },
];

export default function BuySoftware() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tournamentName: '', tournamentDate: '', organizerName: '', email: '', phone: '',
    password: '', confirmPassword: '', logoUrl: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('1_MONTH');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [credentials, setCredentials] = useState(null);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploadingLogo) {
      setStatus({ type: 'info', message: 'Please wait, tournament logo is still uploading...' });
      return;
    }
    setStatus({ type: '', message: '' });

    if (!form.password || form.password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match. Please verify your password.' });
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/organizer-signup/initiate', {
        ...form,
        planType: selectedPlan,
      });

      if (data.razorpayOrder) {
        const response = await openRazorpayCheckout({
          order: data.razorpayOrder, keyId: RAZORPAY_KEY_ID,
          name: 'Auction Arena Software', description: `${selectedPlan.replace('_', ' ')} Pass`,
          prefill: { name: form.organizerName, email: form.email, contact: form.phone },
        });
        const verifyRes = await api.post('/organizer-signup/verify-payment', {
          organizerId: data.organizerId, ...response,
        });
        setCredentials({ loginId: verifyRes.data.loginId, slug: verifyRes.data.slug });
      } else {
        setCredentials({ loginId: data.loginId, slug: data.slug });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || err.message || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (credentials) {
    return (
      <Center>
        <div className="card max-w-md w-full text-center space-y-4 shadow-lg border-sky/30">
          <div className="w-16 h-16 bg-mint/20 text-mint rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
            🎉
          </div>
          <h2 className="font-display text-3xl text-turf">
            Welcome Aboard!
          </h2>
          <p className="text-mauve-dark text-sm">
            Your auction software account is ready.<br/>
            You can now log in using your registered credentials.
          </p>
          <div className="bg-sky/10 rounded-2xl p-4 text-left space-y-2.5 border border-sky/30">
            <div>
              <span className="text-xs text-mauve-dark block font-medium">Login ID</span>
              <span className="font-bold text-turf text-sm sm:text-base">{credentials.loginId}</span>
            </div>
            <div>
              <span className="text-xs text-mauve-dark block font-medium">Password</span>
              <span className="font-medium text-turf/80 text-sm">•••••••• <span className="text-xs text-mauve">(Password created by you)</span></span>
            </div>
          </div>
          <button
            className="btn-primary w-full py-3 text-base font-bold shadow-md shadow-mint/20"
            onClick={() => navigate("/organizer/login")}
          >
            Go to Organizer Login
          </button>
        </div>
      </Center>
    );
  }

  return (
    <Center>
      <form onSubmit={handleSubmit} className="card max-w-lg w-full space-y-4 shadow-lg border-mauve/30">
        <div className="text-center mb-2">
          <h1 className="font-display text-3xl text-turf">Get Your Auction Software</h1>
          <p className="text-sm text-mauve-dark">Set up your tournament and start collecting registrations in minutes.</p>
        </div>

        <div>
          <label className="label-text">Tournament Name</label>
          <input required className="input-field" value={form.tournamentName} onChange={e => update('tournamentName', e.target.value)} />
        </div>
        <div>
          <label className="label-text">Tournament Date</label>
          <input required type="date" className="input-field" value={form.tournamentDate} onChange={e => update('tournamentDate', e.target.value)} />
        </div>
        <div>
          <label className="label-text">Your Name (Organizer)</label>
          <input required className="input-field" value={form.organizerName} onChange={e => update('organizerName', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="label-text">Email (will be your Login ID)</label>
            <input required type="email" className="input-field" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="label-text">Create Password</label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                placeholder="Min 6 characters"
                className="input-field pr-10"
                value={form.password}
                onChange={e => update('password', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-mauve hover:text-turf focus:outline-none"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {form.password && form.password.length < 6 && (
              <p className="text-[11px] text-rose mt-1">Must be at least 6 characters</p>
            )}
          </div>
          <div>
            <label className="label-text">Confirm Password</label>
            <div className="relative">
              <input
                required
                type={showConfirmPassword ? 'text' : 'password'}
                minLength={6}
                placeholder="Re-enter password"
                className={`input-field pr-10 ${
                  form.confirmPassword && form.password !== form.confirmPassword ? 'border-rose focus:ring-rose' : ''
                }`}
                value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-mauve hover:text-turf focus:outline-none"
                onClick={() => setShowConfirmPassword(v => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {form.confirmPassword && (
              <p className={`text-[11px] mt-1 ${form.password === form.confirmPassword ? 'text-mint font-medium' : 'text-rose'}`}>
                {form.password === form.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
              </p>
            )}
          </div>
        </div>

        <ImageUpload
          label="Tournament Logo"
          shape="square"
          onUploaded={(url) => update('logoUrl', url)}
          onUploadingChange={setUploadingLogo}
        />

        <div>
          <label className="label-text mb-2">Choose Your Pass</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {PLANS.map(p => (
              <button type="button" key={p.planType} onClick={() => setSelectedPlan(p.planType)}
                className={`text-left border-2 rounded-2xl p-3.5 transition-all active:scale-[0.98] ${selectedPlan === p.planType ? 'border-mint bg-mint/10 shadow-sm' : 'border-mauve/20 hover:border-sky'}`}>
                <p className="font-bold text-sm text-turf">{p.label}</p>
                <p className="text-xs text-mauve-dark mt-1">{p.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <StatusMessage type={status.type} message={status.message} />

        <button
          type="submit"
          disabled={submitting || uploadingLogo}
          className="btn-primary w-full text-base py-3 font-bold shadow-md shadow-mint/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Processing…' : uploadingLogo ? 'Uploading Logo…' : 'Proceed to Payment'}
        </button>
      </form>
    </Center>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 py-6 sm:py-10 bg-gradient-to-b from-sky/15 via-ivory to-orchid/10">{children}</div>;
}
