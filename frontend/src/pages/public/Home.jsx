import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-turf to-turf-dark text-ivory flex items-center justify-center p-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="font-display text-6xl tracking-wide">AUCTION ARENA</h1>
        <p className="text-ivory/70 text-lg">
          The complete platform to run your local tennis-ball cricket player auction — registrations, live bidding, purse tracking, and PDF summaries, all in one place.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link to="/get-started" className="btn-primary">Organizer: Get Started</Link>
          <Link to="/organizer/login" className="btn-secondary">Organizer Login</Link>
        </div>
        <p className="text-xs text-ivory/40 pt-6">Are you a player or team owner? Use the registration link shared by your tournament organizer.</p>
      </div>
    </div>
  );
}
