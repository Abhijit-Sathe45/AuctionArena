import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import StatusMessage from "../../components/StatusMessage";
import { SkeletonCards } from "../../components/Skeleton";
import FloatingVideoPanel from "../../components/FloatingVideoPanel";
import { useToast } from "../../context/ToastContext";
import PlayerPhoto from "../../components/PlayerPhoto";
import { getSocket, emitWithAck } from "../../socket";
import {
  unlockAudio,
  playBidSound,
  playSoldSound,
  playUnsoldSound,
} from "../../utils/sounds";

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
  const info = JSON.parse(localStorage.getItem("organizerInfo") || "{}");
  const refreshTimer = useRef(null);
  // Unique, shareable video room derived from the organizer's tournament slug — the same
  // room the spectator Watch Live page joins (in view-only mode), so anyone with either
  // link ends up in the same broadcast.
  const videoRoomName = `AuctionArenaLive-${info.slug}`;

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
      // Play the matching sound cue based on the tagged event type from the server —
      // this fires for every connected client (organizer + spectators) so everyone hears it.
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
      scheduleRefresh();
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
    if (busy) return;
    unlockAudio();
    setStatus({ type: "", message: "" });
    setBusy(true);
    try {
      const token = localStorage.getItem("organizerToken");
      try {
        const data = await emitWithAck(socketEvent, {
          ...socketPayload,
          token,
        });
        setState(data);
      } catch (socketErr) {
        const isConnectivityIssue =
          socketErr.message === "SOCKET_NOT_CONNECTED" ||
          socketErr.message === "SOCKET_TIMEOUT";
        if (!isConnectivityIssue) throw socketErr; // real validation error — no point retrying over REST
        // Socket path unavailable — fall back to REST transparently
        const { data } = await restFn();
        setState(data);
      }
    } catch (err) {
      setStatus({ type: "error", message: describeError(err) });
    } finally {
      setBusy(false);
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
    setPendingTeamId(teamId);
    await callActionFast("auction:bid", { teamId }, () =>
      api.post("/auction/bid", { teamId }),
    );
    setPendingTeamId(null);
  }
  const undoBid = () =>
    callActionFast("auction:undo-bid", {}, () => api.post("/auction/undo-bid"));
  async function markSold() {
    const res = await callAction(() => api.post("/auction/sold"));
    if (res?.data?.message) showToast(res.data.message, "success");
  }
  async function markUnsold() {
    const res = await callAction(() => api.post("/auction/unsold"));
    if (res?.data?.message) showToast(res.data.message, "info");
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-turf">Live Auction</h1>
        <div className="flex items-center gap-3">
          {busy && (
            <span className="text-xs text-black/40 animate-pulse">
              Processing…
            </span>
          )}
          <button
            onClick={() => {
              unlockAudio();
              setShowVideo((v) => !v);
            }}
            className="btn-secondary text-sm"
          >
            {showVideo ? "📹 Hide Video Broadcast" : "📹 Start Video Broadcast"}
          </button>
        </div>
      </div>
      <p className="text-black/50 mb-6">
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
        <div className="mt-3 space-y-6">
          {/* STEP 1: Choose category */}
          <div className="card">
            <h2 className="font-semibold mb-3">Step 1 — Choose a Category</h2>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((c) => (
                <button
                  key={c._id}
                  disabled={busy}
                  onClick={() => selectCategory(c._id)}
                  className={`text-left border-2 rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentCategory?._id === c._id ? "border-gold bg-gold/10" : "border-black/10 hover:border-black/25"}`}
                >
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-black/50">
                    Base: Rs. {c.basePrice}
                  </p>
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-black/40 text-sm col-span-4">
                  No categories yet — create some in the Categories tab first.
                </p>
              )}
            </div>
          </div>

          {/* STEP 2: Shuffle & preview queue */}
          {currentCategory && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">
                  Step 2 — Player Order ({queuePlayers.length} in queue)
                </h2>
                <button
                  onClick={shuffleQueue}
                  disabled={busy}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  🔀 Shuffle Player Order
                </button>
              </div>
              {queuePlayers.length > 0 ? (
                <ol className="grid grid-cols-3 gap-2 text-sm max-h-56 overflow-y-auto">
                  {queuePlayers.map((p, i) => (
                    <li
                      key={p._id}
                      className="px-3 py-2 rounded-md bg-turf/5 border border-black/5"
                    >
                      {i + 1}. {p.name} — {p.playerType}
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
            <div className="card text-center py-8">
              <h2 className="font-semibold mb-3">Step 3 — Start the Auction</h2>
              <button
                className="btn-primary disabled:opacity-50"
                disabled={busy}
                onClick={() => nextPlayer()}
              >
                Start Auction (Next in Queue)
              </button>
            </div>
          )}

          <div className="card text-center py-4">
            <button
              className="btn-secondary disabled:opacity-50"
              disabled={busy}
              onClick={reAuction}
            >
              Re-auction Unsold Players (New Round)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 mt-3">
          <div className="col-span-1 card text-center">
            <PlayerPhoto src={currentPlayer.photoUrl} sizeClass="w-40 h-40" />
            <h2 className="font-display text-2xl text-turf">
              {currentPlayer.name}
            </h2>
            <p className="text-black/50 text-sm">
              {currentPlayer.playerType} · Age {currentPlayer.age}
            </p>
            <p className="text-black/50 text-sm">
              Bat: {currentPlayer.battingStyle.replace("_", " ")}
            </p>
            <p className="text-black/50 text-sm mb-4">
              Bowl: {currentPlayer.bowlingStyle.replace("_", " ")}
            </p>
            <div className="bg-gold/10 rounded-lg p-4">
              <p className="text-xs text-black/50">Current Bid</p>
              <p className="font-display text-4xl text-gold-dark">
                Rs. {state.currentBidAmount.toLocaleString("en-IN")}
              </p>
              {state.currentBidTeam && (
                <p className="text-sm mt-1">
                  by <strong>{state.currentBidTeam.teamName}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={markSold}
                disabled={busy}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Mark SOLD
              </button>
              <button
                onClick={markUnsold}
                disabled={busy}
                className="btn-danger flex-1 disabled:opacity-50"
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
              className="btn-secondary w-full mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↩ Undo Last Bid
            </button>
            {queuePlayers.length > 0 && (
              <p className="text-xs text-black/40 mt-3">
                {queuePlayers.length} more player(s) queued in this category
              </p>
            )}
          </div>

          <div className="col-span-2 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Place Bid For a Team</h3>
              <div className="grid grid-cols-3 gap-3">
                {teams
                  .filter((t) => t.isApproved)
                  .map((t) => {
                    const isHighestBidder = state.currentBidTeam?._id === t._id;
                    const isPending = pendingTeamId === t._id;
                    return (
                      <button
                        key={t._id}
                        onClick={() => placeBid(t._id)}
                        disabled={busy || isHighestBidder}
                        className={`card text-left border-2 transition-all duration-150 active:scale-95 active:bg-gold/20
                        disabled:cursor-not-allowed
                        ${isHighestBidder ? "border-gold bg-gold/10 opacity-90" : "border-transparent hover:border-gold hover:shadow-md"}
                        ${busy && !isHighestBidder ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {t.teamLogoUrl && (
                            <img
                              src={t.teamLogoUrl}
                              className="w-8 h-8 rounded-full object-cover"
                              alt=""
                            />
                          )}
                          <p className="font-semibold text-sm">{t.teamName}</p>
                        </div>
                        <p className="text-xs text-black/50">
                          Purse left: Rs.{" "}
                          {t.purseRemaining.toLocaleString("en-IN")}
                        </p>
                        {isPending && (
                          <p className="text-xs text-gold-dark font-semibold mt-2">
                            Placing bid…
                          </p>
                        )}
                        {isHighestBidder && !isPending && (
                          <p className="text-xs text-gold-dark font-semibold mt-2">
                            ✓ Highest Bidder
                          </p>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3">
                Bid History — {currentPlayer.name}
              </h3>
              {state.currentBidHistory && state.currentBidHistory.length > 0 ? (
                <ol className="space-y-1 max-h-64 overflow-y-auto">
                  {[...state.currentBidHistory].reverse().map((b, i) => (
                    <li
                      key={i}
                      className={`flex justify-between items-center text-sm px-3 py-2 rounded-md ${i === 0 ? "bg-gold/10 font-semibold" : "bg-black/5"}`}
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
                <p className="text-black/40 text-sm">
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
