import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import OrganizerLayout from '../../components/OrganizerLayout';
import StatusMessage from '../../components/StatusMessage';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [sets, setSets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [catForm, setCatForm] = useState({ name: '', basePrice: '', order: 0 });
  const [setForm, setSetForm] = useState({ name: '', points: '', description: '' });
  const [grantForm, setGrantForm] = useState({ teamId: '', setId: '' });

  async function load() {
    const [{ data: c }, { data: s }, { data: t }] = await Promise.all([
      api.get('/organizer-admin/categories'), api.get('/organizer-admin/extra-point-sets'), api.get('/organizer-admin/teams'),
    ]);
    setCategories(c); setSets(s); setTeams(t);
  }
  useEffect(() => { load(); }, []);

  async function addCategory(e) {
    e.preventDefault();
    await api.post('/organizer-admin/categories', catForm);
    setCatForm({ name: '', basePrice: '', order: 0 });
    load();
  }
  async function deleteCategory(id) {
    await api.delete(`/organizer-admin/categories/${id}`);
    load();
  }
  async function addSet(e) {
    e.preventDefault();
    await api.post('/organizer-admin/extra-point-sets', setForm);
    setSetForm({ name: '', points: '', description: '' });
    load();
  }
  async function grantPoints(e) {
    e.preventDefault();
    try {
      await api.post('/organizer-admin/extra-point-sets/grant', grantForm);
      setStatus({ type: 'success', message: 'Extra points granted!' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to grant points' });
    }
  }

  return (
    <OrganizerLayout>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🏷️</span>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Cricket Categories & Bonus Purse Sets
        </h1>
      </div>
      <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6 font-medium">
        Set up player roles & base prices (e.g. Icon Batsman, Super Pacer, All-Rounder) and grant bonus purse points to franchises.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="card shadow-xs border-slate-200">
          <h2 className="font-bold text-sm sm:text-base mb-3 text-slate-900 flex items-center gap-2">
            <span>🏏</span> Player Roles & Base Prices
          </h2>
          <form onSubmit={addCategory} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input required placeholder="Category (e.g. Icon Player / Top Batter)" className="input-field flex-1 text-xs sm:text-sm" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-xs">₹</span>
              <input required type="number" placeholder="Base Price" className="input-field w-full sm:w-32 font-mono font-semibold text-xs sm:text-sm" value={catForm.basePrice} onChange={e => setCatForm(f => ({ ...f, basePrice: Number(e.target.value) }))} />
            </div>
            <button className="btn-primary shrink-0 py-2 sm:py-2.5 font-bold shadow-xs">Add</button>
          </form>
          <ul className="space-y-2">
            {categories.map(c => (
              <li key={c._id} className="flex justify-between items-center text-xs sm:text-sm border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800">
                  🏏 {c.name} — <span className="text-[#0F5132] font-mono">₹{c.basePrice.toLocaleString('en-IN')}</span>
                </span>
                <button onClick={() => deleteCategory(c._id)} className="text-red-600 hover:text-red-800 text-xs hover:underline py-1 px-2 font-semibold">Remove</button>
              </li>
            ))}
            {categories.length === 0 && <p className="text-slate-400 text-sm py-2">No categories created yet.</p>}
          </ul>
        </div>

        <div className="card shadow-xs border-slate-200">
          <h2 className="font-bold text-sm sm:text-base mb-3 text-slate-900 flex items-center gap-2">
            <span>💰</span> Bonus Purse Top-Up Sets
          </h2>
          <form onSubmit={addSet} className="space-y-2 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input required placeholder="Bonus Name (e.g. Early Bird Bonus)" className="input-field flex-1 text-xs sm:text-sm" value={setForm.name} onChange={e => setSetForm(f => ({ ...f, name: e.target.value }))} />
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">₹</span>
                <input required type="number" placeholder="Purse Bonus" className="input-field w-full sm:w-28 font-mono font-semibold text-xs sm:text-sm" value={setForm.points} onChange={e => setSetForm(f => ({ ...f, points: Number(e.target.value) }))} />
              </div>
            </div>
            <button className="btn-secondary w-full py-2 sm:py-2.5 font-bold">Create Bonus Set</button>
          </form>
          <ul className="space-y-1.5 mb-4">
            {sets.map(s => <li key={s._id} className="text-xs sm:text-sm text-slate-800 font-medium">✨ {s.name} — <span className="text-[#0F5132] font-bold font-mono">+₹{s.points.toLocaleString('en-IN')}</span></li>)}
            {sets.length === 0 && <p className="text-slate-400 text-xs py-1">No extra purse sets created.</p>}
          </ul>

          <h3 className="font-bold text-xs sm:text-sm mb-2 mt-4 border-t border-slate-200 pt-3 text-slate-900">
            Grant Bonus Purse to a Franchise
          </h3>
          <form onSubmit={grantPoints} className="flex flex-col sm:flex-row gap-2">
            <select required className="input-field flex-1 text-xs sm:text-sm" value={grantForm.teamId} onChange={e => setGrantForm(f => ({ ...f, teamId: e.target.value }))}>
              <option value="">Select Franchise</option>
              {teams.map(t => <option key={t._id} value={t._id}>{t.teamName}</option>)}
            </select>
            <select required className="input-field flex-1 text-xs sm:text-sm" value={grantForm.setId} onChange={e => setGrantForm(f => ({ ...f, setId: e.target.value }))}>
              <option value="">Select Bonus Set</option>
              {sets.map(s => <option key={s._id} value={s._id}>{s.name} (+₹{s.points?.toLocaleString('en-IN')})</option>)}
            </select>
            <button className="btn-primary shrink-0 py-2 sm:py-2.5 font-bold shadow-xs">Grant</button>
          </form>
        </div>
      </div>

      <div className="mt-4"><StatusMessage type={status.type} message={status.message} /></div>
    </OrganizerLayout>
  );
}
