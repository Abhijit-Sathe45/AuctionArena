import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import { getSocket, emitWithAck } from "../../socket";
import { playBidSound, unlockAudio } from "../../utils/sounds";
import { getNextBidAmount } from "../../utils/bidIncrement";
import PlayerPhoto from "../../components/PlayerPhoto";
import TeamLogo from "../../components/TeamLogo";

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

    // Register this team as online for real-time remote bidding
    socket.emit("auction:join-team-remote", { token: session.token });

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

    // Auto-resync when phone screen turns back on or user returns to tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        loadRemoteState();
        if (!socket.connected) {
          socket.connect();
          socket.emit("auction:join-team-remote", { token: session.token });
          if (remoteData?.organizerId) {
            socket.emit("join-auction", remoteData.organizerId);
          }
        }
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      socket.emit("auction:leave-team-remote");
      socket.off("auction-update", handleAuctionUpdate);
    };
  }, [session, remoteData?.organizerId, loadRemoteState]);

  // 4. Synchronized Countdown Timer calculation
  useEffect(() => {
    const endsAtStr = remoteData?.state?.biddingEndsAt;
    const isCountdownEnabled = remoteData?.state?.countdownEnabled;
    const hasPlayer = !!remoteData?.state?.currentPlayer;

    if (!isCountdownEnabled || !endsAtStr || !hasPlayer) {
      setTimeLeft(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    function calcTime() {
      const diffMs = Math.max(0, new Date(endsAtStr).getTime() - Date.now());
      const secs = Math.ceil(diffMs / 1000);
      setTimeLeft(secs);
    }

    calcTime();
    timerRef.current = setInterval(calcTime, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remoteData?.state?.biddingEndsAt, remoteData?.state?.countdownEnabled, remoteData?.state?.currentPlayer]);

  // Handle Team Login with PIN
  async function handleLogin(e) {
    e.preventDefault();
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
    } catch (err) {
      setAuthError(err.response?.data?.message || "Invalid Team PIN");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    if (socketRef.current) {
      socketRef.current.emit("auction:leave-team-remote");
    }
    localStorage.removeItem(`team_remote_${slug}`);
    setSession(null);
    setRemoteData(null);
  }

  // Handle Live Bid Action from Mobile Pad
  async function handlePlaceBid() {
    unlockAudio();
    setBidError("");
    setBidding(true);
    try {
      try {
        // Fast-path WebSocket execution
        const res = await emitWithAck("auction:team-bid", { token: session.token });
        if (res?.ok) {
          playBidSound();
          await loadRemoteState();
          return;
        } else if (res?.message) {
          throw new Error(res.message);
        }
      } catch (socketErr) {
        const isConnectivityIssue =
          socketErr.message === "SOCKET_NOT_CONNECTED" ||
          socketErr.message === "SOCKET_TIMEOUT";
        if (!isConnectivityIssue) throw socketErr;
        // Fallback to HTTP REST endpoint
        const { data } = await api.post(
          `/public/${slug}/team-bid`,
          {},
          { headers: { Authorization: `Bearer ${session.token}` } }
        );
        setRemoteData(data);
        playBidSound();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Bid rejected";
      setBidError(msg);
      setTimeout(() => setBidError(""), 4000);
    } finally {
      setBidding(false);
    }
  }

  // Handle Pass Player Action
  async function handlePass() {
    setPassing(true);
    try {
      try {
        const res = await emitWithAck("auction:team-pass", { token: session.token });
        if (res?.ok) {
          await loadRemoteState();
          return;
        }
      } catch (socketErr) {
        const isConnectivity = socketErr.message === "SOCKET_NOT_CONNECTED" || socketErr.message === "SOCKET_TIMEOUT";
        if (!isConnectivity) throw socketErr;
        const { data } = await api.post(
          `/public/${slug}/team-pass`,
          {},
          { headers: { Authorization: `Bearer ${session.token}` } }
        );
        setRemoteData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPassing(false);
    }
  }

  // If remote bidding is completely disabled by organizer
  if (tournament && !tournament.teamOwnerBiddingEnabled) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl">
          <span className="text-4xl block">🔒</span>
          <h1 className="font-display text-2xl text-white font-bold tracking-wide">Mobile Bidding Disabled</h1>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Team Owner Remote Bidding is currently turned <strong>OFF</strong> by the tournament organizer. Bids are managed directly by the auctioneer.
          </p>
          <div className="pt-2">
            <Link to={`/watch/${slug}`} className="btn-primary text-sm py-2.5 px-6 inline-block font-bold">
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
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0F5132] text-white flex items-center justify-center text-2xl border border-emerald-500/40 shadow-lg">
              🏏
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block">
              Franchise Bidding Paddle
            </span>
            <h1 className="font-display text-2xl tracking-wide pt-1 text-white font-bold">
              {tournament?.tournamentName || "Cricket Tournament"}
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              Select your franchise and enter your secret 4-digit PIN to place live bids.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-xs text-red-300 animate-fade-in font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Select Your Team
              </label>
              <select
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold shadow-inner"
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
              <label className="text-xs font-bold text-slate-200 block mb-1.5 uppercase tracking-wider">
                4-Digit Secret PIN
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••"
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-center text-3xl font-mono tracking-widest text-amber-400 focus:outline-none focus:border-emerald-500 shadow-inner font-bold"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">
                Obtain your confidential PIN from the tournament organizer.
              </p>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/50 active:scale-95 transition-transform disabled:opacity-50 border border-emerald-400/40 uppercase tracking-wider"
            >
              {loggingIn ? "Verifying PIN…" : "🔓 Enter Bidding Arena"}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link to={`/watch/${slug}`} className="text-xs text-slate-400 hover:text-emerald-400 underline font-medium">
              View Public Spectator Screen ↗
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Handheld Header Bar */}
      <header className="p-3.5 bg-[#0B1E3D] border-b border-slate-700 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamLogo
            src={team.teamLogoUrl}
            teamName={team.teamName}
            shape="rounded"
            className="w-10 h-10"
          />
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-white truncate leading-tight">{team.teamName}</h2>
            <p className="text-[11px] text-slate-300 truncate font-medium">Owner: {team.ownerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Purse Balance</span>
            <span className="text-sm font-mono font-black text-amber-400">
              ₹{purseRemaining.toLocaleString("en-IN")}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-red-400 text-xs border border-slate-700"
            title="Sign Out"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main Bidding Arena */}
      <main className="p-4 space-y-3.5 flex-1 overflow-y-auto scroll-touch bg-slate-900">
        {/* Squad Status Mini Meter */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-sm">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Squad Strength</span>
            <span className="font-bold text-white text-sm">
              {team?.squadCount || 0} / {team?.minSquad || 11} Min ({team?.maxSquad || 15} Max)
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Purse Shield</span>
            <span className="font-bold text-emerald-400 text-sm">
              {minReserve > 0 ? `₹${minReserve.toLocaleString("en-IN")} Protected` : "Full Free"}
            </span>
          </div>
        </div>

        {/* Active Player Card */}
        {currentPlayer ? (
          <div className="bg-slate-800 p-4 rounded-3xl border-2 border-slate-700 space-y-3.5 relative overflow-hidden shadow-xl">
            {/* Category Pill & Timer */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                {state.currentCategory?.name || "Player in Auction"}
              </span>

              {state.countdownEnabled && timeLeft !== null && (
                <div
                  className={`flex items-center gap-1 font-mono text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                    timeLeft <= 5
                      ? "bg-red-900/40 text-red-300 border-red-500 animate-pulse"
                      : timeLeft <= 10
                      ? "bg-amber-500/20 text-amber-300 border-amber-500"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  <span>⏱️</span>
                  <span>00:{timeLeft.toString().padStart(2, "0")}</span>
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="flex items-center gap-3.5">
              <PlayerPhoto
                src={currentPlayer.photoUrl}
                name={currentPlayer.name}
                sizeClass="w-18 h-18 sm:w-20 sm:h-20"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border-2 border-amber-400/60 shadow-md bg-black/40"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl text-white font-bold truncate leading-tight uppercase">
                  {currentPlayer.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-amber-300 font-semibold">{currentPlayer.playerType}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-300 font-medium">Age {currentPlayer.age}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Bat: {currentPlayer.battingStyle || "Right"} · Bowl: {currentPlayer.bowlingStyle || "NA"}
                </p>
                <span className="text-xs text-emerald-400 font-bold block mt-1">
                  Base Price: ₹{currentPlayer.basePrice?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Current Highest Bid Box */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-700 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Current Highest Bid</span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
                  ₹{currentBidAmount?.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Leading Franchise</span>
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] block">
                  {state.currentBidTeam ? state.currentBidTeam.teamName : "No Bids Yet"}
                </span>
              </div>
            </div>

            {/* Live Status Banners */}
            {isHighestBidder && (
              <div className="p-2.5 bg-emerald-600/20 border-2 border-emerald-500 rounded-2xl text-center text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5 animate-pulse shadow-sm tracking-wider uppercase">
                <span>👑</span>
                <span>YOU LEAD THE BID!</span>
              </div>
            )}

            {hasPassed && (
              <div className="p-2.5 bg-slate-700/50 border border-slate-600 rounded-2xl text-center text-xs font-semibold text-slate-400">
                You have passed on this player.
              </div>
            )}

            {bidError && (
              <div className="p-2.5 bg-red-900/40 border border-red-500 rounded-2xl text-center text-xs text-red-300 font-bold">
                {bidError}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-800 rounded-3xl border border-slate-700 space-y-3 my-8 shadow-sm">
            <span className="text-4xl block animate-bounce">⏳</span>
            <h3 className="font-display text-xl text-white font-bold">Waiting for Next Player</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              The auctioneer will bring the next player to the bidding arena shortly.
            </p>
          </div>
        )}
      </main>

      {/* Giant Mobile Bidding Action Footer */}
      <footer className="p-4 bg-[#0B1E3D] border-t border-slate-700 space-y-2.5 sticky bottom-0 z-30 shadow-2xl">
        {/* Giant BID Button */}
        <button
          onClick={handlePlaceBid}
          disabled={!canBid || bidding}
          className={`w-full py-4 rounded-2xl font-black text-lg sm:text-xl uppercase tracking-wider shadow-2xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 border ${
            isHighestBidder
              ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/50 cursor-not-allowed"
              : canBid
              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border-emerald-400 shadow-emerald-900/60 ring-2 ring-emerald-500/40"
              : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
          }`}
        >
          <span>🔨</span>
          <span>
            {bidding
              ? "PLACING BID…"
              : isHighestBidder
              ? "YOU ARE HIGHEST BIDDER"
              : !currentPlayer
              ? "NO ACTIVE PLAYER"
              : !hasEnoughPurse
              ? (purseRemaining <= 0 ? "PURSE FINISHED" : "INSUFFICIENT PURSE")
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
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/30 text-xs font-bold text-red-400 active:scale-95 transition-all border border-red-500/40 shadow-sm uppercase tracking-wider"
          >
            {passing ? "Passing…" : "✋ Pass on this Player"}
          </button>
        )}
      </footer>
    </div>
  );
}
