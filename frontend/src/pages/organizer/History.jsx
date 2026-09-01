import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import OrganizerLayout from '../../components/OrganizerLayout';
import AuctionAnalyticsWidget from '../../components/AuctionAnalyticsWidget';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">History & Analytics</h1>
          <p className="text-mauve-dark text-xs sm:text-sm mt-0.5">Full tournament leaderboard, economy metrics, and downloadable PDF summaries.</p>
        </div>
        <button className="btn-primary text-xs sm:text-sm py-2.5 px-5 w-full sm:w-auto shrink-0 font-bold shadow-md shadow-mint/20" onClick={downloadHistoryPDF}>
          📥 Download Full Auction History (PDF)
        </button>
      </div>

      {/* Live Tournament Analytics & Leaderboard Widget */}
      <div className="mb-6">
        <AuctionAnalyticsWidget />
      </div>

      <div className="card mb-4 sm:mb-6 shadow-sm border-mauve/20">
        <h2 className="font-semibold text-sm sm:text-base mb-3 text-turf">Per-Team Summary PDFs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {teams.map(t => (
            <button key={t._id} onClick={() => downloadTeamPDF(t._id, t.teamName)} className="btn-secondary text-xs sm:text-sm py-2.5 px-3 flex items-center justify-between hover:border-mint/50">
              <span className="truncate">{t.teamName}</span>
              <span className="shrink-0 text-xs opacity-80">📄 PDF</span>
            </button>
          ))}
          {teams.length === 0 && (
            <p className="text-mauve text-xs sm:text-sm col-span-full">No registered teams yet.</p>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto scroll-touch shadow-sm border-mauve/20">
        <h2 className="font-semibold text-sm sm:text-base mb-3 text-turf">Auction Log</h2>
        <table className="w-full text-xs sm:text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-mauve-dark border-b border-mauve/20">
              <th className="py-2.5 pr-3">Player</th>
              <th className="py-2.5 pr-3">Result</th>
              <th className="py-2.5 pr-3">Team</th>
              <th className="py-2.5 pr-3">Price</th>
              <th className="py-2.5 pr-3">Round</th>
              <th className="py-2.5 pr-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} className="border-b border-black/5">
                <td className="py-2 pr-3 font-medium text-turf">{l.player?.name}</td>
                <td className="py-2 pr-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${l.result === 'SOLD' ? 'bg-mint/20 text-mint-dark border border-mint/40' : 'bg-rose/20 text-rose border border-rose/40'}`}>{l.result}</span>
                </td>
                <td className="py-2 pr-3">{l.finalTeam?.teamName || '—'}</td>
                <td className="py-2 pr-3 font-bold text-mint-dark">{l.finalPrice ? `Rs. ${l.finalPrice.toLocaleString('en-IN')}` : '—'}</td>
                <td className="py-2 pr-3">Round {l.round}</td>
                <td className="py-2 pr-3 text-mauve-dark text-xs">{new Date(l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-mauve text-sm py-6 text-center">No auction activity yet.</p>}
      </div>
    </OrganizerLayout>
  );
}
