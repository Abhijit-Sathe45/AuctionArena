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
    tournamentName: '', tournamentDate: '', organizerName: '', email: '', phone: '', logoUrl: null,
  });
  const [selectedPlan, setSelectedPlan] = useState('1_MONTH');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [credentials, setCredentials] = useState(null);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setSubmitting(true);
    try {
      const { data } = await api.post('/organizer-signup/initiate', { ...form, planType: selectedPlan });

      if (data.razorpayOrder) {
        const response = await openRazorpayCheckout({
          order: data.razorpayOrder, keyId: RAZORPAY_KEY_ID,
          name: 'Auction Arena Software', description: `${selectedPlan.replace('_', ' ')} Pass`,
          prefill: { name: form.organizerName, email: form.email, contact: form.phone },
        });
        const verifyRes = await api.post('/organizer-signup/verify-payment', {
          organizerId: data.organizerId, ...response,
        });
        setCredentials({ loginId: verifyRes.data.loginId, password: data.rawPasswordPreview, slug: verifyRes.data.slug });
      } else {
        setCredentials({ loginId: data.loginId, password: data.rawPasswordPreview, slug: data.slug });
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
        <div className="card max-w-md text-center space-y-3">
          <h2 className="font-display text-3xl text-turf">Welcome Aboard! 🎉</h2>
          <p className="text-black/70">Your auction software account is ready. Save these credentials — you'll need them to log in.</p>
          <div className="bg-turf/5 rounded-md p-4 text-left space-y-1">
            <p><span className="font-semibold">Login ID:</span> {credentials.loginId}</p>
            <p><span className="font-semibold">Password:</span> {credentials.password}</p>
          </div>
          <button className="btn-primary w-full" onClick={() => navigate('/organizer/login')}>Go to Login</button>
        </div>
      </Center>
    );
  }

  return (
    <Center>
      <form onSubmit={handleSubmit} className="card max-w-lg w-full space-y-4">
        <div className="text-center mb-2">
          <h1 className="font-display text-3xl text-turf">Get Your Auction Software</h1>
          <p className="text-sm text-black/50">Set up your tournament and start collecting registrations in minutes.</p>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Email</label>
            <input required type="email" className="input-field" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} />
          </div>
        </div>

        <ImageUpload label="Tournament Logo" onUploaded={(url) => update('logoUrl', url)} />

        <div>
          <label className="label-text mb-2">Choose Your Pass</label>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map(p => (
              <button type="button" key={p.planType} onClick={() => setSelectedPlan(p.planType)}
                className={`text-left border rounded-lg p-3 transition-colors ${selectedPlan === p.planType ? 'border-gold bg-gold/10' : 'border-black/10 hover:border-black/25'}`}>
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-black/50 mt-1">{p.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <StatusMessage type={status.type} message={status.message} />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Processing…' : 'Proceed to Payment'}
        </button>
      </form>
    </Center>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-turf/5 to-ivory">{children}</div>;
}
