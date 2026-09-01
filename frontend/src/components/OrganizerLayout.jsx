import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DemoSimulatorModal from './DemoSimulatorModal';

const links = [
  { to: '/organizer/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/organizer/players', label: 'Players', icon: '🏏' },
  { to: '/organizer/teams', label: 'Teams', icon: '👥' },
  { to: '/organizer/categories', label: 'Categories & Points', icon: '🏷️' },
  { to: '/organizer/live', label: 'Live Auction', icon: '🔨' },
  { to: '/organizer/history', label: 'History & PDFs', icon: '📜' },
  { to: '/organizer/settings', label: 'Settings', icon: '⚙️' },
  { to: '/organizer/how-to-use', label: 'How to Use', icon: '📖' },
];

export default function OrganizerLayout({ children }) {
  const { organizer, logoutOrganizer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logoutOrganizer();
    navigate('/organizer/login');
  }

  const currentLink = links.find(l => l.to === location.pathname || (l.to === '/organizer/live' && location.pathname === '/organizer/live-auction'));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7FAFE]">
      {/* Demo Tournament Simulator Modal */}
      <DemoSimulatorModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onDataChanged={() => {
          // If on a page that needs reload, dispatch event or reload
          window.location.reload();
        }}
      />

      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden bg-gradient-to-r from-white via-[#F4F8FF] to-white text-turf px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs border-b border-sky/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-2 -ml-2 rounded-xl hover:bg-sky/25 active:bg-sky/35 text-turf flex items-center justify-center focus:outline-none transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <span className="text-2xl leading-none">✕</span>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-mint to-sky flex items-center justify-center text-sm shadow-xs border border-white">
              🏆
            </div>
            <div>
              <p className="font-display text-lg tracking-wide leading-none text-turf font-bold">Auction Arena</p>
              <p className="text-[11px] text-mauve-dark truncate max-w-[160px] font-semibold mt-0.5">
                {currentLink?.label || organizer?.tournamentName}
              </p>
            </div>
          </div>
        </div>

        {organizer?.tournamentName && (
          <span className="text-[11px] px-2.5 py-1 bg-orchid/15 border border-orchid/35 rounded-full text-orchid-dark font-extrabold truncate max-w-[130px] shadow-2xs">
            {organizer.tournamentName}
          </span>
        )}
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Fixed & Locked with matching custom 5-color palette) */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 md:w-60 h-screen bg-gradient-to-b from-[#FFFFFF] via-[#F4F8FF] to-[#FAF4FA] text-turf flex flex-col justify-between shrink-0 shadow-lg md:shadow-md border-r border-sky/50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header Brand Section */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-sky/35 via-white to-orchid/20 border-b border-sky/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mint to-sky flex items-center justify-center text-lg shadow-sm border border-white shrink-0">
                🏆
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl tracking-wide text-turf font-bold leading-tight truncate">
                  Auction Arena
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse shrink-0" />
                  <p className="text-[11px] text-orchid-dark font-extrabold truncate max-w-[140px]">
                    {organizer?.tournamentName || 'Organizer Panel'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-xl text-mauve-dark hover:text-turf hover:bg-sky/25 transition-colors"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
            {links.map((l) => {
              const isActiveRoute = location.pathname === l.to || (l.to === '/organizer/live' && location.pathname === '/organizer/live-auction');
              const isSettings = l.to === '/organizer/settings';

              return (
                <React.Fragment key={l.to}>
                  {/* Practice & Demo Simulator inserted RIGHT OVER Settings Tab */}
                  {isSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDemoModal(true);
                        setMobileOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 select-none bg-gradient-to-r from-orchid/15 via-sky/15 to-mint/15 hover:from-orchid/25 hover:to-mint/25 text-turf border border-orchid/30 font-bold group shadow-2xs text-left my-0.5 active:scale-98"
                      title="Open Practice & Demo Tournament Simulator"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                          🎮
                        </span>
                        <span className="truncate">Practice Demo</span>
                      </div>
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-mint text-turf-dark shadow-xs">
                        Mock
                      </span>
                    </button>
                  )}

                  <NavLink
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 select-none ${
                      isActiveRoute
                        ? 'bg-gradient-to-r from-mint to-mint-dark text-turf-dark font-black shadow-sm shadow-mint/30 border border-mint-dark/25 translate-x-0.5'
                        : 'text-turf/85 font-semibold hover:bg-sky/25 hover:text-turf active:bg-sky/35 border border-transparent hover:border-sky/40'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-base transition-colors ${
                      isActiveRoute ? 'bg-white/60 text-turf-dark' : 'bg-white/40'
                    }`}>
                      {l.icon}
                    </span>
                    <span className="truncate">{l.label}</span>
                  </NavLink>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Tournament Info & Logout */}
        <div className="p-3.5 border-t border-sky/40 bg-gradient-to-t from-orchid/15 via-white/80 to-transparent shrink-0 space-y-2">
          <div className="px-2.5 py-1.5 bg-white/90 border border-sky/40 rounded-xl flex items-center justify-between text-[11px] shadow-2xs">
            <span className="text-mauve-dark font-bold">Status:</span>
            <span className="text-mint-dark font-extrabold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-mint" />
              Active Pass
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-rose/10 hover:bg-rose/20 active:bg-rose/25 text-rose border border-rose/30 flex items-center justify-center gap-2 transition-all font-bold shadow-xs active:scale-95"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <main className="flex-1 md:ml-60 bg-[#F7FAFE] p-3.5 sm:p-6 min-h-screen max-w-full overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
