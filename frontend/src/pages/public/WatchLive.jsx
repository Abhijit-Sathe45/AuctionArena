import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { getSocket } from "../../socket";
import PlayerPhoto from "../../components/PlayerPhoto";
import FloatingVideoPanel from "../../components/FloatingVideoPanel";
import {
  unlockAudio,
  playBidSound,
  playSoldSound,
  playUnsoldSound,
} from "../../utils/sounds";

// Public, read-only live auction spectator page. No login required — anyone with the link
// can watch bidding happen in real time: current player, current bid, bid history, team
// purses, a "recently sold" ticker, sound cues, and the auctioneer's live video. Shared by
// the organizer from their Dashboard.
export default function WatchLive() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const refreshTimer = useRef(null);
  const organizerIdRef = useRef(null); // avoids a stale closure in the socket 'connect' handler below
  const soundEnabledRef = useRef(false); // avoids a stale closure in the socket 'auction-update' handler below

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/public/${slug}/live-auction`);
      setData(d);
      organizerIdRef.current = d.organizerId;
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
      scheduleRefresh();
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

  return (
    <div className="min-h-screen bg-turf-dark text-ivory p-4 md:p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              className="w-12 h-12 rounded-full object-cover"
              alt=""
            />
          )}
          <div>
            <p className="font-display text-3xl tracking-wide">
              {tournamentName}
            </p>
            <p className="text-ivory/50 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />{" "}
              LIVE AUCTION
              {currentCategory && <span> · {currentCategory.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!soundEnabled && (
            <button
              onClick={enableSound}
              className="bg-gold text-turf-dark font-semibold text-sm px-4 py-2 rounded-md"
            >
              🔊 Enable Sound
            </button>
          )}
          {soundEnabled && (
            <span className="text-xs text-ivory/50">🔊 Sound on</span>
          )}
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="bg-white/10 hover:bg-white/20 text-ivory font-semibold text-sm px-4 py-2 rounded-md"
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
        <div className="text-center py-24">
          <p className="text-2xl font-display text-ivory/60">
            Waiting for the next player…
          </p>
          <p className="text-ivory/40 text-sm mt-2">
            The auction will appear here as soon as the organizer starts it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-1 bg-white/5 rounded-2xl p-6 text-center border border-white/10">
            <PlayerPhoto
              src={currentPlayer.photoUrl}
              sizeClass="w-44 h-44"
              dark
            />
            <h2 className="font-display text-3xl">{currentPlayer.name}</h2>
            <p className="text-ivory/60 text-sm">
              {currentPlayer.playerType} · Age {currentPlayer.age}
            </p>
            <p className="text-ivory/60 text-sm mb-4">
              Bat: {currentPlayer.battingStyle?.replace("_", " ")} · Bowl:{" "}
              {currentPlayer.bowlingStyle?.replace("_", " ")}
            </p>
            <div className="bg-gold/20 rounded-xl p-5 border border-gold/30">
              <p className="text-xs text-ivory/60 uppercase tracking-wide">
                Current Bid
              </p>
              <p className="font-display text-5xl text-gold">
                Rs. {state.currentBidAmount?.toLocaleString("en-IN")}
              </p>
              {state.currentBidTeam && (
                <p className="text-sm mt-2 flex items-center justify-center gap-2">
                  {state.currentBidTeam.teamLogoUrl && (
                    <img
                      src={state.currentBidTeam.teamLogoUrl}
                      className="w-5 h-5 rounded-full"
                      alt=""
                    />
                  )}
                  <strong>{state.currentBidTeam.teamName}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="font-semibold mb-3 text-ivory/80">Bid History</h3>
            {state.currentBidHistory?.length > 0 ? (
              <ol className="space-y-1 max-h-80 overflow-y-auto">
                {[...state.currentBidHistory].reverse().map((b, i) => (
                  <li
                    key={i}
                    className={`flex justify-between items-center text-sm px-4 py-2 rounded-lg ${i === 0 ? "bg-gold/20 font-semibold" : "bg-white/5"}`}
                  >
                    <span>
                      {state.currentBidHistory.length - i}.{" "}
                      {b.team?.teamName || "Unknown Team"}
                    </span>
                    <span>Rs. {b.amount.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ivory/40 text-sm">
                No bids placed yet for this player.
              </p>
            )}
          </div>
        </div>
      )}

      <h3 className="font-display text-2xl mb-3">Team Purses</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {teams.map((t) => {
          const pct = Math.max(
            0,
            Math.min(100, (t.purseRemaining / t.totalPurse) * 100),
          );
          return (
            <div
              key={t._id}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                {t.teamLogoUrl && (
                  <img
                    src={t.teamLogoUrl}
                    className="w-8 h-8 rounded-full object-cover"
                    alt=""
                  />
                )}
                <p className="font-semibold text-sm truncate">{t.teamName}</p>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-ivory/50">
                Rs. {t.purseRemaining.toLocaleString("en-IN")} left
              </p>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-ivory/40 text-sm col-span-4">
            No approved teams yet.
          </p>
        )}
      </div>

      {recentSales?.length > 0 && (
        <div>
          <h3 className="font-display text-2xl mb-3">Recently Sold</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentSales.map((log) => (
              <div
                key={log._id}
                className="bg-white/5 rounded-xl p-3 border border-white/10 min-w-[180px] shrink-0"
              >
                <p className="font-semibold text-sm truncate">
                  {log.player?.name}
                </p>
                <p className="text-xs text-ivory/50">
                  {log.finalTeam?.teamName}
                </p>
                <p className="text-xs text-gold mt-1">
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
