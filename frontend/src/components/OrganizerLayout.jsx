import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/organizer/dashboard', label: 'Dashboard' },
  { to: '/organizer/players', label: 'Players' },
  { to: '/organizer/teams', label: 'Teams' },
  { to: '/organizer/categories', label: 'Categories & Points' },
  { to: '/organizer/live-auction', label: 'Live Auction' },
  { to: '/organizer/history', label: 'History & PDFs' },
  { to: '/organizer/settings', label: 'Settings' },
];

export default function OrganizerLayout({ children }) {
  const { organizer, logoutOrganizer } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logoutOrganizer();
    navigate('/organizer/login');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-turf text-ivory flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-display text-2xl tracking-wide">Auction Arena</p>
          <p className="text-xs text-ivory/60 mt-1 truncate">{organizer?.tournamentName}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `block px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-gold text-turf-dark font-semibold' : 'hover:bg-white/10'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="m-3 px-3 py-2 text-sm rounded-md bg-white/10 hover:bg-white/20 text-left">
          Log out
        </button>
      </aside>
      <main className="flex-1 bg-ivory p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
