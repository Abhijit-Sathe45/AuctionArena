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
import CricketAuctionPaddle from "../../components/CricketAuctionPaddle";
import PlayerAuctionPlaque from "../../components/PlayerAuctionPlaque";
import { getNextBidAmount } from "../../utils/bidIncrement";
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
  getActiveLanguageMode,
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
  const [settings, setSettings] = useState(null);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [queuePlayers, setQueuePlayers] = useState([]); // players currently in the shuffled queue, for preview
  const [onlineTeamIds, setOnlineTeamIds] = useState([]); // teams with owners currently connected online
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
    const [{ data: s }, { data: t }, { data: c }, settsRes] = await Promise.all([
      api.get("/auction/state"),
      api.get("/organizer-admin/teams"),
      api.get("/organizer-admin/categories"),
      api.get("/organizer-admin/settings").catch(() => null),
    ]);
    setState(s);
    setTeams(t);
    setCategories(c);
    if (settsRes?.data) setSettings(settsRes.data);
    if (Array.isArray(s.onlineTeamIds)) {
      setOnlineTeamIds(s.onlineTeamIds);
    }

    // Keep the queue preview in sync with the backend queue after any update
    if (s.currentCategory && s.playerQueue?.length) {
      const hasPopulated = s.playerQueue.some((p) => p && typeof p === "object" && p.name);
      if (hasPopulated) {
        setQueuePlayers(s.playerQueue.filter((p) => p && typeof p === "object" && p.name));
      } else {
        const { data: players } = await api.get(
          `/organizer-admin/players?status=PENDING`,
        );
        const byId = {};
        players.forEach((p) => {
          byId[p._id] = p;
        });
        setQueuePlayers(s.playerQueue.map((id) => byId[id?._id || id] || (typeof id === 'object' ? id : null)).filter(Boolean));
      }
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

    socket.on("online-teams-update", (payload) => {
      if (Array.isArray(payload?.onlineTeamIds)) {
        setOnlineTeamIds(payload.onlineTeamIds);
      }
    });

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
      socket.off("online-teams-update");
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
        const res = await emitWithAck(socketEvent, {
          ...socketPayload,
          token,
        });
        const newState = res?.state || res;
        if (newState) setState(newState);
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
    const targetTeam = teams.find((t) => (t._id || t).toString() === teamId.toString());
    const currentBid = state?.currentBidAmount || 0;
    const requiredBid = state?.currentPlayer
      ? currentBid > 0
        ? getNextBidAmount(currentBid, settings?.bidIncrementRules)
        : (state?.currentPlayer?.basePrice || 0)
      : 0;
    if (targetTeam) {
      const isFinished =
        (targetTeam.purseRemaining || 0) <= 0 ||
        (requiredBid > 0 && (targetTeam.purseRemaining || 0) < requiredBid);
      if (isFinished) {
        showToast(`${targetTeam.teamName}'s purse is finished! Cannot place bid.`, "error");
        return;
      }
    }
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
  const currentBidAmount = state.currentBidAmount || 0;
  const nextBidAmount = currentPlayer
    ? currentBidAmount > 0
      ? getNextBidAmount(currentBidAmount, settings?.bidIncrementRules)
      : (currentPlayer.basePrice || 0)
    : 0;

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
              title="Change Voice Tone, Accent & Language (Hinglish / Hindi / English)"
              className={`text-xs sm:text-sm py-2 px-2.5 font-semibold border-l transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                commentaryEnabled
                  ? "bg-mint hover:bg-mint-dark text-turf-dark border-turf-dark/20"
                  : "bg-black/10 hover:bg-black/20 text-turf border-black/10"
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">
                {getActiveLanguageMode() === "hinglish"
                  ? "⚡ Hinglish"
                  : getActiveLanguageMode() === "hi"
                  ? "🇮🇳 हिन्दी"
                  : "🌐 English"}
              </span>
            </button>
          </div>

          {/* OBS Stream Overlay Button */}
          <button
            onClick={() => setShowOverlayModal(true)}
            className="inline-flex items-center gap-1.5 btn-navy text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-xs font-bold"
            title="Open OBS / vMix Live Stream Overlay Link Generator"
          >
            <span>🎥</span>
            <span>Cricket TV Graphics</span>
          </button>

          {/* Demo Simulator Launcher Button */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="inline-flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 font-bold text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-xl shadow-xs transition-all duration-150 active:scale-95"
            title="Open Demo & Practice Auction Simulator"
          >
            <span>🎮</span>
            <span>Mock Practice</span>
          </button>

          <button
            onClick={() => {
              unlockAudio();
              setShowVideo((v) => !v);
            }}
            className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            {showVideo ? "📹 Hide Broadcast" : "📹 Video Broadcast"}
          </button>
        </div>
      </div>

      {/* Practice Simulator Control Bar */}
      <div className="mb-4 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-white">
                AI Auto-Bidder Practice Simulator
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                  botActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 animate-pulse"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {botActive ? "Active & Bidding" : "Standby"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Simulate franchise bidding wars hands-free to test timers, commentary, and sound.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Speed Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setBotSpeed("normal")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                botSpeed === "normal" ? "bg-[#0F5132] text-white font-bold shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              Realistic (2.4s)
            </button>
            <button
              type="button"
              onClick={() => setBotSpeed("fast")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                botSpeed === "fast" ? "bg-[#0F5132] text-white font-bold shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              Fast (1.3s)
            </button>
            <button
              type="button"
              onClick={() => setBotSpeed("intense")}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                botSpeed === "intense" ? "bg-red-600 text-white font-bold shadow-xs" : "text-slate-400 hover:text-white"
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
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 ${
              botActive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-[#0F5132] hover:bg-[#0A3E26] text-white"
            }`}
          >
            <span>{botActive ? "⏹ Stop Bots" : "▶ Start Auto-Bots"}</span>
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6 font-semibold flex items-center gap-2">
        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-xs font-bold font-mono">
          Round {state.currentRound}
        </span>
        {currentCategory ? (
          <span className="text-slate-700">
            · Category: <strong className="text-[#0F5132]">{currentCategory.name}</strong> (Base: ₹{currentCategory.basePrice?.toLocaleString("en-IN")})
          </span>
        ) : ""}
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
          <div className="card border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">1</span>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">Choose Player Category / Role</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categories.map((c) => (
                <button
                  key={c._id}
                  disabled={busy}
                  onClick={() => selectCategory(c._id)}
                  className={`text-left border-2 rounded-2xl p-3.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentCategory?._id === c._id
                      ? "border-[#0F5132] bg-emerald-50 shadow-xs"
                      : "border-slate-200 hover:border-slate-400 bg-white"
                  }`}
                >
                  <p className="font-bold text-xs sm:text-sm truncate text-slate-900">🏏 {c.name}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
                    Base: ₹{c.basePrice?.toLocaleString("en-IN")}
                  </p>
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-slate-400 text-sm col-span-full">
                  No categories yet — create some in the Categories tab first.
                </p>
              )}
            </div>
          </div>

          {/* STEP 2: Shuffle & preview queue */}
          {currentCategory && (
            <div className="card border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h2 className="font-bold text-sm sm:text-base text-slate-900">
                    Cricket Player Auction Order ({queuePlayers.length} in queue)
                  </h2>
                </div>
                <button
                  onClick={shuffleQueue}
                  disabled={busy}
                  className="btn-secondary text-xs sm:text-sm py-1.5 px-3 disabled:opacity-50 w-full sm:w-auto font-bold"
                >
                  🔀 Shuffle Order
                </button>
              </div>
              {queuePlayers.length > 0 ? (
                <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs sm:text-sm max-h-64 overflow-y-auto scroll-touch p-1">
                  {queuePlayers.map((p, i) => {
                    const playerName = p?.name || (typeof p === "string" ? `Player #${i + 1}` : "Cricketer");
                    const playerRole = p?.playerType || "Player";
                    const key = p?._id || `queue-${i}`;
                    return (
                      <li
                        key={key}
                        className="transition-transform duration-150 hover:scale-[1.02]"
                      >
                        <PlayerAuctionPlaque
                          name={playerName}
                          lotNumber={(i + 1).toString().padStart(2, "0")}
                          role={playerRole}
                          variant="compact"
                        />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-slate-400 text-sm">
                  No pending approved players in this category.
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Start auction */}
          {currentCategory && queuePlayers.length > 0 && (
            <div className="card text-center py-6 sm:py-8 shadow-sm border-emerald-500/40 bg-gradient-to-b from-white to-emerald-50/30">
              <h2 className="font-bold text-base sm:text-lg text-slate-900 mb-2">Step 3 — Bring Player to the Hammer</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Launch the bidding round for the next cricketer in queue with live audio commentary.
              </p>
              <button
                className="btn-primary py-3 px-8 text-base font-bold shadow-md"
                disabled={busy}
                onClick={() => nextPlayer()}
              >
                🔨 Bring Next Cricketer to Auction
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 mt-3">
          {/* Live Player Profile Box (Cricket Card) */}
          <div className="lg:col-span-5 xl:col-span-4 card text-center p-3.5 sm:p-4 shadow-sm border-slate-200">
            <div className="relative inline-block mx-auto mb-1">
              <PlayerPhoto
                src={currentPlayer?.photoUrl}
                photoUrl={currentPlayer?.photoUrl}
                name={currentPlayer?.name}
                sizeClass="w-28 h-28 sm:w-32 sm:h-32"
              />
              <span className="absolute bottom-0 right-0 bg-[#0B1E3D] text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
                🏏 {currentPlayer?.playerType || "Cricketer"}
              </span>
            </div>

            {/* 3D Wooden IPL Auction Nameplate Plaque */}
            <PlayerAuctionPlaque
              name={currentPlayer?.name || "Player in Auction"}
              lotNumber={currentPlayer?.lotNumber || currentPlayer?.jerseyNumber || "01"}
              role={currentPlayer?.playerType}
              league="IPL"
              variant="hero"
            />

            <div className="flex flex-wrap items-center justify-center gap-1.5 my-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                Age: {currentPlayer?.age || "—"}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                🏏 {currentPlayer?.battingStyle?.replace("_", " ") || "Right Hand Bat"}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                ⚡ {currentPlayer?.bowlingStyle?.replace("_", " ") || "Right Arm Fast"}
              </span>
            </div>

            {/* Synchronized Countdown Timer */}
            {state.countdownEnabled && timeLeft !== null && (
              <div
                className={`rounded-2xl p-2.5 border mb-3 transition-all duration-300 ${
                  timeLeft <= 5
                    ? "bg-red-50 border-red-300 text-red-700 animate-timer-heartbeat"
                    : timeLeft <= 15
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span>⏱️</span>
                  <span>{timeLeft <= 5 ? "HAMMER FALLING SOON!" : "Cricket Auction Clock"}</span>
                </p>
                <p className="font-scoreboard text-2xl sm:text-3xl font-black tracking-wider mt-0.5">
                  {formatTime(timeLeft)}
                </p>
                {timeLeft === 0 && (
                  <p className="text-[10px] text-red-600 font-bold animate-pulse mt-0.5">
                    Time expired · Under the hammer…
                  </p>
                )}
              </div>
            )}

            {/* Current Highest Bid Display */}
            <div className="bg-[#0B1E3D] text-white rounded-2xl p-3.5 border border-slate-700 shadow-sm">
              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                Current Bid Price
              </p>
              <p className="font-scoreboard text-2xl sm:text-3xl text-white font-black mt-0.5">
                ₹{state.currentBidAmount.toLocaleString("en-IN")}
              </p>
              {state.currentBidTeam ? (
                <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 flex items-center justify-center gap-1.5">
                  <span className="text-[11px] text-slate-300">Leading:</span>
                  <span className="font-bold text-amber-300 text-xs truncate max-w-[170px]">
                    🏆 {state.currentBidTeam.teamName}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">Waiting for opening bid…</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={markSold}
                disabled={busy || !state.currentBidTeam}
                className="btn-primary py-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-xs"
                title={!state.currentBidTeam ? "Place at least one bid before marking SOLD" : "Mark player as SOLD to highest bidder"}
              >
                🔨 Mark SOLD
              </button>
              <button
                onClick={markUnsold}
                disabled={
                  busy ||
                  !!state.currentBidTeam ||
                  (state.currentBidHistory && state.currentBidHistory.length > 0)
                }
                className="btn-danger py-2 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed font-bold shadow-xs"
                title={
                  state.currentBidTeam || (state.currentBidHistory && state.currentBidHistory.length > 0)
                    ? "Cannot mark unsold after bids have been placed. Mark SOLD or Undo Bid first."
                    : "Mark cricketer as UNSOLD"
                }
              >
                🔴 Mark UNSOLD
              </button>
            </div>
            <button
              onClick={undoBid}
              disabled={
                busy ||
                !state.currentBidHistory ||
                state.currentBidHistory.length === 0
              }
              className="btn-secondary w-full mt-2 py-1.5 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              ↩ Undo Last Bid
            </button>

            {queuePlayers.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-2.5 font-medium">
                {queuePlayers.length} more cricketer(s) queued in this category
              </p>
            )}
          </div>

          <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-5">
            <div className="card p-3.5 sm:p-4 border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <span>🏏</span> Place Bid For a Franchise
                  {onlineTeamIds.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                      {onlineTeamIds.length} Online
                    </span>
                  )}
                </h3>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {onlineTeamIds.length > 0
                    ? "Online team owners bid directly"
                    : "Click team paddle to place bid"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5 justify-items-center">
                {teams
                  .filter((t) => t.isApproved)
                  .map((t, idx) => {
                    const isHighestBidder = state.currentBidTeam?._id === t._id;
                    const isPending = pendingTeamId === t._id;
                    const hasPassed = state.passedTeams?.some(
                      (pt) => (pt._id || pt).toString() === t._id.toString()
                    );
                    const isTeamOnline = onlineTeamIds.some(
                      (oid) => (oid?._id || oid)?.toString() === t._id?.toString()
                    );
                    const isPurseFinished =
                      (t.purseRemaining || 0) <= 0 ||
                      (nextBidAmount > 0 && (t.purseRemaining || 0) < nextBidAmount);
                    const isBidDisabled =
                      busy || isHighestBidder || isTeamOnline || isPurseFinished || !state.currentPlayer;

                    return (
                      <CricketAuctionPaddle
                        key={t._id}
                        team={t}
                        index={idx}
                        isHighestBidder={isHighestBidder}
                        isPending={isPending}
                        hasPassed={hasPassed}
                        isTeamOnline={isTeamOnline}
                        isPurseFinished={isPurseFinished}
                        disabled={isBidDisabled}
                        onClick={() => placeBid(t._id)}
                      />
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === "commentary"
                      ? "bg-[#0F5132] text-white shadow-xs"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span>📜 Cricket Match Commentary</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("bidHistory")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === "bidHistory"
                      ? "bg-[#0F5132] text-white shadow-xs"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  <span>⚡ Bid Logs</span>
                  <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded-full font-mono">
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
                <div className="card border-slate-200">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-2.5 flex items-center justify-between">
                    <span>Bid History — {currentPlayer.name}</span>
                    <span className="text-xs text-amber-700 font-mono font-bold">
                      {state.currentBidHistory?.length || 0} Bids Logged
                    </span>
                  </h3>
                  {state.currentBidHistory && state.currentBidHistory.length > 0 ? (
                    <ol className="space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto scroll-touch pr-1">
                      {[...state.currentBidHistory].reverse().map((b, i) => (
                        <li
                          key={i}
                          className={`flex justify-between items-center text-xs sm:text-sm px-3 py-2 rounded-xl transition-colors ${
                            i === 0 ? "bg-amber-50 font-bold border border-amber-300 text-amber-950" : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="truncate max-w-[65%]">
                            {state.currentBidHistory.length - i}.{" "}
                            {b.team?.teamName || "Unknown Franchise"}
                          </span>
                          <span className="shrink-0 font-bold">₹{b.amount.toLocaleString("en-IN")}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-slate-400 text-xs sm:text-sm py-3">
                      No bids placed yet for this cricketer.
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
