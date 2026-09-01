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
      const { data } = await api.post(
        `/public/${slug}/team-bid`,
        {},
        { headers: { Authorization: `Bearer ${session.token}` } }
      );
      setRemoteData(data);
      playBidSound();
    } catch (err) {
      const msg = err.response?.data?.message || "Bid rejected";
      setBidError(msg);
      // Auto-clear bid error after 3 seconds
      setTimeout(() => setBidError(""), 3000);
    } finally {
      setBidding(false);
    }
  }

  // Handle Pass Player Action
  async function handlePass() {
    setPassing(true);
    try {
      const { data } = await api.post(
        `/public/${slug}/team-pass`,
        {},
        { headers: { Authorization: `Bearer ${session.token}` } }
      );
      setRemoteData(data);
    } catch {
      setPassing(false);
    }
  }

  // If remote bidding is completely disabled by organizer
  if (tournament && !tournament.teamOwnerBiddingEnabled) {
    return (
      <div className="min-h-screen bg-ivory text-turf flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-6 bg-white border border-mauve/30 rounded-3xl shadow-xl">
          <span className="text-4xl block">🔒</span>
          <h1 className="font-display text-2xl text-turf font-bold">Mobile Bidding Disabled</h1>
          <p className="text-sm text-mauve-dark leading-relaxed font-medium">
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
      <div className="min-h-screen bg-gradient-to-b from-[#F0F5FF] via-[#FAF5FC] to-[#F2FCF8] text-turf flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-mauve/30 shadow-xl space-y-5">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <span className="text-3xl block">📱</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-mint/20 text-mint-dark border border-mint/40">
              Team Remote Pad
            </span>
            <h1 className="font-display text-2xl tracking-wide pt-1 text-turf font-bold">
              {tournament?.tournamentName || "Auction Arena"}
            </h1>
            <p className="text-xs text-mauve-dark font-medium">
              Select your team and enter your secret 4-digit PIN to bid live.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose/15 border border-rose/40 rounded-xl text-xs text-rose animate-fade-in font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-turf/85 block mb-1">
                Select Your Team
              </label>
              <select
                className="w-full bg-white border border-mauve/35 rounded-xl p-3 text-sm text-turf focus:outline-none focus:border-mint font-semibold shadow-sm"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                {tournament?.teams?.map((t) => (
                  <option key={t._id} value={t._id} className="bg-white text-turf">
                    {t.teamName} ({t.ownerName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-turf/85 block mb-1">
                4-Digit Secret PIN
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••"
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full bg-white border border-mauve/35 rounded-xl p-3 text-center text-2xl font-mono tracking-widest text-mint-dark focus:outline-none focus:border-mint shadow-sm font-bold"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <p className="text-[10px] text-mauve-dark text-center mt-1 font-medium">
                Obtain your PIN from the tournament organizer.
              </p>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-mint/25 active:scale-95 transition-transform disabled:opacity-50"
            >
              {loggingIn ? "Verifying PIN…" : "🔓 Enter Bidding Pad"}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link to={`/watch/${slug}`} className="text-xs text-mauve-dark hover:text-turf underline font-medium">
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
    <div className="min-h-screen bg-[#F7FAFE] text-turf flex flex-col justify-between max-w-md mx-auto border-x border-mauve/25 shadow-xl">
      {/* Handheld Header Bar */}
      <header className="p-3.5 bg-white/95 backdrop-blur-md border-b border-mauve/20 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          {team.teamLogoUrl ? (
            <img src={team.teamLogoUrl} className="w-9 h-9 rounded-full object-cover shrink-0 border border-mint/40 shadow-sm" alt="" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-mint/20 text-mint-dark flex items-center justify-center text-sm font-bold shrink-0 shadow-inner">
              🏏
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-turf truncate">{team.teamName}</h2>
            <p className="text-[11px] text-mauve-dark truncate font-medium">Owner: {team.ownerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-mauve-dark block font-bold">Purse Left</span>
            <span className="text-xs font-mono font-black text-mint-dark">
              ₹{purseRemaining.toLocaleString("en-IN")}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-sky/15 hover:bg-rose/15 text-rose text-xs"
            title="Sign Out"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main Bidding Arena */}
      <main className="p-4 space-y-4 flex-1 overflow-y-auto scroll-touch">
        {/* Squad Status Mini Meter */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-2xl border border-mauve/20 shadow-sm">
          <div>
            <span className="text-mauve-dark block text-[10px] font-semibold">Squad Count</span>
            <span className="font-bold text-turf">
              {team?.squadCount || 0} / {team?.minSquad || 11} Min ({team?.maxSquad || 15} Max)
            </span>
          </div>
          <div className="text-right">
            <span className="text-mauve-dark block text-[10px] font-semibold">Purse Shield</span>
            <span className="font-bold text-mint-dark">
              {minReserve > 0 ? `₹${minReserve.toLocaleString()} Protected` : "Full Free"}
            </span>
          </div>
        </div>

        {/* Active Player Card */}
        {currentPlayer ? (
          <div className="bg-white p-4 rounded-3xl border border-mauve/25 space-y-3 relative overflow-hidden shadow-md">
            {/* Category Pill & Timer */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orchid/20 text-orchid-dark border border-orchid/30">
                {state.currentCategory?.name || "Player in Auction"}
              </span>

              {state.countdownEnabled && timeLeft !== null && (
                <div
                  className={`flex items-center gap-1 font-mono text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                    timeLeft <= 5
                      ? "bg-rose/15 text-rose border-rose animate-pulse"
                      : timeLeft <= 10
                      ? "bg-orchid/20 text-orchid-dark border-orchid"
                      : "bg-mint/15 text-mint-dark border-mint/40"
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
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-sky-dark/30 shrink-0 shadow-md"
                  alt=""
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sky/20 text-mint-dark flex items-center justify-center text-3xl shrink-0 border border-sky/30 shadow-inner">
                  🏏
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg sm:text-xl text-turf font-bold truncate">
                  {currentPlayer.name}
                </h3>
                <p className="text-xs text-mauve-dark font-medium">{currentPlayer.playerType} · Age {currentPlayer.age}</p>
                <p className="text-[11px] text-mauve-dark font-medium">
                  Bat: {currentPlayer.battingStyle} · Bowl: {currentPlayer.bowlingStyle}
                </p>
                <span className="text-[11px] text-mint-dark font-bold block mt-0.5">
                  Base Price: ₹{currentPlayer.basePrice?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Current Highest Bid Box */}
            <div className="p-3 bg-mint/15 rounded-2xl border border-mint/40 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-[10px] text-mauve-dark uppercase font-bold block">Current Highest Bid</span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-mint-dark">
                  ₹{currentBidAmount?.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-mauve-dark uppercase font-bold block">Winning Team</span>
                <span className="text-xs sm:text-sm font-bold text-turf truncate max-w-[140px] block">
                  {state.currentBidTeam ? state.currentBidTeam.teamName : "No Bids Yet"}
                </span>
              </div>
            </div>

            {/* Live Status Banners */}
            {isHighestBidder && (
              <div className="p-2.5 bg-mint/20 border border-mint/40 rounded-2xl text-center text-xs font-bold text-mint-dark flex items-center justify-center gap-1.5 animate-pulse shadow-sm">
                <span>👑</span>
                <span>YOU ARE THE HIGHEST BIDDER!</span>
              </div>
            )}

            {hasPassed && (
              <div className="p-2.5 bg-sky/10 border border-sky/25 rounded-2xl text-center text-xs font-semibold text-mauve-dark">
                You have passed on this player.
              </div>
            )}

            {bidError && (
              <div className="p-2 bg-rose/15 border border-rose/40 rounded-2xl text-center text-xs text-rose font-bold">
                {bidError}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-mauve/25 space-y-3 my-8 shadow-sm">
            <span className="text-4xl block animate-bounce">⏳</span>
            <h3 className="font-display text-xl text-turf font-bold">Waiting for Next Player</h3>
            <p className="text-xs text-mauve-dark leading-relaxed font-medium">
              The auctioneer will bring the next player to the bidding arena shortly.
            </p>
          </div>
        )}
      </main>

      {/* Giant Mobile Bidding Action Footer */}
      <footer className="p-4 bg-white border-t border-mauve/20 space-y-2.5 sticky bottom-0 z-30 shadow-lg">
        {/* Giant BID Button */}
        <button
          onClick={handlePlaceBid}
          disabled={!canBid || bidding}
          className={`w-full py-4 rounded-2xl font-black text-lg sm:text-xl uppercase tracking-wide shadow-xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 ${
            isHighestBidder
              ? "bg-mint/20 text-mint-dark border-2 border-mint/40 cursor-not-allowed"
              : canBid
              ? "bg-gradient-to-r from-mint to-mint-dark hover:from-mint-light hover:to-mint text-turf-dark shadow-mint/30 ring-2 ring-mint/50"
              : "bg-sky/15 text-mauve-dark cursor-not-allowed"
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
            className="w-full py-2.5 rounded-xl bg-white hover:bg-rose/15 text-xs font-bold text-rose active:scale-95 transition-all border border-rose/30 shadow-sm"
          >
            {passing ? "Passing…" : "✋ Pass on this Player"}
          </button>
        )}
      </footer>
    </div>
  );
}
