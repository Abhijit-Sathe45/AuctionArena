import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { getSocket } from "../../socket";
import PlayerPhoto from "../../components/PlayerPhoto";
import FloatingVideoPanel from "../../components/FloatingVideoPanel";
import AuctionStampOverlay from "../../components/AuctionStampOverlay";
import VoiceSettingsModal from "../../components/VoiceSettingsModal";
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

// Public, read-only live auction spectator page. No login required — anyone with the link
// can watch bidding happen in real time: current player, current bid, bid history, team
// purses, a "recently sold" ticker, sound cues, the auctioneer's live video, live countdown
// timer, 3D SOLD/UNSOLD stamp animations, and AI voice commentary.
export default function WatchLive() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(() => {
    return localStorage.getItem("aiCommentary_spectator") === "true";
  });
  const commentaryEnabledRef = useRef(commentaryEnabled);
  const hasAnnounced10sRef = useRef(false);
  const hasAnnounced4sRef = useRef(false);
  const lastBidCountRef = useRef(0);
  const lastPlayerIdRef = useRef(null);

  // 3D Stamp animation overlay state (spectator only)
  const [stampData, setStampData] = useState(null); // { result: 'SOLD' | 'UNSOLD', player, team, finalPrice }

  // Synchronized countdown timer state
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const serverOffsetRef = useRef(0); // clock difference (server time - client time)

  const refreshTimer = useRef(null);
  const organizerIdRef = useRef(null); // avoids a stale closure in the socket 'connect' handler below
  const soundEnabledRef = useRef(false); // avoids a stale closure in the socket 'auction-update' handler below

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/public/${slug}/live-auction`);
      setData(d);
      organizerIdRef.current = d.organizerId;

      if (d.serverTime) {
        serverOffsetRef.current = d.serverTime - Date.now();
      }
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
  }, [data?.state?.currentPlayer, data?.state?.countdownEnabled, data?.state?.biddingEndsAt, data?.state?.currentBidTeam, data?.state?.currentBidAmount]);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.connect();

    // Joins (or rejoins, after a reconnect) the organizer's auction room once we know their ID.
    function joinRoomIfReady() {
      if (organizerIdRef.current)
        socket.emit("join-auction", organizerIdRef.current);
    }
    socket.on("connect", joinRoomIfReady);
    socket.on("auction-update", (payload) => {
      if (payload?.state) {
        setData((prev) => (prev ? { ...prev, state: payload.state } : prev));
      }

      // Play AI voice commentary if enabled by spectator
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

      if (soundEnabledRef.current) {
        switch (payload?.event) {
          case "BID_PLACED":
            playBidSound();
            break;
          case "PLAYER_SOLD":
            playSoldSound();
            break;
          case "PLAYER_UNSOLD":
            playUnsoldSound();
            break;
          default:
            break;
        }
      }

      // Handle 3D Stamp Animations on SOLD / UNSOLD
      if (payload?.event === "PLAYER_SOLD") {
        setStampData({
          result: "SOLD",
          player: payload.player,
          team: payload.team,
          finalPrice: payload.finalPrice || payload.player?.soldPrice,
        });
        scheduleRefresh(100);
      } else if (payload?.event === "PLAYER_UNSOLD") {
        setStampData({
          result: "UNSOLD",
          player: payload.player,
          team: null,
          finalPrice: 0,
        });
        scheduleRefresh(100);
      } else if (payload?.event === "NEXT_PLAYER") {
        // Clear previous stamp when new player starts
        setStampData(null);
        scheduleRefresh(100);
      }
    });

    return () => {
      socket.off("connect", joinRoomIfReady);
      socket.off("auction-update");
      socket.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line
  }, [slug]);

  // Once we learn the organizerId (after first successful load), join the socket room.
  useEffect(() => {
    if (data?.organizerId) {
      const socket = getSocket();
      if (socket.connected) socket.emit("join-auction", data.organizerId);
    }
  }, [data?.organizerId]);

  function enableSound() {
    unlockAudio();
    soundEnabledRef.current = true;
    setSoundEnabled(true);
  }

  function toggleCommentary() {
    unlockAudio();
    const next = !commentaryEnabled;
    setCommentaryEnabled(next);
    commentaryEnabledRef.current = next;
    localStorage.setItem("aiCommentary_spectator", next.toString());
    if (!next) stopCommentary();
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-turf-dark text-ivory p-6">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-turf-dark text-ivory p-6">
        <p className="text-lg animate-pulse">Loading live auction…</p>
      </div>
    );
  }

  const { tournamentName, logoUrl, state, teams, recentSales } = data;
  const currentPlayer = state?.currentPlayer;
  const currentCategory = state?.currentCategory;
  const videoRoomName = `AuctionArenaLive-${slug}`;
  const isCountdownActive = state?.countdownEnabled && timeLeft !== null;

  // Format seconds as mm:ss
  function formatTime(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined) return "00:00";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-turf-dark text-ivory p-3.5 sm:p-6 md:p-8 relative">
      {/* 3D SOLD / UNSOLD Rubber Stamp Overlay (Spectator View Only) */}
      {stampData && (
        <AuctionStampOverlay
          result={stampData.result}
          player={stampData.player}
          team={stampData.team}
          finalPrice={stampData.finalPrice}
          onClose={() => setStampData(null)}
          autoDismissTime={5500}
        />
      )}

      {/* AI Voice Selection Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettingsModal}
        onClose={() => setShowVoiceSettingsModal(false)}
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0"
              alt=""
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-lg shrink-0">
              🏏
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-2xl sm:text-3xl tracking-wide truncate">
              {tournamentName}
            </p>
            <p className="text-ivory/60 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block shrink-0" />{" "}
              LIVE AUCTION
              {currentCategory && <span className="truncate"> · {currentCategory.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Voice Toggle & Voice Selector Button */}
          <div className="flex items-center rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={toggleCommentary}
              className={`font-semibold text-xs sm:text-sm px-3 py-2 transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                commentaryEnabled
                  ? "bg-gold text-turf-dark"
                  : "bg-white/10 hover:bg-white/20 active:bg-white/30 text-ivory"
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
              className={`font-semibold text-xs sm:text-sm px-2.5 py-2 border-l transition-all duration-150 active:scale-95 flex items-center gap-1 ${
                commentaryEnabled
                  ? "bg-gold hover:bg-gold-dark text-turf-dark border-turf-dark/20"
                  : "bg-white/10 hover:bg-white/25 text-ivory border-white/10"
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>

          {!soundEnabled && (
            <button
              onClick={enableSound}
              className="bg-gold hover:bg-gold-dark active:bg-gold-dark text-turf-dark font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-colors active:scale-95"
            >
              🔊 Enable Sound
            </button>
          )}
          {soundEnabled && (
            <span className="text-xs text-ivory/60 bg-white/10 px-2.5 py-1.5 rounded-md">🔊 Sound on</span>
          )}
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-ivory font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-colors active:scale-95"
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
        <div className="text-center py-16 sm:py-24 bg-white/5 rounded-2xl border border-white/10 mb-8 p-4">
          <p className="text-xl sm:text-2xl font-display text-ivory/70">
            Waiting for the next player…
          </p>
          <p className="text-ivory/40 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
            The auction will appear here as soon as the organizer starts it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Player Card & Current Bid & Countdown */}
          <div className="lg:col-span-1 bg-white/5 rounded-2xl p-4 sm:p-6 text-center border border-white/10 flex flex-col justify-between">
            <div>
              <PlayerPhoto
                src={currentPlayer.photoUrl}
                sizeClass="w-32 h-32 sm:w-44 sm:h-44"
                dark
              />
              <h2 className="font-display text-2xl sm:text-3xl mt-2">{currentPlayer.name}</h2>
              <p className="text-ivory/60 text-xs sm:text-sm">
                {currentPlayer.playerType} · Age {currentPlayer.age}
              </p>
              <p className="text-ivory/60 text-xs sm:text-sm mb-4">
                Bat: {currentPlayer.battingStyle?.replace("_", " ")} · Bowl:{" "}
                {currentPlayer.bowlingStyle?.replace("_", " ")}
              </p>
            </div>

            <div className="space-y-3">
              {/* Synchronized Countdown Timer (Only displayed when Countdown is ON) */}
              {isCountdownActive && (
                <div
                  className={`rounded-xl p-3 border transition-all duration-300 ${
                    timeLeft <= 5
                      ? "bg-red-500/20 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-timer-heartbeat"
                      : timeLeft <= 15
                      ? "bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      : "bg-turf-light/30 border-gold/40 shadow-sm"
                  }`}
                >
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ivory/70 flex items-center justify-center gap-1.5">
                    <span>⏱️</span>
                    <span>{timeLeft <= 5 ? "Closing Soon!" : "Time Remaining"}</span>
                  </p>
                  <p
                    className={`font-display text-3xl sm:text-4xl font-bold tracking-widest mt-0.5 ${
                      timeLeft <= 5
                        ? "text-red-400"
                        : timeLeft <= 15
                        ? "text-amber-300"
                        : "text-gold"
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </p>
                  {timeLeft === 0 && (
                    <p className="text-[10px] text-red-300 font-semibold animate-pulse mt-0.5">
                      Bidding expired · Finalizing result…
                    </p>
                  )}
                </div>
              )}

              {/* Current Bid Display */}
              <div className="bg-gold/20 rounded-xl p-4 sm:p-5 border border-gold/30">
                <p className="text-[11px] sm:text-xs text-ivory/70 uppercase tracking-wider">
                  Current Bid
                </p>
                <p className="font-display text-3xl sm:text-5xl text-gold mt-1">
                  Rs. {state.currentBidAmount?.toLocaleString("en-IN")}
                </p>
                {state.currentBidTeam ? (
                  <div className="text-xs sm:text-sm mt-2 flex items-center justify-center gap-2">
                    {state.currentBidTeam.teamLogoUrl && (
                      <img
                        src={state.currentBidTeam.teamLogoUrl}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                        alt=""
                      />
                    )}
                    <span className="truncate max-w-[200px] font-semibold">
                      {state.currentBidTeam.teamName}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-ivory/40 mt-1.5 italic">
                    Base price · No bids yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bid History */}
          <div className="lg:col-span-2 bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
            <h3 className="font-semibold text-sm sm:text-base mb-3 text-ivory/90">Bid History</h3>
            {state.currentBidHistory?.length > 0 ? (
              <ol className="space-y-1.5 max-h-72 sm:max-h-80 overflow-y-auto scroll-touch pr-1">
                {[...state.currentBidHistory].reverse().map((b, i) => (
                  <li
                    key={i}
                    className={`flex justify-between items-center text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-colors ${
                      i === 0 ? "bg-gold/20 font-semibold border border-gold/30" : "bg-white/5"
                    }`}
                  >
                    <span className="truncate max-w-[65%]">
                      {state.currentBidHistory.length - i}.{" "}
                      {b.team?.teamName || "Unknown Team"}
                    </span>
                    <span className="shrink-0 font-medium">Rs. {b.amount?.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ivory/40 text-xs sm:text-sm py-4">
                No bids placed yet for this player.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Team Purses Grid */}
      <h3 className="font-display text-xl sm:text-2xl mb-3">Team Purses</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {teams.map((t) => {
          const pct = Math.max(
            0,
            Math.min(100, (t.purseRemaining / t.totalPurse) * 100),
          );
          return (
            <div
              key={t._id}
              className="bg-white/5 rounded-xl p-3.5 sm:p-4 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-2 min-w-0">
                {t.teamLogoUrl ? (
                  <img
                    src={t.teamLogoUrl}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">
                    🏏
                  </div>
                )}
                <p className="font-semibold text-xs sm:text-sm truncate">{t.teamName}</p>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-ivory/60 truncate">
                Rs. {t.purseRemaining.toLocaleString("en-IN")} left
              </p>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-ivory/40 text-sm col-span-full">
            No approved teams yet.
          </p>
        )}
      </div>

      {/* Recently Sold Ticker */}
      {recentSales?.length > 0 && (
        <div>
          <h3 className="font-display text-xl sm:text-2xl mb-3">Recently Sold</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scroll-touch">
            {recentSales.map((log) => (
              <div
                key={log._id}
                className="bg-white/5 rounded-xl p-3 border border-white/10 min-w-[160px] sm:min-w-[180px] shrink-0"
              >
                <p className="font-semibold text-xs sm:text-sm truncate">
                  {log.player?.name}
                </p>
                <p className="text-xs text-ivory/50 truncate">
                  {log.finalTeam?.teamName}
                </p>
                <p className="text-xs text-gold font-medium mt-1">
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
