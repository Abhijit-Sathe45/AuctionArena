import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { getSocket } from "../../socket";
import PlayerPhoto from "../../components/PlayerPhoto";
import { playBidSound, playSoldSound, playUnsoldSound } from "../../utils/sounds";

export default function StreamOverlay() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  // Overlay Configuration via Query Parameters
  const mode = searchParams.get("mode") || "lowerthird"; // 'lowerthird' | 'sidebar' | 'topbar'
  const bgType = searchParams.get("bg") || "transparent"; // 'transparent' | 'green' | 'blue' | 'dark'
  const theme = searchParams.get("theme") || "gold"; // 'gold' | 'emerald' | 'cyber' | 'crimson'
  const soundEnabled = searchParams.get("sound") === "1";
  const showTicker = searchParams.get("ticker") !== "0";
  const customScale = parseFloat(searchParams.get("scale") || "1");

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [bidPulse, setBidPulse] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null); // { result: 'SOLD' | 'UNSOLD', player, team, finalPrice }
  const [recentSales, setRecentSales] = useState([]);

  const serverOffsetRef = useRef(0);
  const organizerIdRef = useRef(null);
  const refreshTimer = useRef(null);
  const prevBidAmountRef = useRef(0);

  // Background style helper
  const getBgStyle = () => {
    switch (bgType) {
      case "green":
        return "bg-[#00FF00]";
      case "blue":
        return "bg-[#0000FF]";
      case "dark":
        return "bg-[#0A0E1A]";
      case "transparent":
      default:
        return "bg-transparent";
    }
  };

  // Color theme palettes
  const getThemeColors = () => {
    switch (theme) {
      case "orchid":
        return {
          primary: "#ECB0E1",
          primaryDark: "#D694CA",
          accent: "#F7D6F1",
          border: "border-orchid/50",
          glow: "rgba(236, 176, 225, 0.7)",
          badgeBg: "bg-orchid/20 text-orchid border-orchid/40",
        };
      case "rose":
      case "crimson":
        return {
          primary: "#DE6C83",
          primaryDark: "#C4546B",
          accent: "#EAA1B1",
          border: "border-rose/50",
          glow: "rgba(222, 108, 131, 0.7)",
          badgeBg: "bg-rose/20 text-rose border-rose/40",
        };
      case "sky":
      case "cyber":
        return {
          primary: "#C9DDFF",
          primaryDark: "#A4C5FA",
          accent: "#EAF2FF",
          border: "border-sky/50",
          glow: "rgba(201, 221, 255, 0.7)",
          badgeBg: "bg-sky/20 text-sky border-sky/40",
        };
      case "emerald":
      case "gold":
      case "mint":
      default:
        return {
          primary: "#2CF6B3",
          primaryDark: "#1EC990",
          accent: "#67F9C6",
          border: "border-mint/50",
          glow: "rgba(44, 246, 179, 0.7)",
          badgeBg: "bg-mint/20 text-mint border-mint/40",
        };
    }
  };

  const themeColors = getThemeColors();

  // Load initial auction data
  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/public/${slug}/live-auction`);
      setData(d);
      setRecentSales(d.recentSales || []);
      organizerIdRef.current = d.organizerId;
      if (d.serverTime) {
        serverOffsetRef.current = d.serverTime - Date.now();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not connect to tournament live stream.");
    }
  }, [slug]);

  const scheduleRefresh = useCallback(
    (delay = 200) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, delay);
    },
    [load]
  );

  // Synchronized countdown timer
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
    }

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 100);
    return () => clearInterval(interval);
  }, [data?.state?.currentPlayer, data?.state?.countdownEnabled, data?.state?.biddingEndsAt]);

  // Socket Connection & Realtime Broadcast Event Handlers
  useEffect(() => {
    load();
    const socket = getSocket();
    socket.connect();

    function joinRoomIfReady() {
      if (organizerIdRef.current) {
        socket.emit("join-auction", organizerIdRef.current);
      }
    }

    socket.on("connect", joinRoomIfReady);
    socket.on("auction-update", (payload) => {
      if (payload?.state) {
        setData((prev) => (prev ? { ...prev, state: payload.state } : prev));
      }

      if (payload?.event === "BID_PLACED") {
        setBidPulse(true);
        setTimeout(() => setBidPulse(false), 600);
        if (soundEnabled) playBidSound();
      } else if (payload?.event === "PLAYER_SOLD") {
        setCelebrationData({
          result: "SOLD",
          player: payload.player,
          team: payload.team,
          finalPrice: payload.finalPrice || payload.player?.soldPrice,
        });
        if (soundEnabled) playSoldSound();
        scheduleRefresh(150);
        // Automatically hide celebration after 8 seconds
        setTimeout(() => {
          setCelebrationData(null);
        }, 8500);
      } else if (payload?.event === "PLAYER_UNSOLD") {
        setCelebrationData({
          result: "UNSOLD",
          player: payload.player,
          team: null,
          finalPrice: 0,
        });
        if (soundEnabled) playUnsoldSound();
        scheduleRefresh(150);
        setTimeout(() => {
          setCelebrationData(null);
        }, 6000);
      } else if (payload?.event === "NEXT_PLAYER") {
        setCelebrationData(null);
        scheduleRefresh(100);
      }
    });

    return () => {
      socket.off("connect", joinRoomIfReady);
      socket.off("auction-update");
      socket.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [load, scheduleRefresh, soundEnabled]);

  const state = data?.state;
  const currentPlayer = state?.currentPlayer;
  const currentBidTeam = state?.currentBidTeam;
  const currentBidAmount = state?.currentBidAmount || 0;
  const currentCategory = state?.currentCategory;

  // Format currency helper
  const formatAmount = (num) => {
    if (!num && num !== 0) return "—";
    return Number(num).toLocaleString("en-IN");
  };

  if (error) {
    return (
      <div className={`w-screen h-screen ${getBgStyle()} flex items-center justify-center p-8 text-white font-sans`}>
        <div className="bg-black/85 backdrop-blur-md border border-red-500/50 rounded-2xl p-6 max-w-md text-center shadow-2xl">
          <div className="text-red-400 font-bold text-lg mb-2">OBS Overlay Disconnected</div>
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-screen h-screen ${getBgStyle()} overflow-hidden select-none font-sans relative flex flex-col justify-between`}
      style={{
        transform: customScale !== 1 ? `scale(${customScale})` : undefined,
        transformOrigin: "bottom center",
      }}
    >
      {/* ========================================================= */}
      {/* 1. TOP BAR OVERLAY MODE (Compact Header)                  */}
      {/* ========================================================= */}
      {mode === "topbar" && (
        <div className="w-full p-4 animate-lower-third">
          <div className="max-w-7xl mx-auto broadcast-glass-dark rounded-2xl p-3 px-5 flex items-center justify-between border border-amber-400/30 shadow-2xl">
            {/* Left: Tournament & Live indicator */}
            <div className="flex items-center gap-3">
              {data?.logoUrl ? (
                <img
                  src={data.logoUrl}
                  alt="Logo"
                  className="w-11 h-11 object-contain rounded-lg border border-white/20 bg-black/40 p-1"
                />
              ) : null}
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    LIVE AUCTION
                  </span>
                  {currentCategory && (
                    <span className="text-[10px] font-bold text-amber-300/90 uppercase tracking-wide bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      {currentCategory.name}
                    </span>
                  )}
                </div>
                <div className="font-display text-lg text-white tracking-wide truncate max-w-[220px]">
                  {data?.tournamentName || "Tournament Auction"}
                </div>
              </div>
            </div>

            {/* Center: Current Player */}
            {currentPlayer ? (
              <div className="flex items-center gap-4 border-x border-white/10 px-6">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400/60 shrink-0 bg-black/50">
                  <PlayerPhoto photoUrl={currentPlayer.photoUrl} name={currentPlayer.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-display text-2xl text-white tracking-wide leading-tight">{currentPlayer.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                    <span className="text-amber-400">{currentPlayer.playerType}</span>
                    <span>•</span>
                    <span>Base: ₹{formatAmount(currentPlayer.basePrice)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm font-semibold text-gray-400 italic">Waiting for next player...</div>
            )}

            {/* Right: Current Highest Bid & Team */}
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div
                  className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center font-display leading-none min-w-[54px] ${
                    timeLeft <= 4
                      ? "bg-red-600/30 border-red-500 text-red-400 animate-timer-heartbeat"
                      : timeLeft <= 10
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">Timer</span>
                  <span className="text-2xl font-black">{timeLeft}s</span>
                </div>
              )}

              <div className={`flex items-center gap-3 bg-black/60 rounded-xl p-2 px-3 border border-white/10 ${bidPulse ? "animate-bid-pulse border-amber-400" : ""}`}>
                {currentBidTeam?.teamLogoUrl && (
                  <img
                    src={currentBidTeam.teamLogoUrl}
                    alt={currentBidTeam.teamName}
                    className="w-10 h-10 object-contain rounded-lg border border-white/20 bg-white/5 p-1"
                  />
                )}
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {currentBidTeam ? currentBidTeam.teamName : "Opening Bid"}
                  </div>
                  <div className="font-display text-2xl text-amber-400 font-black leading-tight">
                    ₹{formatAmount(currentBidAmount || currentPlayer?.basePrice || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SIDEBAR OVERLAY MODE (Docked Scorecard Panel)          */}
      {/* ========================================================= */}
      {mode === "sidebar" && (
        <div className="absolute right-6 top-8 bottom-16 w-96 max-w-full flex flex-col justify-center animate-sidebar-slide z-30 pointer-events-none">
          <div className="broadcast-glass-dark rounded-3xl p-5 border-2 border-amber-400/40 shadow-2xl flex flex-col gap-4 overflow-hidden">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                {data?.logoUrl && (
                  <img src={data.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-black/40 p-1 border border-white/20" />
                )}
                <div>
                  <span className="inline-block bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse mb-0.5">
                    LIVE
                  </span>
                  <div className="font-display text-base text-white tracking-wide truncate max-w-[180px]">
                    {data?.tournamentName}
                  </div>
                </div>
              </div>

              {timeLeft !== null && (
                <div
                  className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center font-display leading-none shrink-0 ${
                    timeLeft <= 4
                      ? "bg-red-600/30 border-red-500 text-red-400 animate-timer-heartbeat"
                      : timeLeft <= 10
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  }`}
                >
                  <span className="text-xl font-black">{timeLeft}</span>
                  <span className="text-[8px] uppercase font-bold opacity-75">SEC</span>
                </div>
              )}
            </div>

            {/* Current Player Card */}
            {currentPlayer ? (
              <div className="flex flex-col items-center text-center gap-3 bg-black/40 rounded-2xl p-4 border border-white/10">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg bg-black/60">
                    <PlayerPhoto photoUrl={currentPlayer.photoUrl} name={currentPlayer.name} className="w-full h-full object-cover" />
                  </div>
                  {currentCategory && (
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      {currentCategory.name}
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  <h2 className="font-display text-2xl text-white tracking-wide uppercase leading-tight">
                    {currentPlayer.name}
                  </h2>
                  <div className="text-xs font-semibold text-amber-300/90 mt-0.5">
                    {currentPlayer.playerType} • {currentPlayer.battingStyle || "Batsman"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Base Price: <span className="text-white font-bold">₹{formatAmount(currentPlayer.basePrice)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 font-display text-lg">
                READY FOR NEXT PLAYER
              </div>
            )}

            {/* Live Bid Box */}
            <div
              className={`rounded-2xl p-4 bg-gradient-to-br from-amber-500/20 via-black/60 to-black/80 border-2 ${
                bidPulse ? "border-amber-400 animate-bid-pulse scale-105" : "border-amber-400/40"
              } transition-all shadow-xl`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                <span>Current Highest Bid</span>
                <span className="text-[10px] bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                  {state?.currentBidHistory?.length || 0} Bids
                </span>
              </div>

              <div className="font-display text-4xl text-amber-400 font-black tracking-tight my-1">
                ₹{formatAmount(currentBidAmount || currentPlayer?.basePrice || 0)}
              </div>

              {currentBidTeam ? (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                  {currentBidTeam.teamLogoUrl ? (
                    <img
                      src={currentBidTeam.teamLogoUrl}
                      alt={currentBidTeam.teamName}
                      className="w-10 h-10 object-contain rounded-xl bg-black/40 p-1 border border-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center font-display text-amber-300 text-lg font-bold shrink-0">
                      {currentBidTeam.teamName?.[0]}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="font-display text-lg text-white truncate leading-tight">
                      {currentBidTeam.teamName}
                    </div>
                    {currentBidTeam.ownerName && (
                      <div className="text-xs text-gray-400 truncate">Owner: {currentBidTeam.ownerName}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-2 italic">Awaiting first bid from teams...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BROADCAST LOWER-THIRD (Standard TV Default)            */}
      {/* ========================================================= */}
      {mode === "lowerthird" && (
        <div className="w-full px-6 sm:px-12 pb-4 pt-0 mt-auto animate-lower-third z-20 pointer-events-none">
          <div className="max-w-7xl mx-auto broadcast-glass-dark rounded-3xl p-3.5 sm:p-4 border-2 border-amber-400/40 shadow-2xl grid grid-cols-12 gap-3 items-center">
            {/* Left Col (Col 1-3): Tournament Branding & Countdown */}
            <div className="col-span-3 flex items-center gap-3 border-r border-white/10 pr-4">
              {data?.logoUrl ? (
                <img
                  src={data.logoUrl}
                  alt="Tournament"
                  className="w-14 h-14 object-contain rounded-2xl bg-black/50 p-1.5 border border-white/20 shrink-0 shadow"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-display text-slate-950 font-black text-2xl shrink-0 shadow">
                  🏆
                </div>
              )}
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    LIVE AUCTION
                  </span>
                </div>
                <div className="font-display text-lg sm:text-xl text-white tracking-wide truncate leading-tight">
                  {data?.tournamentName || "Tournament Auction"}
                </div>
                {currentCategory && (
                  <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 truncate max-w-full">
                    {currentCategory.name}
                  </span>
                )}
              </div>
            </div>

            {/* Center Col (Col 4-8): Active Player Details */}
            <div className="col-span-5 flex items-center gap-4 px-2">
              {currentPlayer ? (
                <>
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-black/60">
                      <PlayerPhoto photoUrl={currentPlayer.photoUrl} name={currentPlayer.name} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <div className="font-display text-2xl sm:text-3xl text-white tracking-wide uppercase leading-tight truncate">
                      {currentPlayer.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {currentPlayer.playerType}
                      </span>
                      {currentPlayer.battingStyle && currentPlayer.battingStyle !== "NA" && (
                        <span className="text-gray-300 text-xs font-medium">
                          {currentPlayer.battingStyle}
                        </span>
                      )}
                      {currentPlayer.bowlingStyle && currentPlayer.bowlingStyle !== "NA" && (
                        <span className="text-gray-300 text-xs font-medium">
                          • {currentPlayer.bowlingStyle}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-semibold mt-1">
                      Base Price: <span className="text-amber-300 font-bold">₹{formatAmount(currentPlayer.basePrice)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full py-4 text-center text-gray-400 font-display text-xl tracking-wider">
                  WAITING FOR NEXT PLAYER...
                </div>
              )}
            </div>

            {/* Right Col (Col 9-12): Leading Bid & Timer */}
            <div className="col-span-4 flex items-center justify-end gap-3 border-l border-white/10 pl-4">
              {/* Countdown Timer */}
              {timeLeft !== null && (
                <div
                  className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center font-display leading-none shrink-0 shadow-lg ${
                    timeLeft <= 4
                      ? "bg-red-600/30 border-red-500 text-red-400 animate-timer-heartbeat"
                      : timeLeft <= 10
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  }`}
                >
                  <span className="text-2xl font-black">{timeLeft}</span>
                  <span className="text-[8px] uppercase font-bold opacity-80">SEC</span>
                </div>
              )}

              {/* Current Bid Display */}
              <div
                className={`flex-1 flex items-center justify-between gap-3 bg-black/60 rounded-2xl p-2.5 px-3.5 border-2 ${
                  bidPulse ? "border-amber-400 animate-bid-pulse scale-102 bg-amber-500/10" : "border-amber-400/30"
                } transition-all shadow-xl`}
              >
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">
                    {currentBidTeam ? currentBidTeam.teamName : "Current Bid"}
                  </div>
                  <div className="font-display text-2xl sm:text-3xl text-amber-400 font-black leading-tight tracking-tight">
                    ₹{formatAmount(currentBidAmount || currentPlayer?.basePrice || 0)}
                  </div>
                </div>

                {currentBidTeam?.teamLogoUrl ? (
                  <img
                    src={currentBidTeam.teamLogoUrl}
                    alt={currentBidTeam.teamName}
                    className="w-11 h-11 object-contain rounded-xl bg-white/5 p-1 border border-white/20 shrink-0 shadow"
                  />
                ) : currentBidTeam ? (
                  <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center font-display text-amber-300 text-xl font-bold shrink-0">
                    {currentBidTeam.teamName?.[0]}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REAL-TIME BOTTOM TICKER (MARQUEE)                      */}
      {/* ========================================================= */}
      {showTicker && (
        <div className="w-full bg-black/90 border-t border-amber-400/30 py-1.5 overflow-hidden z-20 pointer-events-none">
          <div className="animate-stream-ticker items-center text-xs font-semibold text-gray-200">
            {/* Ticker Batch 1 */}
            <div className="flex items-center gap-8 shrink-0 px-4">
              <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                AUCTION TICKER
              </span>

              {recentSales.length > 0 ? (
                recentSales.map((sale, idx) => (
                  <div key={`sale-1-${sale._id || idx}`} className="flex items-center gap-2 bg-white/5 px-3 py-0.5 rounded-full border border-white/10">
                    <span className="text-white font-bold">{sale.player?.name}</span>
                    <span className="text-gray-400">➡️</span>
                    <span className="text-emerald-400 font-bold">{sale.finalTeam?.teamName}</span>
                    <span className="text-amber-400 font-black">₹{formatAmount(sale.finalPrice)}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-400">Live bidding in progress • Stay tuned for player sales!</span>
              )}

              {data?.teams?.map((team, idx) => (
                <div key={`team-1-${team._id || idx}`} className="flex items-center gap-1.5 text-gray-300">
                  <span className="font-bold text-white">{team.teamName}:</span>
                  <span className="text-emerald-300">Purse Left: ₹{formatAmount(team.purseRemaining)}</span>
                </div>
              ))}
            </div>

            {/* Ticker Duplicate Batch 2 for Seamless Loop */}
            <div className="flex items-center gap-8 shrink-0 px-4">
              <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                AUCTION TICKER
              </span>

              {recentSales.length > 0 ? (
                recentSales.map((sale, idx) => (
                  <div key={`sale-2-${sale._id || idx}`} className="flex items-center gap-2 bg-white/5 px-3 py-0.5 rounded-full border border-white/10">
                    <span className="text-white font-bold">{sale.player?.name}</span>
                    <span className="text-gray-400">➡️</span>
                    <span className="text-emerald-400 font-bold">{sale.finalTeam?.teamName}</span>
                    <span className="text-amber-400 font-black">₹{formatAmount(sale.finalPrice)}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-400">Live bidding in progress • Stay tuned for player sales!</span>
              )}

              {data?.teams?.map((team, idx) => (
                <div key={`team-2-${team._id || idx}`} className="flex items-center gap-1.5 text-gray-300">
                  <span className="font-bold text-white">{team.teamName}:</span>
                  <span className="text-emerald-300">Purse Left: ₹{formatAmount(team.purseRemaining)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. FULL-SCREEN BROADCAST "SOLD" / "UNSOLD" TV GRAPHIC SLAM */}
      {/* ========================================================= */}
      {celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Subtle vignette backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"></div>

          {celebrationData.result === "SOLD" ? (
            <div className="relative z-10 flex flex-col items-center text-center animate-sold-blast max-w-2xl px-6">
              {/* Rotating Spotlight Rays behind */}
              <div
                className="absolute -inset-20 opacity-35 animate-[spin_12s_linear_infinite] pointer-events-none"
                style={{
                  background:
                    "conic-gradient(from 0deg at 50% 50%, rgba(217,164,65,0.8) 0deg, transparent 25deg, rgba(217,164,65,0.8) 50deg, transparent 75deg, rgba(217,164,65,0.8) 100deg, transparent 125deg, rgba(217,164,65,0.8) 150deg, transparent 175deg, rgba(217,164,65,0.8) 200deg, transparent 225deg, rgba(217,164,65,0.8) 250deg, transparent 275deg, rgba(217,164,65,0.8) 300deg, transparent 325deg, rgba(217,164,65,0.8) 350deg)",
                }}
              ></div>

              {/* SOLD Broadcast Card */}
              <div className="relative broadcast-glass-dark rounded-3xl p-8 border-4 border-amber-400 shadow-[0_0_80px_rgba(217,164,65,0.6)] flex flex-col items-center gap-4">
                {/* SOLD Stamp Ribbon */}
                <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 text-slate-950 font-display text-4xl sm:text-5xl font-black px-10 py-2 rounded-2xl shadow-2xl tracking-wider uppercase transform -rotate-2 border-2 border-white">
                  🔥 SOLD! 🔥
                </div>

                {/* Player & Team Badges */}
                <div className="flex items-center justify-center gap-6 my-2">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-black/50">
                    <PlayerPhoto photoUrl={celebrationData.player?.photoUrl} name={celebrationData.player?.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="text-3xl text-amber-400 font-bold">➡️</div>

                  {celebrationData.team?.teamLogoUrl ? (
                    <img
                      src={celebrationData.team.teamLogoUrl}
                      alt={celebrationData.team.teamName}
                      className="w-24 h-24 object-contain rounded-2xl bg-white/10 p-2 border-2 border-amber-400 shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-display text-amber-300 text-3xl font-black shadow-xl">
                      {celebrationData.team?.teamName?.[0] || "🏆"}
                    </div>
                  )}
                </div>

                {/* Details Text */}
                <div>
                  <h2 className="font-display text-4xl text-white uppercase tracking-wide">
                    {celebrationData.player?.name}
                  </h2>
                  <p className="text-xl text-emerald-400 font-bold mt-1">
                    Bought by <span className="text-white underline decoration-amber-400">{celebrationData.team?.teamName}</span>
                  </p>
                </div>

                {/* Final Price Tag */}
                <div className="bg-black/80 rounded-2xl px-8 py-3 border-2 border-amber-400/80 shadow-inner">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-widest block mb-0.5">Final Sale Price</span>
                  <span className="font-display text-4xl sm:text-5xl text-amber-400 font-black tracking-tight">
                    ₹{formatAmount(celebrationData.finalPrice)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center text-center animate-sold-blast max-w-md px-6">
              <div className="broadcast-glass-dark rounded-3xl p-8 border-4 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.6)] flex flex-col items-center gap-4">
                <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-display text-4xl font-black px-10 py-2 rounded-2xl shadow-2xl tracking-wider uppercase border-2 border-white">
                  UNSOLD
                </div>

                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-red-500/80 shadow-xl bg-black/50 my-1">
                  <PlayerPhoto photoUrl={celebrationData.player?.photoUrl} name={celebrationData.player?.name} className="w-full h-full object-cover" />
                </div>

                <h2 className="font-display text-3xl text-white uppercase tracking-wide">
                  {celebrationData.player?.name}
                </h2>
                <p className="text-sm text-gray-300">
                  Player will return in the re-auction round.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
