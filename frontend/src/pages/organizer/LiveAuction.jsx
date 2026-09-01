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
import StreamOverlayModal from "../../components/StreamOverlayModal";
import LiveCommentaryFeed from "../../components/LiveCommentaryFeed";
import DemoSimulatorModal from "../../components/DemoSimulatorModal";
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
import {
  createIntroCommentary,
  createBidCommentary,
  createWarningCommentary,
  createSoldCommentary,
  createUnsoldCommentary,
  createAnnouncementCommentary,
  createRoundCommentary,
  buildHistoricalTimeline,
} from "../../utils/liveCommentaryEngine";

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
  const [showOverlayModal, setShowOverlayModal] = useState(false); // OBS stream overlay config modal
  const [showDemoModal, setShowDemoModal] = useState(false); // Demo tournament practice modal
  const [botActive, setBotActive] = useState(false); // AI bot auto-bidder practice simulator
  const [botSpeed, setBotSpeed] = useState("normal"); // 'normal' (2.5s) | 'fast' (1.3s) | 'intense' (0.8s)
  const [stampData, setStampData] = useState(null); // { result: 'SOLD' | 'UNSOLD', player, team, finalPrice }
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("commentary"); // 'commentary' | 'bidHistory'
  const [commentaryItems, setCommentaryItems] = useState([]);
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

      // 1. Text Commentary Stream Engine
      switch (payload?.event) {
        case "NEXT_PLAYER":
          if (payload?.state?.currentPlayer) {
            const intro = createIntroCommentary(payload.state.currentPlayer, payload.state.currentCategory);
            if (intro) setCommentaryItems((prev) => [intro, ...prev]);
          }
          break;
        case "BID_PLACED":
          if (payload?.state?.currentBidTeam) {
            const history = payload.state.currentBidHistory || [];
            const count = history.length;
            const prevTeam = count > 1 ? history[count - 2]?.team?.teamName : null;
            const bidCommentary = createBidCommentary(
              payload.state.currentPlayer,
              payload.state.currentBidTeam,
              payload.state.currentBidAmount,
              count,
              prevTeam
            );
            if (bidCommentary) setCommentaryItems((prev) => [bidCommentary, ...prev]);
          }
          break;
        case "PLAYER_SOLD":
          {
            const soldItem = createSoldCommentary(
              payload.player,
              payload.team,
              payload.finalPrice || payload.player?.soldPrice,
              lastBidCountRef.current
            );
            if (soldItem) setCommentaryItems((prev) => [soldItem, ...prev]);
          }
          break;
        case "PLAYER_UNSOLD":
          {
            const unsoldItem = createUnsoldCommentary(payload.player);
            if (unsoldItem) setCommentaryItems((prev) => [unsoldItem, ...prev]);
          }
          break;
        case "ANNOUNCEMENT":
          {
            const annItem = createAnnouncementCommentary(payload.message, payload.author);
            if (annItem) setCommentaryItems((prev) => [annItem, ...prev]);
          }
          break;
        case "RE_AUCTION_STARTED":
          {
            const roundItem = createRoundCommentary(payload.round);
            if (roundItem) setCommentaryItems((prev) => [roundItem, ...prev]);
          }
          break;
        default:
          break;
      }

      // 2. Play sound and voice commentary cues based on event type
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

  const handlePostAnnouncement = async (message) => {
    const token = localStorage.getItem("organizerToken");
    const res = await emitWithAck("auction:post-announcement", {
      token,
      message,
      author: info.tournamentName || "Auctioneer",
    });
    if (!res?.ok) throw new Error(res?.message || "Failed to broadcast announcement");
  };

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

  // AI Bot Auto-Bidder Practice Simulator Engine
  const botTargetBidsRef = useRef(5);

  useEffect(() => {
    if (state?.currentPlayer?._id) {
      // Random target between 3 and 7 bids per player
      botTargetBidsRef.current = Math.floor(Math.random() * 5) + 3;
    }
  }, [state?.currentPlayer?._id]);

  useEffect(() => {
    if (!botActive || !state?.currentPlayer || busy) return;

    const delayMs = botSpeed === "intense" ? 800 : botSpeed === "fast" ? 1300 : 2400;

    const botTimer = setTimeout(() => {
      if (!botActive || busy || pendingTeamId) return;

      const bidHistory = state.currentBidHistory || [];
      if (bidHistory.length >= botTargetBidsRef.current) {
        // Reached realistic bot bidding duel cap — allow timer / organizer to gavel SOLD
        return;
      }

      const currentBidTeamId = (state.currentBidTeam?._id || state.currentBidTeam || "").toString();
      const currentAmt = state.currentBidAmount || state.currentPlayer.basePrice || 0;
      const passedSet = new Set((state.passedTeams || []).map((t) => (t._id || t).toString()));

      // Find teams eligible to bid
      const eligibleTeams = teams.filter((t) => {
        const tid = t._id.toString();
        if (tid === currentBidTeamId) return false;
        if (passedSet.has(tid)) return false;
        return (t.purseRemaining || 0) > currentAmt;
      });

      if (eligibleTeams.length === 0) return;

      // Pick a random eligible team
      const chosenTeam = eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)];
      if (chosenTeam && chosenTeam._id) {
        placeBid(chosenTeam._id);
      }
    }, delayMs);

    return () => clearTimeout(botTimer);
  }, [botActive, botSpeed, state?.currentPlayer, state?.currentBidTeam, state?.currentBidAmount, state?.currentBidHistory, state?.passedTeams, teams, busy, pendingTeamId]);

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

      {/* OBS Stream Overlay Setup Modal */}
      <StreamOverlayModal
        isOpen={showOverlayModal}
        onClose={() => setShowOverlayModal(false)}
        slug={info.slug}
        tournamentName={info.tournamentName}
      />

      {/* Demo Tournament Simulator Modal */}
      <DemoSimulatorModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onDataChanged={refresh}
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
          <div className="flex items-center rounded-xl overflow-hidden shadow-sm border border-mauve/30">
            <button
              onClick={toggleCommentary}
              className={`text-xs sm:text-sm py-2 px-3.5 font-bold transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                commentaryEnabled
                  ? "bg-mint text-turf-dark"
                  : "bg-black/10 hover:bg-black/15 text-turf"
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
                  ? "bg-mint hover:bg-mint-dark text-turf-dark border-turf-dark/20"
                  : "bg-black/10 hover:bg-black/20 text-turf border-black/10"
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          {/* OBS Stream Overlay Button */}
          <button
            onClick={() => setShowOverlayModal(true)}
            className="inline-flex items-center gap-1.5 btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-sm font-bold"
            title="Open OBS / vMix Live Stream Overlay Link Generator"
          >
            <span>🎥</span>
            <span>OBS Overlay</span>
          </button>

          {/* Demo Simulator Launcher Button */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-sky/20 text-turf border border-mauve/35 font-bold text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-xl shadow-sm transition-all duration-150 active:scale-95"
            title="Open Demo & Practice Auction Simulator"
          >
            <span>🎮</span>
            <span>Practice Simulator</span>
          </button>

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

      {/* Practice Simulator Control Bar */}
      <div className="mb-4 bg-gradient-to-r from-sky/25 via-orchid/20 to-mint/20 border border-mauve/30 rounded-2xl p-3 sm:p-4 text-turf shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mint/20 text-mint-dark flex items-center justify-center text-lg shrink-0 shadow-inner">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-turf">
                AI Bot Auto-Bidder Simulator
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                  botActive
                    ? "bg-mint/25 text-mint-dark border border-mint/40 animate-pulse"
                    : "bg-white/80 text-mauve-dark border border-mauve/25"
                }`}
              >
                {botActive ? "Active & Bidding" : "Standby"}
              </span>
            </div>
            <p className="text-[11px] text-mauve-dark font-medium">
              Simulate realistic team bidding wars hands-free to test timers, commentary, and sound.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Speed Selector */}
          <div className="flex items-center bg-white rounded-xl p-1 border border-mauve/25 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setBotSpeed("normal")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                botSpeed === "normal" ? "bg-mint text-turf-dark font-bold shadow-sm" : "text-mauve-dark hover:text-turf"
              }`}
            >
              Realistic (2.4s)
            </button>
            <button
              type="button"
              onClick={() => setBotSpeed("fast")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                botSpeed === "fast" ? "bg-mint text-turf-dark font-bold shadow-sm" : "text-mauve-dark hover:text-turf"
              }`}
            >
              Fast (1.3s)
            </button>
            <button
              type="button"
              onClick={() => setBotSpeed("intense")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                botSpeed === "intense" ? "bg-rose text-white font-bold shadow-sm" : "text-mauve-dark hover:text-turf"
              }`}
            >
              Duel 🔥
            </button>
          </div>

          {/* Toggle Bot ON/OFF */}
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setBotActive((a) => !a);
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
              botActive
                ? "bg-rose hover:bg-rose-dark text-white"
                : "bg-mint hover:bg-mint-dark text-turf-dark"
            }`}
          >
            <span>{botActive ? "⏹ Stop Bots" : "▶ Start Auto-Bots"}</span>
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
                  className={`text-left border-2 rounded-2xl p-3.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${currentCategory?._id === c._id ? "border-mint bg-mint/15 shadow-sm" : "border-mauve/30 hover:border-mint/60"}`}
                >
                  <p className="font-semibold text-xs sm:text-sm truncate text-turf">{c.name}</p>
                  <p className="text-[11px] sm:text-xs text-mauve-dark mt-0.5">
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
                      className="px-3 py-2 rounded-xl bg-sky/10 border border-sky/20 flex items-center justify-between"
                    >
                      <span className="truncate font-medium text-turf">{i + 1}. {p.name}</span>
                      <span className="text-xs text-mauve-dark shrink-0 ml-2">{p.playerType}</span>
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
            <div className="card text-center py-6 sm:py-8 shadow-md border-mint/30">
              <h2 className="font-semibold text-sm sm:text-base mb-3">Step 3 — Start the Auction</h2>
              <button
                className="btn-primary py-3 px-8 text-base disabled:opacity-50 shadow-lg shadow-mint/25 font-bold"
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
          <div className="lg:col-span-1 card text-center p-4 sm:p-5 shadow-lg border-mauve/20">
            <PlayerPhoto src={currentPlayer.photoUrl} sizeClass="w-32 h-32 sm:w-40 sm:h-40" />
            <h2 className="font-display text-2xl sm:text-3xl text-turf mt-2">
              {currentPlayer.name}
            </h2>
            <p className="text-mauve-dark text-xs sm:text-sm">
              {currentPlayer.playerType} · Age {currentPlayer.age}
            </p>
            <p className="text-mauve-dark text-xs sm:text-sm">
              Bat: {currentPlayer.battingStyle.replace("_", " ")}
            </p>
            <p className="text-mauve-dark text-xs sm:text-sm mb-4">
              Bowl: {currentPlayer.bowlingStyle.replace("_", " ")}
            </p>

            {/* Synchronized Countdown Timer (when Countdown is ON) */}
            {state.countdownEnabled && timeLeft !== null && (
              <div
                className={`rounded-2xl p-3 border mb-3 transition-all duration-300 ${
                  timeLeft <= 5
                    ? "bg-rose/15 border-rose/50 shadow-[0_0_15px_rgba(222,108,131,0.3)] animate-timer-heartbeat"
                    : timeLeft <= 15
                    ? "bg-orchid/15 border-orchid/40"
                    : "bg-mint/10 border-mint/30"
                }`}
              >
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-mauve-dark flex items-center justify-center gap-1.5">
                  <span>⏱️</span>
                  <span>{timeLeft <= 5 ? "Bidding Ending Soon!" : "Auction Countdown"}</span>
                </p>
                <p
                  className={`font-display text-3xl sm:text-4xl font-bold tracking-widest mt-0.5 ${
                    timeLeft <= 5
                      ? "text-rose"
                      : timeLeft <= 15
                      ? "text-orchid-dark"
                      : "text-mint-dark"
                  }`}
                >
                  {formatTime(timeLeft)}
                </p>
                {timeLeft === 0 && (
                  <p className="text-[10px] text-rose font-semibold animate-pulse mt-0.5">
                    Time expired · Finalizing result…
                  </p>
                )}
              </div>
            )}

            <div className="bg-mint/15 rounded-2xl p-4 border border-mint/30 shadow-inner">
              <p className="text-[11px] sm:text-xs text-mauve-dark font-semibold uppercase tracking-wider">Current Bid</p>
              <p className="font-display text-3xl sm:text-4xl text-mint-dark mt-0.5 font-bold">
                Rs. {state.currentBidAmount.toLocaleString("en-IN")}
              </p>
              {state.currentBidTeam && (
                <p className="text-xs sm:text-sm mt-1.5 font-bold text-turf flex items-center justify-center gap-1.5">
                  <span>by</span>
                  <span className="truncate max-w-[180px]">{state.currentBidTeam.teamName}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={markSold}
                disabled={busy}
                className="btn-primary py-2.5 text-sm disabled:opacity-50 font-bold shadow-sm shadow-mint/20"
              >
                Mark SOLD
              </button>
              <button
                onClick={markUnsold}
                disabled={busy}
                className="btn-danger py-2.5 text-sm disabled:opacity-50 font-bold shadow-sm shadow-rose/20"
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
              <p className="text-xs text-mauve-dark mt-3">
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
                        className={`card text-left border-2 transition-all duration-150 active:scale-95 active:bg-mint/20 p-3 sm:p-4 select-none
                        disabled:cursor-not-allowed
                        ${isHighestBidder ? "border-mint bg-mint/15 shadow-md ring-2 ring-mint/40" : "border-mauve/20 hover:border-mint hover:shadow-md"}
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
                        <p className="text-[11px] sm:text-xs text-mauve-dark truncate">
                          Purse left: Rs.{" "}
                          {t.purseRemaining.toLocaleString("en-IN")}
                        </p>
                        {isPending && (
                          <p className="text-[11px] sm:text-xs text-mint-dark font-semibold mt-1.5 animate-pulse">
                            Placing bid…
                          </p>
                        )}
                        {isHighestBidder && !isPending && (
                          <p className="text-[11px] sm:text-xs text-mint-dark font-bold mt-1.5 flex items-center gap-1">
                            <span>✓</span> <span>Highest Bidder</span>
                          </p>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Tabbed Live Commentary Feed & Bid History */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("commentary")}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "commentary"
                      ? "bg-mint text-turf-dark shadow-sm font-extrabold"
                      : "bg-black/10 text-turf hover:bg-black/15"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose"></span>
                  </span>
                  <span>📜 Live Commentary Stream</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("bidHistory")}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "bidHistory"
                      ? "bg-mint text-turf-dark shadow-sm font-extrabold"
                      : "bg-black/10 text-turf hover:bg-black/15"
                  }`}
                >
                  <span>⚡ Bid History</span>
                  <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded-full font-mono">
                    {state.currentBidHistory?.length || 0}
                  </span>
                </button>
              </div>

              {activeTab === "commentary" ? (
                <div className="h-[360px]">
                  <LiveCommentaryFeed
                    items={commentaryItems}
                    isOrganizer={true}
                    onPostAnnouncement={handlePostAnnouncement}
                    tournamentName={info.tournamentName || "Tournament"}
                  />
                </div>
              ) : (
                <div className="card">
                  <h3 className="font-semibold text-sm sm:text-base mb-2.5 flex items-center justify-between">
                    <span>Bid History — {currentPlayer.name}</span>
                    <span className="text-xs text-gold-dark font-mono font-bold">
                      {state.currentBidHistory?.length || 0} Bids
                    </span>
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
              )}
            </div>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
