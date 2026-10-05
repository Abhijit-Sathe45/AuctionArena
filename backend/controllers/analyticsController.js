const Player = require('../models/Player');
const Team = require('../models/Team');
const Category = require('../models/Category');
const Organizer = require('../models/Organizer');
const AuctionLog = require('../models/AuctionLog');

/**
 * Computes deep, comprehensive analytics and insights for a tournament auction:
 * 1. Overview & Tournament Economy (Purse, Spent, Inflation, Price Tiers, Bids Count)
 * 2. Category & Role Deep Dives with Average Cost and Demand Share
 * 3. Team Strategy Matrix: Squad Balance Score (0-100), Archetypes, Letter Grades, Avg Cost
 * 4. Market Highlights: Top Marquee Buys, Steals/Bargains, Fiercest Bidding Wars, Unsold Breakdown
 * 5. Bidding War Dynamics & Head-to-Head Duels
 * 6. Automated AI Executive Summary & Narrative Report
 * 7. Complete Player Dataset for custom client-side slicing and querying
 */
async function computeAuctionAnalytics(organizerId) {
  const [players, teams, categories, logs, organizer] = await Promise.all([
    Player.find({ organizer: organizerId })
      .populate('soldTo', 'teamName teamLogoUrl ownerName')
      .populate('category', 'name basePrice')
      .lean(),
    Team.find({ organizer: organizerId }).lean(),
    Category.find({ organizer: organizerId }).lean(),
    AuctionLog.find({ organizer: organizerId })
      .populate('player', 'name playerType category')
      .populate('finalTeam', 'teamName teamLogoUrl')
      .populate('bids.team', 'teamName')
      .lean(),
    Organizer.findById(organizerId, 'tournamentName slug currencySymbol createdAt').lean(),
  ]);

  const soldPlayers = players.filter((p) => p.auctionStatus === 'SOLD');
  const unsoldPlayers = players.filter((p) => p.auctionStatus === 'UNSOLD');
  const pendingPlayers = players.filter((p) => p.auctionStatus === 'PENDING' || p.auctionStatus === 'IN_AUCTION');

  // 1. Core Economy Stats
  const totalPurse = teams.reduce((acc, t) => acc + (t.totalPurse || 0), 0);
  const totalPurseRemaining = teams.reduce((acc, t) => acc + (t.purseRemaining || 0), 0);
  const totalMoneySpent = Math.max(0, totalPurse - totalPurseRemaining);
  const avgSoldPrice = soldPlayers.length > 0 ? Math.round(totalMoneySpent / soldPlayers.length) : 0;
  
  const totalBaseValueOfSold = soldPlayers.reduce((acc, p) => acc + (p.basePrice || p.category?.basePrice || 0), 0);
  const inflationMultiplier = totalBaseValueOfSold > 0 ? (totalMoneySpent / totalBaseValueOfSold) : 1;
  const overallInflationPct = totalBaseValueOfSold > 0 
    ? Math.round(((totalMoneySpent - totalBaseValueOfSold) / totalBaseValueOfSold) * 100) 
    : 0;
  
  const clearanceRate = (soldPlayers.length + unsoldPlayers.length) > 0
    ? Math.round((soldPlayers.length / (soldPlayers.length + unsoldPlayers.length)) * 100)
    : 0;

  // 2. Price Tiers / Spending Brackets
  const priceTiers = [
    { key: 'budget', label: 'Budget Tier (< ₹1,000)', min: 0, max: 999, players: [], count: 0, totalSpend: 0 },
    { key: 'mid', label: 'Mid-Range (₹1,000 - ₹4,999)', min: 1000, max: 4999, players: [], count: 0, totalSpend: 0 },
    { key: 'premium', label: 'Premium (₹5,000 - ₹9,999)', min: 5000, max: 9999, players: [], count: 0, totalSpend: 0 },
    { key: 'marquee', label: 'Marquee / High Value (≥ ₹10,000)', min: 10000, max: Infinity, players: [], count: 0, totalSpend: 0 },
  ];

  soldPlayers.forEach((p) => {
    const price = p.soldPrice || 0;
    const tier = priceTiers.find((t) => price >= t.min && price <= t.max);
    if (tier) {
      tier.count += 1;
      tier.totalSpend += price;
      tier.players.push({
        id: p._id,
        name: p.name,
        soldPrice: price,
        playerType: p.playerType,
        teamName: p.soldTo?.teamName || 'Unknown',
      });
    }
  });

  priceTiers.forEach((tier) => {
    tier.percentageOfSpend = totalMoneySpent > 0 ? Math.round((tier.totalSpend / totalMoneySpent) * 100) : 0;
    tier.avgPrice = tier.count > 0 ? Math.round(tier.totalSpend / tier.count) : 0;
  });

  // 3. Category Breakdown Economics
  const categoryAnalytics = categories.map((c) => {
    const catPlayers = players.filter((p) => (p.category?._id || p.category)?.toString() === c._id.toString());
    const catSold = catPlayers.filter((p) => p.auctionStatus === 'SOLD');
    const catUnsold = catPlayers.filter((p) => p.auctionStatus === 'UNSOLD');
    const catPending = catPlayers.filter((p) => p.auctionStatus === 'PENDING' || p.auctionStatus === 'IN_AUCTION');
    const catTotalSpend = catSold.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
    const catBaseTotal = catSold.reduce((acc, p) => acc + (p.basePrice || c.basePrice || 0), 0);
    const catAvgSold = catSold.length > 0 ? Math.round(catTotalSpend / catSold.length) : 0;
    const catInflation = catBaseTotal > 0 ? Math.round(((catTotalSpend - catBaseTotal) / catBaseTotal) * 100) : 0;
    const catClearance = (catSold.length + catUnsold.length) > 0
      ? Math.round((catSold.length / (catSold.length + catUnsold.length)) * 100)
      : 0;

    return {
      id: c._id,
      name: c.name,
      basePrice: c.basePrice,
      totalPlayers: catPlayers.length,
      soldCount: catSold.length,
      unsoldCount: catUnsold.length,
      pendingCount: catPending.length,
      clearanceRate: catClearance,
      totalSpend: catTotalSpend,
      avgSoldPrice: catAvgSold,
      inflationPct: catInflation,
      shareOfTotalSpend: totalMoneySpent > 0 ? Math.round((catTotalSpend / totalMoneySpent) * 100) : 0,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  // 4. Role Breakdown Economics
  const roles = ['BATSMAN', 'BOWLER', 'ALLROUNDER'];
  const roleBreakdown = {};
  
  roles.forEach((r) => {
    const rKey = r.toLowerCase() === 'batsman' ? 'batsmen' : r.toLowerCase() === 'bowler' ? 'bowlers' : 'allrounders';
    const rPlayers = players.filter((p) => p.playerType === r);
    const rSold = rPlayers.filter((p) => p.auctionStatus === 'SOLD');
    const rUnsold = rPlayers.filter((p) => p.auctionStatus === 'UNSOLD');
    const rSpend = rSold.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
    const rAvg = rSold.length > 0 ? Math.round(rSpend / rSold.length) : 0;
    const rTop = [...rSold].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0];

    roleBreakdown[rKey] = {
      role: r,
      total: rPlayers.length,
      sold: rSold.length,
      unsold: rUnsold.length,
      pending: rPlayers.length - rSold.length - rUnsold.length,
      totalSpend: rSpend,
      avgSoldPrice: rAvg,
      shareOfTotalSpend: totalMoneySpent > 0 ? Math.round((rSpend / totalMoneySpent) * 100) : 0,
      clearanceRate: (rSold.length + rUnsold.length) > 0
        ? Math.round((rSold.length / (rSold.length + rUnsold.length)) * 100)
        : 0,
      topPlayer: rTop ? {
        name: rTop.name,
        soldPrice: rTop.soldPrice,
        teamName: rTop.soldTo?.teamName || 'Unknown',
        photoUrl: rTop.photoUrl,
      } : null,
    };
  });

  // 5. Team Strategy Matrix, Squad Balance & Letter Grades
  const teamAnalytics = teams.map((t) => {
    const teamIdStr = t._id.toString();
    const teamPlayers = soldPlayers.filter(
      (p) => (p.soldTo?._id || p.soldTo)?.toString() === teamIdStr
    );
    const spent = Math.max(0, (t.totalPurse || 0) - (t.purseRemaining || 0));
    const spentPct = t.totalPurse > 0 ? Math.min(100, Math.round((spent / t.totalPurse) * 100)) : 0;
    const avgCostPerPlayer = teamPlayers.length > 0 ? Math.round(spent / teamPlayers.length) : 0;

    const batsmen = teamPlayers.filter((p) => p.playerType === 'BATSMAN');
    const bowlers = teamPlayers.filter((p) => p.playerType === 'BOWLER');
    const allrounders = teamPlayers.filter((p) => p.playerType === 'ALLROUNDER');

    // Calculate Squad Balance Score (0 - 100)
    // Ideal balance: at least 30% batsmen, 30% bowlers, 20% allrounders
    let balanceScore = 50;
    if (teamPlayers.length > 0) {
      const batRatio = batsmen.length / teamPlayers.length;
      const bowlRatio = bowlers.length / teamPlayers.length;
      const allRatio = allrounders.length / teamPlayers.length;
      
      // Penalty for missing entirely any category
      const hasAllRoles = batsmen.length > 0 && bowlers.length > 0 && allrounders.length > 0;
      const variance = Math.abs(batRatio - 0.35) + Math.abs(bowlRatio - 0.35) + Math.abs(allRatio - 0.30);
      balanceScore = Math.max(20, Math.min(100, Math.round(100 - (variance * 60) + (hasAllRoles ? 15 : -15))));
    } else {
      balanceScore = 0;
    }

    // Strategy Archetype Classification
    let strategyArchetype = 'Balanced Mastermind';
    let archetypeIcon = '⚖️';
    if (teamPlayers.length === 0) {
      strategyArchetype = 'Yet to Enter Bidding';
      archetypeIcon = '⏳';
    } else if (batsmen.length > (bowlers.length + allrounders.length)) {
      strategyArchetype = 'Batting Heavyweight';
      archetypeIcon = '🏏';
    } else if (bowlers.length > (batsmen.length + allrounders.length)) {
      strategyArchetype = 'Bowling Fortress';
      archetypeIcon = '🎯';
    } else if (allrounders.length >= batsmen.length && allrounders.length >= bowlers.length) {
      strategyArchetype = 'All-Rounder Stronghold';
      archetypeIcon = '⚡';
    } else if (spentPct < 50 && teamPlayers.length >= 4) {
      strategyArchetype = 'Value Economizer';
      archetypeIcon = '💰';
    } else if (spentPct > 80 && teamPlayers.length <= 3) {
      strategyArchetype = 'Aggressive Top-Heavy';
      archetypeIcon = '🔥';
    }

    // Squad Grade (A+, A, B+, B, C)
    let squadGrade = 'B';
    if (teamPlayers.length >= 6 && balanceScore >= 80 && t.purseRemaining >= (t.totalPurse * 0.15)) {
      squadGrade = 'A+';
    } else if (teamPlayers.length >= 4 && balanceScore >= 70) {
      squadGrade = 'A';
    } else if (teamPlayers.length >= 3 && balanceScore >= 60) {
      squadGrade = 'B+';
    } else if (teamPlayers.length >= 2) {
      squadGrade = 'B';
    } else if (teamPlayers.length > 0) {
      squadGrade = 'C+';
    } else {
      squadGrade = 'N/A';
    }

    // Top player bought by this team
    const topBuy = [...teamPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))[0];

    return {
      id: t._id,
      teamName: t.teamName,
      ownerName: t.ownerName,
      teamLogoUrl: t.teamLogoUrl,
      totalPurse: t.totalPurse,
      purseRemaining: t.purseRemaining,
      purseSpent: spent,
      spentPercentage: spentPct,
      playerCount: teamPlayers.length,
      avgCostPerPlayer,
      balanceScore,
      strategyArchetype,
      archetypeIcon,
      squadGrade,
      composition: {
        batsmen: batsmen.length,
        bowlers: bowlers.length,
        allrounders: allrounders.length,
      },
      topBuy: topBuy ? {
        name: topBuy.name,
        soldPrice: topBuy.soldPrice,
        photoUrl: topBuy.photoUrl,
        playerType: topBuy.playerType,
      } : null,
      players: teamPlayers.map((p) => ({
        id: p._id,
        name: p.name,
        playerType: p.playerType,
        categoryName: p.category?.name || 'Standard',
        basePrice: p.basePrice || 0,
        soldPrice: p.soldPrice || 0,
        photoUrl: p.photoUrl,
        age: p.age,
      })).sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0)),
    };
  }).sort((a, b) => b.purseSpent - a.purseSpent);

  // 6. Market Highlights: Top Buys, Steals, Bidding Wars, Unsold
  const sortedByPrice = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
  
  // Top 10 Marquee Buys
  const topBuys = sortedByPrice.slice(0, 10).map((p) => ({
    id: p._id,
    name: p.name,
    photoUrl: p.photoUrl,
    playerType: p.playerType,
    categoryName: p.category?.name || 'Standard',
    basePrice: p.basePrice || 0,
    soldPrice: p.soldPrice || 0,
    markupPct: p.basePrice > 0 ? Math.round(((p.soldPrice - p.basePrice) / p.basePrice) * 100) : 0,
    teamName: p.soldTo?.teamName || 'Unknown Team',
    teamLogoUrl: p.soldTo?.teamLogoUrl || null,
  }));

  // Top 10 Value Steals (Lowest markup multiplier or bought at base price)
  const topSteals = [...soldPlayers]
    .map((p) => {
      const base = p.basePrice || p.category?.basePrice || 1;
      const markup = p.soldPrice - base;
      const ratio = p.soldPrice / base;
      return {
        id: p._id,
        name: p.name,
        photoUrl: p.photoUrl,
        playerType: p.playerType,
        categoryName: p.category?.name || 'Standard',
        basePrice: base,
        soldPrice: p.soldPrice,
        markup,
        ratio: Number(ratio.toFixed(2)),
        teamName: p.soldTo?.teamName || 'Unknown Team',
      };
    })
    .sort((a, b) => a.ratio - b.ratio || a.markup - b.markup)
    .slice(0, 10);

  // Top 10 Bidding Wars (Highest absolute jump and price multiplier)
  const biggestBiddingWars = [...soldPlayers]
    .map((p) => {
      const base = p.basePrice || p.category?.basePrice || 0;
      const jump = Math.max(0, (p.soldPrice || 0) - base);
      const multiplier = base > 0 ? Number((p.soldPrice / base).toFixed(2)) : 1;
      return {
        id: p._id,
        name: p.name,
        photoUrl: p.photoUrl,
        playerType: p.playerType,
        categoryName: p.category?.name || 'Standard',
        basePrice: base,
        soldPrice: p.soldPrice || 0,
        priceJump: jump,
        multiplier,
        teamName: p.soldTo?.teamName || 'Unknown Team',
      };
    })
    .sort((a, b) => b.priceJump - a.priceJump || b.multiplier - a.multiplier)
    .slice(0, 10);

  // Unsold Players Diagnostics & Round 2 Recommendations
  const unsoldAnalysis = unsoldPlayers.map((p) => {
    const originalBase = p.basePrice || p.category?.basePrice || 0;
    const recommendedRound2Base = Math.max(500, Math.round((originalBase * 0.75) / 100) * 100);
    return {
      id: p._id,
      name: p.name,
      photoUrl: p.photoUrl,
      playerType: p.playerType,
      categoryName: p.category?.name || 'Standard',
      originalBasePrice: originalBase,
      recommendedRound2Base,
      age: p.age,
    };
  });

  // 7. Bidding Dynamics & Head-to-Head Duels from AuctionLog
  let totalBidsPlaced = 0;
  const playerBidCounts = {};
  const teamDuelMatrix = {};

  logs.forEach((log) => {
    const bidList = log.bids || [];
    totalBidsPlaced += bidList.length;
    
    if (log.player?._id) {
      const pId = log.player._id.toString();
      playerBidCounts[pId] = (playerBidCounts[pId] || 0) + bidList.length;
    }

    // Check consecutive pairs of bidding teams in the log
    for (let i = 0; i < bidList.length - 1; i++) {
      const t1 = bidList[i].team?.teamName || bidList[i].team?.toString();
      const t2 = bidList[i + 1].team?.teamName || bidList[i + 1].team?.toString();
      if (t1 && t2 && t1 !== t2) {
        const key = [t1, t2].sort().join(' ⚔️ ');
        teamDuelMatrix[key] = (teamDuelMatrix[key] || 0) + 1;
      }
    }
  });

  const avgBidsPerPlayer = soldPlayers.length > 0 ? Number((totalBidsPlaced / soldPlayers.length).toFixed(1)) : 0;
  
  // Top contested bidding duels
  const topBiddingDuels = Object.entries(teamDuelMatrix)
    .map(([teamsKey, count]) => ({ teams: teamsKey, bidExchanges: count }))
    .sort((a, b) => b.bidExchanges - a.bidExchanges)
    .slice(0, 5);

  // 8. Automated AI Executive Summary Narrative
  const topTeamBySpend = teamAnalytics[0];
  const mostBalancedTeam = [...teamAnalytics].sort((a, b) => b.balanceScore - a.balanceScore)[0];
  const mostEconomicalTeam = [...teamAnalytics]
    .filter((t) => t.playerCount > 0)
    .sort((a, b) => a.avgCostPerPlayer - b.avgCostPerPlayer)[0];

  const highestBid = topBuys.length > 0 ? topBuys[0].soldPrice : 0;
  const marqueePlayerName = topBuys.length > 0 ? topBuys[0].name : 'N/A';

  const executiveNarrative = {
    headline: `Tournament Auction Analysis: ₹${totalMoneySpent.toLocaleString('en-IN')} Spent Across ${soldPlayers.length} Players`,
    summaryParagraph: `The auction concluded with a ${clearanceRate}% clearance rate. Total bidding turnover reached ₹${totalMoneySpent.toLocaleString('en-IN')} across ${teams.length} franchises. The market experienced an overall price inflation of ${overallInflationPct > 0 ? `+${overallInflationPct}%` : '0%'} above reserve prices, led by marquee player ${marqueePlayerName} who commanded the top bid of ₹${highestBid.toLocaleString('en-IN')}.`,
    highlights: [
      `Total Tournament Turnover: ₹${totalMoneySpent.toLocaleString('en-IN')} of ₹${totalPurse.toLocaleString('en-IN')} (${totalPurse > 0 ? Math.round((totalMoneySpent / totalPurse) * 100) : 0}% pool utilization)`,
      `Clearance Efficiency: ${soldPlayers.length} Sold (${clearanceRate}%), ${unsoldPlayers.length} Unsold in pool`,
      `Average Player Acquisition Cost: ₹${avgSoldPrice.toLocaleString('en-IN')}`,
      `Total Live Bids Processed: ${totalBidsPlaced} bids (${avgBidsPerPlayer} bids/sold player)`,
    ],
    awards: {
      mostBalancedSquad: mostBalancedTeam ? {
        teamName: mostBalancedTeam.teamName,
        score: mostBalancedTeam.balanceScore,
        details: `${mostBalancedTeam.playerCount} players with optimal role mix`,
      } : null,
      topSpender: topTeamBySpend ? {
        teamName: topTeamBySpend.teamName,
        spent: topTeamBySpend.purseSpent,
        pct: topTeamBySpend.spentPercentage,
      } : null,
      valueBargainMaster: mostEconomicalTeam ? {
        teamName: mostEconomicalTeam.teamName,
        avgCost: mostEconomicalTeam.avgCostPerPlayer,
        squadSize: mostEconomicalTeam.playerCount,
      } : null,
      topDuel: topBiddingDuels[0] || null,
    },
    round2Advice: unsoldPlayers.length > 0
      ? `A total of ${unsoldPlayers.length} players remain unsold. Re-auctioning them with a 20-25% base price discount in Round 2 can maximize squad completion for franchises holding remaining purse.`
      : 'All registered players have been successfully auctioned! No re-auction round required.',
  };

  // 9. Flat Player Dataset for instant client-side querying & slicing
  const allPlayersDataset = players.map((p) => ({
    id: p._id,
    name: p.name,
    age: p.age,
    playerType: p.playerType,
    battingStyle: p.battingStyle,
    bowlingStyle: p.bowlingStyle,
    categoryName: p.category?.name || 'Standard',
    basePrice: p.basePrice || p.category?.basePrice || 0,
    soldPrice: p.soldPrice || 0,
    auctionStatus: p.auctionStatus,
    soldToTeamId: p.soldTo?._id || p.soldTo || null,
    soldToTeamName: p.soldTo?.teamName || '—',
    photoUrl: p.photoUrl,
    markupPct: (p.basePrice > 0 && p.soldPrice > 0)
      ? Math.round(((p.soldPrice - p.basePrice) / p.basePrice) * 100)
      : 0,
  }));

  return {
    tournament: {
      name: organizer?.tournamentName || 'Cricket Tournament Auction',
      slug: organizer?.slug || '',
      currency: organizer?.currencySymbol || '₹',
      generatedAt: new Date().toISOString(),
    },
    economy: {
      totalPurse,
      totalMoneySpent,
      totalPurseRemaining,
      avgSoldPrice,
      highestBid,
      totalSold: soldPlayers.length,
      totalUnsold: unsoldPlayers.length,
      totalPending: pendingPlayers.length,
      totalPlayers: players.length,
      clearanceRate,
      inflationMultiplier: Number(inflationMultiplier.toFixed(2)),
      overallInflationPct,
      totalBidsPlaced,
      avgBidsPerPlayer,
    },
    priceTiers,
    categoryAnalytics,
    roleBreakdown,
    teamAnalytics,
    marketHighlights: {
      topBuys,
      topSteals,
      biggestBiddingWars,
      unsoldAnalysis,
    },
    biddingDynamics: {
      totalBidsPlaced,
      avgBidsPerPlayer,
      topBiddingDuels,
    },
    executiveNarrative,
    allPlayersDataset,
  };
}

// Handler for Organizer Admin: GET /api/organizer-admin/analytics
async function getOrganizerAnalytics(req, res) {
  const analytics = await computeAuctionAnalytics(req.user.id);
  res.json(analytics);
}

// Handler for Public Spectator: GET /api/public/:slug/analytics
async function getPublicAnalytics(req, res) {
  const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
  if (!organizer) return res.status(404).json({ message: 'Tournament not found' });
  const analytics = await computeAuctionAnalytics(organizer._id);
  res.json(analytics);
}

module.exports = {
  computeAuctionAnalytics,
  getOrganizerAnalytics,
  getPublicAnalytics,
};

