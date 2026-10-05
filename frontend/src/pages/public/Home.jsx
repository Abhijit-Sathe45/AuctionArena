import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-[#0B1E3D] border-b border-slate-700 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏏</span>
            <span className="font-display text-xl sm:text-2xl tracking-wider text-white font-black">AUCTION ARENA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/how-to-use"
              className="text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>📖</span>
              <span>How to Use</span>
            </Link>
            <Link
              to="/organizer/login"
              className="btn-primary text-xs sm:text-sm py-2 px-5 font-bold shadow-md shadow-emerald-950"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <div className="max-w-4xl w-full mx-auto text-center px-4 py-12 sm:py-20 space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-sm">
          <span>🏆</span>
          <span>Professional Tennis & Leather Cricket Player Auction</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl tracking-wide leading-tight text-white font-black uppercase">
          AUCTION ARENA
        </h1>

        <p className="text-slate-300 text-base sm:text-xl leading-relaxed max-w-2xl mx-auto font-medium">
          The complete digital broadcast suite for cricket tournaments — team owner mobile bidding paddles, real-time live auctioneer desk, broadcast OBS overlays, countdown clocks, and official PDF squad cards.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 pt-3 max-w-md sm:max-w-none mx-auto">
          <Link to="/get-started" className="btn-primary w-full sm:w-auto text-base py-3.5 px-8 shadow-xl shadow-emerald-950/80 hover:scale-105 transition-transform font-bold tracking-wide uppercase">
            Organizer: Get Started
          </Link>
          <Link to="/how-to-use" className="btn-secondary w-full sm:w-auto text-base py-3.5 px-7 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border-slate-600 text-white font-bold">
            <span>📺</span>
            <span>Watch How to Use</span>
          </Link>
        </div>

        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-left">
          <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-sm hover:border-emerald-500 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-300 flex items-center justify-center text-lg mb-2 shadow-inner border border-emerald-500/30">
              ⚡
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-white">Zero-Lag Bidding</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Instant WebSocket fast-path</p>
          </div>
          <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-sm hover:border-amber-500 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg mb-2 shadow-inner border border-amber-500/30">
              📱
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-white">Team Owner Remotes</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">4-Digit PIN mobile paddles</p>
          </div>
          <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-sm hover:border-red-500 transition">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center text-lg mb-2 shadow-inner border border-red-500/30">
              ⏱️
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-white">Auto Countdown</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Auto-sold & unsold timers</p>
          </div>
          <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-sm hover:border-blue-500 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center text-lg mb-2 shadow-inner border border-blue-500/30">
              🎥
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-white">OBS Broadcast TV</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">YouTube & FB Live lower-thirds</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 pt-3 max-w-md mx-auto font-medium">
          Are you a player or franchise owner? Use the registration link shared by your tournament organizer.
        </p>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-800 bg-slate-950">
        Auction Arena © {new Date().getFullYear()} · Professional Cricket Tournament Software.
      </footer>
    </div>
  );
}
