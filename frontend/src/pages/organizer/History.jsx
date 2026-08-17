import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import OrganizerLayout from '../../components/OrganizerLayout';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    api.get('/auction/history').then(({ data }) => setLogs(data));
    api.get('/organizer-admin/teams').then(({ data }) => setTeams(data));
  }, []);

  async function downloadTeamPDF(teamId, teamName) {
    const res = await api.get(`/pdf/team/${teamId}`, { responseType: 'blob' });
    triggerDownload(res.data, `${teamName.replace(/\s+/g, '_')}_summary.pdf`);
  }
  async function downloadHistoryPDF() {
    const res = await api.get('/pdf/history', { responseType: 'blob' });
    triggerDownload(res.data, 'auction_history.pdf');
  }
  function triggerDownload(blobData, filename) {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', filename);
    document.body.appendChild(link); link.click(); link.remove();
  }

  return (
    <OrganizerLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl text-turf">History & Downloads</h1>
          <p className="text-black/50">Full auction log and downloadable PDF summaries.</p>
        </div>
        <button className="btn-primary" onClick={downloadHistoryPDF}>Download Full Auction History (PDF)</button>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Per-Team Summary PDFs</h2>
        <div className="grid grid-cols-3 gap-3">
          {teams.map(t => (
            <button key={t._id} onClick={() => downloadTeamPDF(t._id, t.teamName)} className="btn-secondary text-sm">
              {t.teamName} — Download PDF
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-3">Auction Log</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-3">Player</th>
              <th className="py-2 pr-3">Result</th>
              <th className="py-2 pr-3">Team</th>
              <th className="py-2 pr-3">Price</th>
              <th className="py-2 pr-3">Round</th>
              <th className="py-2 pr-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} className="border-b border-black/5">
                <td className="py-2 pr-3">{l.player?.name}</td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.result === 'SOLD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.result}</span>
                </td>
                <td className="py-2 pr-3">{l.finalTeam?.teamName || '—'}</td>
                <td className="py-2 pr-3">{l.finalPrice ? `Rs. ${l.finalPrice.toLocaleString('en-IN')}` : '—'}</td>
                <td className="py-2 pr-3">{l.round}</td>
                <td className="py-2 pr-3">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-black/40 text-sm py-6 text-center">No auction activity yet.</p>}
      </div>
    </OrganizerLayout>
  );
}
