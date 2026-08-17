import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import StatusMessage from '../../components/StatusMessage';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const PLANS = [
  { planType: '1_MONTH', label: '1 Month Pass' },
  { planType: '4_MONTH', label: '4 Month Pass' },
  { planType: '12_MONTH', label: '12 Month Pass' },
];

// Shown when an organizer's pass has expired — this is the ONLY thing they can do until they renew.
export default function RenewPass() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('1_MONTH');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleRenew() {
    setSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      const { data } = await api.post('/organizer-signup/renew', { planType: selectedPlan });
      const response = await openRazorpayCheckout({
        order: data.razorpayOrder, keyId: RAZORPAY_KEY_ID,
        name: 'Auction Arena Software', description: `Renewal — ${selectedPlan.replace('_', ' ')}`,
      });
      await api.post('/organizer-signup/verify-renew-payment', response);
      setStatus({ type: 'success', message: 'Pass renewed! Redirecting to your dashboard…' });
      setTimeout(() => navigate('/organizer/dashboard'), 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || err.message || 'Renewal failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-clay/5 to-ivory p-6">
      <div className="card max-w-md w-full space-y-4 text-center">
        <h1 className="font-display text-3xl text-clay">Your Pass Has Expired</h1>
        <p className="text-black/60 text-sm">Renew now to regain full access to your auction dashboard, live auction tools, and registration links.</p>
        <div className="grid grid-cols-3 gap-3">
          {PLANS.map(p => (
            <button key={p.planType} onClick={() => setSelectedPlan(p.planType)}
              className={`border rounded-lg p-3 text-sm font-medium ${selectedPlan === p.planType ? 'border-gold bg-gold/10' : 'border-black/10'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <StatusMessage type={status.type} message={status.message} />
        <button onClick={handleRenew} disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Processing…' : 'Renew Pass'}
        </button>
      </div>
    </div>
  );
}
