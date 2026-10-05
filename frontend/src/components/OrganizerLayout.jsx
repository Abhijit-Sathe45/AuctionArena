import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DemoSimulatorModal from './DemoSimulatorModal';

const links = [
  { to: '/organizer/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/organizer/players', label: 'Players & Squads', icon: '🏏' },
  { to: '/organizer/teams', label: 'Teams & Franchises', icon: '👥' },
  { to: '/organizer/categories', label: 'Categories & Base Prices', icon: '🏷️' },
  { to: '/organizer/live', label: 'Live Auction Desk', icon: '🔨' },
  { to: '/organizer/analytics', label: 'Auction Analyst Studio', icon: '📈' },
  { to: '/organizer/history', label: 'Bid History & PDFs', icon: '📜' },
  { to: '/organizer/settings', label: 'Settings & Rules', icon: '⚙️' },
  { to: '/organizer/how-to-use', label: 'Auction Handbook', icon: '📖' },
];

export default function OrganizerLayout({ children }) {
  const { organizer, logoutOrganizer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLiveAuction = location.pathname.startsWith('/organizer/live');
  
  // On Live Auction page, default sidebar to closed (3-line hamburger menu) for 100% full-screen arena
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logoutOrganizer();
    navigate('/organizer/login');
  }

  const currentLink = links.find(
    l => l.to === location.pathname || (l.to === '/organizer/live' && location.pathname === '/organizer/live-auction')
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Demo Tournament Simulator Modal */}
      <DemoSimulatorModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onDataChanged={() => {
          window.location.reload();
        }}
      />

      {/* Top Navigation Bar with 3-Line Hamburger Menu */}
      <header className="bg-[#0B1E3D] text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b border-slate-700">
        <div className="flex items-center gap-3">
          {/* 3-Line Structure Hamburger Button */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-2 -ml-1 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center focus:outline-none transition-colors shadow-xs"
            aria-label="Toggle navigation menu"
            title="Toggle Navigation Menu (☰)"
          >
            {sidebarOpen ? (
              <span className="text-xl leading-none font-bold w-5 h-5 flex items-center justify-center">✕</span>
            ) : (
              <div className="flex flex-col gap-1 w-5 justify-center items-center py-0.5">
                <span className="w-5 h-0.5 bg-white rounded-full transition-all"></span>
                <span className="w-5 h-0.5 bg-amber-300 rounded-full transition-all"></span>
                <span className="w-5 h-0.5 bg-white rounded-full transition-all"></span>
              </div>
            )}
          </button>

          <div className="flex items-center gap-2">
            {organizer?.logoUrl ? (
              <img
                src={organizer.logoUrl}
                alt="Tournament Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain p-0.5 bg-white border border-emerald-400/40 shadow-xs"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F5132] border border-emerald-400/40 items-center justify-center text-sm sm:text-base shadow-xs ${
                organizer?.logoUrl ? 'hidden' : 'flex'
              }`}
            >
              🏏
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-display text-sm sm:text-base tracking-wide leading-none text-white font-bold">
                  Auction Arena
                </p>
                <span className="text-[8px] sm:text-[9px] font-black uppercase bg-amber-500 text-slate-950 px-1 py-0.2 rounded-xs">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate max-w-[170px] sm:max-w-[280px] font-medium mt-0.5">
                {organizer?.tournamentName || currentLink?.label || 'Cricket Auctioneer Desk'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLiveAuction ? (
            <span className="text-[10px] sm:text-xs px-2.5 py-1 bg-red-600/30 border border-red-500/50 rounded-full text-red-300 font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>LIVE DESK</span>
            </span>
          ) : (
            organizer?.tournamentName && (
              <span className="text-[10px] sm:text-xs px-2.5 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 font-bold truncate max-w-[140px] sm:max-w-[200px]">
                🏆 {organizer.tournamentName}
              </span>
            )
          )}
        </div>
      </header>

      {/* Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar Drawer Navigation */}
      <aside
        className={`fixed top-0 left-0 z-50 w-72 sm:w-80 h-screen bg-[#0B1E3D] text-white flex flex-col justify-between shadow-2xl border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header Brand Section */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-[#061022] to-[#0B1E3D] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {organizer?.logoUrl ? (
                <img
                  src={organizer.logoUrl}
                  alt="Tournament Logo"
                  className="w-10 h-10 rounded-xl object-contain p-0.5 bg-white border border-emerald-400/40 shadow-md shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-10 h-10 rounded-xl bg-[#0F5132] border border-emerald-400/40 items-center justify-center text-xl shadow-md shrink-0 ${
                  organizer?.logoUrl ? 'hidden' : 'flex'
                }`}
              >
                🏏
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-display text-lg tracking-wide text-white font-black leading-tight truncate">
                    Auction Arena
                  </p>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-sm">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold truncate max-w-[150px] mt-0.5">
                  {organizer?.tournamentName || 'Cricket Auctioneer'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-lg"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto scroll-touch">
            {links.map((l) => {
              const isActiveRoute =
                location.pathname === l.to ||
                (l.to === '/organizer/live' && location.pathname === '/organizer/live-auction');
              const isSettings = l.to === '/organizer/settings';

              return (
                <React.Fragment key={l.to}>
                  {/* Practice & Demo Simulator placed right above Settings */}
                  {isSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDemoModal(true);
                        setSidebarOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 select-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 group shadow-xs text-left my-1 active:scale-98"
                      title="Open Practice & Demo Tournament Simulator"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                          🎮
                        </span>
                        <span className="truncate">Mock Auction Practice</span>
                      </div>
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow-2xs">
                        Demo
                      </span>
                    </button>
                  )}

                  <NavLink
                    to={l.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-150 select-none ${
                      isActiveRoute
                        ? 'bg-[#0F5132] text-white font-bold shadow-sm border border-emerald-500/40 translate-x-1'
                        : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white active:bg-white/15'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors ${
                        isActiveRoute ? 'bg-black/20 text-white' : 'bg-white/5 text-slate-300'
                      }`}
                    >
                      {l.icon}
                    </span>
                    <span className="truncate">{l.label}</span>
                  </NavLink>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Cricket Pass Info & Logout */}
        <div className="p-3.5 border-t border-slate-800 bg-[#061022] shrink-0 space-y-2">
          <div className="px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs shadow-2xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Desk Live
            </span>
            <span className="text-amber-300 font-bold">🏆 Verified</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-xs rounded-xl bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center justify-center gap-2 transition-all font-bold shadow-xs active:scale-95"
          >
            <span>🚪</span>
            <span>Exit Auctioneer Desk</span>
          </button>
        </div>
      </aside>

      {/* Main Full-Width Content Container */}
      <main className="flex-1 bg-[#F8FAFC] p-3 sm:p-5 lg:p-6 min-h-[calc(100vh-56px)] max-w-full overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
