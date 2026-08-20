import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-turf via-turf-dark to-slate-950 text-ivory flex flex-col justify-between">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏏</span>
          <span className="font-display text-xl sm:text-2xl tracking-wide">AUCTION ARENA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/how-to-use"
            className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
          >
            <span>📖</span>
            <span>How to Use</span>
          </Link>
          <Link
            to="/organizer/login"
            className="text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-gold hover:bg-gold-dark text-slate-950 transition-colors"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero Body */}
      <div className="max-w-3xl w-full mx-auto text-center px-4 py-12 sm:py-16 space-y-5 sm:space-y-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
          <span>🏆</span>
          <span>Professional Tennis Cricket Player Auction</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl tracking-wide leading-none">
          AUCTION ARENA
        </h1>

        <p className="text-ivory/80 text-base sm:text-xl leading-relaxed max-w-2xl mx-auto font-light">
          The complete digital platform for local cricket auctions — online registrations, real-time live bidding, AI voice commentary, countdown timers, and official PDF squad summaries.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 pt-4 max-w-md sm:max-w-none mx-auto">
          <Link to="/get-started" className="btn-primary w-full sm:w-auto text-base py-3 px-6 shadow-lg shadow-gold/20">
            Organizer: Get Started
          </Link>
          <Link to="/how-to-use" className="btn-secondary w-full sm:w-auto text-base py-3 px-6 border-white/20 hover:border-white/40 flex items-center justify-center gap-2">
            <span>📺</span>
            <span>Watch How to Use</span>
          </Link>
        </div>

        <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-xl block mb-1">⚡</span>
            <h4 className="font-bold text-xs text-ivory">Zero-Lag Bidding</h4>
            <p className="text-[11px] text-ivory/60">Instant WebSocket fast-path</p>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-xl block mb-1">🎙️</span>
            <h4 className="font-bold text-xs text-ivory">AI Voice Commentary</h4>
            <p className="text-[11px] text-ivory/60">5 Selectable female voices</p>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-xl block mb-1">⏱️</span>
            <h4 className="font-bold text-xs text-ivory">Auto Countdown</h4>
            <p className="text-[11px] text-ivory/60">Auto-sold & unsold timers</p>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-xl block mb-1">📜</span>
            <h4 className="font-bold text-xs text-ivory">Squad PDF Exports</h4>
            <p className="text-[11px] text-ivory/60">One-click roster cards</p>
          </div>
        </div>

        <p className="text-xs text-ivory/50 pt-4 max-w-md mx-auto">
          Are you a player or team owner? Use the registration link shared by your tournament organizer.
        </p>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-ivory/40 border-t border-white/5">
        Auction Arena © {new Date().getFullYear()} · All rights reserved.
      </footer>
    </div>
  );
}
