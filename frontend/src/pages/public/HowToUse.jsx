import React from "react";
import { Link } from "react-router-dom";
import HowToUseGuide from "../../components/HowToUseGuide";

export default function HowToUse() {
  return (
    <div className="min-h-screen bg-ivory text-turf">
      {/* Top Navbar */}
      <header className="bg-white/85 backdrop-blur-md text-turf border-b border-mauve/25 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🏏</span>
            <span className="font-display text-xl sm:text-2xl tracking-wide text-turf font-bold">
              AUCTION ARENA
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/get-started"
              className="btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm font-bold"
            >
              Get Started
            </Link>
            <Link
              to="/organizer/login"
              className="btn-secondary text-xs sm:text-sm py-2 px-4 font-bold"
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
      <div className="bg-gradient-to-r from-sky/30 via-orchid/25 to-mint/25 border-t border-mauve/25 text-turf py-10 sm:py-14 text-center px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-display text-2xl sm:text-4xl tracking-wide text-turf font-bold">
            Ready to Host Your Tournament Auction?
          </h2>
          <p className="text-mauve-dark text-sm sm:text-base font-medium">
            Set up player registrations, team owners, live bidding, and AI voice commentary in minutes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/get-started" className="btn-primary text-base py-3 px-7 shadow-lg shadow-mint/25 font-bold">
              Get Your Auction Software
            </Link>
            <Link to="/organizer/login" className="btn-secondary text-base py-3 px-6 font-bold">
              Organizer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
