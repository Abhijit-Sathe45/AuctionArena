import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { getSocket } from "../../socket";
import PlayerPhoto from "../../components/PlayerPhoto";
import TeamLogo from "../../components/TeamLogo";
import PlayerAuctionPlaque from "../../components/PlayerAuctionPlaque";
import FloatingVideoPanel from "../../components/FloatingVideoPanel";
import AuctionStampOverlay from "../../components/AuctionStampOverlay";
import VoiceSettingsModal from "../../components/VoiceSettingsModal";
import LiveCommentaryFeed from "../../components/LiveCommentaryFeed";
import AuctionAnalyticsWidget from "../../components/AuctionAnalyticsWidget";
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

export default function WatchLive() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState("commentary"); // 'commentary' | 'bidHistory'
  const [commentaryItems, setCommentaryItems] = useState([]);
  const [commentaryEnabled, setCommentaryEnabled] = useState(() => {
    return localStorage.getItem("aiCommentary_spectator") === "true";
  });
  const commentaryEnabledRef = useRef(commentaryEnabled);
  const hasAnnounced10sRef = useRef(false);
  const hasAnnounced4sRef = useRef(false);
  const lastBidCountRef = useRef(0);
  const lastPlayerIdRef = useRef(null);

  // 3D Stamp animation overlay state
  const [stampData, setStampData] = useState(null); // { result: 'SOLD' | 'UNSOLD', player, team, finalPrice }

  // Synchronized countdown timer state
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const serverOffsetRef = useRef(0);

  const refreshTimer = useRef(null);
  const organizerIdRef = useRef(null);
  const soundEnabledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/public/${slug}/live-auction`);
      setData(d);
      organizerIdRef.current = d.organizerId;

      if (d.serverTime) {
        serverOffsetRef.current = d.serverTime - Date.now();
      }

      // Initialize live commentary timeline from recent sales & current state
      setCommentaryItems((prev) => {
        if (prev.length > 0) return prev;
        return buildHistoricalTimeline(
          d.recentSales,
          d.state?.currentBidHistory,
          d.state?.currentPlayer
        );
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this auction.");
    }
  }, [slug]);

  const scheduleRefresh = useCallback(
    (delay = 200) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, delay);
    },
    [load],
  );

  // Reset 10s and 4s warning flags whenever a new bid is placed or player changes
  useEffect(() => {
    const state = data?.state;
    const currentBidCount = state?.currentBidHistory?.length || 0;
    const currentPid = state?.currentPlayer?._id || state?.currentPlayer || null;
    if (currentBidCount !== lastBidCountRef.current || currentPid !== lastPlayerIdRef.current) {
      lastBidCountRef.current = currentBidCount;
      lastPlayerIdRef.current = currentPid;
      hasAnnounced10sRef.current = false;
      hasAnnounced4sRef.current = false;
    }
  }, [data?.state?.currentBidHistory?.length, data?.state?.currentPlayer]);

  // High-frequency countdown timer interval + 10s and 4s female auctioneer warnings
  useEffect(() => {
    const state = data?.state;
    if (!state?.currentPlayer || !state?.countdownEnabled || !state?.biddingEndsAt) {
      setTimeLeft(null);
      return;
    }

    function calculateRemaining() {
      const endsAt = new Date(state.biddingEndsAt).getTime();
      const currentServerNow = Date.now() + serverOffsetRef.current;
      const diffMs = Math.max(0, endsAt - currentServerNow);
      const seconds = Math.ceil(diffMs / 1000);
      setTimeLeft(seconds);

      // Voice announcements & Live Commentary warnings at 10s and 4s
      if (seconds <= 10 && seconds > 4 && !hasAnnounced10sRef.current) {
        hasAnnounced10sRef.current = true;
        const teamName = state.currentBidTeam?.teamName || null;
        const amount = state.currentBidAmount || 0;
        const playerName = state.currentPlayer?.name;
        const basePrice = state.currentPlayer?.basePrice;

        if (commentaryEnabledRef.current) {
          announceTenSecondWarning(teamName, amount, playerName, basePrice);
        }
        const warnItem = createWarningCommentary(state.currentPlayer, state.currentBidTeam, amount, 10);
        if (warnItem) {
          setCommentaryItems((prev) => [warnItem, ...prev.slice(0, 99)]);
        }
      } else if (seconds <= 4 && seconds > 0 && !hasAnnounced4sRef.current) {
        hasAnnounced4sRef.current = true;
        const teamName = state.currentBidTeam?.teamName || null;
        const amount = state.currentBidAmount || 0;
        const playerName = state.currentPlayer?.name;

        if (commentaryEnabledRef.current) {
          announceGoingOnceGoingTwice(teamName, amount, playerName);
        }
        const warnItem = createWarningCommentary(state.currentPlayer, state.currentBidTeam, amount, 4);
        if (warnItem) {
          setCommentaryItems((prev) => [warnItem, ...prev.slice(0, 99)]);
        }
      }
    }

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 100);
    return () => clearInterval(interval);
  }, [data?.state]);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.connect();

    function handleConnect() {
      if (organizerIdRef.current) {
        socket.emit("join-auction", organizerIdRef.current);
      }
    }

    function handleAuctionUpdate(payload) {
      if (payload && payload.event) {
        if (payload.event === "BID_PLACED" && soundEnabledRef.current) {
          playBidSound();
        } else if (payload.event === "PLAYER_SOLD" && soundEnabledRef.current) {
          playSoldSound();
        } else if (payload.event === "PLAYER_UNSOLD" && soundEnabledRef.current) {
          playUnsoldSound();
        }

        // Live Commentary Engine integration
        if (payload.event === "PLAYER_INTRODUCED" && payload.player) {
          if (commentaryEnabledRef.current) {
            announcePlayerIntroduction(payload.player);
          }
          const item = createIntroCommentary(payload.player);
          if (item) setCommentaryItems((prev) => [item, ...prev.slice(0, 99)]);
        } else if (payload.event === "BID_PLACED" && payload.team && payload.amount) {
          if (commentaryEnabledRef.current) {
            announceBid(payload.team.teamName, payload.amount, payload.player?.name);
          }
          const item = createBidCommentary(payload.player, payload.team, payload.amount, payload.bidCount);
          if (item) setCommentaryItems((prev) => [item, ...prev.slice(0, 99)]);
        } else if (payload.event === "PLAYER_SOLD" && payload.player && payload.team) {
          setStampData({
            result: "SOLD",
            player: payload.player,
            team: payload.team,
            finalPrice: payload.amount,
          });
          if (commentaryEnabledRef.current) {
            announceSold(payload.player.name, payload.team.teamName, payload.amount);
          }
          const item = createSoldCommentary(payload.player, payload.team, payload.amount);
          if (item) setCommentaryItems((prev) => [item, ...prev.slice(0, 99)]);
        } else if (payload.event === "PLAYER_UNSOLD" && payload.player) {
          setStampData({
            result: "UNSOLD",
            player: payload.player,
            team: null,
            finalPrice: 0,
          });
          if (commentaryEnabledRef.current) {
            announceUnsold(payload.player.name);
          }
          const item = createUnsoldCommentary(payload.player);
          if (item) setCommentaryItems((prev) => [item, ...prev.slice(0, 99)]);
        } else if (payload.event === "ANNOUNCEMENT" && payload.text) {
          const item = createAnnouncementCommentary(payload.text, payload.author);
          if (item) setCommentaryItems((prev) => [item, ...prev.slice(0, 99)]);
        } else if (payload.event === "ROUND_STARTED" && payload.round) {
          const item = createRoundCommentary(payload.round, payload.categoryName);
          if (item) setCommentaryItems((prev) => [item, ...prev.slice(0, 99)]);
        }
      }
      scheduleRefresh(150);
    }

    socket.on("connect", handleConnect);
    socket.on("auction-update", handleAuctionUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("auction-update", handleAuctionUpdate);
      socket.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      stopCommentary();
    };
  }, [load, scheduleRefresh]);

  useEffect(() => {
    if (data?.organizerId) {
      organizerIdRef.current = data.organizerId;
      const socket = getSocket();
      if (socket.connected) {
        socket.emit("join-auction", data.organizerId);
      }
    }
  }, [data?.organizerId]);

  function enableSound() {
    unlockAudio();
    setSoundEnabled(true);
    soundEnabledRef.current = true;
  }

  function toggleCommentary() {
    unlockAudio();
    const next = !commentaryEnabled;
    setCommentaryEnabled(next);
    commentaryEnabledRef.current = next;
    localStorage.setItem("aiCommentary_spectator", next.toString());
    if (!next) stopCommentary();
  }

  function formatTime(sec) {
    if (sec === null || sec === undefined) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ivory text-turf flex items-center justify-center p-4">
        <div className="bg-white border border-rose/40 rounded-3xl p-6 text-center max-w-sm shadow-xl">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="font-bold text-rose">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ivory text-turf flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-mauve/20" />
            <div className="absolute inset-0 rounded-full border-4 border-mint border-t-transparent animate-spin" />
          </div>
          <p className="text-mauve-dark text-sm font-medium">Connecting to live auction…</p>
        </div>
      </div>
    );
  }

  const { tournamentName, logoUrl, state, teams, recentSales } = data;
  const currentPlayer = state?.currentPlayer;
  const currentCategory = state?.currentCategory;
  const videoRoomName = `AuctionArenaLive-${slug}`;
  const isCountdownActive = state?.countdownEnabled && timeLeft !== null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-3 sm:p-6 max-w-6xl mx-auto">
      {/* 3D Stamp animation overlay */}
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

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0 border border-slate-300 shadow-xs"
              alt=""
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0B1E3D] text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-xs border border-slate-700">
              🏏
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-2xl sm:text-3xl tracking-tight truncate text-slate-900 font-black">
              {tournamentName}
            </p>
            <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-2 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse inline-block shrink-0" />{" "}
              LIVE CRICKET AUCTION
              {currentCategory && <span className="truncate text-emerald-800"> · {currentCategory.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Voice Toggle & Voice Selector Button */}
          <div className="flex items-center rounded-xl overflow-hidden shadow-2xs border border-slate-300 bg-white">
            <button
              onClick={toggleCommentary}
              className={`font-bold text-xs sm:text-sm px-3.5 py-2 transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                commentaryEnabled
                  ? "bg-[#0F5132] text-white"
                  : "bg-white hover:bg-slate-100 text-slate-800"
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
              title="Change Voice Tone & Accent"
              className={`font-semibold text-xs sm:text-sm px-2.5 py-2 border-l border-slate-300 transition-all duration-150 active:scale-95 flex items-center gap-1 ${
                commentaryEnabled
                  ? "bg-[#0A3E26] text-white hover:bg-[#072F1C]"
                  : "bg-white hover:bg-slate-100 text-slate-800"
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          {!soundEnabled && (
            <button
              onClick={enableSound}
              className="btn-primary text-xs sm:text-sm px-3.5 py-2 shadow-xs font-bold"
            >
              🔊 Enable Sound
            </button>
          )}
          {soundEnabled && (
            <span className="text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl font-bold">🔊 Sound on</span>
          )}
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2 font-bold"
          >
            {showVideo ? "Hide Video" : "📹 Live Video Feed"}
          </button>
        </div>
      </div>

      {showVideo && (
        <FloatingVideoPanel
          title="🎥 Auctioneer's Live Video (view only)"
          src={`https://meet.jit.si/${videoRoomName}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.prejoinPageEnabled=false&config.disableDeepLinking=true`}
          onClose={() => setShowVideo(false)}
        />
      )}

      {!currentPlayer ? (
        <div className="text-center py-16 sm:py-24 bg-white rounded-3xl border border-slate-200 mb-8 p-4 shadow-xs">
          <span className="text-4xl block mb-2">🏏</span>
          <p className="text-xl sm:text-2xl font-display text-slate-900 font-bold">
            Waiting for the next cricketer…
          </p>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto font-medium">
            The live auction will appear here as soon as the auctioneer brings the next player to the hammer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Player Card & Current Bid & Countdown */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-4 sm:p-6 text-center border border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="relative inline-block mx-auto mb-1">
                <PlayerPhoto
                  src={currentPlayer.photoUrl}
                  sizeClass="w-32 h-32 sm:w-44 sm:h-44"
                />
                <span className="absolute bottom-0 right-0 bg-[#0B1E3D] text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
                  🏏 {currentPlayer.playerType || "Cricketer"}
                </span>
              </div>
              <PlayerAuctionPlaque
                name={currentPlayer.name}
                lotNumber={currentPlayer.lotNumber || currentPlayer.jerseyNumber || "01"}
                role={currentPlayer.playerType}
                league="IPL"
                variant="hero"
              />
              <div className="flex flex-wrap items-center justify-center gap-1.5 my-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                  Age: {currentPlayer.age || "—"}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  🏏 {currentPlayer.battingStyle?.replace("_", " ") || "Right Hand Bat"}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                  ⚡ {currentPlayer.bowlingStyle?.replace("_", " ") || "Right Arm Fast"}
                </span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {/* Synchronized Countdown Timer */}
              {isCountdownActive && (
                <div
                  className={`rounded-2xl p-3 border transition-all duration-300 ${
                    timeLeft <= 5
                      ? "bg-red-50 border-red-300 text-red-700 animate-timer-heartbeat"
                      : timeLeft <= 15
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-emerald-50 border-emerald-300 text-emerald-800"
                  }`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <span>⏱️</span>
                    <span>{timeLeft <= 5 ? "HAMMER CLOSING SOON!" : "Auction Clock"}</span>
                  </p>
                  <p className="font-scoreboard text-3xl sm:text-4xl font-black tracking-wider mt-0.5">
                    {formatTime(timeLeft)}
                  </p>
                  {timeLeft === 0 && (
                    <p className="text-[10px] text-red-600 font-bold animate-pulse mt-0.5">
                      Bidding expired · Under the hammer…
                    </p>
                  )}
                </div>
              )}

              {/* Current Bid Display */}
              <div className="bg-[#0B1E3D] text-white rounded-2xl p-4 sm:p-5 border border-slate-700 shadow-xs">
                <p className="text-[11px] text-amber-300 uppercase tracking-wider font-bold">
                  Current Bid
                </p>
                <p className="font-scoreboard text-3xl sm:text-5xl text-white mt-1 font-black">
                  ₹{state.currentBidAmount?.toLocaleString("en-IN")}
                </p>
                {state.currentBidTeam ? (
                  <div className="mt-2 pt-2 border-t border-slate-700/80 flex items-center justify-center gap-2">
                    <TeamLogo
                      src={state.currentBidTeam.teamLogoUrl}
                      teamName={state.currentBidTeam.teamName}
                      className="w-6 h-6"
                    />
                    <span className="truncate max-w-[200px] font-bold text-amber-300 text-xs sm:text-sm">
                      🏆 {state.currentBidTeam.teamName}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1.5 italic font-medium">
                    Base price · No bids yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Live Commentary Feed & Bid History (Tabbed Cricbuzz Style) */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Tab Bar */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setActiveTab("commentary")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === "commentary"
                    ? "bg-[#0F5132] text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>📜 Cricket Match Commentary</span>
              </button>

              <button
                onClick={() => setActiveTab("bidHistory")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === "bidHistory"
                    ? "bg-[#0F5132] text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
              >
                <span>⚡ Bid Stream</span>
                <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded-full font-mono font-bold">
                  {state.currentBidHistory?.length || 0}
                </span>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "commentary" ? (
              <div className="flex-1 min-h-[380px]">
                <LiveCommentaryFeed
                  items={commentaryItems}
                  tournamentName={tournamentName}
                  isOrganizer={false}
                />
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 flex-1 flex flex-col shadow-xs">
                <h3 className="font-bold text-sm sm:text-base mb-3 text-slate-900 flex items-center justify-between">
                  <span>Current Cricketer Bid Log</span>
                  <span className="text-xs text-amber-700 font-mono font-bold">
                    Total: {state.currentBidHistory?.length || 0} Bids
                  </span>
                </h3>
                {state.currentBidHistory?.length > 0 ? (
                  <ol className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto scroll-touch pr-1">
                    {[...state.currentBidHistory].reverse().map((b, i) => (
                      <li
                        key={i}
                        className={`flex justify-between items-center text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all ${
                          i === 0
                            ? "bg-amber-50 font-bold border border-amber-300 text-amber-950 shadow-2xs"
                            : "bg-slate-50 border border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                          <span className="text-xs font-mono text-slate-500 w-5 font-bold">
                            #{state.currentBidHistory.length - i}
                          </span>
                          <TeamLogo
                            src={b.team?.teamLogoUrl}
                            teamName={b.team?.teamName}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="truncate font-bold text-slate-900">
                            {b.team?.teamName || "Unknown Franchise"}
                          </span>
                        </div>
                        <span className="shrink-0 font-scoreboard text-base text-[#0F5132] font-black">
                          ₹{b.amount?.toLocaleString("en-IN")}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400">
                    <p className="text-3xl mb-1">🏏</p>
                    <p className="text-sm font-semibold">No bids placed yet for this cricketer.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Franchise Purses Grid */}
      <h3 className="font-display text-xl sm:text-2xl mb-3 text-slate-900 font-bold flex items-center gap-2">
        <span>💰</span> Franchise Team Purses
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {teams.map((t) => {
          const pct = Math.max(
            0,
            Math.min(100, (t.purseRemaining / t.totalPurse) * 100),
          );
          return (
            <div
              key={t._id}
              className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 hover:border-slate-300 shadow-xs transition"
            >
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <TeamLogo
                  src={t.teamLogoUrl}
                  teamName={t.teamName}
                  className="w-8 h-8 rounded-full"
                />
                <p className="font-bold text-xs sm:text-sm truncate text-slate-900">{t.teamName}</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5 border border-slate-200">
                <div className="h-full bg-[#0F5132] transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-600 truncate font-semibold font-mono">
                ₹{t.purseRemaining.toLocaleString("en-IN")} left
              </p>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-slate-400 text-sm col-span-full">
            No approved franchise teams yet.
          </p>
        )}
      </div>

      {/* Live Auction Analytics & Leaderboard Widget */}
      <div className="mb-8">
        <AuctionAnalyticsWidget slug={slug} isPublic={true} />
      </div>

      {/* Recently Sold Ticker */}
      {recentSales?.length > 0 && (
        <div>
          <h3 className="font-display text-xl sm:text-2xl mb-3 text-slate-900 font-bold flex items-center gap-2">
            <span>🏆</span> Recently Sold Cricketers
          </h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scroll-touch">
            {recentSales.map((log) => (
              <div
                key={log._id}
                className="bg-white rounded-2xl p-3 border border-slate-200 min-w-[160px] sm:min-w-[180px] shrink-0 hover:border-emerald-600/40 shadow-xs transition"
              >
                <p className="font-bold text-xs sm:text-sm truncate text-slate-900">
                  🏏 {log.player?.name}
                </p>
                <p className="text-xs text-slate-500 truncate font-medium">
                  {log.finalTeam?.teamName}
                </p>
                <p className="text-xs text-[#0F5132] font-black mt-1 font-mono">
                  ₹{log.finalPrice?.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
