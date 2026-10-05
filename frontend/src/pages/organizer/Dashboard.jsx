import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import PurseBar from "../../components/PurseBar";
import { SkeletonStatCards, SkeletonCards } from "../../components/Skeleton";
import StreamOverlayModal from "../../components/StreamOverlayModal";
import AuctionAnalyticsWidget from "../../components/AuctionAnalyticsWidget";
import { getSocket } from "../../socket";
import { useToast } from "../../context/ToastContext";

export default function Dashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
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

      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏏</span>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {info.tournamentName || "Cricket Tournament Dashboard"}
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Manage franchise registrations, player base prices, team purses, and live auction broadcast.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/organizer/analytics"
            className="text-xs sm:text-sm py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold shadow-xs flex items-center justify-center gap-2 transition active:scale-95"
            title="Open Data Analyst Studio & Economic Insights"
          >
            <span>📈</span>
            <span>Analyst Studio</span>
          </a>
          <a
            href="/organizer/live"
            className="btn-primary text-center text-xs sm:text-sm py-2.5 px-5 shadow-xs font-bold flex items-center justify-center gap-2"
          >
            <span>🔨</span>
            <span>Launch Live Auction</span>
          </a>
        </div>
      </div>

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard label="Total Cricket Players" value={data?.totalPlayers ?? "—"} icon="🏏" />
          <StatCard
            label="Squad Members Sold"
            value={data?.soldPlayers ?? "—"}
            color="text-emerald-700"
            icon="✅"
          />
          <StatCard
            label="Unsold In Pool"
            value={data?.unsoldPlayers ?? "—"}
            color="text-red-600"
            icon="🔴"
          />
          <StatCard
            label="Pending In Queue"
            value={data?.pendingPlayers ?? "—"}
            color="text-amber-600"
            icon="⏳"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <LinkCard title="🏏 Player Registration Link" link={registerLinkPlayer} />
        <LinkCard title="👥 Team Franchise Link" link={registerLinkTeam} />
        <LinkCard
          title="🔴 Spectator Live Stream"
          link={watchLiveLink}
          highlight
        />
        <div className="card border border-emerald-600/30 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>🎥</span> OBS Cricket TV Graphics
              </p>
              <span className="text-[10px] font-black uppercase bg-[#0F5132] text-white px-2 py-0.5 rounded">
                Live TV
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 font-medium">
              Broadcast lower-thirds & live ticker for YouTube / Facebook Live streams.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOverlayModal(true)}
              className="btn-navy text-xs w-full py-2 flex items-center justify-center gap-1.5 font-bold"
            >
              <span>⚙️</span> Configure TV Graphics
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Live Auction Analytics & Leaderboard Widget */}
      <div className="mb-6">
        <AuctionAnalyticsWidget />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span>💰</span> Franchise Purses & Squad Limits
        </h2>
      </div>
      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {data?.teams?.map((t) => (
            <PurseBar key={t.id} team={t} />
          ))}
          {data?.teams?.length === 0 && (
            <div className="card col-span-full text-center py-8 text-slate-500 text-sm">
              No franchise teams registered yet. Share the Team Registration link above.
            </div>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}

function StatCard({ label, value, color = "text-slate-900", icon }) {
  return (
    <div className="card text-center p-4 sm:p-5 shadow-xs border-slate-200">
      {icon && <span className="text-lg sm:text-xl block mb-1">{icon}</span>}
      <p className={`text-2xl sm:text-3xl font-scoreboard font-black ${color}`}>{value}</p>
      <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-1">{label}</p>
    </div>
  );
}

function LinkCard({ title, link, highlight = false }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`card ${highlight ? "border-2 border-[#0F5132] shadow-xs" : "border-slate-200"}`}>
      <p className="text-xs sm:text-sm font-bold mb-2 text-slate-800">{title}</p>
      <div className="flex gap-1.5 sm:gap-2">
        <input
          readOnly
          className="input-field text-xs min-w-0 flex-1 px-2.5 py-1.5 font-mono text-slate-600 bg-slate-50"
          value={link}
          onFocus={(e) => e.target.select()}
        />
        <button
          className="btn-secondary text-xs px-2.5 sm:px-3 py-1.5 shrink-0"
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
          className="btn-primary text-xs px-2.5 sm:px-3 py-1.5 shrink-0 inline-flex items-center"
        >
          Open
        </a>
      </div>
    </div>
  );
}
