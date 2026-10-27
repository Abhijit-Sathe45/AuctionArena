import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import OrganizerLayout from '../../components/OrganizerLayout';
import AuctionAnalyticsWidget from '../../components/AuctionAnalyticsWidget';
import TeamSquadPosterModal from '../../components/TeamSquadPosterModal';
import { useToast } from '../../context/ToastContext';

export default function History() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [downloadingTeamId, setDownloadingTeamId] = useState(null);
  const [downloadingHistory, setDownloadingHistory] = useState(false);
  const [downloadingPlayers, setDownloadingPlayers] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [selectedPosterTeamId, setSelectedPosterTeamId] = useState(null);

  useEffect(() => {
    api.get('/auction/history').then(({ data }) => setLogs(data));
    api.get('/organizer-admin/teams').then(({ data }) => setTeams(data));
  }, []);

  async function downloadTeamPDF(teamId, teamName) {
    if (downloadingTeamId) return;
    setDownloadingTeamId(teamId);
    showToast(`Generating ${teamName} PDF report...`, 'info');
    try {
      const res = await api.get(`/pdf/team/${teamId}`, { responseType: 'blob' });
      triggerDownload(res.data, `${teamName.replace(/\s+/g, '_')}_summary.pdf`);
      showToast(`${teamName} summary PDF downloaded!`, 'success');
    } catch (err) {
      showToast('Failed to download team summary PDF', 'error');
    } finally {
      setDownloadingTeamId(null);
    }
  }

  async function downloadHistoryPDF() {
    if (downloadingHistory) return;
    setDownloadingHistory(true);
    showToast('Generating Full Tournament History PDF report...', 'info');
    try {
      const res = await api.get('/pdf/history', { responseType: 'blob' });
      triggerDownload(res.data, 'auction_history.pdf');
      showToast('Auction History PDF downloaded!', 'success');
    } catch (err) {
      showToast('Failed to download history PDF', 'error');
    } finally {
      setDownloadingHistory(false);
    }
  }

  async function downloadRegisteredPlayersPDF() {
    if (downloadingPlayers) return;
    setDownloadingPlayers(true);
    showToast('Generating Registered Players PDF report...', 'info');
    try {
      const res = await api.get('/pdf/players', { responseType: 'blob' });
      triggerDownload(res.data, 'registered_players.pdf');
      showToast('Registered Players PDF downloaded!', 'success');
    } catch (err) {
      showToast('Failed to download registered players PDF', 'error');
    } finally {
      setDownloadingPlayers(false);
    }
  }

  function triggerDownload(blobData, filename) {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', filename);
    document.body.appendChild(link); link.click(); link.remove();
  }

  return (
    <OrganizerLayout>
      <TeamSquadPosterModal
        isOpen={posterModalOpen}
        onClose={() => setPosterModalOpen(false)}
        initialTeamId={selectedPosterTeamId}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">History & Analytics</h1>
          <p className="text-mauve-dark text-xs sm:text-sm mt-0.5">Full tournament leaderboard, economy metrics, official squad posters, and downloadable PDF summaries.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => { setSelectedPosterTeamId(null); setPosterModalOpen(true); }}
            className="text-xs sm:text-sm py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold shadow-xs flex items-center justify-center gap-2 transition active:scale-95 flex-1 sm:flex-initial"
            title="Generate high-resolution team squad posters with player photos, roles & team logos"
          >
            <span>🖼️</span>
            <span>Squad Posters</span>
          </button>
          <a
            href="/organizer/analytics"
            className="text-xs sm:text-sm py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold shadow-xs flex items-center justify-center gap-2 transition active:scale-95 flex-1 sm:flex-initial"
          >
            <span>📈</span>
            <span>Auction Analyst Studio</span>
          </a>
          <button
            className="btn-secondary text-xs sm:text-sm py-2.5 px-4 w-full sm:w-auto shrink-0 font-bold border-emerald-400 text-emerald-800 hover:bg-emerald-50 flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
            onClick={downloadRegisteredPlayersPDF}
            disabled={downloadingPlayers}
            title="Download complete directory of all registered players in PDF format"
          >
            {downloadingPlayers ? '⏳ Generating PDF...' : '📥 Registered Players (PDF)'}
          </button>
          <button
            className="btn-primary text-xs sm:text-sm py-2.5 px-5 w-full sm:w-auto shrink-0 font-bold shadow-md shadow-mint/20 flex items-center justify-center gap-2 disabled:opacity-60"
            onClick={downloadHistoryPDF}
            disabled={downloadingHistory}
          >
            {downloadingHistory ? '⏳ Generating PDF...' : '📥 Download Full History (PDF)'}
          </button>
        </div>
      </div>

      {/* Live Tournament Analytics & Leaderboard Widget */}
      <div className="mb-6">
        <AuctionAnalyticsWidget />
      </div>

      <div className="card mb-4 sm:mb-6 shadow-sm border-mauve/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="font-semibold text-sm sm:text-base text-turf">Franchise Squad Posters & PDFs</h2>
            <p className="text-mauve-dark text-xs">Generate visual posters with player photos, roles, and download official team PDFs.</p>
          </div>
          <button
            onClick={() => { setSelectedPosterTeamId(null); setPosterModalOpen(true); }}
            className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto transition"
          >
            <span>🖼️</span>
            <span>View All Posters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {teams.map(t => (
            <div
              key={t._id}
              className="p-3 rounded-xl bg-white border border-mauve/20 shadow-xs flex flex-col justify-between gap-2.5 hover:border-emerald-500/50 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-2.5">
                {t.teamLogoUrl ? (
                  <img src={t.teamLogoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-base shrink-0">🏏</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-slate-900 truncate">{t.teamName}</h3>
                  <p className="text-[11px] text-slate-500 truncate">Owner: {t.ownerName || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setSelectedPosterTeamId(t._id); setPosterModalOpen(true); }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs"
                  title="View & Download Visual Poster with player photos & roles"
                >
                  <span>🖼️</span>
                  <span>Poster</span>
                </button>
                <button
                  onClick={() => downloadTeamPDF(t._id, t.teamName)}
                  disabled={downloadingTeamId === t._id}
                  className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-2xs"
                  title="Download official squad PDF document"
                >
                  <span>{downloadingTeamId === t._id ? '⏳' : '📄'}</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>
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
