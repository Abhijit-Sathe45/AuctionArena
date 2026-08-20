import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/organizer/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/organizer/players', label: 'Players', icon: '🏏' },
  { to: '/organizer/teams', label: 'Teams', icon: '👥' },
  { to: '/organizer/categories', label: 'Categories & Points', icon: '🏷️' },
  { to: '/organizer/live-auction', label: 'Live Auction', icon: '🔨' },
  { to: '/organizer/history', label: 'History & PDFs', icon: '📜' },
  { to: '/organizer/settings', label: 'Settings', icon: '⚙️' },
  { to: '/organizer/how-to-use', label: 'How to Use', icon: '📖' },
];

export default function OrganizerLayout({ children }) {
  const { organizer, logoutOrganizer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logoutOrganizer();
    navigate('/organizer/login');
  }

  const currentLink = links.find(l => l.to === location.pathname);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ivory">
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden bg-turf text-ivory px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 active:bg-white/20 text-ivory flex items-center justify-center focus:outline-none"
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
          <div>
            <p className="font-display text-xl tracking-wide leading-none">Auction Arena</p>
            <p className="text-[11px] text-ivory/70 truncate max-w-[190px]">
              {currentLink?.label || organizer?.tournamentName}
            </p>
          </div>
        </div>

        {organizer?.tournamentName && (
          <span className="text-[11px] px-2 py-0.5 bg-white/10 rounded-full text-ivory/80 font-medium truncate max-w-[110px]">
            {organizer.tournamentName}
          </span>
        )}
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop sticky & Mobile Slide-over Drawer) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-60 bg-turf text-ivory flex flex-col shrink-0 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl tracking-wide">Auction Arena</p>
            <p className="text-xs text-ivory/60 mt-1 truncate max-w-[180px]">{organizer?.tournamentName}</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-md text-ivory/70 hover:text-ivory hover:bg-white/10"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scroll-touch">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors select-none ${
                  isActive
                    ? 'bg-gold text-turf-dark font-semibold shadow-sm'
                    : 'text-ivory/90 hover:bg-white/10 active:bg-white/15'
                }`
              }
            >
              <span className="text-base">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/25 text-left flex items-center gap-2 text-ivory transition-colors"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-ivory p-3.5 sm:p-6 overflow-y-auto max-w-full">{children}</main>
    </div>
  );
}
