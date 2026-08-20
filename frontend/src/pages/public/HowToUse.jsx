import React from "react";
import { Link } from "react-router-dom";
import HowToUseGuide from "../../components/HowToUseGuide";

export default function HowToUse() {
  return (
    <div className="min-h-screen bg-ivory text-black/90">
      {/* Top Navbar */}
      <header className="bg-turf text-ivory border-b border-white/10 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🏏</span>
            <span className="font-display text-xl sm:text-2xl tracking-wide">
              AUCTION ARENA
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/get-started"
              className="btn-primary text-xs sm:text-sm py-2 px-3.5 shadow-sm"
            >
              Get Started
            </Link>
            <Link
              to="/organizer/login"
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Guide Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <HowToUseGuide isOrganizer={false} />
      </main>

      {/* Bottom CTA Banner */}
      <div className="bg-gradient-to-r from-turf to-turf-dark text-ivory py-10 sm:py-14 text-center px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-display text-2xl sm:text-4xl tracking-wide">
            Ready to Host Your Tournament Auction?
          </h2>
          <p className="text-ivory/75 text-sm sm:text-base">
            Set up player registrations, team owners, live bidding, and AI voice commentary in minutes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/get-started" className="btn-primary text-base py-3 px-6 shadow-md">
              Get Your Auction Software
            </Link>
            <Link to="/organizer/login" className="btn-secondary text-base py-3 px-6">
              Organizer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
