import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import ImageUpload from '../../components/ImageUpload';
import StatusMessage from '../../components/StatusMessage';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

export default function TeamRegister() {
  const { slug } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    ownerName: '', teamName: '', ownerPlaysMatch: false,
    phone: '', ownerPhotoUrl: null, teamLogoUrl: null,
  });

  useEffect(() => {
    api.get(`/public/${slug}/info`).then(({ data }) => setInfo(data))
      .catch(() => setStatus({ type: 'error', message: 'Tournament not found.' }))
      .finally(() => setLoading(false));
  }, [slug]);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setSubmitting(true);
    try {
      const { data } = await api.post(`/public/${slug}/team/register`, form);
      if (data.razorpayOrder) {
        const response = await openRazorpayCheckout({
          order: data.razorpayOrder, keyId: RAZORPAY_KEY_ID,
          name: info.tournamentName, description: 'Team Registration Fee',
          prefill: { name: form.ownerName, contact: form.phone },
        });
        await api.post(`/public/${slug}/team/verify-payment`, { teamId: data.teamId, ...response });
      }
      setDone(true);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || err.message || 'Registration failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Center><p>Loading tournament details…</p></Center>;
  if (!info) return <Center><StatusMessage type="error" message={status.message || 'Tournament not found.'} /></Center>;

  if (done) {
    return (
      <Center>
        <div className="card max-w-md text-center">
          <h2 className="font-display text-3xl text-turf mb-2">Team Registered! 🏆</h2>
          <p className="text-black/70">Your team <strong>{form.teamName}</strong> is registered for <strong>{info.tournamentName}</strong>. Get ready for auction day!</p>
        </div>
      </Center>
    );
  }

  if (!info.teamRegistrationOpen) {
    return (
      <Center>
        <StatusMessage type="info" message="Team registration is currently closed — either the organizer has paused it or all team slots are full. Please contact the organizer." />
      </Center>
    );
  }

  return (
    <Center>
      <form onSubmit={handleSubmit} className="card max-w-lg w-full space-y-4">
        <div className="text-center mb-2">
          {info.logoUrl && <img src={info.logoUrl} className="w-16 h-16 mx-auto rounded-full object-cover mb-2" alt="" />}
          <h1 className="font-display text-3xl text-turf">{info.tournamentName}</h1>
          <p className="text-sm text-black/50">Team Owner Registration · {info.slotsLeft.teams} slots left</p>
        </div>

        <div>
          <label className="label-text">Team Owner Name</label>
          <input required className="input-field" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
        </div>

        <div>
          <label className="label-text">Team Name</label>
          <input required className="input-field" value={form.teamName} onChange={e => update('teamName', e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="plays" checked={form.ownerPlaysMatch} onChange={e => update('ownerPlaysMatch', e.target.checked)} />
          <label htmlFor="plays" className="text-sm">I will also play as a player in matches</label>
        </div>

        <div>
          <label className="label-text">Phone Number</label>
          <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} />
        </div>

        <ImageUpload label="Your Photo" onUploaded={(url) => update('ownerPhotoUrl', url)} />
        <ImageUpload label="Team Logo" onUploaded={(url) => update('teamLogoUrl', url)} />

        {info.teamRegistrationFee > 0 && (
          <p className="text-sm text-turf font-medium">Registration Fee: Rs. {info.teamRegistrationFee}</p>
        )}

        <StatusMessage type={status.type} message={status.message} />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Processing…' : info.teamRegistrationFee > 0 ? `Pay Rs. ${info.teamRegistrationFee} & Register` : 'Register Team'}
        </button>
      </form>
    </Center>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-turf/5 to-ivory">{children}</div>;
}
