import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import PurseBar from "../../components/PurseBar";
import { SkeletonStatCards, SkeletonCards } from "../../components/Skeleton";
import { getSocket } from "../../socket";
import { useToast } from "../../context/ToastContext";

export default function Dashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);
  const info = JSON.parse(localStorage.getItem("organizerInfo") || "{}");

  const load = useCallback(async () => {
    const { data } = await api.get("/organizer-admin/dashboard");
    setData(data);
    setLoading(false);
  }, []);

  // Debounces bursts of registration events (e.g. several people registering within
  // a second or two of each other) into a single refresh instead of one per event.
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
      <h1 className="font-display text-3xl text-turf mb-1">Dashboard</h1>
      <p className="text-black/50 mb-6">
        Overview of your auction so far. Updates live as players and teams
        register.
      </p>

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
          <StatCard label="Total Players" value={data?.totalPlayers ?? "—"} />
          <StatCard
            label="Sold"
            value={data?.soldPlayers ?? "—"}
            color="text-green-600"
          />
          <StatCard
            label="Unsold"
            value={data?.unsoldPlayers ?? "—"}
            color="text-clay"
          />
          <StatCard
            label="Pending"
            value={data?.pendingPlayers ?? "—"}
            color="text-gold-dark"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <LinkCard title="Player Registration Link" link={registerLinkPlayer} />
        <LinkCard title="Team Registration Link" link={registerLinkTeam} />
        <LinkCard
          title="🔴 Watch Live Auction Link"
          link={watchLiveLink}
          highlight
        />
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
            <p className="text-black/40 text-sm col-span-full">No teams registered yet.</p>
          )}
        </div>
      )}
    </OrganizerLayout>
  );
}

function StatCard({ label, value, color = "text-turf" }) {
  return (
    <div className="card text-center p-3 sm:p-5">
      <p className={`text-2xl sm:text-3xl font-display ${color}`}>{value}</p>
      <p className="text-[11px] sm:text-xs text-black/60 mt-1">{label}</p>
    </div>
  );
}

function LinkCard({ title, link, highlight = false }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`card ${highlight ? "border-2 border-gold shadow-md" : ""}`}>
      <p className="text-sm font-semibold mb-2">{title}</p>
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
