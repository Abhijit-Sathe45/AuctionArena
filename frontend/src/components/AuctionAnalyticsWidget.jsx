import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import PlayerPhoto from "./PlayerPhoto";

/**
 * Modern, high-performance Live Auction Analytics & Leaderboard Widget.
 * Can be embedded into Organizer Dashboard, Live Auction console, and public Watch Live page.
 */
export default function AuctionAnalyticsWidget({
  slug = null,
  isPublic = false,
  className = "",
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const endpoint = isPublic
        ? `/public/${slug}/analytics`
        : "/organizer-admin/analytics";
      const { data: res } = await api.get(endpoint);
      setData(res);
      setError(null);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Unable to load live analytics.");
    } finally {
      setLoading(false);
    }
  }, [slug, isPublic]);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh analytics periodically every 15s during live auctions
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className={`card p-6 border-mauve/20 space-y-4 animate-pulse ${className}`}>
        <div className="h-6 bg-sky/30 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-sky/20 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          <div className="h-64 bg-sky/15 rounded-2xl" />
          <div className="h-64 bg-sky/15 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { topBuys = [], economy = {}, teamAnalytics = [], roleBreakdown = {} } = data;
  const clearanceRate =
    economy.totalPlayers > 0
      ? Math.round((economy.totalSold / (economy.totalSold + economy.totalUnsold || 1)) * 100)
      : 0;

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-mint/20 text-mint-dark text-xl shadow-inner font-bold">
            📊
          </span>
          <div>
            <h2 className="font-display text-xl sm:text-2xl text-turf font-bold tracking-wide">
              Live Tournament Leaderboard & Insights
            </h2>
            <p className="text-xs text-mauve-dark font-medium">
              Real-time economy metrics, top bidding wars, and squad utilization.
            </p>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-sky/20 border border-mauve/30 font-bold text-turf shadow-sm flex items-center gap-1.5 self-start sm:self-auto active:scale-95 transition-transform"
          title="Refresh statistics"
        >
          <span>🔄</span>
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* 4 Economy Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Money Spent vs Total Purse */}
        <div className="p-3.5 bg-gradient-to-br from-mint/15 to-mint/5 border border-mint/40 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs text-mauve-dark uppercase font-bold tracking-wider block">
            💰 Purse Spent
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-mint-dark">
            ₹{economy.totalMoneySpent?.toLocaleString("en-IN") || 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-mauve-dark pt-1">
            <span>Pool: ₹{economy.totalPurse?.toLocaleString("en-IN") || 0}</span>
          </div>
        </div>

        {/* Metric 2: Highest Bid Placed */}
        <div className="p-3.5 bg-gradient-to-br from-orchid/15 to-orchid/5 border border-orchid/30 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs text-mauve-dark uppercase font-bold tracking-wider block">
            🔥 Highest Bid
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-orchid-dark">
            ₹{economy.highestBid?.toLocaleString("en-IN") || 0}
          </p>
          <div className="text-[11px] text-mauve-dark truncate font-medium pt-1">
            {topBuys[0] ? `${topBuys[0].name}` : "No bids yet"}
          </div>
        </div>

        {/* Metric 3: Average Player Price */}
        <div className="p-3.5 bg-gradient-to-br from-sky/25 to-sky/10 border border-sky/40 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs text-mauve-dark uppercase font-bold tracking-wider block">
            📈 Avg Player Cost
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-turf">
            ₹{economy.avgSoldPrice?.toLocaleString("en-IN") || 0}
          </p>
          <div className="text-[11px] text-mauve-dark font-medium pt-1">
            Across {economy.totalSold || 0} sold players
          </div>
        </div>

        {/* Metric 4: Clearance Rate */}
        <div className="p-3.5 bg-gradient-to-br from-rose/15 to-rose/5 border border-rose/30 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs text-mauve-dark uppercase font-bold tracking-wider block">
            🎯 Auction Clearance
          </span>
          <p className="text-lg sm:text-2xl font-mono font-black text-rose">
            {clearanceRate}%
          </p>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-1">
            <span className="text-mint-dark">✓ {economy.totalSold || 0} Sold</span>
            <span className="text-rose">✕ {economy.totalUnsold || 0} Unsold</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Top 5 Expensive Buys & Team Purse Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Card: 🏆 Top 5 Most Expensive Buys */}
        <div className="card p-4 sm:p-5 border-mauve/20 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-mauve/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <h3 className="font-display text-base sm:text-lg text-turf font-bold">
                Most Expensive Players
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase bg-mint/20 text-mint-dark px-2.5 py-0.5 rounded-full border border-mint/40">
              Top 5 Buys
            </span>
          </div>

          {topBuys.length === 0 ? (
            <div className="text-center py-10 text-mauve-dark text-xs sm:text-sm font-medium space-y-1">
              <span className="text-2xl block">⏳</span>
              <p>No players sold yet in this auction.</p>
              <p className="text-[11px] text-mauve">Bids and purchases will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topBuys.map((player, idx) => {
                const rankColors = [
                  "bg-gradient-to-r from-mint to-mint-dark text-turf-dark ring-2 ring-mint/40",
                  "bg-sky text-turf font-bold",
                  "bg-orchid/30 text-orchid-dark font-bold",
                  "bg-mauve/30 text-turf font-bold",
                  "bg-mauve/20 text-turf font-bold",
                ];

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-sky/10 hover:bg-sky/20 border border-sky/25 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          rankColors[idx] || "bg-mauve/20 text-turf"
                        }`}
                      >
                        {idx + 1}
                      </span>

                      {/* Photo & Role */}
                      <PlayerPhoto
                        photoUrl={player.photoUrl}
                        className="w-10 h-10 rounded-full object-cover border border-mauve/30 shrink-0 shadow-sm"
                        fallbackClassName="w-10 h-10 rounded-full bg-sky/20 flex items-center justify-center text-sm"
                      />

                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-bold text-xs sm:text-sm text-turf truncate">
                            {player.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orchid/20 text-orchid-dark font-semibold shrink-0">
                            {player.categoryName}
                          </span>
                        </div>
                        <p className="text-[11px] text-mauve-dark truncate font-medium">
                          {player.playerType} · Sold to{" "}
                          <span className="text-turf font-bold">{player.teamName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Price Badge */}
                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm sm:text-base font-black text-mint-dark block">
                        ₹{player.soldPrice?.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-mauve font-medium">
                        Base: ₹{player.basePrice?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Card: 💼 Team Purse Utilization & Squad Composition */}
        <div className="card p-4 sm:p-5 border-mauve/20 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-mauve/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">💼</span>
              <h3 className="font-display text-base sm:text-lg text-turf font-bold">
                Team Spending & Squad Index
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase bg-sky/30 text-turf px-2.5 py-0.5 rounded-full border border-sky/40">
              {teamAnalytics.length} Teams
            </span>
          </div>

          {teamAnalytics.length === 0 ? (
            <div className="text-center py-10 text-mauve-dark text-xs sm:text-sm font-medium space-y-1">
              <span className="text-2xl block">👥</span>
              <p>No teams registered yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scroll-touch">
              {teamAnalytics.map((team) => (
                <div
                  key={team.id}
                  className="p-3 rounded-2xl bg-white border border-mauve/25 shadow-sm space-y-2 hover:border-sky-dark transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {team.teamLogoUrl ? (
                        <img
                          src={team.teamLogoUrl}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover border border-sky/30 shrink-0"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-mint/20 text-mint-dark flex items-center justify-center font-bold text-xs shrink-0">
                          🏏
                        </span>
                      )}
                      <div className="truncate">
                        <h4 className="font-bold text-xs sm:text-sm text-turf truncate">
                          {team.teamName}
                        </h4>
                        <p className="text-[10px] text-mauve-dark truncate font-medium">
                          {team.ownerName} · {team.playerCount} Players
                        </p>
                      </div>
                    </div>

                    {/* Remaining vs Spent */}
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-turf block">
                        ₹{team.purseRemaining?.toLocaleString("en-IN")} Left
                      </span>
                      <span className="text-[10px] text-mint-dark font-bold">
                        {team.spentPercentage}% Spent
                      </span>
                    </div>
                  </div>

                  {/* 2-Tone Purse Utilization Meter */}
                  <div className="space-y-1">
                    <div className="w-full bg-mauve/20 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-mint to-mint-dark h-full transition-all duration-300"
                        style={{ width: `${team.spentPercentage}%` }}
                        title={`Spent: ₹${team.purseSpent?.toLocaleString("en-IN")}`}
                      />
                    </div>
                  </div>

                  {/* Squad Role Breakdown Chips */}
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-mauve-dark pt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-sky/20 text-turf">
                      🏏 {team.composition.batsmen} Batsmen
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-orchid/20 text-orchid-dark">
                      🎯 {team.composition.bowlers} Bowlers
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-mint/20 text-mint-dark">
                      ⚡ {team.composition.allrounders} All-rounders
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Breakdown Distribution Banner */}
      <div className="p-4 bg-gradient-to-r from-sky/20 via-orchid/15 to-mint/15 border border-mauve/25 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-bold text-turf">Tournament Category Quotas:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1 bg-white rounded-xl border border-mauve/20 font-bold text-turf shadow-xs">
            🏏 Batsmen:{" "}
            <span className="text-mint-dark">{roleBreakdown.batsmen?.sold || 0}</span> /{" "}
            {roleBreakdown.batsmen?.total || 0}
          </span>
          <span className="px-3 py-1 bg-white rounded-xl border border-mauve/20 font-bold text-turf shadow-xs">
            🎯 Bowlers:{" "}
            <span className="text-mint-dark">{roleBreakdown.bowlers?.sold || 0}</span> /{" "}
            {roleBreakdown.bowlers?.total || 0}
          </span>
          <span className="px-3 py-1 bg-white rounded-xl border border-mauve/20 font-bold text-turf shadow-xs">
            ⚡ All-Rounders:{" "}
            <span className="text-mint-dark">{roleBreakdown.allrounders?.sold || 0}</span> /{" "}
            {roleBreakdown.allrounders?.total || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
