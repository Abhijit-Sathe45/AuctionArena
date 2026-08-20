import React, { useState, useEffect, useRef } from "react";
import { speak, stopCommentary } from "../utils/commentaryService";
import { unlockAudio } from "../utils/sounds";

export const GUIDE_CHAPTERS = [
  {
    id: "setup",
    title: "1. Setup & Tournament Pass",
    icon: "🏁",
    tagline: "Create your tournament account and get started",
    duration: 8,
    narration:
      "Step one: Choose your tournament pass, enter your tournament name, date, and set up your organizer account with secure credentials and your official tournament logo.",
    details: [
      {
        title: "Flexible Tournament Passes",
        desc: "Choose from 1-Month, 4-Month, or 12-Month passes to activate your organizer account instantly via Razorpay.",
      },
      {
        title: "Branding & Credentials",
        desc: "Upload your official tournament logo and set your secure password to access the organizer control center.",
      },
    ],
    demoType: "setup",
  },
  {
    id: "settings",
    title: "2. Settings Tab & Tournament Rules",
    icon: "⚙️",
    tagline: "Configure purse, quotas, increments, countdown & public links",
    duration: 10,
    narration:
      "Step two: In the Settings tab, manage registration open and close switches, set registration fees, define max purse per team, squad size limits, custom bid increment brackets, and configure the live auction countdown timer with auto-sold rules.",
    details: [
      {
        title: "Registration Controls & Fees",
        desc: "Turn Player and Team registrations ON or OFF anytime. Set optional entry fees collected automatically via Razorpay.",
      },
      {
        title: "Team Purse & Squad Quotas",
        desc: "Set the total purse budget per team (e.g. ₹50,000) and define minimum and maximum players per squad (e.g. 11 to 15 players).",
      },
      {
        title: "Custom Bid Increment Rules",
        desc: "Define custom bracket increments (e.g. up to ₹10,000: +₹500; up to ₹50,000: +₹1,000; above ₹50,000: +₹2,500).",
      },
      {
        title: "Auction Countdown Settings",
        desc: "Toggle countdown timer ON/OFF. Choose presets (15s, 30s, 45s, 60s, 90s, 2m, or custom duration) with automatic SOLD / UNSOLD resolution.",
      },
      {
        title: "Public Shareable Links",
        desc: "One-click copy of player registration link, team registration link, and public Watch Live spectator link with QR codes.",
      },
    ],
    demoType: "settings",
  },
  {
    id: "registration",
    title: "3. Player & Team Registration",
    icon: "👥",
    tagline: "Collect registrations online and verify candidate entries",
    duration: 8,
    narration:
      "Step three: Share your unique registration links with players and team owners. Review their player profiles, photos, and roles, then approve or reject candidates with one click from the dashboard.",
    details: [
      {
        title: "Shareable Registration Links",
        desc: "Public links /register/player/:slug and /register/team/:slug allow players and teams to register from any mobile or computer.",
      },
      {
        title: "Candidate Verification",
        desc: "Filter by Pending, Approved, Sold, and Unsold. Review age, batting style, bowling style, and contact details before approving.",
      },
      {
        title: "Team Profiles & Owner Details",
        desc: "Manage registered teams, upload team logos, and flag whether the team owner will play matches.",
      },
    ],
    demoType: "registration",
  },
  {
    id: "categories",
    title: "4. Categories, Base Prices & Points",
    icon: "🏷️",
    tagline: "Group players into bidding tiers and grant bonus points",
    duration: 8,
    narration:
      "Step four: Create categories like Icon, Diamond, and Gold with custom base prices. Assign approved players to categories and optionally grant bonus purse points to specific teams.",
    details: [
      {
        title: "Tiered Categories",
        desc: "Create custom categories with individual base prices (e.g. Icon ₹5,000, Diamond ₹2,500, Gold ₹1,000, Silver ₹500).",
      },
      {
        title: "Category Player Assignment",
        desc: "Assign approved players to categories and set custom individual base prices if needed.",
      },
      {
        title: "Bonus Purse / Point Sets",
        desc: "Grant bonus purse points to teams with named point sets (e.g. 'Retention Credit', 'Sponsorship Bonus').",
      },
    ],
    demoType: "categories",
  },
  {
    id: "live_auction",
    title: "5. Live Auction Arena & Fast Bidding",
    icon: "🔨",
    tagline: "Ultra-fast WebSocket bidding wars with smart countdown reset",
    duration: 10,
    narration:
      "Step five: Open Live Auction! Select a category and shuffle the queue. Click Next Player to bring candidates up. Tap any team button to place instant bids with zero lag. Each new bid automatically resets the countdown timer to full duration.",
    details: [
      {
        title: "Category Queue & Shuffling",
        desc: "Select an active category and shuffle the player order for fair, exciting random auctioning.",
      },
      {
        title: "Zero-Lag WebSocket Bidding",
        desc: "Instant parallelized bidding buttons show current highest bidder, new price, and auto-calculated purse balances.",
      },
      {
        title: "Smart Bid Timer Reset",
        desc: "Every time any team places a bid (or a bid is undone), the countdown timer resets to the full duration automatically.",
      },
      {
        title: "Auction Controls",
        desc: "Full auctioneer control: Undo Bid, Next Player, Mark Sold, Mark Unsold, and Re-Auction Unsold.",
      },
    ],
    demoType: "live_auction",
  },
  {
    id: "voice_studio",
    title: "6. AI Voice Commentary & Voice Studio",
    icon: "🎙️",
    tagline: "5 Selectable AI Auctioneer voices with speed & pitch tuning",
    duration: 9,
    narration:
      "Step six: Elevate your auction with AI Voice Commentary! Choose from five distinct voice styles, including Priya Indian Pro and Ananya High-Energy. The AI announces player intros, live bids, 10-second warnings, and final callouts automatically.",
    details: [
      {
        title: "5 Curated Voice Styles",
        desc: "Pick between Priya (Indian Pro), Ananya (High-Energy), Victoria (British Royal), Samantha (Studio Host), and Kabir (Bold Male).",
      },
      {
        title: "Voice Studio Modal",
        desc: "Click ⚙️ Voice to audition sample phrases, customize Speech Speed (0.8x - 1.4x), and adjust Pitch/Tone.",
      },
      {
        title: "Real-Time Auction Callouts",
        desc: "Automatic speech for player introductions, real-time bid increases, 10-second idle warnings, and last 4-second 'Going once, going twice' calls.",
      },
    ],
    demoType: "voice_studio",
  },
  {
    id: "watch_live",
    title: "7. Public Watch Live & Spectator Screen",
    icon: "📺",
    tagline: "Live spectator broadcast with 3D stamps & live video",
    duration: 9,
    narration:
      "Step seven: Fans, spectators, and team owners can open the Watch Live page to follow bidding in real time. They see live countdowns, dynamic purse bars, 3D SOLD rubber stamps, and the auctioneer's live video stream.",
    details: [
      {
        title: "Public Spectator URL (/watch/:slug)",
        desc: "Open to all audience members with zero login required. Updates in real-time with sub-second WebSocket sync.",
      },
      {
        title: "3D Rubber Stamp SOLD / UNSOLD",
        desc: "Stunning 3D physical rubber stamp animations with vibration shake, winning team banner, and price badge.",
      },
      {
        title: "Embedded Live Video Broadcast",
        desc: "Auctioneers can stream camera and microphone video directly through the built-in Jitsi live stream panel.",
      },
      {
        title: "Spectator Voice & Purse Tickers",
        desc: "Spectators have their own AI Commentary and Sound toggles, live team purse progress meters, and recently sold ticker.",
      },
    ],
    demoType: "watch_live",
  },
  {
    id: "reports",
    title: "8. PDF Rosters, History & Re-Auction",
    icon: "📜",
    tagline: "Official team roster sheets, financial ledgers & re-auctioning",
    duration: 8,
    narration:
      "Step eight: After bidding concludes, download official printable PDF squad rosters, review the complete bid-by-bid tournament history, and trigger rapid second-chance re-auction rounds for unsold players.",
    details: [
      {
        title: "Official Team Squad PDFs",
        desc: "One-click download of printable squad sheets with player roles, acquisition prices, and tournament headers.",
      },
      {
        title: "Tournament Financial Ledger",
        desc: "Detailed balance sheet of initial purse, total spent, and remaining purse for every team.",
      },
      {
        title: "Complete Audit Trail",
        desc: "Full chronological record of every bid placed on every player in the History tab.",
      },
      {
        title: "Rapid Re-Auction Round",
        desc: "Bring all unsold players back into a rapid Round 2 with a single click.",
      },
    ],
    demoType: "reports",
  },
];

export default function HowToUseGuide({ isOrganizer = false }) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const timerRef = useRef(null);

  const currentChapter = GUIDE_CHAPTERS[activeChapterIndex];

  // AI Voice narration when chapter changes and voice is enabled
  useEffect(() => {
    if (voiceEnabled) {
      unlockAudio();
      speak(currentChapter.narration, { rate: 1.05, pitch: 1.15 });
    } else {
      stopCommentary();
    }
  }, [activeChapterIndex, voiceEnabled]);

  // Video playback simulation interval
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const stepMs = 100;
    const totalMs = currentChapter.duration * 1000;
    const increment = (stepMs / totalMs) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeChapterIndex < GUIDE_CHAPTERS.length - 1) {
            setActiveChapterIndex((idx) => idx + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeChapterIndex, currentChapter.duration]);

  function handlePlayPause() {
    unlockAudio();
    if (!isPlaying && progress >= 100) {
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  }

  function handleSelectChapter(index) {
    unlockAudio();
    setActiveChapterIndex(index);
    setProgress(0);
  }

  function handleNext() {
    if (activeChapterIndex < GUIDE_CHAPTERS.length - 1) {
      handleSelectChapter(activeChapterIndex + 1);
    }
  }

  function handlePrev() {
    if (activeChapterIndex > 0) {
      handleSelectChapter(activeChapterIndex - 1);
    }
  }

  function toggleVoice() {
    unlockAudio();
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next) stopCommentary();
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Title */}
      <div className="text-center space-y-2">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-widest px-3 py-1 bg-gold/15 text-gold-dark rounded-full border border-gold/30">
          Interactive Video & Complete Feature Guide
        </span>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-turf tracking-wide">
          How to Use Auction Arena
        </h1>
        <p className="text-sm sm:text-base text-black/60 max-w-2xl mx-auto">
          Explore all 8 application modules — from Settings and Registration to Live Bidding, Voice Commentary, and Public Spectator Streams.
        </p>
      </div>

      {/* Interactive AI Video Simulator Player */}
      <div className="bg-slate-950 rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl overflow-hidden text-ivory">
        {/* Video Top Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <p className="font-semibold text-xs sm:text-sm truncate">
              {currentChapter.title} — {currentChapter.tagline}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleVoice}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
                voiceEnabled
                  ? "bg-gold text-slate-950 shadow-sm"
                  : "bg-white/10 hover:bg-white/20 text-ivory"
              }`}
            >
              <span>🎙️</span>
              <span>AI Narration: {voiceEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Video Screen / Animated Simulator Canvas */}
        <div className="relative min-h-[320px] sm:min-h-[420px] md:min-h-[460px] bg-gradient-to-br from-slate-950 via-turf-dark/80 to-slate-900 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

          {/* Chapter 1: Setup */}
          {currentChapter.demoType === "setup" && (
            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3.5 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-display text-lg text-gold font-bold">🏁 Tournament Setup</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                  1-Month Pass
                </span>
              </div>
              <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/10">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-xl shrink-0">
                  🏆
                </div>
                <div>
                  <h4 className="font-bold text-sm text-ivory">Premier Cricket League 2026</h4>
                  <p className="text-[11px] text-ivory/60">Tournament Date: 25 Aug 2026</p>
                  <p className="text-[10px] text-emerald-400 font-medium">✓ Software Activated</p>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs flex justify-between items-center">
                <span className="text-ivory/70">Login ID: organizer@league.com</span>
                <span className="font-mono text-gold font-bold">Active</span>
              </div>
            </div>
          )}

          {/* Chapter 2: Settings Tab & Tournament Rules */}
          {currentChapter.demoType === "settings" && (
            <div className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 space-y-3 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display text-base sm:text-lg text-gold font-bold">⚙️ Settings Tab Console</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded">
                  Admin Rules
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-black/30 rounded-lg border border-white/5">
                  <span className="text-[10px] text-ivory/50 block">Registrations</span>
                  <span className="font-bold text-emerald-400">OPEN (ON)</span>
                </div>
                <div className="p-2 bg-black/30 rounded-lg border border-white/5">
                  <span className="text-[10px] text-ivory/50 block">Max Team Purse</span>
                  <span className="font-bold text-gold">₹50,000</span>
                </div>
                <div className="p-2 bg-black/30 rounded-lg border border-white/5">
                  <span className="text-[10px] text-ivory/50 block">Squad Quota</span>
                  <span className="font-bold text-ivory">11 - 15 Players</span>
                </div>
              </div>

              {/* Countdown Settings Box */}
              <div className="p-2.5 bg-gold/15 border border-gold/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ivory block">⏱️ Auction Countdown Timer</span>
                  <span className="text-[10px] text-ivory/60">Preset: 30 Seconds · Auto-Sold on 00:00</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-gold text-slate-950 shadow">
                  ON (30s)
                </span>
              </div>

              {/* Public Links Box */}
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                <div className="truncate mr-2">
                  <span className="text-[10px] text-ivory/50 block font-medium">Public Watch Live Link:</span>
                  <span className="font-mono text-emerald-400 text-[11px] truncate block">/watch/premier-league-2026</span>
                </div>
                <button className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded font-bold text-[11px] shrink-0">
                  Copy Link 📋
                </button>
              </div>
            </div>
          )}

          {/* Chapter 3: Registration */}
          {currentChapter.demoType === "registration" && (
            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3.5 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-display text-lg text-gold font-bold">👥 Player Verification</span>
                <span className="text-[10px] bg-turf text-gold font-bold px-2 py-0.5 rounded">
                  48 Registrations
                </span>
              </div>
              <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/10">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-xl">
                  🏏
                </div>
                <div>
                  <h4 className="font-bold text-sm text-ivory">Virat Sharma (All-Rounder)</h4>
                  <p className="text-[11px] text-ivory/60">Right Hand Bat · Fast Bowler · Age 24</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">✓ Paid ₹500 Entry Fee</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-emerald-600 font-bold text-xs shadow">
                  ✓ Approve Player
                </button>
                <button className="px-3 py-2 rounded-lg bg-white/10 font-bold text-xs text-ivory/70">
                  Assign Category
                </button>
              </div>
            </div>
          )}

          {/* Chapter 4: Categories & Points */}
          {currentChapter.demoType === "categories" && (
            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3.5 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-display text-lg text-gold font-bold">🏷️ Categories & Point Sets</span>
                <span className="text-xs text-ivory/60">4 Tiers Active</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 bg-gold/20 border border-gold/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ivory block">💎 Category Diamond</span>
                    <span className="text-[10px] text-ivory/60">12 Icon Players</span>
                  </div>
                  <span className="font-bold text-xs text-gold">Base: ₹5,000</span>
                </div>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ivory block">🥇 Category Gold</span>
                    <span className="text-[10px] text-ivory/60">20 Players</span>
                  </div>
                  <span className="font-bold text-xs text-ivory/80">Base: ₹2,000</span>
                </div>
              </div>
              <div className="p-2.5 bg-black/30 rounded-xl flex items-center justify-between text-xs">
                <span>Bonus Purse: Retention Set (+₹5,000)</span>
                <span className="text-emerald-400 font-bold">Assigned</span>
              </div>
            </div>
          )}

          {/* Chapter 5: Live Auction Arena */}
          {currentChapter.demoType === "live_auction" && (
            <div className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 space-y-3 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-ivory/60 uppercase font-bold">Currently in Auction</span>
                  <h3 className="font-display text-lg sm:text-xl text-ivory font-bold">Rohit Verma (Batsman)</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-amber-400 font-mono font-bold block">⏱️ 00:26</span>
                  <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded font-bold">
                    Diamond Tier
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-ivory/50 block font-medium">Highest Bid</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-gold">₹18,000</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-ivory/50 block font-medium">Bidder</span>
                  <span className="text-sm font-bold text-ivory">Royal Strikers 🦁</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1">
                  <span>🔨</span>
                  <span>Bid ₹20,000 (Titans)</span>
                </button>
                <button className="py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1">
                  <span>🔨</span>
                  <span>Bid ₹20,000 (Kings)</span>
                </button>
              </div>
            </div>
          )}

          {/* Chapter 6: Voice Studio */}
          {currentChapter.demoType === "voice_studio" && (
            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3.5 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-display text-lg text-gold font-bold">🎙️ AI Voice Studio</span>
                <span className="text-[10px] bg-gold/20 text-gold font-bold px-2 py-0.5 rounded">
                  5 Personas
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 bg-gold/20 border border-gold/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ivory block">1. Priya (Indian English Pro)</span>
                    <span className="text-[10px] text-ivory/60">Natural IPL Auctioneer Accent</span>
                  </div>
                  <span className="text-xs bg-gold text-slate-950 px-2 py-0.5 rounded font-bold">Active</span>
                </div>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ivory block">2. Ananya (High-Energy Stadium)</span>
                    <span className="text-[10px] text-ivory/60">Fast-Paced & Punchy Delivery</span>
                  </div>
                  <button className="text-xs bg-white/10 px-2 py-0.5 rounded font-semibold text-ivory/80">
                    ▶ Sample
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-ivory/60 text-center">
                Speed & Pitch Sliders Available in ⚙️ Voice Settings
              </div>
            </div>
          )}

          {/* Chapter 7: Watch Live Spectator View */}
          {currentChapter.demoType === "watch_live" && (
            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 space-y-3 animate-fade-in shadow-2xl text-center">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display text-base text-gold font-bold">📺 Spectator Watch Live (/watch/:slug)</span>
                <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded animate-pulse">
                  LIVE
                </span>
              </div>

              {/* Simulated 3D Stamp */}
              <div className="py-2">
                <div className="inline-block border-4 border-emerald-500 text-emerald-400 font-black text-2xl sm:text-3xl tracking-widest px-5 py-1.5 rounded-xl uppercase rotate-[-5deg] shadow-2xl animate-bounce">
                  SOLD!
                </div>
                <p className="text-xs text-gold font-bold mt-2">Virat Sharma acquired for ₹28,000</p>
                <p className="text-[11px] text-ivory/60">Winning Bidder: Mumbai Titans</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-ivory/70 bg-black/40 p-2.5 rounded-xl">
                <span>📹 Jitsi Video Stream</span>
                <span>🔊 AI Commentary Sync</span>
              </div>
            </div>
          )}

          {/* Chapter 8: Reports & PDFs */}
          {currentChapter.demoType === "reports" && (
            <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3.5 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-display text-lg text-gold font-bold">📜 Rosters & Audit Reports</span>
                <span className="text-xs text-emerald-400 font-bold">Completed</span>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📄</span>
                    <div>
                      <span className="font-bold text-xs text-ivory block">All Team Squads PDF</span>
                      <span className="text-[10px] text-ivory/50">Full player rosters & roles</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-gold text-slate-950 text-xs font-bold rounded-lg shadow">
                    Download
                  </button>
                </div>
                <div className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📊</span>
                    <div>
                      <span className="font-bold text-xs text-ivory block">Financial Purse Ledger</span>
                      <span className="text-[10px] text-ivory/50">Team spending & balances</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-white/15 text-ivory text-xs font-bold rounded-lg">
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Timeline & Controls */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-white/10 space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative cursor-pointer">
            <div
              className="bg-gold h-full transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons & Chapter Selector */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={activeChapterIndex === 0}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-sm transition-colors"
                title="Previous Chapter"
              >
                ⏮
              </button>
              <button
                onClick={handlePlayPause}
                className="px-4 py-1.5 rounded-lg bg-gold hover:bg-gold-dark text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
              >
                <span>{isPlaying ? "⏸ Pause" : "▶ Play Video"}</span>
              </button>
              <button
                onClick={handleNext}
                disabled={activeChapterIndex === GUIDE_CHAPTERS.length - 1}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-sm transition-colors"
                title="Next Chapter"
              >
                ⏭
              </button>
            </div>

            {/* Chapter Step Indicators */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {GUIDE_CHAPTERS.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(idx)}
                  className={`text-xs px-2 sm:px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    activeChapterIndex === idx
                      ? "bg-gold text-slate-950 shadow"
                      : "bg-white/5 hover:bg-white/10 text-ivory/70"
                  }`}
                >
                  <span className="hidden sm:inline">{ch.icon} </span>
                  <span>Step {idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Dive Step Cards */}
      <div className="space-y-4 pt-4">
        <h2 className="font-display text-2xl sm:text-3xl text-turf tracking-wide">
          Complete Feature Breakdown (All Modules)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDE_CHAPTERS.map((chapter, idx) => (
            <div
              key={chapter.id}
              onClick={() => handleSelectChapter(idx)}
              className={`card p-5 cursor-pointer transition-all border-2 ${
                activeChapterIndex === idx
                  ? "border-gold bg-gold/5 shadow-md ring-1 ring-gold"
                  : "border-black/10 hover:border-black/25 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl p-2 rounded-xl bg-turf/10 text-turf">
                  {chapter.icon}
                </span>
                <div>
                  <h3 className="font-display text-lg text-turf font-bold">
                    {chapter.title}
                  </h3>
                  <p className="text-xs text-black/50">{chapter.tagline}</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {chapter.details.map((item, dIdx) => (
                  <div key={dIdx} className="text-xs">
                    <span className="font-bold text-turf-dark block mb-0.5">
                      • {item.title}
                    </span>
                    <p className="text-black/65 pl-3 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
