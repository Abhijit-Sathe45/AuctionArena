import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import { SkeletonCards } from "../../components/Skeleton";
import FloatingVideoPanel from "../../components/FloatingVideoPanel";
import { useToast } from "../../context/ToastContext";
import PlayerPhoto from "../../components/PlayerPhoto";
import AuctionStampOverlay from "../../components/AuctionStampOverlay";
import VoiceSettingsModal from "../../components/VoiceSettingsModal";
import { getSocket, emitWithAck } from "../../socket";
import {
  unlockAudio,
  playBidSound,
  playSoldSound,
  playUnsoldSound,
} from "../../utils/sounds";
import {
  announcePlayerIntroduction,
  announceBid,
  announceTenSecondWarning,
  announceGoingOnceGoingTwice,
  announceSold,
  announceUnsold,
  stopCommentary,
} from "../../utils/commentaryService";

export default function LiveAuction() {
  const { showToast } = useToast();
  const [state, setState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [queuePlayers, setQueuePlayers] = useState([]); // players currently in the shuffled queue, for preview
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false); // true while any action request is in flight
  const [pendingTeamId, setPendingTeamId] = useState(null); // which team's bid button is currently mid-click
  const [showVideo, setShowVideo] = useState(false); // whether the auctioneer's video broadcast panel is open
  const [stampData, setStampData] = useState(null); // { result: 'SOLD' | 'UNSOLD', player, team, finalPrice }
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(() => {
    return localStorage.getItem("aiCommentary_organizer") === "true";
  });
  const commentaryEnabledRef = useRef(commentaryEnabled);
  const hasAnnounced10sRef = useRef(false);
  const hasAnnounced4sRef = useRef(false);
  const lastBidCountRef = useRef(0);
  const lastPlayerIdRef = useRef(null);
  const info = JSON.parse(localStorage.getItem("organizerInfo") || "{}");
  const refreshTimer = useRef(null);
  // Unique, shareable video room derived from the organizer's tournament slug — the same
  // room the spectator Watch Live page joins (in view-only mode), so anyone with either
  // link ends up in the same broadcast.
  const videoRoomName = `AuctionArenaLive-${info.slug}`;

  // Reset 10s and 4s warning flags whenever a new bid is placed or player changes
  useEffect(() => {
    const currentBidCount = state?.currentBidHistory?.length || 0;
    const currentPid = state?.currentPlayer?._id || state?.currentPlayer || null;
    if (currentBidCount !== lastBidCountRef.current || currentPid !== lastPlayerIdRef.current) {
      lastBidCountRef.current = currentBidCount;
      lastPlayerIdRef.current = currentPid;
      hasAnnounced10sRef.current = false;
      hasAnnounced4sRef.current = false;
    }
  }, [state?.currentBidHistory?.length, state?.currentPlayer]);

  // Countdown timer calculation interval + 10s and 4s female auctioneer warnings
  useEffect(() => {
    if (!state?.currentPlayer || !state?.countdownEnabled || !state?.biddingEndsAt) {
      setTimeLeft(null);
      return;
    }

    function calculateRemaining() {
      const endsAt = new Date(state.biddingEndsAt).getTime();
      const diffMs = Math.max(0, endsAt - Date.now());
      const seconds = Math.ceil(diffMs / 1000);
      setTimeLeft(seconds);

      // Voice announcements at 10s and 4s
      if (commentaryEnabledRef.current) {
        if (seconds <= 10 && seconds > 4 && !hasAnnounced10sRef.current) {
          hasAnnounced10sRef.current = true;
          const teamName = state.currentBidTeam?.teamName || null;
          const amount = state.currentBidAmount || 0;
          const playerName = state.currentPlayer?.name;
          const basePrice = state.currentPlayer?.basePrice;
          announceTenSecondWarning(teamName, amount, playerName, basePrice);
        } else if (seconds <= 4 && seconds > 0 && !hasAnnounced4sRef.current) {
          hasAnnounced4sRef.current = true;
          const teamName = state.currentBidTeam?.teamName || null;
          const amount = state.currentBidAmount || 0;
          const playerName = state.currentPlayer?.name;
          announceGoingOnceGoingTwice(teamName, amount, playerName);
        }
      }
    }

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 100);
    return () => clearInterval(interval);
  }, [state?.currentPlayer, state?.countdownEnabled, state?.biddingEndsAt, state?.currentBidTeam, state?.currentBidAmount]);

  const refresh = useCallback(async () => {
    const [{ data: s }, { data: t }, { data: c }] = await Promise.all([
      api.get("/auction/state"),
      api.get("/organizer-admin/teams"),
      api.get("/organizer-admin/categories"),
    ]);
    setState(s);
    setTeams(t);
    setCategories(c);

    // Keep the queue preview in sync with the backend queue after any update
    if (s.currentCategory && s.playerQueue?.length) {
      const { data: players } = await api.get(
        `/organizer-admin/players?status=PENDING`,
      );
      const byId = {};
      players.forEach((p) => {
        byId[p._id] = p;
      });
      setQueuePlayers(s.playerQueue.map((id) => byId[id]).filter(Boolean));
    } else {
      setQueuePlayers([]);
    }
  }, []);

  // Collapses bursts of Socket.io events (e.g. several bids in quick succession from other
  // devices watching the same auction) into a single refresh instead of one network round-trip per event.
  const scheduleRefresh = useCallback(
    (delay = 200) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(refresh, delay);
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    const socket = getSocket();
    socket.connect();
    socket.emit("join-auction", info.id);
    socket.on("auction-update", (payload) => {
      if (payload?.state) {
        setState(payload.state);
      }

      // Play sound and voice commentary cues based on event type
      if (commentaryEnabledRef.current) {
        switch (payload?.event) {
          case "NEXT_PLAYER":
            if (payload?.state?.currentPlayer) {
              announcePlayerIntroduction(payload.state.currentPlayer, payload.state.currentCategory);
            }
            break;
          case "BID_PLACED":
            if (payload?.state?.currentBidTeam) {
              const teamName = payload.state.currentBidTeam.teamName || "Team";
              announceBid(teamName, payload.state.currentBidAmount);
            }
            break;
          case "PLAYER_SOLD":
            announceSold(
              payload.player?.name,
              payload.team?.teamName,
              payload.finalPrice || payload.player?.soldPrice
            );
            break;
          case "PLAYER_UNSOLD":
            announceUnsold(payload.player?.name);
            break;
          default:
            break;
        }
      }

      switch (payload?.event) {
        case "BID_PLACED":
          playBidSound();
          break;
        case "PLAYER_SOLD":
          playSoldSound();
          setStampData({
            result: "SOLD",
            player: payload.player,
            team: payload.team,
            finalPrice: payload.finalPrice || payload.player?.soldPrice,
          });
          scheduleRefresh(100);
          break;
        case "PLAYER_UNSOLD":
          playUnsoldSound();
          setStampData({
            result: "UNSOLD",
            player: payload.player,
            team: null,
            finalPrice: 0,
          });
          scheduleRefresh(100);
          break;
        case "NEXT_PLAYER":
          setStampData(null);
          scheduleRefresh(100);
          break;
        default:
          break;
      }
    });
    return () => {
      socket.off("auction-update");
      socket.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line
  }, []);

  // Used for actions that structurally change data (category/queue/player transitions) —
  // these still do a full refresh since teams/queue/categories may all need to update.
  async function callAction(fn) {
    if (busy) return; // ignore clicks while a request is already in flight
    unlockAudio(); // satisfies the browser's autoplay policy using this click as the user gesture
    setStatus({ type: "", message: "" });
    setBusy(true);
    try {
      const result = await fn();
      await refresh();
      return result;
    } catch (err) {
      setStatus({ type: "error", message: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  // Used for bid/undo — tries the WebSocket fast path first (skips a full HTTP round trip,
  // which matters most during a fast back-and-forth bidding war), and transparently falls
  // back to the regular REST endpoint if the socket isn't connected or doesn't answer in time.
  async function callActionFast(socketEvent, socketPayload, restFn) {
    unlockAudio();
    setStatus({ type: "", message: "" });
    try {
      const token = localStorage.getItem("organizerToken");
      try {
        const data = await emitWithAck(socketEvent, {
          ...socketPayload,
          token,
        });
        if (data) setState(data);
      } catch (socketErr) {
        const isConnectivityIssue =
          socketErr.message === "SOCKET_NOT_CONNECTED" ||
          socketErr.message === "SOCKET_TIMEOUT";
        if (!isConnectivityIssue) throw socketErr; // real validation error — no point retrying over REST
        // Socket path unavailable — fall back to REST transparently
        const { data } = await restFn();
        if (data) setState(data);
      }
    } catch (err) {
      setStatus({ type: "error", message: describeError(err) });
    }
  }

  function describeError(err) {
    if (err.code === "ECONNABORTED")
      return "That took too long and timed out. Please check your connection and try again.";
    if (err.response) return err.response?.data?.message || "Action failed"; // axios (REST) error
    if (err.message && !err.request) return err.message; // socket error (plain Error with a message)
    return "Network error — check your internet connection and try again.";
  }

  async function selectCategory(categoryId) {
    const res = await callAction(() =>
      api.post("/auction/select-category", { categoryId }),
    );
    if (res?.data?.players) setQueuePlayers(res.data.players);
  }
  async function shuffleQueue() {
    const res = await callAction(() => api.post("/auction/shuffle-queue"));
    if (res?.data?.players) {
      setQueuePlayers(res.data.players);
      showToast("Player order shuffled.", "info");
    }
  }
  const nextPlayer = (playerId) =>
    callAction(() =>
      api.post("/auction/next-player", playerId ? { playerId } : {}),
    );
  async function placeBid(teamId) {
    if (pendingTeamId) return;
    setPendingTeamId(teamId);
    try {
      await callActionFast("auction:bid", { teamId }, () =>
        api.post("/auction/bid", { teamId }),
      );
    } finally {
      setPendingTeamId(null);
    }
  }
  async function undoBid() {
    if (pendingTeamId) return;
    setPendingTeamId("undo");
    try {
      await callActionFast("auction:undo-bid", {}, () => api.post("/auction/undo-bid"));
    } finally {
      setPendingTeamId(null);
    }
  }
  function formatTime(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined) return "00:00";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function toggleCommentary() {
    unlockAudio();
    const next = !commentaryEnabled;
    setCommentaryEnabled(next);
    commentaryEnabledRef.current = next;
    localStorage.setItem("aiCommentary_organizer", next.toString());
    if (!next) stopCommentary();
  }

  async function markSold() {
    const res = await callAction(() => api.post("/auction/sold"));
    if (res?.data?.player) {
      setStampData({
        result: "SOLD",
        player: res.data.player,
        team: res.data.team,
        finalPrice: res.data.player?.soldPrice,
      });
    }
  }
  async function markUnsold() {
    const res = await callAction(() => api.post("/auction/unsold"));
    if (res?.data?.player) {
      setStampData({
        result: "UNSOLD",
        player: res.data.player,
        team: null,
        finalPrice: 0,
      });
    }
  }
  const reAuction = () =>
    callAction(() => api.post("/auction/re-auction-unsold"));

  if (!state)
    return (
      <OrganizerLayout>
        <SkeletonCards count={3} />
      </OrganizerLayout>
    );

  const currentPlayer = state.currentPlayer;
  const currentCategory = state.currentCategory;

  return (
    <OrganizerLayout>
      {/* 3D Rubber Stamp Animation Overlay (also visible on organizer screen) */}
      {stampData && (
        <AuctionStampOverlay
          result={stampData.result}
          player={stampData.player}
          team={stampData.team}
          finalPrice={stampData.finalPrice}
          onClose={() => setStampData(null)}
          autoDismissTime={5000}
        />
      )}

      {/* AI Voice Selection Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettingsModal}
        onClose={() => setShowVoiceSettingsModal(false)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <h1 className="font-display text-2xl sm:text-3xl text-turf">Live Auction</h1>
        <div className="flex items-center gap-2.5 flex-wrap">
          {busy && (
            <span className="text-xs text-black/50 font-medium animate-pulse bg-gold/15 px-2.5 py-1 rounded-md">
              Processing…
            </span>
          )}

          {/* AI Voice Toggle & Voice Selector Button */}
          <div className="flex items-center rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={toggleCommentary}
              className={`text-xs sm:text-sm py-2 px-3 font-semibold transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                commentaryEnabled
                  ? "bg-gold text-turf-dark"
                  : "bg-black/10 hover:bg-black/15 text-black/70"
              }`}
            >
              <span>🎙️</span>
              <span>AI Voice: {commentaryEnabled ? "ON" : "OFF"}</span>
            </button>
            <button
              onClick={() => {
                unlockAudio();
                setShowVoiceSettingsModal(true);
              }}
              title="Change Voice Tone & Accent (5 Options)"
              className={`text-xs sm:text-sm py-2 px-2.5 font-semibold border-l transition-all duration-150 active:scale-95 flex items-center gap-1 ${
                commentaryEnabled
                  ? "bg-gold hover:bg-gold-dark text-turf-dark border-turf-dark/20"
                  : "bg-black/10 hover:bg-black/20 text-black/70 border-black/10"
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          <button
            onClick={() => {
              unlockAudio();
              setShowVideo((v) => !v);
            }}
            className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            {showVideo ? "📹 Hide Video Broadcast" : "📹 Start Video Broadcast"}
          </button>
        </div>
      </div>
      <p className="text-xs sm:text-sm text-black/50 mb-4 sm:mb-6">
        Round {state.currentRound}
        {currentCategory ? ` · Category: ${currentCategory.name}` : ""}
      </p>

      {showVideo && (
        <FloatingVideoPanel
          title="🎥 Auctioneer Video"
          src={`https://meet.jit.si/${videoRoomName}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`}
          onClose={() => setShowVideo(false)}
        />
      )}

      <StatusMessage type={status.type} message={status.message} />

      {!currentPlayer ? (
        <div className="mt-3 space-y-4 sm:space-y-6">
          {/* STEP 1: Choose category */}
          <div className="card">
            <h2 className="font-semibold text-sm sm:text-base mb-3">Step 1 — Choose a Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {categories.map((c) => (
                <button
                  key={c._id}
                  disabled={busy}
                  onClick={() => selectCategory(c._id)}
                  className={`text-left border-2 rounded-xl p-3 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${currentCategory?._id === c._id ? "border-gold bg-gold/10" : "border-black/10 hover:border-black/25"}`}
                >
                  <p className="font-semibold text-xs sm:text-sm truncate">{c.name}</p>
                  <p className="text-[11px] sm:text-xs text-black/60 mt-0.5">
                    Base: Rs. {c.basePrice}
                  </p>
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-black/40 text-sm col-span-full">
                  No categories yet — create some in the Categories tab first.
                </p>
              )}
            </div>
          </div>

          {/* STEP 2: Shuffle & preview queue */}
          {currentCategory && (
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <h2 className="font-semibold text-sm sm:text-base">
                  Step 2 — Player Order ({queuePlayers.length} in queue)
                </h2>
                <button
                  onClick={shuffleQueue}
                  disabled={busy}
                  className="btn-secondary text-xs sm:text-sm py-1.5 px-3 disabled:opacity-50 w-full sm:w-auto"
                >
                  🔀 Shuffle Player Order
                </button>
              </div>
              {queuePlayers.length > 0 ? (
                <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs sm:text-sm max-h-56 overflow-y-auto scroll-touch pr-1">
                  {queuePlayers.map((p, i) => (
                    <li
                      key={p._id}
                      className="px-3 py-2 rounded-lg bg-turf/5 border border-black/5 flex items-center justify-between"
                    >
                      <span className="truncate font-medium">{i + 1}. {p.name}</span>
                      <span className="text-xs text-black/50 shrink-0 ml-2">{p.playerType}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-black/40 text-sm">
                  No pending approved players in this category.
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Start auction */}
          {currentCategory && queuePlayers.length > 0 && (
            <div className="card text-center py-6 sm:py-8">
              <h2 className="font-semibold text-sm sm:text-base mb-3">Step 3 — Start the Auction</h2>
              <button
                className="btn-primary py-3 px-6 text-base disabled:opacity-50 shadow-md"
                disabled={busy}
                onClick={() => nextPlayer()}
              >
                Start Auction (Next in Queue)
              </button>
            </div>
          )}

          <div className="card text-center py-4">
            <button
              className="btn-secondary text-xs sm:text-sm py-2 disabled:opacity-50"
              disabled={busy}
              onClick={reAuction}
            >
              Re-auction Unsold Players (New Round)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-3">
          <div className="lg:col-span-1 card text-center p-4 sm:p-5">
            <PlayerPhoto src={currentPlayer.photoUrl} sizeClass="w-32 h-32 sm:w-40 sm:h-40" />
            <h2 className="font-display text-2xl sm:text-3xl text-turf">
              {currentPlayer.name}
            </h2>
            <p className="text-black/60 text-xs sm:text-sm">
              {currentPlayer.playerType} · Age {currentPlayer.age}
            </p>
            <p className="text-black/60 text-xs sm:text-sm">
              Bat: {currentPlayer.battingStyle.replace("_", " ")}
            </p>
            <p className="text-black/60 text-xs sm:text-sm mb-4">
              Bowl: {currentPlayer.bowlingStyle.replace("_", " ")}
            </p>

            {/* Synchronized Countdown Timer (when Countdown is ON) */}
            {state.countdownEnabled && timeLeft !== null && (
              <div
                className={`rounded-xl p-3 border mb-3 transition-all duration-300 ${
                  timeLeft <= 5
                    ? "bg-red-500/15 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-timer-heartbeat"
                    : timeLeft <= 15
                    ? "bg-amber-500/10 border-amber-500/40"
                    : "bg-turf/5 border-turf/20"
                }`}
              >
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black/60 flex items-center justify-center gap-1.5">
                  <span>⏱️</span>
                  <span>{timeLeft <= 5 ? "Bidding Ending Soon!" : "Auction Countdown"}</span>
                </p>
                <p
                  className={`font-display text-3xl sm:text-4xl font-bold tracking-widest mt-0.5 ${
                    timeLeft <= 5
                      ? "text-red-600"
                      : timeLeft <= 15
                      ? "text-amber-600"
                      : "text-turf"
                  }`}
                >
                  {formatTime(timeLeft)}
                </p>
                {timeLeft === 0 && (
                  <p className="text-[10px] text-red-600 font-semibold animate-pulse mt-0.5">
                    Time expired · Finalizing result…
                  </p>
                )}
              </div>
            )}

            <div className="bg-gold/15 rounded-xl p-4 border border-gold/30">
              <p className="text-[11px] sm:text-xs text-black/60 font-medium uppercase tracking-wider">Current Bid</p>
              <p className="font-display text-3xl sm:text-4xl text-gold-dark mt-0.5">
                Rs. {state.currentBidAmount.toLocaleString("en-IN")}
              </p>
              {state.currentBidTeam && (
                <p className="text-xs sm:text-sm mt-1.5 font-semibold text-turf flex items-center justify-center gap-1.5">
                  <span>by</span>
                  <span className="truncate max-w-[180px]">{state.currentBidTeam.teamName}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={markSold}
                disabled={busy}
                className="btn-primary py-2.5 text-sm disabled:opacity-50"
              >
                Mark SOLD
              </button>
              <button
                onClick={markUnsold}
                disabled={busy}
                className="btn-danger py-2.5 text-sm disabled:opacity-50"
              >
                Mark UNSOLD
              </button>
            </div>
            <button
              onClick={undoBid}
              disabled={
                busy ||
                !state.currentBidHistory ||
                state.currentBidHistory.length === 0
              }
              className="btn-secondary w-full mt-2 py-2 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↩ Undo Last Bid
            </button>
            {queuePlayers.length > 0 && (
              <p className="text-xs text-black/40 mt-3">
                {queuePlayers.length} more player(s) queued in this category
              </p>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div>
              <h3 className="font-semibold text-sm sm:text-base mb-2.5">Place Bid For a Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                {teams
                  .filter((t) => t.isApproved)
                  .map((t) => {
                    const isHighestBidder = state.currentBidTeam?._id === t._id;
                    const isPending = pendingTeamId === t._id;
                    const hasPassed = state.passedTeams?.some(pt => (pt._id || pt).toString() === t._id.toString());
                    return (
                      <button
                        key={t._id}
                        onClick={() => placeBid(t._id)}
                        disabled={busy || isHighestBidder}
                        className={`card text-left border-2 transition-all duration-150 active:scale-95 active:bg-gold/20 p-3 sm:p-4 select-none
                        disabled:cursor-not-allowed
                        ${isHighestBidder ? "border-gold bg-gold/10 shadow-md ring-2 ring-gold/40" : "border-black/10 hover:border-gold hover:shadow-md"}
                        ${hasPassed ? "bg-slate-100/70 border-slate-300 opacity-75" : ""}
                        ${busy && !isHighestBidder ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {t.teamLogoUrl ? (
                              <img
                                src={t.teamLogoUrl}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0"
                                alt=""
                              />
                            ) : (
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-turf/10 text-turf flex items-center justify-center text-xs shrink-0">
                                🏏
                              </div>
                            )}
                            <p className="font-semibold text-xs sm:text-sm truncate">{t.teamName}</p>
                          </div>
                          {hasPassed && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold shrink-0">
                              Passed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-black/60 truncate">
                          Purse left: Rs.{" "}
                          {t.purseRemaining.toLocaleString("en-IN")}
                        </p>
                        {isPending && (
                          <p className="text-[11px] sm:text-xs text-gold-dark font-semibold mt-1.5 animate-pulse">
                            Placing bid…
                          </p>
                        )}
                        {isHighestBidder && !isPending && (
                          <p className="text-[11px] sm:text-xs text-gold-dark font-bold mt-1.5 flex items-center gap-1">
                            <span>✓</span> <span>Highest Bidder</span>
                          </p>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-sm sm:text-base mb-2.5">
                Bid History — {currentPlayer.name}
              </h3>
              {state.currentBidHistory && state.currentBidHistory.length > 0 ? (
                <ol className="space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto scroll-touch pr-1">
                  {[...state.currentBidHistory].reverse().map((b, i) => (
                    <li
                      key={i}
                      className={`flex justify-between items-center text-xs sm:text-sm px-3 py-2 rounded-lg transition-colors ${
                        i === 0 ? "bg-gold/15 font-semibold border border-gold/30" : "bg-black/5"
                      }`}
                    >
                      <span className="truncate max-w-[65%]">
                        {state.currentBidHistory.length - i}.{" "}
                        {b.team?.teamName || "Unknown Team"}
                      </span>
                      <span className="shrink-0 font-medium">Rs. {b.amount.toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-black/40 text-xs sm:text-sm py-3">
                  No bids placed yet for this player.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
