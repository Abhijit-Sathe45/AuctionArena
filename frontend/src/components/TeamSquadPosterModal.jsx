import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function TeamSquadPosterModal({ isOpen, onClose, initialTeamId = null }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tournament: {}, teams: [] });
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const posterRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    loadSquadData();
  }, [isOpen]);

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamId(initialTeamId);
    }
  }, [initialTeamId]);

  async function loadSquadData() {
    setLoading(true);
    try {
      const res = await api.get('/organizer-admin/squad-posters');
      setData(res.data);
      if (res.data.teams?.length > 0) {
        if (!selectedTeamId || !res.data.teams.some(t => t._id === selectedTeamId)) {
          setSelectedTeamId(res.data.teams[0]._id);
        }
      }
    } catch (err) {
      showToast('Failed to load team squad details', 'error');
    } finally {
      setLoading(false);
    }
  }

  const selectedTeam = data.teams.find(t => t._id === selectedTeamId) || data.teams[0];

  function getFullImageUrl(url) {
    if (!url) return null;
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
      const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
      return rawApiUrl ? `${rawApiUrl}${url}` : url;
    }
    return url;
  }

  function formatPrice(val) {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  }

  function getRoleInfo(role) {
    const r = (role || '').toUpperCase();
    if (r === 'BATSMAN') {
      return { label: 'BATSMAN', icon: '🏏', color: 'bg-blue-600/90 text-blue-100 border-blue-400/40', accent: '#3b82f6' };
    }
    if (r === 'BOWLER') {
      return { label: 'BOWLER', icon: '⚡', color: 'bg-emerald-600/90 text-emerald-100 border-emerald-400/40', accent: '#10b981' };
    }
    if (r === 'ALLROUNDER' || r === 'ALL_ROUNDER') {
      return { label: 'ALL-ROUNDER', icon: '🌟', color: 'bg-amber-600/90 text-amber-100 border-amber-400/40', accent: '#f59e0b' };
    }
    if (r === 'WICKET_KEEPER') {
      return { label: 'WICKETKEEPER', icon: '🧤', color: 'bg-purple-600/90 text-purple-100 border-purple-400/40', accent: '#a855f7' };
    }
    return { label: role || 'CRICKETER', icon: '🏏', color: 'bg-slate-700 text-slate-200 border-slate-500/40', accent: '#64748b' };
  }

  // Download high-resolution PNG poster using html2canvas
  async function downloadPosterPNG() {
    if (!posterRef.current || !selectedTeam) return;
    setIsExportingPng(true);
    showToast('Rendering high-resolution squad poster...', 'info');

    try {
      // Wait for fonts & layout stabilization
      if (document.fonts) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(posterRef.current, {
        scale: 2.2, // Crisp 2x retina output suitable for printing and WhatsApp
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#070f1e',
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure cloned DOM element has appropriate visibility and dimensions
          const target = clonedDoc.getElementById('team-poster-capture-card');
          if (target) {
            target.style.transform = 'none';
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cleanTeamName = (selectedTeam.teamName || 'team').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u0900-\u097F-]/g, '');
      link.download = `${cleanTeamName}_Official_Squad_Poster.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();

      showToast(`Poster for ${selectedTeam.teamName} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Poster export error:', err);
      showToast('Failed to export poster image. Try again.', 'error');
    } finally {
      setIsExportingPng(false);
    }
  }

  // Download Official Team Player PDF
  async function downloadTeamPDF() {
    if (!selectedTeam) return;
    setIsDownloadingPdf(true);
    showToast(`Generating ${selectedTeam.teamName} PDF report...`, 'info');
    try {
      const res = await api.get(`/pdf/team/${selectedTeam._id}`, { responseType: 'blob' });
      const cleanTeamName = (selectedTeam.teamName || 'team').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u0900-\u097F-]/g, '');
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanTeamName}_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      showToast(`${selectedTeam.teamName} squad PDF downloaded!`, 'success');
    } catch (err) {
      showToast('Failed to download team summary PDF', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  if (!isOpen) return null;

  const players = selectedTeam?.players || [];
  const totalSpent = players.reduce((s, p) => s + (p.soldPrice || 0), 0);
  const battersCount = players.filter(p => (p.playerType || '').toUpperCase() === 'BATSMAN').length;
  const bowlersCount = players.filter(p => (p.playerType || '').toUpperCase() === 'BOWLER').length;
  const allRoundersCount = players.filter(p => ['ALLROUNDER', 'ALL_ROUNDER'].includes((p.playerType || '').toUpperCase())).length;
  const keepersCount = players.filter(p => (p.playerType || '').toUpperCase() === 'WICKET_KEEPER').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Official Team Squad Poster & Downloads
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-resolution announcement posters with player photos, roles & official PDF squad roster.
            </p>
          </div>

          {/* Action Buttons: Download Poster (PNG) & Download PDF */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadPosterPNG}
              disabled={isExportingPng || loading || !selectedTeam}
              className="flex-1 sm:flex-initial btn-primary bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="Download high-resolution image poster (PNG) for WhatsApp, Instagram, or Print"
            >
              <span>{isExportingPng ? '⏳' : '📥'}</span>
              <span>{isExportingPng ? 'Exporting HD Poster...' : 'Download Poster (PNG)'}</span>
            </button>

            <button
              onClick={downloadTeamPDF}
              disabled={isDownloadingPdf || loading || !selectedTeam}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="Download official tabular player PDF document"
            >
              <span>{isDownloadingPdf ? '⏳' : '📄'}</span>
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Squad (PDF)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Team Selector Tabs */}
        {data.teams?.length > 1 && (
          <div className="flex items-center gap-2 p-2.5 px-4 bg-slate-950 border-b border-slate-800/80 overflow-x-auto scroll-touch shrink-0">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap mr-1">Select Franchise:</span>
            {data.teams.map(t => {
              const isSelected = t._id === selectedTeamId;
              const logo = getFullImageUrl(t.teamLogoUrl);
              return (
                <button
                  key={t._id}
                  onClick={() => setSelectedTeamId(t._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {logo ? (
                    <img src={logo} alt="" className="w-4 h-4 rounded-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span>🏏</span>
                  )}
                  <span>{t.teamName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {t.players?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Poster Preview Area (Scrollable container, capturing target inside) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950 flex justify-center items-start">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-sm">Loading team squad details & photos...</p>
            </div>
          ) : !selectedTeam ? (
            <div className="py-20 text-center text-slate-400">
              <p className="text-lg">No teams found in this tournament.</p>
            </div>
          ) : (
            /* =========================================================================
               THE CAPTURED POSTER CANVAS
               Styled like a grand, high-impact IPL / Cricket franchise announcement card
               ========================================================================= */
            <div
              ref={posterRef}
              id="team-poster-capture-card"
              className="w-full max-w-4xl bg-gradient-to-b from-[#09152a] via-[#0b1c36] to-[#060e1c] text-white rounded-3xl p-5 sm:p-8 border-2 border-amber-500/30 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
              style={{
                fontFamily: "'Poppins', sans-serif",
                backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.15), transparent 60%)',
              }}
            >
              {/* Subtle Stadium Light Beam Accents */}
              <div className="absolute -top-32 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* POSTER TOP BANNER: Tournament Identity */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  {data.tournament?.logoUrl ? (
                    <img
                      src={getFullImageUrl(data.tournament.logoUrl)}
                      alt="Tournament Logo"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-400/60 shadow-lg shadow-amber-500/20 bg-slate-900"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 border-2 border-amber-300">
                      🏆
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] sm:text-xs uppercase tracking-widest font-extrabold text-amber-400/90 block">
                      OFFICIAL SQUAD ANNOUNCEMENT • 2026
                    </span>
                    <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                      {data.tournament?.tournamentName || 'CRICKET TOURNAMENT'}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 tracking-wider uppercase">
                    🏏 Gavel Closed
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* TEAM HERO BANNER: Team Logo, Team Name & Franchise Details */}
              <div className="relative z-10 my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                  {selectedTeam.teamLogoUrl ? (
                    <div className="relative">
                      <img
                        src={getFullImageUrl(selectedTeam.teamLogoUrl)}
                        alt={selectedTeam.teamName}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] bg-slate-900"
                        crossOrigin="anonymous"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20">
                        OFFICIAL
                      </span>
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 border-4 border-amber-400/70 flex items-center justify-center text-4xl shadow-xl">
                      🏏
                    </div>
                  )}

                  <div>
                    <span className="text-xs uppercase tracking-widest font-bold text-amber-400">
                      FRANCHISE TEAM
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-300 tracking-tight">
                      {selectedTeam.teamName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 flex-wrap justify-center md:justify-start">
                      <span>Owner: <strong className="text-white">{selectedTeam.ownerName || '—'}</strong></span>
                      {selectedTeam.phone && <span>• Phone: <strong className="text-slate-200">{selectedTeam.phone}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* Team Financial & Squad Metrics */}
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0 text-center">
                  <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-2.5 px-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Squad Size</span>
                    <span className="text-lg sm:text-xl font-black text-amber-300">{players.length}</span>
                    <span className="text-[10px] text-slate-400 block">Players</span>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-2.5 px-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purse Spent</span>
                    <span className="text-sm sm:text-base font-black text-emerald-400">{formatPrice(totalSpent)}</span>
                    <span className="text-[10px] text-slate-400 block">Invested</span>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-700/80 rounded-xl p-2.5 px-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purse Left</span>
                    <span className="text-sm sm:text-base font-black text-slate-200">{formatPrice(selectedTeam.purseRemaining)}</span>
                    <span className="text-[10px] text-slate-400 block">Balance</span>
                  </div>
                </div>
              </div>

              {/* Role Composition Pills Bar */}
              <div className="relative z-10 flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800 mb-6 flex-wrap text-xs">
                <span className="text-slate-400 font-semibold text-[11px]">Squad Composition:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-400/30 text-blue-300 font-bold text-[11px]">
                    🏏 {battersCount} Batters
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold text-[11px]">
                    ⚡ {bowlersCount} Bowlers
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 font-bold text-[11px]">
                    🌟 {allRoundersCount} All-Rounders
                  </span>
                  {keepersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-400/30 text-purple-300 font-bold text-[11px]">
                      🧤 {keepersCount} Keepers
                    </span>
                  )}
                </div>
              </div>

              {/* SQUAD PLAYERS GRID */}
              <div className="relative z-10">
                {players.length === 0 ? (
                  <div className="py-14 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-700">
                    <p className="text-4xl mb-2">🏏</p>
                    <p className="text-base font-bold text-slate-300">No players purchased yet by this franchise</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Once players are sold to {selectedTeam.teamName} in the live auction gavel, their player cards and photos will appear on this official squad poster.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {players.map((p, idx) => {
                      const role = getRoleInfo(p.playerType);
                      const photo = getFullImageUrl(p.photoUrl);
                      return (
                        <div
                          key={p._id || idx}
                          className="group relative bg-gradient-to-b from-slate-800/90 via-slate-850 to-slate-900 rounded-2xl p-3 border border-slate-700/80 hover:border-amber-400/50 transition-all duration-200 flex flex-col items-center text-center shadow-lg hover:shadow-amber-500/10"
                        >
                          {/* Jersey Number Tag */}
                          <div className="absolute top-2.5 left-2.5 text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md bg-slate-950/80 text-amber-300 border border-slate-700/60 shadow-xs">
                            {p.jerseyNumber ? `#${p.jerseyNumber}` : `#${idx + 1}`}
                          </div>

                          {/* Category Badge */}
                          <div className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900/90 text-slate-400 border border-slate-800 uppercase">
                            {p.categoryName || 'Cricketer'}
                          </div>

                          {/* Player Photo with Role-colored Ring */}
                          <div className="relative my-2 mt-4">
                            {photo ? (
                              <img
                                src={photo}
                                alt={p.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 shadow-md bg-slate-950"
                                style={{ borderColor: role.accent }}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  // Fallback to avatar emoji on image error
                                  e.target.style.display = 'none';
                                  const fallback = e.target.parentElement.querySelector('.player-photo-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="player-photo-fallback w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 items-center justify-center text-3xl shadow-inner"
                              style={{
                                borderColor: role.accent,
                                display: photo ? 'none' : 'flex'
                              }}
                            >
                              {role.icon}
                            </div>
                          </div>

                          {/* Player Role Badge */}
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-xs tracking-wider flex items-center gap-1 ${role.color}`}>
                            <span>{role.icon}</span>
                            <span>{role.label}</span>
                          </span>

                          {/* Player Name (Preserves Marathi & English cleanly) */}
                          <h3
                            className="text-xs sm:text-sm font-bold text-white mt-1.5 line-clamp-1 w-full tracking-tight"
                            title={p.name}
                          >
                            {p.name}
                          </h3>

                          {/* Sold Price Tag */}
                          <div className="mt-2 w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400 font-medium">Acquired</span>
                            <span className="font-extrabold text-amber-300 font-mono">
                              {formatPrice(p.soldPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* POSTER FOOTER */}
              <div className="relative z-10 mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">⚡</span>
                  <span className="font-semibold text-slate-300">
                    Official Franchise Squad Poster • {data.tournament?.tournamentName || 'Tournament'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>Total Purchases: <strong className="text-white">{players.length} Cricketers</strong></span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">Powered by AuctionArena</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Tip: Tap <strong>Download Poster (PNG)</strong> to share on WhatsApp status or print for your team gallery.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
