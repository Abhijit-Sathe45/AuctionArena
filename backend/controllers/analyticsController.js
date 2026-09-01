const Player = require('../models/Player');
const Team = require('../models/Team');
const Category = require('../models/Category');
const Organizer = require('../models/Organizer');

/**
 * Computes deep analytics for a given tournament organizer:
 * 1. Top 5 Most Expensive Buys
 * 2. Overall Tournament Economy (Purse, Spent, Remaining, Avg, Highest Bid)
 * 3. Team Leaderboard with Purse Utilization % and Squad Composition
 * 4. Role & Category breakdown (Batsmen, Bowlers, All-rounders)
 */
async function computeAuctionAnalytics(organizerId) {
  const [players, teams, categories] = await Promise.all([
    Player.find({ organizer: organizerId })
      .populate('soldTo', 'teamName teamLogoUrl')
      .populate('category', 'name basePrice'),
    Team.find({ organizer: organizerId }),
    Category.find({ organizer: organizerId }),
  ]);

  const soldPlayers = players.filter((p) => p.auctionStatus === 'SOLD');
  const unsoldPlayers = players.filter((p) => p.auctionStatus === 'UNSOLD');
  const pendingPlayers = players.filter((p) => p.auctionStatus === 'PENDING' || p.auctionStatus === 'IN_AUCTION');

  // Top 5 Most Expensive Buys
  const topBuys = [...soldPlayers]
    .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
    .slice(0, 5)
    .map((p) => ({
      id: p._id,
      name: p.name,
      photoUrl: p.photoUrl,
      playerType: p.playerType,
      categoryName: p.category?.name || 'Standard',
      basePrice: p.basePrice || 0,
      soldPrice: p.soldPrice || 0,
      teamName: p.soldTo?.teamName || 'Unknown Team',
      teamLogoUrl: p.soldTo?.teamLogoUrl || null,
    }));

  // Economy Stats
  const totalPurse = teams.reduce((acc, t) => acc + (t.totalPurse || 0), 0);
  const totalPurseRemaining = teams.reduce((acc, t) => acc + (t.purseRemaining || 0), 0);
  const totalMoneySpent = Math.max(0, totalPurse - totalPurseRemaining);
  const avgSoldPrice = soldPlayers.length > 0 ? Math.round(totalMoneySpent / soldPlayers.length) : 0;
  const highestBid = topBuys.length > 0 ? topBuys[0].soldPrice : 0;

  // Team Leaderboards & Purse Utilization
  const teamAnalytics = teams.map((t) => {
    const teamPlayers = soldPlayers.filter(
      (p) => p.soldTo?._id?.toString() === t._id.toString() || p.soldTo?.toString() === t._id.toString()
    );
    const spent = Math.max(0, (t.totalPurse || 0) - (t.purseRemaining || 0));
    const spentPct = t.totalPurse > 0 ? Math.min(100, Math.round((spent / t.totalPurse) * 100)) : 0;

    // Squad composition by playerType
    const batsmen = teamPlayers.filter((p) => p.playerType === 'BATSMAN').length;
    const bowlers = teamPlayers.filter((p) => p.playerType === 'BOWLER').length;
    const allrounders = teamPlayers.filter((p) => p.playerType === 'ALLROUNDER').length;

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
      composition: {
        batsmen,
        bowlers,
        allrounders,
      },
    };
  }).sort((a, b) => b.purseSpent - a.purseSpent);

  // Overall Role Breakdown
  const roleBreakdown = {
    batsmen: {
      total: players.filter((p) => p.playerType === 'BATSMAN').length,
      sold: soldPlayers.filter((p) => p.playerType === 'BATSMAN').length,
      unsold: unsoldPlayers.filter((p) => p.playerType === 'BATSMAN').length,
    },
    bowlers: {
      total: players.filter((p) => p.playerType === 'BOWLER').length,
      sold: soldPlayers.filter((p) => p.playerType === 'BOWLER').length,
      unsold: unsoldPlayers.filter((p) => p.playerType === 'BOWLER').length,
    },
    allrounders: {
      total: players.filter((p) => p.playerType === 'ALLROUNDER').length,
      sold: soldPlayers.filter((p) => p.playerType === 'ALLROUNDER').length,
      unsold: unsoldPlayers.filter((p) => p.playerType === 'ALLROUNDER').length,
    },
  };

  return {
    topBuys,
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
    },
    teamAnalytics,
    roleBreakdown,
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
