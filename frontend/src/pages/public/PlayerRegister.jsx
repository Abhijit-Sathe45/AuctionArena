import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import ImageUpload from '../../components/ImageUpload';
import StatusMessage from '../../components/StatusMessage';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

export default function PlayerRegister() {
  const { slug } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: '', battingStyle: 'RIGHT_HANDED', bowlingStyle: 'NA',
    playerType: 'BATSMAN', age: '', phone: '', photoUrl: null,
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
      const { data } = await api.post(`/public/${slug}/player/register`, form);
      if (data.razorpayOrder) {
        const response = await openRazorpayCheckout({
          order: data.razorpayOrder, keyId: RAZORPAY_KEY_ID,
          name: info.tournamentName, description: 'Player Registration Fee',
          prefill: { name: form.name, contact: form.phone },
        });
        await api.post(`/public/${slug}/player/verify-payment`, {
          playerId: data.playerId, ...response,
        });
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
          <h2 className="font-display text-3xl text-turf mb-2">You're In! 🏏</h2>
          <p className="text-black/70">Your registration for <strong>{info.tournamentName}</strong> is confirmed. The organizer will contact you with further auction details.</p>
        </div>
      </Center>
    );
  }

  if (!info.playerRegistrationOpen) {
    return (
      <Center>
        <StatusMessage type="info" message="Player registration is currently closed — either the organizer has paused it or all slots are full. Please contact the organizer." />
      </Center>
    );
  }

  return (
    <Center>
      <form onSubmit={handleSubmit} className="card max-w-lg w-full space-y-4">
        <div className="text-center mb-2">
          {info.logoUrl && <img src={info.logoUrl} className="w-16 h-16 mx-auto rounded-full object-cover mb-2" alt="" />}
          <h1 className="font-display text-3xl text-turf">{info.tournamentName}</h1>
          <p className="text-sm text-black/50">Player Auction Registration · {info.slotsLeft.players} slots left</p>
        </div>

        <div>
          <label className="label-text">Full Name</label>
          <input required className="input-field" value={form.name} onChange={e => update('name', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="label-text">Batting Style</label>
            <select className="input-field" value={form.battingStyle} onChange={e => update('battingStyle', e.target.value)}>
              <option value="RIGHT_HANDED">Right Handed</option>
              <option value="LEFT_HANDED">Left Handed</option>
            </select>
          </div>
          <div>
            <label className="label-text">Bowling Style</label>
            <select className="input-field" value={form.bowlingStyle} onChange={e => update('bowlingStyle', e.target.value)}>
              <option value="NA">Does not bowl</option>
              <option value="RIGHT_HANDED">Right Handed</option>
              <option value="LEFT_HANDED">Left Handed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="label-text">Player Type</label>
            <select className="input-field" value={form.playerType} onChange={e => update('playerType', e.target.value)}>
              <option value="BATSMAN">Batsman</option>
              <option value="BOWLER">Bowler</option>
              <option value="ALLROUNDER">All-rounder</option>
            </select>
          </div>
          <div>
            <label className="label-text">Age</label>
            <input required type="number" min="10" max="70" className="input-field" value={form.age} onChange={e => update('age', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label-text">Phone Number</label>
          <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} />
        </div>

        <ImageUpload label="Your Photo" onUploaded={(url) => update('photoUrl', url)} />

        {info.playerRegistrationFee > 0 && (
          <p className="text-sm text-turf font-semibold bg-gold/15 px-3 py-2 rounded-lg text-center">
            Registration Fee: Rs. {info.playerRegistrationFee}
          </p>
        )}

        <StatusMessage type={status.type} message={status.message} />

        <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-3">
          {submitting ? 'Processing…' : info.playerRegistrationFee > 0 ? `Pay Rs. ${info.playerRegistrationFee} & Register` : 'Register for Auction'}
        </button>
      </form>
    </Center>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 py-6 sm:py-10 bg-gradient-to-b from-turf/5 to-ivory">{children}</div>;
}
