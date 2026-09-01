import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { getSocket } from "../../socket";
import PlayerPhoto from "../../components/PlayerPhoto";
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
    <div className="min-h-screen bg-gradient-to-b from-[#F0F5FF] via-[#FAF5FC] to-[#F2FCF8] text-turf p-3 sm:p-6 max-w-6xl mx-auto">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-4 border-b border-mauve/20">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0 border border-sky-dark/40 shadow-sm"
              alt=""
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-mint/20 text-mint-dark flex items-center justify-center text-lg shrink-0 shadow-inner">
              🏏
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-2xl sm:text-3xl tracking-wide truncate text-turf font-bold">
              {tournamentName}
            </p>
            <p className="text-mauve-dark text-xs sm:text-sm flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose animate-pulse inline-block shrink-0" />{" "}
              LIVE AUCTION
              {currentCategory && <span className="truncate text-orchid-dark"> · {currentCategory.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Voice Toggle & Voice Selector Button */}
          <div className="flex items-center rounded-xl overflow-hidden shadow-sm border border-mauve/30 bg-white">
            <button
              onClick={toggleCommentary}
              className={`font-bold text-xs sm:text-sm px-3.5 py-2 transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                commentaryEnabled
                  ? "bg-mint text-turf-dark"
                  : "bg-white hover:bg-sky/20 text-turf"
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
              className={`font-semibold text-xs sm:text-sm px-2.5 py-2 border-l border-mauve/30 transition-all duration-150 active:scale-95 flex items-center gap-1 ${
                commentaryEnabled
                  ? "bg-mint hover:bg-mint-dark text-turf-dark"
                  : "bg-white hover:bg-sky/20 text-turf"
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          {!soundEnabled && (
            <button
              onClick={enableSound}
              className="btn-primary text-xs sm:text-sm px-3.5 py-2 shadow-sm font-bold"
            >
              🔊 Enable Sound
            </button>
          )}
          {soundEnabled && (
            <span className="text-xs text-mint-dark bg-mint/15 border border-mint/40 px-3 py-2 rounded-xl font-bold">🔊 Sound on</span>
          )}
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2"
          >
            {showVideo ? "Hide Video" : "📹 Watch Live Video"}
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
        <div className="text-center py-16 sm:py-24 bg-white/90 rounded-3xl border border-mauve/25 mb-8 p-4 shadow-sm">
          <p className="text-xl sm:text-2xl font-display text-turf font-bold">
            Waiting for the next player…
          </p>
          <p className="text-mauve-dark text-xs sm:text-sm mt-2 max-w-sm mx-auto font-medium">
            The auction will appear here as soon as the organizer starts it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Player Card & Current Bid & Countdown */}
          <div className="lg:col-span-1 bg-white/95 rounded-3xl p-4 sm:p-6 text-center border border-mauve/25 flex flex-col justify-between shadow-md">
            <div>
              <PlayerPhoto
                src={currentPlayer.photoUrl}
                sizeClass="w-32 h-32 sm:w-44 sm:h-44"
              />
              <h2 className="font-display text-2xl sm:text-3xl mt-2 text-turf font-bold">{currentPlayer.name}</h2>
              <p className="text-mauve-dark text-xs sm:text-sm font-medium">
                {currentPlayer.playerType} · Age {currentPlayer.age}
              </p>
              <p className="text-mauve-dark text-xs sm:text-sm mb-4 font-medium">
                Bat: {currentPlayer.battingStyle?.replace("_", " ")} · Bowl:{" "}
                {currentPlayer.bowlingStyle?.replace("_", " ")}
              </p>
            </div>

            <div className="space-y-3">
              {/* Synchronized Countdown Timer */}
              {isCountdownActive && (
                <div
                  className={`rounded-2xl p-3 border transition-all duration-300 ${
                    timeLeft <= 5
                      ? "bg-rose/15 border-rose/50 shadow-[0_0_15px_rgba(222,108,131,0.25)] animate-timer-heartbeat"
                      : timeLeft <= 15
                      ? "bg-orchid/20 border-orchid/40"
                      : "bg-mint/15 border-mint/40 shadow-sm"
                  }`}
                >
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-mauve-dark flex items-center justify-center gap-1.5">
                    <span>⏱️</span>
                    <span>{timeLeft <= 5 ? "Closing Soon!" : "Time Remaining"}</span>
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
                    <p className="text-[10px] text-rose font-bold animate-pulse mt-0.5">
                      Bidding expired · Finalizing result…
                    </p>
                  )}
                </div>
              )}

              {/* Current Bid Display */}
              <div className="bg-mint/15 rounded-2xl p-4 sm:p-5 border border-mint/40 shadow-inner">
                <p className="text-[11px] sm:text-xs text-mauve-dark uppercase tracking-wider font-bold">
                  Current Bid
                </p>
                <p className="font-display text-3xl sm:text-5xl text-mint-dark mt-1 font-black">
                  Rs. {state.currentBidAmount?.toLocaleString("en-IN")}
                </p>
                {state.currentBidTeam ? (
                  <div className="text-xs sm:text-sm mt-2 flex items-center justify-center gap-2">
                    {state.currentBidTeam.teamLogoUrl && (
                      <img
                        src={state.currentBidTeam.teamLogoUrl}
                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-mint/40 shadow-sm"
                        alt=""
                      />
                    )}
                    <span className="truncate max-w-[200px] font-bold text-turf">
                      {state.currentBidTeam.teamName}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-mauve-dark mt-1.5 italic font-medium">
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
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === "commentary"
                    ? "bg-mint text-turf-dark shadow-md font-extrabold"
                    : "bg-white text-turf border border-mauve/25 hover:bg-sky/20"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose"></span>
                </span>
                <span>📜 Live Text Commentary</span>
              </button>

              <button
                onClick={() => setActiveTab("bidHistory")}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === "bidHistory"
                    ? "bg-mint text-turf-dark shadow-md font-extrabold"
                    : "bg-white text-turf border border-mauve/25 hover:bg-sky/20"
                }`}
              >
                <span>⚡ Bid History</span>
                <span className="text-[10px] bg-sky/20 text-turf px-2 py-0.5 rounded-full font-mono font-bold">
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
              <div className="bg-white/95 rounded-3xl p-4 sm:p-6 border border-mauve/25 flex-1 flex flex-col shadow-md">
                <h3 className="font-bold text-sm sm:text-base mb-3 text-turf flex items-center justify-between">
                  <span>Current Player Bid Stream</span>
                  <span className="text-xs text-mint-dark font-mono font-bold">
                    Total: {state.currentBidHistory?.length || 0} Bids
                  </span>
                </h3>
                {state.currentBidHistory?.length > 0 ? (
                  <ol className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto scroll-touch pr-1">
                    {[...state.currentBidHistory].reverse().map((b, i) => (
                      <li
                        key={i}
                        className={`flex justify-between items-center text-xs sm:text-sm px-4 py-2.5 rounded-2xl transition-all ${
                          i === 0
                            ? "bg-mint/20 font-bold border-2 border-mint text-mint-dark shadow-sm scale-[1.01]"
                            : "bg-sky/10 border border-sky/20 text-turf"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                          <span className="text-xs font-mono text-mauve-dark w-5 font-bold">
                            #{state.currentBidHistory.length - i}
                          </span>
                          {b.team?.teamLogoUrl && (
                            <img
                              src={b.team.teamLogoUrl}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover shrink-0 border border-mint/40"
                            />
                          )}
                          <span className="truncate font-bold text-turf">
                            {b.team?.teamName || "Unknown Team"}
                          </span>
                        </div>
                        <span className="shrink-0 font-display text-base text-mint-dark font-black">
                          Rs. {b.amount?.toLocaleString("en-IN")}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-mauve-dark">
                    <p className="text-2xl mb-1">🏏</p>
                    <p className="text-sm font-semibold">No bids placed yet for this player.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Purses Grid */}
      <h3 className="font-display text-xl sm:text-2xl mb-3 text-turf font-bold">Team Purses</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {teams.map((t) => {
          const pct = Math.max(
            0,
            Math.min(100, (t.purseRemaining / t.totalPurse) * 100),
          );
          return (
            <div
              key={t._id}
              className="bg-white/95 rounded-2xl p-3.5 sm:p-4 border border-mauve/25 hover:border-mint/50 shadow-sm transition"
            >
              <div className="flex items-center gap-2 mb-2 min-w-0">
                {t.teamLogoUrl ? (
                  <img
                    src={t.teamLogoUrl}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 border border-mauve/30 shadow-sm"
                    alt=""
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky/20 text-turf flex items-center justify-center text-xs shrink-0 font-bold">
                    🏏
                  </div>
                )}
                <p className="font-bold text-xs sm:text-sm truncate text-turf">{t.teamName}</p>
              </div>
              <div className="w-full h-2 bg-mauve/20 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-mint to-mint-dark transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-mauve-dark truncate font-medium">
                Rs. {t.purseRemaining.toLocaleString("en-IN")} left
              </p>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-mauve-dark text-sm col-span-full">
            No approved teams yet.
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
          <h3 className="font-display text-xl sm:text-2xl mb-3 text-turf font-bold">Recently Sold</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scroll-touch">
            {recentSales.map((log) => (
              <div
                key={log._id}
                className="bg-white/95 rounded-2xl p-3 border border-mauve/25 min-w-[160px] sm:min-w-[180px] shrink-0 hover:border-mint/50 shadow-sm transition"
              >
                <p className="font-bold text-xs sm:text-sm truncate text-turf">
                  {log.player?.name}
                </p>
                <p className="text-xs text-mauve-dark truncate font-medium">
                  {log.finalTeam?.teamName}
                </p>
                <p className="text-xs text-mint-dark font-black mt-1 font-mono">
                  Rs. {log.finalPrice?.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
