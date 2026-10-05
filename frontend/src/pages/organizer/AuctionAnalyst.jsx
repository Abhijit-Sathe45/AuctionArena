import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/axios";
import OrganizerLayout from "../../components/OrganizerLayout";
import PlayerPhoto from "../../components/PlayerPhoto";
import { useToast } from "../../context/ToastContext";

export default function AuctionAnalyst() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary"); // 'summary' | 'teams' | 'market' | 'explorer' | 'ai-analyst'
  const [selectedTeam, setSelectedTeam] = useState(null); // For team deep-dive modal
  
  // Head-to-head compare state
  const [compareTeamA, setCompareTeamA] = useState("");
  const [compareTeamB, setCompareTeamB] = useState("");

  // Explorer Tab Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterTeam, setFilterTeam] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [maxPriceFilter, setMaxPriceFilter] = useState(100000);

  // Market sub-tab
  const [marketView, setMarketView] = useState("marquee"); // 'marquee' | 'steals' | 'wars' | 'unsold'

  // AI Analyst Chat / Query state
  const [analystMessages, setAnalystMessages] = useState([]);
  const [analystInput, setAnalystInput] = useState("");
  const [isAnalystThinking, setIsAnalystThinking] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get("/organizer-admin/analytics");
      setData(res);
      if (res.teamAnalytics?.length >= 2 && !compareTeamA) {
        setCompareTeamA(res.teamAnalytics[0]?.id);
        setCompareTeamB(res.teamAnalytics[1]?.id);
      }
    } catch (err) {
      console.error("Failed to load auction analytics:", err);
      showToast("Failed to load auction analytics.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, compareTeamA]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Initialize AI Analyst welcoming message once data is loaded
  useEffect(() => {
    if (data && analystMessages.length === 0) {
      const topName = data.marketHighlights?.topBuys?.[0]?.name || "None yet";
      const totalSpent = data.economy?.totalMoneySpent?.toLocaleString("en-IN") || "0";
      setAnalystMessages([
        {
          sender: "ai",
          title: "📈 Auction Intelligence Assistant Ready",
          text: `I have analyzed the complete data for **${data.tournament?.name || "Tournament"}**.\n\n* **Turnover:** ₹${totalSpent}\n* **Clearance Rate:** ${data.economy?.clearanceRate || 0}%\n* **Highest Bid:** ₹${data.economy?.highestBid?.toLocaleString("en-IN") || 0} (${topName})\n\nAsk me anything about team spending patterns, player valuation, role distribution, or round 2 strategies!`,
          suggestions: [
            "Which team has the best squad balance?",
            "Who are the top 3 most expensive players?",
            "Which category had the highest price inflation?",
            "Compare the top 2 teams in the auction",
            "Generate WhatsApp summary for team owners",
            "Show unsold players for Round 2 re-auction"
          ],
        },
      ]);
    }
  }, [data, analystMessages.length]);

  // CSV Export Utility
  function exportCSV() {
    if (!data?.allPlayersDataset) return;
    const headers = [
      "Player ID",
      "Player Name",
      "Age",
      "Role",
      "Batting Style",
      "Bowling Style",
      "Category",
      "Base Price (INR)",
      "Sold Price (INR)",
      "Status",
      "Winning Team",
      "Price Inflation (%)"
    ];

    const rows = data.allPlayersDataset.map((p) => [
      `"${p.id}"`,
      `"${p.name}"`,
      p.age || "",
      `"${p.playerType}"`,
      `"${p.battingStyle || ""}"`,
      `"${p.bowlingStyle || ""}"`,
      `"${p.categoryName}"`,
      p.basePrice || 0,
      p.soldPrice || 0,
      `"${p.auctionStatus}"`,
      `"${p.soldToTeamName}"`,
      `${p.markupPct}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `${(data.tournament?.name || "Auction").replace(/\s+/g, "_")}_Data_Analysis.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("CSV dataset downloaded successfully!", "success");
  }

  // Copy WhatsApp Broadcast Summary
  function copyWhatsAppSummary() {
    if (!data) return;
    const topBuy = data.marketHighlights?.topBuys?.[0];
    const topDuel = data.biddingDynamics?.topBiddingDuels?.[0];
    
    const msg = `🏏 *${data.tournament?.name || "AUCTION ARENA"} — OFFICIAL AUCTION SUMMARY* 📊\n\n` +
      `💰 *Total Turnover:* ₹${data.economy?.totalMoneySpent?.toLocaleString("en-IN")} / ₹${data.economy?.totalPurse?.toLocaleString("en-IN")} (${Math.round((data.economy?.totalMoneySpent / (data.economy?.totalPurse || 1)) * 100)}% Pool Utilization)\n` +
      `🎯 *Clearance Rate:* ${data.economy?.totalSold} Sold | ${data.economy?.totalUnsold} Unsold (${data.economy?.clearanceRate}% Clearance)\n` +
      `📈 *Market Inflation:* +${data.economy?.overallInflationPct}% above base prices\n` +
      `🔥 *Highest Bid of the Day:* ${topBuy ? `${topBuy.name} (₹${topBuy.soldPrice?.toLocaleString("en-IN")} to ${topBuy.teamName})` : "N/A"}\n` +
      `⚡ *Total Bids Placed:* ${data.economy?.totalBidsPlaced} bids processed\n` +
      (topDuel ? `⚔️ *Fiercest Bidding Duel:* ${topDuel.teams} (${topDuel.bidExchanges} bids exchanged)\n\n` : "\n") +
      `🏆 *FRANCHISE SQUAD TOTALS:*\n` +
      data.teamAnalytics.map(t => `• *${t.teamName}:* ${t.playerCount} Players | ₹${t.purseSpent?.toLocaleString("en-IN")} Spent (₹${t.purseRemaining?.toLocaleString("en-IN")} Left) [Grade: ${t.squadGrade}]`).join("\n") +
      `\n\n📌 *Generated by Auction Arena Intelligence Studio*`;

    navigator.clipboard.writeText(msg);
    showToast("WhatsApp broadcast summary copied to clipboard!", "success");
  }

  // AI Analyst Response Handler
  function handleAskAnalyst(customQuery = null) {
    const q = (customQuery || analystInput).trim();
    if (!q || !data) return;

    const userMsg = { sender: "user", text: q };
    setAnalystMessages((prev) => [...prev, userMsg]);
    setAnalystInput("");
    setIsAnalystThinking(true);

    setTimeout(() => {
      const lower = q.toLowerCase();
      let replyTitle = "Analyst Insight";
      let replyText = "";
      let suggestions = [
        "Which team has the best squad balance?",
        "Compare top 2 teams",
        "Show unsold players for Round 2",
        "Who is the top bowler?"
      ];

      if (lower.includes("balance") || lower.includes("best squad") || lower.includes("grade")) {
        const sorted = [...data.teamAnalytics].sort((a, b) => b.balanceScore - a.balanceScore);
        const best = sorted[0];
        replyTitle = "⚖️ Squad Balance & Roster Rating";
        replyText = `**${best.teamName}** leads the tournament with a **Squad Balance Score of ${best.balanceScore}/100** (Grade: **${best.squadGrade}**).\n\n* **Composition:** ${best.composition.batsmen} Batsmen, ${best.composition.bowlers} Bowlers, ${best.composition.allrounders} All-Rounders.\n* **Purse Efficiency:** Spent ₹${best.purseSpent.toLocaleString("en-IN")} (${best.spentPercentage}%) with ₹${best.purseRemaining.toLocaleString("en-IN")} remaining.\n* **Archetype:** ${best.archetypeIcon} ${best.strategyArchetype}.\n\nOther strong contenders include **${sorted[1]?.teamName || "N/A"}** (${sorted[1]?.balanceScore}/100).`;
      } else if (lower.includes("expensive") || lower.includes("top buy") || lower.includes("highest bid") || lower.includes("top 3")) {
        const top3 = data.marketHighlights?.topBuys?.slice(0, 3) || [];
        replyTitle = "🏆 Top Marquee Player Acquisitions";
        replyText = `Here are the top marquee acquisitions in the auction:\n\n` +
          top3.map((p, idx) => `${idx + 1}. **${p.name}** (${p.playerType}) — **₹${p.soldPrice.toLocaleString("en-IN")}** to *${p.teamName}* (+${p.markupPct}% over base)`).join("\n") +
          `\n\nTotal money spent on top 3 players represents **${data.economy.totalMoneySpent > 0 ? Math.round((top3.reduce((s, p) => s + p.soldPrice, 0) / data.economy.totalMoneySpent) * 100) : 0}%** of the entire tournament turnover.`;
      } else if (lower.includes("bowler") || lower.includes("bowling")) {
        const topBowler = data.roleBreakdown?.bowlers?.topPlayer;
        const bowlersSold = data.roleBreakdown?.bowlers?.sold || 0;
        const bowlerSpend = data.roleBreakdown?.bowlers?.totalSpend?.toLocaleString("en-IN") || "0";
        replyTitle = "🎯 Bowlers Market Analysis";
        replyText = `A total of **${bowlersSold} bowlers** were acquired for a combined turnover of **₹${bowlerSpend}** (Avg: ₹${data.roleBreakdown?.bowlers?.avgSoldPrice?.toLocaleString("en-IN")}).\n\n* **Top Bowler Acquisition:** ${topBowler ? `**${topBowler.name}** for **₹${topBowler.soldPrice?.toLocaleString("en-IN")}** to *${topBowler.teamName}*` : "No bowlers sold yet."}\n* **Share of Total Pool:** ${data.roleBreakdown?.bowlers?.shareOfTotalSpend}% of tournament spending went towards bowling assets.`;
      } else if (lower.includes("batsman") || lower.includes("batting") || lower.includes("batter")) {
        const topBat = data.roleBreakdown?.batsmen?.topPlayer;
        replyTitle = "🏏 Batsmen Market Analysis";
        replyText = `**${data.roleBreakdown?.batsmen?.sold || 0} batsmen** were sold for **₹${data.roleBreakdown?.batsmen?.totalSpend?.toLocaleString("en-IN")}** (Avg: ₹${data.roleBreakdown?.batsmen?.avgSoldPrice?.toLocaleString("en-IN")}).\n\n* **Highest Priced Batter:** ${topBat ? `**${topBat.name}** (₹${topBat.soldPrice?.toLocaleString("en-IN")} to *${topBat.teamName}*)` : "None"}`;
      } else if (lower.includes("compare") || lower.includes("vs")) {
        const t1 = data.teamAnalytics[0];
        const t2 = data.teamAnalytics[1];
        if (t1 && t2) {
          replyTitle = `⚔️ Head-to-Head: ${t1.teamName} vs ${t2.teamName}`;
          replyText = `**Side-by-Side Comparison:**\n\n` +
            `* **Purse Spent:** ${t1.teamName} ₹${t1.purseSpent.toLocaleString("en-IN")} (${t1.spentPercentage}%) vs ${t2.teamName} ₹${t2.purseSpent.toLocaleString("en-IN")} (${t2.spentPercentage}%)\n` +
            `* **Squad Size:** ${t1.playerCount} players vs ${t2.playerCount} players\n` +
            `* **Avg Player Cost:** ₹${t1.avgCostPerPlayer.toLocaleString("en-IN")} vs ₹${t2.avgCostPerPlayer.toLocaleString("en-IN")}\n` +
            `* **Squad Balance Rating:** ${t1.balanceScore}/100 vs ${t2.balanceScore}/100\n` +
            `* **Strategy Profile:** ${t1.archetypeIcon} ${t1.strategyArchetype} vs ${t2.archetypeIcon} ${t2.strategyArchetype}\n` +
            `* **Top Buy:** ${t1.topBuy ? `${t1.topBuy.name} (₹${t1.topBuy.soldPrice.toLocaleString("en-IN")})` : "N/A"} vs ${t2.topBuy ? `${t2.topBuy.name} (₹${t2.topBuy.soldPrice.toLocaleString("en-IN")})` : "N/A"}`;
        }
      } else if (lower.includes("unsold") || lower.includes("round 2") || lower.includes("re-auction")) {
        const count = data.marketHighlights?.unsoldAnalysis?.length || 0;
        replyTitle = "⚠️ Round 2 Re-Auction Strategic Roadmap";
        replyText = `There are currently **${count} unsold players** in the pool.\n\n${data.executiveNarrative?.round2Advice}\n\nTop unsold players available for Round 2 include:\n` +
          (data.marketHighlights?.unsoldAnalysis?.slice(0, 4)?.map(p => `• **${p.name}** (${p.playerType}) — Orig Base: ₹${p.originalBasePrice.toLocaleString("en-IN")} → *Recommended Round 2: ₹${p.recommendedRound2Base.toLocaleString("en-IN")}*`).join("\n") || "None");
      } else if (lower.includes("inflation") || lower.includes("category")) {
        const topCat = data.categoryAnalytics?.[0];
        replyTitle = "📈 Category Market Inflation & Demand";
        replyText = `Overall market inflation is **+${data.economy.overallInflationPct}%** across all sold players.\n\n` +
          (data.categoryAnalytics?.map(c => `• **${c.name}:** ₹${c.totalSpend.toLocaleString("en-IN")} total spend | ${c.soldCount}/${c.totalPlayers} Sold (${c.clearanceRate}%) | Inflation: **+${c.inflationPct}%**`).join("\n") || "No category data.");
      } else if (lower.includes("whatsapp") || lower.includes("summary") || lower.includes("owner")) {
        replyTitle = "📋 Formatted Tournament Executive Recap";
        replyText = `Here is your summary ready to broadcast:\n\n` +
          `🏆 **${data.tournament.name} Auction Highlights**\n` +
          `• Total Pool Turnover: ₹${data.economy.totalMoneySpent.toLocaleString("en-IN")}\n` +
          `• Clearance Rate: ${data.economy.clearanceRate}% (${data.economy.totalSold} Sold, ${data.economy.totalUnsold} Unsold)\n` +
          `• Top Marquee Buy: ${data.marketHighlights?.topBuys?.[0]?.name} (₹${data.marketHighlights?.topBuys?.[0]?.soldPrice?.toLocaleString("en-IN")})\n` +
          `• Total Live Bids: ${data.economy.totalBidsPlaced}\n\n` +
          `*(Tap the "WhatsApp Summary" button in the top action bar to copy the full message)*`;
      } else {
        replyTitle = "📊 Analyst Insights";
        replyText = `Based on current tournament statistics:\n\n* **Total Turnover:** ₹${data.economy.totalMoneySpent.toLocaleString("en-IN")} across ${data.economy.totalSold} sold players.\n* **Clearance Rate:** ${data.economy.clearanceRate}%\n* **Market Inflation:** +${data.economy.overallInflationPct}% above base prices.\n* **Active Franchises:** ${data.teamAnalytics.length} teams with ₹${data.economy.totalPurseRemaining.toLocaleString("en-IN")} total purse remaining.\n\nTry asking about **squad balance ratings**, **marquee buys**, **unsold player strategy**, or **head-to-head comparisons**!`;
      }

      setAnalystMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          title: replyTitle,
          text: replyText,
          suggestions,
        },
      ]);
      setIsAnalystThinking(false);
    }, 320);
  }

  // Filtered dataset for Explorer Tab
  const filteredPlayers = useMemo(() => {
    if (!data?.allPlayersDataset) return [];
    return data.allPlayersDataset.filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterRole !== "ALL" && p.playerType !== filterRole) return false;
      if (filterCategory !== "ALL" && p.categoryName !== filterCategory) return false;
      if (filterTeam !== "ALL" && (p.soldToTeamName !== filterTeam && p.soldToTeamId !== filterTeam)) return false;
      if (filterStatus !== "ALL" && p.auctionStatus !== filterStatus) return false;
      if (p.soldPrice > maxPriceFilter) return false;
      return true;
    });
  }, [data, searchQuery, filterRole, filterCategory, filterTeam, filterStatus, maxPriceFilter]);

  // Statistics for currently filtered explorer selection
  const explorerStats = useMemo(() => {
    const totalSpent = filteredPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
    const soldCount = filteredPlayers.filter(p => p.auctionStatus === "SOLD").length;
    const avgPrice = soldCount > 0 ? Math.round(totalSpent / soldCount) : 0;
    const maxBid = filteredPlayers.reduce((max, p) => Math.max(max, p.soldPrice || 0), 0);
    return {
      count: filteredPlayers.length,
      soldCount,
      totalSpent,
      avgPrice,
      maxBid,
    };
  }, [filteredPlayers]);

  // Compare teams objects
  const teamAObj = useMemo(() => data?.teamAnalytics?.find(t => t.id === compareTeamA), [data, compareTeamA]);
  const teamBObj = useMemo(() => data?.teamAnalytics?.find(t => t.id === compareTeamB), [data, compareTeamB]);

  if (loading && !data) {
    return (
      <OrganizerLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>
      </OrganizerLayout>
    );
  }

  if (!data) {
    return (
      <OrganizerLayout>
        <div className="card p-10 text-center space-y-3">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold text-slate-800">No Analytics Data Available</h2>
          <p className="text-xs text-slate-500">Ensure teams and players are registered in your tournament.</p>
          <button onClick={fetchAnalytics} className="btn-primary text-xs py-2 px-4 font-bold">
            Retry Loading
          </button>
        </div>
      </OrganizerLayout>
    );
  }

  const { economy, priceTiers, categoryAnalytics, roleBreakdown, teamAnalytics, marketHighlights, biddingDynamics, executiveNarrative } = data;

  return (
    <OrganizerLayout>
      {/* 1. Header Toolbar & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-2xl bg-[#0F5132]/15 text-[#0F5132] text-xl shadow-xs font-black">
              📈
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Auction Analyst Studio
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              Live Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Deep-dive economic metrics, team strategy balance matrices, price brackets, and AI executive summaries.
          </p>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            className="text-xs px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-800 shadow-xs flex items-center gap-1.5 transition active:scale-95"
            title="Download CSV dataset with all players & bids"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          <button
            onClick={copyWhatsAppSummary}
            className="text-xs px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
            title="Copy formatted WhatsApp summary"
          >
            <span>📲</span>
            <span>WhatsApp Summary</span>
          </button>

          <button
            onClick={() => window.print()}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
            title="Print or save as Executive PDF report"
          >
            <span>🖨️</span>
            <span>Print Report</span>
          </button>

          <button
            onClick={fetchAnalytics}
            className="text-xs p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-800 shadow-xs transition active:scale-95"
            title="Refresh statistics"
          >
            🔄
          </button>
        </div>
      </div>

      {/* 2. Top 5 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-300/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            💰 Turnover / Spent
          </span>
          <p className="text-lg sm:text-2xl font-scoreboard font-black text-emerald-800">
            ₹{economy.totalMoneySpent?.toLocaleString("en-IN")}
          </p>
          <div className="text-[10px] text-slate-500 truncate font-semibold">
            Pool: ₹{economy.totalPurse?.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-sky-50 to-white border border-sky-300/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            📈 Avg Cost / Player
          </span>
          <p className="text-lg sm:text-2xl font-scoreboard font-black text-sky-900">
            ₹{economy.avgSoldPrice?.toLocaleString("en-IN")}
          </p>
          <div className="text-[10px] text-slate-500 truncate font-semibold">
            Across {economy.totalSold} sold players
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-amber-50 to-white border border-amber-300/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            🔥 Market Inflation
          </span>
          <p className="text-lg sm:text-2xl font-scoreboard font-black text-amber-900">
            +{economy.overallInflationPct}%
          </p>
          <div className="text-[10px] text-slate-500 truncate font-semibold">
            {economy.inflationMultiplier}x base reserve ratio
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-white border border-indigo-300/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            🎯 Clearance Rate
          </span>
          <p className="text-lg sm:text-2xl font-scoreboard font-black text-indigo-900">
            {economy.clearanceRate}%
          </p>
          <div className="text-[10px] text-slate-500 truncate font-semibold">
            ✓ {economy.totalSold} Sold · ✕ {economy.totalUnsold} Unsold
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-purple-50 to-white border border-purple-300/80 rounded-2xl shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            ⚡ Live Bids Count
          </span>
          <p className="text-lg sm:text-2xl font-scoreboard font-black text-purple-900">
            {economy.totalBidsPlaced || 0}
          </p>
          <div className="text-[10px] text-slate-500 truncate font-semibold">
            ~{economy.avgBidsPerPlayer} bids per sold player
          </div>
        </div>
      </div>

      {/* 3. Studio Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl mb-6 overflow-x-auto scroll-touch">
        <TabButton
          active={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
          icon="📊"
          label="Executive Summary & KPIs"
        />
        <TabButton
          active={activeTab === "teams"}
          onClick={() => setActiveTab("teams")}
          icon="👥"
          label="Team Strategy & Balance Matrix"
        />
        <TabButton
          active={activeTab === "market"}
          onClick={() => setActiveTab("market")}
          icon="🏏"
          label="Market Dynamics & Wars"
        />
        <TabButton
          active={activeTab === "explorer"}
          onClick={() => setActiveTab("explorer")}
          icon="🔍"
          label="Custom Query & Slicer"
        />
        <TabButton
          active={activeTab === "ai-analyst"}
          onClick={() => setActiveTab("ai-analyst")}
          icon="🤖"
          label="Ask AI Data Analyst"
          badge="AI"
        />
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE SUMMARY & KPIS */}
      {/* ========================================================================= */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-fade-in">
          {/* AI Executive Digest Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-[#0B1E3D] text-white shadow-md border border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold border border-emerald-400/30">
                  ✨
                </span>
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-white">
                    {executiveNarrative.headline}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    AI-Generated Executive Tournament Digest
                  </p>
                </div>
              </div>
              <button
                onClick={copyWhatsAppSummary}
                className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold self-start sm:self-auto transition active:scale-95 shadow-xs"
              >
                📋 Copy Broadcast
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {executiveNarrative.summaryParagraph}
            </p>

            {/* Awards & Milestones Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {executiveNarrative.awards?.mostBalancedSquad && (
                <div className="p-3 rounded-2xl bg-white/10 border border-white/15 space-y-1">
                  <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider flex items-center gap-1">
                    <span>⚖️</span> Best Balanced Squad
                  </span>
                  <p className="text-sm font-bold text-white">
                    {executiveNarrative.awards.mostBalancedSquad.teamName}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Score: {executiveNarrative.awards.mostBalancedSquad.score}/100 ({executiveNarrative.awards.mostBalancedSquad.details})
                  </p>
                </div>
              )}

              {executiveNarrative.awards?.topSpender && (
                <div className="p-3 rounded-2xl bg-white/10 border border-white/15 space-y-1">
                  <span className="text-[10px] text-amber-300 uppercase font-bold tracking-wider flex items-center gap-1">
                    <span>🔥</span> Most Aggressive Spender
                  </span>
                  <p className="text-sm font-bold text-white">
                    {executiveNarrative.awards.topSpender.teamName}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    ₹{executiveNarrative.awards.topSpender.spent?.toLocaleString("en-IN")} ({executiveNarrative.awards.topSpender.pct}% purse utilized)
                  </p>
                </div>
              )}

              {executiveNarrative.awards?.valueBargainMaster && (
                <div className="p-3 rounded-2xl bg-white/10 border border-white/15 space-y-1">
                  <span className="text-[10px] text-sky-300 uppercase font-bold tracking-wider flex items-center gap-1">
                    <span>💰</span> Value Master (Lowest Cost)
                  </span>
                  <p className="text-sm font-bold text-white">
                    {executiveNarrative.awards.valueBargainMaster.teamName}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Avg ₹{executiveNarrative.awards.valueBargainMaster.avgCost?.toLocaleString("en-IN")} / player ({executiveNarrative.awards.valueBargainMaster.squadSize} players)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Price Tier Spending Brackets */}
          <div className="card p-5 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Price Tier & Value Distribution
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                4 Spending Brackets
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {priceTiers.map((tier) => (
                <div
                  key={tier.key}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 hover:border-slate-400 transition shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{tier.label}</span>
                    <span className="text-[11px] font-mono font-black text-emerald-700">
                      {tier.percentageOfSpend}% Spend
                    </span>
                  </div>

                  <p className="text-xl font-scoreboard font-black text-slate-900">
                    {tier.count} <span className="text-xs font-normal text-slate-500 font-sans">Players</span>
                  </p>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${tier.percentageOfSpend}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                    <span>Total: ₹{tier.totalSpend.toLocaleString("en-IN")}</span>
                    <span>Avg: ₹{tier.avgPrice.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2-Column: Category Economics & Role Economics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Category Breakdown Table */}
            <div className="card p-5 border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Category Turnover & Inflation
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {categoryAnalytics.length} Categories
                </span>
              </div>

              <div className="overflow-x-auto scroll-touch">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                      <th className="py-2 pr-2">Category</th>
                      <th className="py-2 px-2 text-center">Sold/Total</th>
                      <th className="py-2 px-2 text-right">Total Spent</th>
                      <th className="py-2 px-2 text-right">Avg Price</th>
                      <th className="py-2 pl-2 text-right">Inflation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryAnalytics.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 pr-2 font-bold text-slate-800">
                          {cat.name}
                          <span className="block text-[10px] text-slate-500 font-normal">
                            Base: ₹{cat.basePrice?.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                            {cat.soldCount}/{cat.totalPlayers} ({cat.clearanceRate}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-800">
                          ₹{cat.totalSpend.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-700 font-medium">
                          ₹{cat.avgSoldPrice.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <span className={`font-bold ${cat.inflationPct > 0 ? "text-amber-700" : "text-slate-500"}`}>
                            +{cat.inflationPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {categoryAnalytics.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No categories defined yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Role Demand & Spending Breakdown */}
            <div className="card p-5 border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏏</span>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Role Demand & Allocation
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Batsmen · Bowlers · All-Rounders
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(roleBreakdown).map(([key, r]) => {
                  const roleName = key === "batsmen" ? "🏏 Batsmen" : key === "bowlers" ? "🎯 Bowlers" : "⚡ All-Rounders";
                  const colorClass = key === "batsmen" ? "from-sky-500 to-sky-600" : key === "bowlers" ? "from-purple-500 to-purple-600" : "from-emerald-500 to-emerald-600";
                  return (
                    <div key={key} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{roleName}</span>
                        <span className="font-mono font-bold text-emerald-800">
                          ₹{r.totalSpend.toLocaleString("en-IN")} ({r.shareOfTotalSpend}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${colorClass} h-full transition-all duration-500`}
                          style={{ width: `${r.shareOfTotalSpend}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>{r.sold}/{r.total} Acquired ({r.clearanceRate}%)</span>
                        <span>Avg: ₹{r.avgSoldPrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEAM STRATEGY & SQUAD BALANCE MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "teams" && (
        <div className="space-y-6 animate-fade-in">
          {/* Head-to-Head Team Comparison Tool */}
          <div className="card p-5 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚔️</span>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Head-to-Head Franchise Duel Comparison
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Compare Any 2 Franchises
              </span>
            </div>

            {/* Team Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Franchise A:
                </label>
                <select
                  value={compareTeamA}
                  onChange={(e) => setCompareTeamA(e.target.value)}
                  className="input-field text-xs sm:text-sm py-2 px-3 rounded-xl w-full"
                >
                  {teamAnalytics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName} ({t.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Franchise B:
                </label>
                <select
                  value={compareTeamB}
                  onChange={(e) => setCompareTeamB(e.target.value)}
                  className="input-field text-xs sm:text-sm py-2 px-3 rounded-xl w-full"
                >
                  {teamAnalytics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName} ({t.ownerName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-Side Comparison Display */}
            {teamAObj && teamBObj && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <TeamCompareCard team={teamAObj} />
                <TeamCompareCard team={teamBObj} />
              </div>
            )}
          </div>

          {/* Franchise Master Leaderboard & Strategy Table */}
          <div className="card p-5 border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Franchise Squad Analytics & Strategy Index
                </h3>
                <p className="text-xs text-slate-500">
                  Click any franchise row to inspect their full squad roster and price breakdown.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 self-start sm:self-auto">
                {teamAnalytics.length} Franchises Active
              </span>
            </div>

            <div className="overflow-x-auto scroll-touch">
              <table className="w-full text-xs sm:text-sm text-left min-w-[720px]">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <th className="py-2.5 pr-3">Franchise</th>
                    <th className="py-2.5 px-3">Strategy Archetype</th>
                    <th className="py-2.5 px-3 text-center">Squad Role Mix</th>
                    <th className="py-2.5 px-3 text-right">Purse Spent</th>
                    <th className="py-2.5 px-3 text-right">Purse Left</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost</th>
                    <th className="py-2.5 px-3 text-center">Balance Score</th>
                    <th className="py-2.5 pl-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamAnalytics.map((team) => (
                    <tr
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className="hover:bg-emerald-50/50 cursor-pointer transition"
                      title="Click to view full team roster"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          {team.teamLogoUrl ? (
                            <img
                              src={team.teamLogoUrl}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                              🏏
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{team.teamName}</p>
                            <p className="text-[10px] text-slate-500">{team.ownerName} · {team.playerCount} Players</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>{team.archetypeIcon}</span>
                          <span>{team.strategyArchetype}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                            🏏 {team.composition.batsmen}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            🎯 {team.composition.bowlers}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            ⚡ {team.composition.allrounders}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        ₹{team.purseSpent.toLocaleString("en-IN")}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {team.spentPercentage}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        ₹{team.purseRemaining.toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ₹{team.avgCostPerPlayer.toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-scoreboard font-bold text-slate-800">
                            {team.balanceScore}
                          </span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </div>
                      </td>

                      <td className="py-3 pl-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
                          team.squadGrade.startsWith("A")
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : team.squadGrade.startsWith("B")
                            ? "bg-sky-100 text-sky-800 border border-sky-300"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {team.squadGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MARKET DYNAMICS: MARQUEE, STEALS & WARS */}
      {/* ========================================================================= */}
      {activeTab === "market" && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-Tabs Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-2xl w-fit flex-wrap">
            <button
              onClick={() => setMarketView("marquee")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
                marketView === "marquee"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🏆 Top Marquee Buys
            </button>
            <button
              onClick={() => setMarketView("steals")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
                marketView === "steals"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💎 Value Bargains & Steals
            </button>
            <button
              onClick={() => setMarketView("wars")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
                marketView === "wars"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔥 Fiercest Bidding Wars
            </button>
            <button
              onClick={() => setMarketView("unsold")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
                marketView === "unsold"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⚠️ Unsold Diagnostics ({marketHighlights.unsoldAnalysis.length})
            </button>
          </div>

          {/* Sub-View: Top Marquee Buys */}
          {marketView === "marquee" && (
            <div className="card p-5 border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                    🏆 Top 10 Most Expensive Marquee Buys
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ranked by highest final hammer price in the auction.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {marketHighlights.topBuys.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <PlayerPhoto
                        photoUrl={player.photoUrl}
                        className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
                        fallbackClassName="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {player.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold shrink-0">
                            {player.categoryName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {player.playerType} · Sold to <span className="font-bold text-slate-800">{player.teamName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm sm:text-base font-black text-emerald-800 block">
                        ₹{player.soldPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Base: ₹{player.basePrice?.toLocaleString("en-IN")} (+{player.markupPct}%)
                      </span>
                    </div>
                  </div>
                ))}
                {marketHighlights.topBuys.length === 0 && (
                  <p className="text-slate-400 text-xs py-8 text-center col-span-full">
                    No sold players yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sub-View: Value Steals & Bargains */}
          {marketView === "steals" && (
            <div className="card p-5 border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                    💎 Top 10 Value Steals & Bargain Buys
                  </h3>
                  <p className="text-xs text-slate-500">
                    Players acquired at or closest to their initial base reserve price.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {marketHighlights.topSteals.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <PlayerPhoto
                        photoUrl={player.photoUrl}
                        className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
                        fallbackClassName="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {player.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {player.playerType} · <span className="font-semibold text-slate-700">{player.teamName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-bold text-emerald-900 block">
                        ₹{player.soldPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {player.ratio}x Base Value
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-View: Fiercest Bidding Wars */}
          {marketView === "wars" && (
            <div className="card p-5 border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                    🔥 Top 10 Fiercest Bidding Wars
                  </h3>
                  <p className="text-xs text-slate-500">
                    Highest price escalation from original base price to final hammer price.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {marketHighlights.biggestBiddingWars.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50/40 border border-amber-200/80 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <PlayerPhoto
                        photoUrl={player.photoUrl}
                        className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
                        fallbackClassName="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {player.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {player.playerType} · <span className="font-semibold text-slate-700">{player.teamName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-black text-amber-900 block">
                        +₹{player.priceJump.toLocaleString("en-IN")} Jump
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">
                        {player.multiplier}x Base Price
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-View: Unsold Diagnostics */}
          {marketView === "unsold" && (
            <div className="card p-5 border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                    ⚠️ Unsold Player Diagnostics & Round 2 Strategy
                  </h3>
                  <p className="text-xs text-slate-500">
                    {executiveNarrative.round2Advice}
                  </p>
                </div>
                <a
                  href="/organizer/live"
                  className="btn-primary text-xs py-2 px-4 font-bold self-start sm:self-auto"
                >
                  🚀 Launch Round 2 Re-Auction
                </a>
              </div>

              <div className="overflow-x-auto scroll-touch">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                      <th className="py-2 pr-3">Player</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Original Base</th>
                      <th className="py-2 pl-3 text-right">Recommended Round 2 Base</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {marketHighlights.unsoldAnalysis.map((player) => (
                      <tr key={player.id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <PlayerPhoto
                              photoUrl={player.photoUrl}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                              fallbackClassName="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs"
                            />
                            <span className="font-bold text-slate-800">{player.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{player.playerType}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {player.categoryName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ₹{player.originalBasePrice.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono font-bold text-emerald-800">
                          ₹{player.recommendedRound2Base.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {marketHighlights.unsoldAnalysis.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          🎉 No unsold players! All players were sold.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bidding War Duels Bar */}
          {biddingDynamics.topBiddingDuels?.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-purple-50 via-sky-50 to-emerald-50 border border-slate-200 rounded-3xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚔️</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Top Franchise Bidding Duels (Head-to-Head Bid Exchanges):
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {biddingDynamics.topBiddingDuels.map((duel, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-1.5"
                  >
                    <span>{duel.teams}</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-black">
                      {duel.bidExchanges} bids
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CUSTOM QUERY & SLICER EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === "explorer" && (
        <div className="space-y-5 animate-fade-in">
          {/* Slicer Controls Box */}
          <div className="card p-5 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Interactive Player Slicer & Filtering Engine
                </h3>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterRole("ALL");
                  setFilterCategory("ALL");
                  setFilterTeam("ALL");
                  setFilterStatus("ALL");
                  setMaxPriceFilter(100000);
                }}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Search Name:
                </label>
                <input
                  type="text"
                  placeholder="Player name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field text-xs py-2 px-2.5 rounded-xl w-full"
                />
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Role:
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="input-field text-xs py-2 px-2.5 rounded-xl w-full"
                >
                  <option value="ALL">All Roles</option>
                  <option value="BATSMAN">Batsmen</option>
                  <option value="BOWLER">Bowlers</option>
                  <option value="ALLROUNDER">All-Rounders</option>
                  <option value="WICKET_KEEPER">Wicket Keepers</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Category:
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field text-xs py-2 px-2.5 rounded-xl w-full"
                >
                  <option value="ALL">All Categories</option>
                  {categoryAnalytics.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Winning Team:
                </label>
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="input-field text-xs py-2 px-2.5 rounded-xl w-full"
                >
                  <option value="ALL">All Franchises</option>
                  {teamAnalytics.map((t) => (
                    <option key={t.id} value={t.teamName}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Status:
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input-field text-xs py-2 px-2.5 rounded-xl w-full"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SOLD">Sold</option>
                  <option value="UNSOLD">Unsold</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
            </div>

            {/* Sliced Summary Banner */}
            <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold text-slate-700 flex-wrap">
              <span>Showing: <strong className="text-slate-900">{explorerStats.count} Players</strong></span>
              <span>Sold in Selection: <strong className="text-emerald-800">{explorerStats.soldCount}</strong></span>
              <span>Total Spent: <strong className="text-emerald-800 font-mono">₹{explorerStats.totalSpent.toLocaleString("en-IN")}</strong></span>
              <span>Avg Price: <strong className="font-mono">₹{explorerStats.avgPrice.toLocaleString("en-IN")}</strong></span>
              <span>Highest Bid: <strong className="text-amber-800 font-mono">₹{explorerStats.maxBid.toLocaleString("en-IN")}</strong></span>
            </div>
          </div>

          {/* Sliced Data Table */}
          <div className="card overflow-x-auto scroll-touch p-5 border-slate-200 shadow-xs">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <th className="py-2.5 pr-3">Player</th>
                  <th className="py-2.5 px-3">Role & Style</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Winning Team</th>
                  <th className="py-2.5 px-3 text-right">Base Price</th>
                  <th className="py-2.5 pl-3 text-right">Sold Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <PlayerPhoto
                          photoUrl={p.photoUrl}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          fallbackClassName="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs"
                        />
                        <span className="font-bold text-slate-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {p.playerType}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {p.categoryName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.auctionStatus === "SOLD"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.auctionStatus === "UNSOLD"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.auctionStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {p.soldToTeamName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      ₹{p.basePrice?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono font-bold text-emerald-800">
                      {p.soldPrice ? `₹${p.soldPrice.toLocaleString("en-IN")}` : "—"}
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No players match the current filter selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ASK AI DATA ANALYST (NLP CHAT Q&A) */}
      {/* ========================================================================= */}
      {activeTab === "ai-analyst" && (
        <div className="card p-5 border-slate-200 shadow-xs space-y-4 animate-fade-in max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-sky-600 text-white flex items-center justify-center text-lg font-bold shadow-xs">
                🤖
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Auction Intelligence AI Analyst
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ask conversational questions about this tournament's economy, team balance, and statistics.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAnalystMessages(analystMessages.slice(0, 1))}
              className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-900 font-semibold"
            >
              Clear
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="space-y-3.5 max-h-[480px] overflow-y-auto p-2 scroll-touch">
            {analystMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm ${
                    msg.sender === "user"
                      ? "bg-emerald-700 text-white rounded-br-xs font-semibold shadow-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs space-y-2"
                  }`}
                >
                  {msg.title && (
                    <div className="font-bold text-xs text-emerald-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                      <span>{msg.title}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>

                {/* Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 pl-1 max-w-[90%]">
                    {msg.suggestions.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleAskAnalyst(chip)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 border border-slate-300 text-slate-800 font-semibold transition active:scale-95 shadow-2xs flex items-center gap-1"
                      >
                        <span>💡</span>
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isAnalystThinking && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-100 border border-slate-200 w-24">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about team balance, highest bids, unsold players..."
              value={analystInput}
              onChange={(e) => setAnalystInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskAnalyst();
                }
              }}
              className="input-field text-xs sm:text-sm py-2.5 px-3 rounded-xl flex-1"
            />
            <button
              onClick={() => handleAskAnalyst()}
              disabled={!analystInput.trim() || isAnalystThinking}
              className="btn-primary text-xs sm:text-sm py-2.5 px-4 font-bold rounded-xl shadow-xs disabled:opacity-40"
            >
              Ask Analyst
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEAM DEEP-DIVE MODAL / DRAWER */}
      {/* ========================================================================= */}
      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-scale-up text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0B1E3D] to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {selectedTeam.teamLogoUrl ? (
                  <img
                    src={selectedTeam.teamLogoUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/40"
                  />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-base border border-white/20">
                    🏏
                  </span>
                )}
                <div className="truncate">
                  <h3 className="font-display font-bold text-base sm:text-lg text-white truncate">
                    {selectedTeam.teamName}
                  </h3>
                  <p className="text-xs text-emerald-300 font-medium truncate">
                    Owner: {selectedTeam.ownerName} · {selectedTeam.strategyArchetype} ({selectedTeam.squadGrade})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeam(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 text-center shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Purse Spent</span>
                <span className="font-scoreboard text-sm sm:text-base font-black text-emerald-800">
                  ₹{selectedTeam.purseSpent.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Purse Left</span>
                <span className="font-scoreboard text-sm sm:text-base font-black text-slate-800">
                  ₹{selectedTeam.purseRemaining.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Squad Mix</span>
                <span className="text-xs font-bold text-slate-700">
                  {selectedTeam.composition.batsmen}B · {selectedTeam.composition.bowlers}W · {selectedTeam.composition.allrounders}A
                </span>
              </div>
            </div>

            {/* Squad List */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2.5 scroll-touch">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                Acquired Squad ({selectedTeam.players.length} Players)
              </h4>

              {selectedTeam.players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <PlayerPhoto
                      photoUrl={p.photoUrl}
                      className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                      fallbackClassName="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs"
                    />
                    <div className="truncate">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.playerType} · {p.categoryName}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-800 block">
                      ₹{p.soldPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400">Base: ₹{p.basePrice?.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}

              {selectedTeam.players.length === 0 && (
                <p className="text-slate-400 text-xs py-8 text-center">
                  This team has not acquired any players yet.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 text-right shrink-0">
              <button
                onClick={() => setSelectedTeam(null)}
                className="btn-secondary text-xs py-1.5 px-4 font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}

// Subcomponents
function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition select-none ${
        active
          ? "bg-white text-slate-900 shadow-xs border border-slate-300"
          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className="text-[9px] font-black uppercase bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded">
          {badge}
        </span>
      )}
    </button>
  );
}

function TeamCompareCard({ team }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
      <div className="flex items-center gap-2.5">
        {team.teamLogoUrl ? (
          <img
            src={team.teamLogoUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-slate-300"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            🏏
          </span>
        )}
        <div className="truncate">
          <h4 className="font-bold text-sm text-slate-900 truncate">{team.teamName}</h4>
          <p className="text-[10px] text-slate-500">{team.ownerName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-white rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Spent</span>
          <span className="font-mono font-bold text-emerald-800">
            ₹{team.purseSpent.toLocaleString("en-IN")} ({team.spentPercentage}%)
          </span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance Left</span>
          <span className="font-mono font-bold text-slate-800">
            ₹{team.purseRemaining.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
        <span className="text-slate-500 font-medium">Squad Mix:</span>
        <span className="font-bold text-slate-800">
          {team.composition.batsmen} Bat · {team.composition.bowlers} Bowl · {team.composition.allrounders} All
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Strategy & Grade:</span>
        <span className="font-bold text-emerald-800">
          {team.strategyArchetype} ({team.squadGrade})
        </span>
      </div>

      {team.topBuy && (
        <div className="text-[11px] p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
          🏆 Top Buy: <strong>{team.topBuy.name}</strong> (₹{team.topBuy.soldPrice.toLocaleString("en-IN")})
        </div>
      )}
    </div>
  );
}
