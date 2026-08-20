import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import { getSocket } from "../../socket";
import { playBidSound, playSoldSound, unlockAudio } from "../../utils/sounds";
import { getNextBidAmount } from "../../utils/bidIncrement";

export default function TeamBidRemote() {
  const { slug } = useParams();

  // Authentication State
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(`team_remote_${slug}`);
    return saved ? JSON.parse(saved) : null;
  });

  // Tournament / Team List Data
  const [tournament, setTournament] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Live Auction State for Logged-In Team
  const [remoteData, setRemoteData] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [passing, setPassing] = useState(false);
  const [bidError, setBidError] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);

  const socketRef = useRef(null);
  const timerRef = useRef(null);

  // 1. Load Tournament Info & Teams List
  const loadTeamsList = useCallback(async () => {
    try {
      const { data } = await api.get(`/public/${slug}/teams-list`);
      setTournament(data);
      if (data.teams?.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data.teams[0]._id);
      }
    } catch (err) {
      console.error("Failed to load tournament teams", err);
    }
  }, [slug, selectedTeamId]);

  useEffect(() => {
    loadTeamsList();
  }, [loadTeamsList]);

  // 2. Load Live Team Remote State
  const loadRemoteState = useCallback(async () => {
    if (!session?.token) return;
    try {
      const { data } = await api.get(`/public/${slug}/team-remote-state`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setRemoteData(data);
      setLoadingState(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token expired or invalid
        handleLogout();
      }
    }
  }, [slug, session]);

  // 3. Connect WebSocket for Real-time sync
  useEffect(() => {
    if (!session?.token) return;

    loadRemoteState();

    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    if (remoteData?.organizerId) {
      socket.emit("join-auction", remoteData.organizerId);
    }

    function handleAuctionUpdate(payload) {
      if (payload?.event === "BID_PLACED" || payload?.event === "BID_UNDONE" || payload?.event === "TEAM_PASSED") {
        loadRemoteState();
        if (payload?.event === "BID_PLACED") {
          playBidSound();
        }
      } else {
        loadRemoteState();
      }
    }

    socket.on("auction-update", handleAuctionUpdate);

    return () => {
      socket.off("auction-update", handleAuctionUpdate);
    };
  }, [session, remoteData?.organizerId, loadRemoteState]);

  // 4. Live Countdown Timer Tick
  useEffect(() => {
    if (!remoteData?.state?.countdownEnabled || !remoteData?.state?.biddingEndsAt) {
      setTimeLeft(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    function updateTimer() {
      const ends = new Date(remoteData.state.biddingEndsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((ends - now) / 1000));
      setTimeLeft(diff);
    }

    updateTimer();
    timerRef.current = setInterval(updateTimer, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remoteData?.state?.countdownEnabled, remoteData?.state?.biddingEndsAt]);

  // Team Login Handler
  async function handleLogin(e) {
    e.preventDefault();
    unlockAudio();
    setAuthError("");
    if (!selectedTeamId) {
      setAuthError("Please select your team");
      return;
    }
    if (!pin || pin.length < 4) {
      setAuthError("Please enter your 4-digit PIN");
      return;
    }

    setLoggingIn(true);
    try {
      const { data } = await api.post(`/public/${slug}/team-login`, {
        teamId: selectedTeamId,
        pin: pin.trim(),
      });
      localStorage.setItem(`team_remote_${slug}`, JSON.stringify(data));
      setSession(data);
      playSoldSound();
    } catch (err) {
      setAuthError(err.response?.data?.message || "Invalid Team PIN or remote bidding is disabled.");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(`team_remote_${slug}`);
    setSession(null);
    setRemoteData(null);
  }

  // Handle Fast Bidding
  async function handlePlaceBid() {
    unlockAudio();
    if (!session?.token || bidding) return;
    setBidError("");
    setBidding(true);

    try {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit("auction:team-bid", { token: session.token }, (res) => {
          setBidding(false);
          if (!res?.ok) {
            setBidError(res?.message || "Bid could not be placed.");
          } else {
            playBidSound();
            loadRemoteState();
          }
        });
      } else {
        setBidError("Connecting to live auction...");
        setBidding(false);
      }
    } catch (err) {
      setBidError(err.message || "Failed to place bid");
      setBidding(false);
    }
  }

  // Handle Pass
  async function handlePass() {
    unlockAudio();
    if (!session?.token || passing) return;
    setPassing(true);
    try {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit("auction:team-pass", { token: session.token }, () => {
          setPassing(false);
          loadRemoteState();
        });
      }
    } catch {
      setPassing(false);
    }
  }

  // If remote bidding is completely disabled by organizer
  if (tournament && !tournament.teamOwnerBiddingEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-ivory flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-4xl block">🔒</span>
          <h1 className="font-display text-2xl text-gold">Mobile Bidding Disabled</h1>
          <p className="text-sm text-ivory/70 leading-relaxed">
            Team Owner Remote Bidding is currently turned <strong>OFF</strong> by the tournament organizer. Bids are managed directly by the auctioneer.
          </p>
          <div className="pt-2">
            <Link to={`/watch/${slug}`} className="btn-primary text-sm py-2 px-5 inline-block">
              📺 Go to Watch Live Screen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 1: TEAM OWNER PIN LOGIN SCREEN
  // ----------------------------------------------------
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-turf-dark to-slate-950 text-ivory flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-5">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <span className="text-3xl block">📱</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
              Team Remote Pad
            </span>
            <h1 className="font-display text-2xl tracking-wide pt-1">
              {tournament?.tournamentName || "Auction Arena"}
            </h1>
            <p className="text-xs text-ivory/60">
              Select your team and enter your secret 4-digit PIN to bid live.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 animate-fade-in">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-ivory/80 block mb-1">
                Select Your Team
              </label>
              <select
                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-sm text-ivory focus:outline-none focus:border-gold"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                {tournament?.teams?.map((t) => (
                  <option key={t._id} value={t._id} className="bg-slate-900 text-white">
                    {t.teamName} ({t.ownerName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ivory/80 block mb-1">
                4-Digit Secret PIN
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••"
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-center text-2xl font-mono tracking-widest text-gold focus:outline-none focus:border-gold"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <p className="text-[10px] text-ivory/40 text-center mt-1">
                Obtain your PIN from the tournament organizer.
              </p>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl bg-gold hover:bg-gold-dark text-slate-950 font-bold text-sm shadow-lg shadow-gold/20 active:scale-95 transition-transform disabled:opacity-50"
            >
              {loggingIn ? "Verifying PIN…" : "🔓 Enter Bidding Pad"}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link to={`/watch/${slug}`} className="text-xs text-ivory/50 hover:text-ivory underline">
              View Public Spectator Screen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: LIVE HANDHELD BIDDING CONSOLE
  // ----------------------------------------------------
  const team = remoteData?.team || session.team;
  const state = remoteData?.state;
  const currentPlayer = state?.currentPlayer;
  const currentBidAmount = state?.currentBidAmount || 0;
  const nextBid = getNextBidAmount(currentBidAmount);
  const isHighestBidder = remoteData?.isHighestBidder;
  const hasPassed = remoteData?.hasPassed;

  // Purse Shield calculation
  const purseRemaining = team?.purseRemaining || 0;
  const minReserve = team?.minReserve || 0;
  const availablePurse = Math.max(purseRemaining - minReserve, 0);
  const hasEnoughPurse = availablePurse >= nextBid;
  const isSquadFull = team?.squadCount >= (team?.maxSquad || 15);

  const canBid =
    currentPlayer &&
    !isHighestBidder &&
    !hasPassed &&
    hasEnoughPurse &&
    !isSquadFull &&
    (!state?.countdownEnabled || timeLeft === null || timeLeft > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-ivory flex flex-col justify-between max-w-md mx-auto border-x border-white/10 shadow-2xl">
      {/* Handheld Header Bar */}
      <header className="p-3.5 bg-slate-900/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          {team.teamLogoUrl ? (
            <img src={team.teamLogoUrl} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gold/40" alt="" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-turf text-gold flex items-center justify-center text-sm font-bold shrink-0">
              🏏
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-ivory truncate">{team.teamName}</h2>
            <p className="text-[11px] text-ivory/60 truncate">Owner: {team.ownerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-ivory/50 block font-medium">Purse Left</span>
            <span className="text-xs font-mono font-bold text-gold">
              ₹{purseRemaining.toLocaleString("en-IN")}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ivory/60 text-xs"
            title="Sign Out"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main Bidding Arena */}
      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Squad Status Mini Meter */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-2.5 rounded-xl border border-white/10">
          <div>
            <span className="text-ivory/50 block text-[10px]">Squad Count</span>
            <span className="font-bold text-ivory">
              {team?.squadCount || 0} / {team?.minSquad || 11} Min ({team?.maxSquad || 15} Max)
            </span>
          </div>
          <div className="text-right">
            <span className="text-ivory/50 block text-[10px]">Purse Shield</span>
            <span className="font-bold text-emerald-400">
              {minReserve > 0 ? `₹${minReserve.toLocaleString()} Protected` : "Full Free"}
            </span>
          </div>
        </div>

        {/* Active Player Card */}
        {currentPlayer ? (
          <div className="bg-gradient-to-b from-slate-900 to-black/60 p-4 rounded-2xl border border-white/15 space-y-3 relative overflow-hidden shadow-lg">
            {/* Category Pill & Timer */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                {state.currentCategory?.name || "Player in Auction"}
              </span>

              {state.countdownEnabled && timeLeft !== null && (
                <div
                  className={`flex items-center gap-1 font-mono text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                    timeLeft <= 5
                      ? "bg-red-500/20 text-red-400 border-red-500 animate-pulse"
                      : timeLeft <= 10
                      ? "bg-amber-500/20 text-amber-400 border-amber-500"
                      : "bg-white/10 text-ivory border-white/20"
                  }`}
                >
                  <span>⏱️</span>
                  <span>00:{timeLeft.toString().padStart(2, "0")}</span>
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="flex items-center gap-3.5">
              {currentPlayer.photoUrl ? (
                <img
                  src={currentPlayer.photoUrl}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/20 shrink-0 shadow-md"
                  alt=""
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-turf/30 text-gold flex items-center justify-center text-3xl shrink-0 border border-white/20">
                  🏏
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg sm:text-xl text-ivory font-bold truncate">
                  {currentPlayer.name}
                </h3>
                <p className="text-xs text-ivory/70">{currentPlayer.playerType} · Age {currentPlayer.age}</p>
                <p className="text-[11px] text-ivory/50">
                  Bat: {currentPlayer.battingStyle} · Bowl: {currentPlayer.bowlingStyle}
                </p>
                <span className="text-[11px] text-gold font-semibold block mt-0.5">
                  Base Price: ₹{currentPlayer.basePrice?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Current Highest Bid Box */}
            <div className="p-3 bg-black/60 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-ivory/50 uppercase font-bold block">Current Highest Bid</span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-gold">
                  ₹{currentBidAmount?.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-ivory/50 uppercase font-bold block">Winning Team</span>
                <span className="text-xs sm:text-sm font-bold text-ivory truncate max-w-[140px] block">
                  {state.currentBidTeam ? state.currentBidTeam.teamName : "No Bids Yet"}
                </span>
              </div>
            </div>

            {/* Live Status Banners */}
            {isHighestBidder && (
              <div className="p-2.5 bg-gold/20 border border-gold/40 rounded-xl text-center text-xs font-bold text-gold flex items-center justify-center gap-1.5 animate-pulse">
                <span>👑</span>
                <span>YOU ARE THE HIGHEST BIDDER!</span>
              </div>
            )}

            {hasPassed && (
              <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-center text-xs font-semibold text-slate-400">
                You have passed on this player.
              </div>
            )}

            {bidError && (
              <div className="p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-center text-xs text-red-300">
                {bidError}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-3 my-8">
            <span className="text-4xl block animate-bounce">⏳</span>
            <h3 className="font-display text-xl text-gold">Waiting for Next Player</h3>
            <p className="text-xs text-ivory/60 leading-relaxed">
              The auctioneer will bring the next player to the bidding arena shortly.
            </p>
          </div>
        )}
      </main>

      {/* Giant Mobile Bidding Action Footer */}
      <footer className="p-4 bg-slate-900 border-t border-white/15 space-y-2.5 sticky bottom-0 z-30">
        {/* Giant BID Button */}
        <button
          onClick={handlePlaceBid}
          disabled={!canBid || bidding}
          className={`w-full py-4 rounded-2xl font-black text-lg sm:text-xl uppercase tracking-wide shadow-2xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 ${
            isHighestBidder
              ? "bg-gold/30 text-gold border-2 border-gold/40 cursor-not-allowed"
              : canBid
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50"
              : "bg-white/10 text-ivory/40 cursor-not-allowed"
          }`}
        >
          <span>🔨</span>
          <span>
            {bidding
              ? "PLACING BID…"
              : isHighestBidder
              ? "LEADING BIDDER"
              : !currentPlayer
              ? "NO ACTIVE PLAYER"
              : !hasEnoughPurse
              ? "INSUFFICIENT PURSE"
              : hasPassed
              ? "PASSED"
              : `BID ₹${nextBid.toLocaleString("en-IN")}`}
          </span>
        </button>

        {/* Secondary PASS Button */}
        {currentPlayer && !isHighestBidder && !hasPassed && (
          <button
            onClick={handlePass}
            disabled={passing}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-ivory/60 active:scale-95 transition-transform"
          >
            {passing ? "Passing…" : "✋ Pass on this Player"}
          </button>
        )}
      </footer>
    </div>
  );
}
