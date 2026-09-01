import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F5FF] via-[#FAF5FC] to-[#F2FCF8] text-turf flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-mauve/20 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏏</span>
            <span className="font-display text-xl sm:text-2xl tracking-wide text-turf font-bold">AUCTION ARENA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/how-to-use"
              className="text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl bg-white hover:bg-sky/20 text-turf border border-mauve/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>📖</span>
              <span>How to Use</span>
            </Link>
            <Link
              to="/organizer/login"
              className="btn-primary text-xs sm:text-sm py-2 px-5 font-bold shadow-md shadow-mint/25"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <div className="max-w-4xl w-full mx-auto text-center px-4 py-12 sm:py-20 space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mint/20 border border-mint/40 text-turf text-xs font-bold uppercase tracking-wider shadow-sm">
          <span>🏆</span>
          <span>Professional Tennis Cricket Player Auction</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl tracking-wide leading-none text-turf font-bold">
          AUCTION ARENA
        </h1>

        <p className="text-mauve-dark text-base sm:text-xl leading-relaxed max-w-2xl mx-auto font-medium">
          The complete digital platform for local cricket auctions — online registrations, real-time live bidding, AI voice commentary, countdown timers, and official PDF squad summaries.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 pt-3 max-w-md sm:max-w-none mx-auto">
          <Link to="/get-started" className="btn-primary w-full sm:w-auto text-base py-3.5 px-8 shadow-lg shadow-mint/30 hover:scale-105 transition-transform font-bold">
            Organizer: Get Started
          </Link>
          <Link to="/how-to-use" className="btn-secondary w-full sm:w-auto text-base py-3.5 px-7 flex items-center justify-center gap-2">
            <span>📺</span>
            <span>Watch How to Use</span>
          </Link>
        </div>

        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-left">
          <div className="p-4 bg-white/90 border border-mauve/25 rounded-2xl shadow-sm hover:shadow-md hover:border-mint/50 transition">
            <div className="w-10 h-10 rounded-xl bg-mint/20 text-mint-dark flex items-center justify-center text-lg mb-2 shadow-inner">
              ⚡
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-turf">Zero-Lag Bidding</h4>
            <p className="text-[11px] text-mauve-dark mt-0.5 font-medium">Instant WebSocket fast-path</p>
          </div>
          <div className="p-4 bg-white/90 border border-mauve/25 rounded-2xl shadow-sm hover:shadow-md hover:border-orchid/50 transition">
            <div className="w-10 h-10 rounded-xl bg-orchid/25 text-orchid-dark flex items-center justify-center text-lg mb-2 shadow-inner">
              🎙️
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-turf">AI Voice Commentary</h4>
            <p className="text-[11px] text-mauve-dark mt-0.5 font-medium">5 Selectable female voices</p>
          </div>
          <div className="p-4 bg-white/90 border border-mauve/25 rounded-2xl shadow-sm hover:shadow-md hover:border-rose/50 transition">
            <div className="w-10 h-10 rounded-xl bg-rose/20 text-rose flex items-center justify-center text-lg mb-2 shadow-inner">
              ⏱️
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-turf">Auto Countdown</h4>
            <p className="text-[11px] text-mauve-dark mt-0.5 font-medium">Auto-sold & unsold timers</p>
          </div>
          <div className="p-4 bg-white/90 border border-mauve/25 rounded-2xl shadow-sm hover:shadow-md hover:border-sky-dark/50 transition">
            <div className="w-10 h-10 rounded-xl bg-sky/30 text-turf flex items-center justify-center text-lg mb-2 shadow-inner">
              📜
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-turf">Squad PDF Exports</h4>
            <p className="text-[11px] text-mauve-dark mt-0.5 font-medium">One-click roster cards</p>
          </div>
        </div>

        <p className="text-xs text-mauve-dark pt-3 max-w-md mx-auto font-medium">
          Are you a player or team owner? Use the registration link shared by your tournament organizer.
        </p>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-mauve-dark border-t border-mauve/20 bg-white/50">
        Auction Arena © {new Date().getFullYear()} · All rights reserved.
      </footer>
    </div>
  );
}
