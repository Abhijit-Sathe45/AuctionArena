import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import PurseBar from "../../components/PurseBar";
import { SkeletonStatCards, SkeletonCards } from "../../components/Skeleton";
import StreamOverlayModal from "../../components/StreamOverlayModal";
import DemoSimulatorModal from "../../components/DemoSimulatorModal";
import AuctionAnalyticsWidget from "../../components/AuctionAnalyticsWidget";
import { getSocket } from "../../socket";
import { useToast } from "../../context/ToastContext";

export default function Dashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const refreshTimer = useRef(null);
  const info = JSON.parse(localStorage.getItem("organizerInfo") || "{}");

  const load = useCallback(async () => {
    const { data } = await api.get("/organizer-admin/dashboard");
    setData(data);
    setLoading(false);
  }, []);

  const scheduleRefresh = useCallback(
    (delay = 400) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, delay);
    },
    [load],
  );

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.connect();
    socket.emit("join-auction", info.id);
    socket.on("registration-update", (payload) => {
      showToast(
        payload?.kind === "team"
          ? "A new team just registered!"
          : "A new player just registered!",
        "info",
      );
      scheduleRefresh();
    });
    return () => {
      socket.off("registration-update");
      socket.disconnect();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line
  }, []);

  const registerLinkPlayer = `${window.location.origin}/register/player/${info.slug}`;
  const registerLinkTeam = `${window.location.origin}/register/team/${info.slug}`;
  const watchLiveLink = `${window.location.origin}/watch/${info.slug}`;

  return (
    <OrganizerLayout>
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
        onDataChanged={load}
      />

      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-turf">
            {info.tournamentName || "Tournament Dashboard"}
          </h1>
          <p className="text-mauve-dark text-xs sm:text-sm mt-0.5 font-medium">
            Track registrations, manage team purses, launch live auctions, and monitor tournament statistics.
          </p>
        </div>
        <a
          href="/organizer/live"
          className="btn-primary text-center text-sm py-2.5 px-5 shadow-lg shadow-mint/20 font-bold"
        >
          🚀 Launch Live Auction
        </a>
      </div>

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard label="Total Players" value={data?.totalPlayers ?? "—"} />
          <StatCard
            label="Sold"
            value={data?.soldPlayers ?? "—"}
            color="text-mint-dark"
          />
          <StatCard
            label="Unsold"
            value={data?.unsoldPlayers ?? "—"}
            color="text-rose"
          />
          <StatCard
            label="Pending"
            value={data?.pendingPlayers ?? "—"}
            color="text-orchid-dark"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <LinkCard title="Player Registration Link" link={registerLinkPlayer} />
        <LinkCard title="Team Registration Link" link={registerLinkTeam} />
        <LinkCard
          title="🔴 Watch Live Auction"
          link={watchLiveLink}
          highlight
        />
        <div className="card border-2 border-mint/40 bg-gradient-to-br from-mint/10 via-white to-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold text-turf flex items-center gap-1.5">
                <span>🎥</span> OBS Stream Overlay
              </p>
              <span className="text-[10px] font-black uppercase bg-mint text-turf-dark px-2 py-0.5 rounded-full">
                Broadcast
              </span>
            </div>
            <p className="text-xs text-mauve-dark mb-3">
              TV lower-thirds & live graphics for YouTube / Facebook Live.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOverlayModal(true)}
              className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 font-bold shadow-sm"
            >
              <span>⚙️</span> Configure & Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Live Auction Analytics & Leaderboard Widget */}
      <div className="mb-6">
        <AuctionAnalyticsWidget />
      </div>

      <h2 className="font-display text-2xl text-turf mb-3">Team Purses</h2>
      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {data?.teams?.map((t) => (
            <PurseBar key={t.id} team={t} />
          ))}
          {data?.teams?.length === 0 && (
            <p className="text-mauve text-sm col-span-full">No teams registered yet.</p>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}

function StatCard({ label, value, color = "text-turf" }) {
  return (
    <div className="card text-center p-3 sm:p-5 shadow-sm border-mauve/20">
      <p className={`text-2xl sm:text-3xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-[11px] sm:text-xs text-mauve-dark font-medium mt-1">{label}</p>
    </div>
  );
}

function LinkCard({ title, link, highlight = false }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`card ${highlight ? "border-2 border-mint shadow-md" : "border-mauve/20"}`}>
      <p className="text-sm font-semibold mb-2 text-turf">{title}</p>
      <div className="flex gap-1.5 sm:gap-2">
        <input
          readOnly
          className="input-field text-xs min-w-0 flex-1 px-2.5 py-1.5"
          value={link}
          onFocus={(e) => e.target.select()}
        />
        <button
          className="btn-secondary text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 inline-flex items-center"
        >
          Open
        </a>
      </div>
    </div>
  );
}
