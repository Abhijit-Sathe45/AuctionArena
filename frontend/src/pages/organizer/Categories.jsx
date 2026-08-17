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
      <h1 className="font-display text-3xl text-turf mb-1">Categories & Extra Points</h1>
      <p className="text-black/50 mb-6">Set up player categories with base prices, and bonus purse sets for teams.</p>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Player Categories</h2>
          <form onSubmit={addCategory} className="flex gap-2 mb-4">
            <input required placeholder="Name (e.g. Icon)" className="input-field" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
            <input required type="number" placeholder="Base Price" className="input-field w-32" value={catForm.basePrice} onChange={e => setCatForm(f => ({ ...f, basePrice: Number(e.target.value) }))} />
            <button className="btn-secondary shrink-0">Add</button>
          </form>
          <ul className="space-y-2">
            {categories.map(c => (
              <li key={c._id} className="flex justify-between items-center text-sm border-b border-black/5 pb-2">
                <span>{c.name} — Rs. {c.basePrice}</span>
                <button onClick={() => deleteCategory(c._id)} className="text-clay text-xs hover:underline">Remove</button>
              </li>
            ))}
            {categories.length === 0 && <p className="text-black/40 text-sm">No categories yet.</p>}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Extra Point Sets</h2>
          <form onSubmit={addSet} className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input required placeholder="Set Name" className="input-field" value={setForm.name} onChange={e => setSetForm(f => ({ ...f, name: e.target.value }))} />
              <input required type="number" placeholder="Points" className="input-field w-28" value={setForm.points} onChange={e => setSetForm(f => ({ ...f, points: Number(e.target.value) }))} />
            </div>
            <button className="btn-secondary w-full">Create Set</button>
          </form>
          <ul className="space-y-1 mb-4">
            {sets.map(s => <li key={s._id} className="text-sm">{s.name} — +Rs. {s.points}</li>)}
          </ul>

          <h3 className="font-semibold text-sm mb-2 mt-4 border-t border-black/10 pt-3">Grant to a Team</h3>
          <form onSubmit={grantPoints} className="flex gap-2">
            <select required className="input-field" value={grantForm.teamId} onChange={e => setGrantForm(f => ({ ...f, teamId: e.target.value }))}>
              <option value="">Select Team</option>
              {teams.map(t => <option key={t._id} value={t._id}>{t.teamName}</option>)}
            </select>
            <select required className="input-field" value={grantForm.setId} onChange={e => setGrantForm(f => ({ ...f, setId: e.target.value }))}>
              <option value="">Select Set</option>
              {sets.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button className="btn-primary shrink-0">Grant</button>
          </form>
        </div>
      </div>

      <div className="mt-4"><StatusMessage type={status.type} message={status.message} /></div>
    </OrganizerLayout>
  );
}
