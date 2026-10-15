// Pure business logic for the live auction, shared by both the REST controller (auctionController),
// the WebSocket handler (socket/auctionSocket.js), and the background timer (auctionTimerService).
// Keeping this logic in one place ensures the fast WebSocket bidding path, the regular HTTP API,
// and the server-side auto-resolution timers are always in sync.

const AuctionState = require('../models/AuctionState');
const AuctionSettings = require('../models/AuctionSettings');
const AuctionLog = require('../models/AuctionLog');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { getNextBidAmount } = require('../utils/bidIncrement');

async function getOrCreateState(organizerId) {
  let state = await AuctionState.findOne({ organizer: organizerId });
  if (!state) state = await AuctionState.create({ organizer: organizerId });
  return state;
}

const POPULATE_PATH = 'currentPlayer currentBidTeam currentCategory currentBidHistory.team passedTeams playerQueue';
const FAST_BID_POPULATE = 'currentPlayer currentBidTeam currentCategory currentBidHistory.team passedTeams';

// High-speed in-memory cache for AuctionSettings per organizer (TTL 20 seconds)
const settingsCache = new Map();

async function getCachedSettings(organizerId) {
  const key = organizerId.toString();
  const cached = settingsCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.settings;
  }

  let settings = await AuctionSettings.findOne({ organizer: organizerId }).lean();
  if (!settings) {
    const created = await AuctionSettings.create({ organizer: organizerId });
    settings = created.toObject();
  }

  settingsCache.set(key, { settings, expiresAt: now + 20000 });
  return settings;
}

function invalidateSettingsCache(organizerId) {
  if (organizerId) settingsCache.delete(organizerId.toString());
}

// In-memory sequential queue per tournament/organizer to eliminate race conditions
// when multiple team owners tap bid simultaneously.
const auctionLocks = new Map();

async function runWithAuctionLock(organizerId, fn) {
  const key = organizerId.toString();
  const currentLock = auctionLocks.get(key) || Promise.resolve();

  let release;
  const nextLock = new Promise((resolve) => {
    release = resolve;
  });

  // Chain this execution to previous lock
  auctionLocks.set(key, currentLock.then(() => nextLock, () => nextLock));

  await currentLock;
  try {
    return await fn();
  } finally {
    release();
    if (auctionLocks.get(key) === nextLock) {
      auctionLocks.delete(key);
    }
  }
}

// Places the next-increment bid for a team on whichever player is currently up for auction.
async function placeBid(organizerId, teamId, { isOrganizer = false, expectedBidAmount = null } = {}) {
  return runWithAuctionLock(organizerId, async () => {
    // Ultra-fast parallel database execution: fetch state, cached settings, team, and squad count simultaneously
    let [state, settings, team, currentSquadSize] = await Promise.all([
      getOrCreateState(organizerId),
      getCachedSettings(organizerId),
      Team.findOne({ _id: teamId, organizer: organizerId }).lean(),
      Player.countDocuments({ organizer: organizerId, soldTo: teamId }),
    ]);

    if (!state.currentPlayer) throw new Error('No player currently in auction');
    if (!team) throw new Error('Team not found');

    // Server-side countdown validation: reject bids if time has expired
    if (state.countdownEnabled && state.biddingEndsAt) {
      const now = new Date();
      if (now > new Date(state.biddingEndsAt)) {
        throw new Error('Bidding time has expired for this player.');
      }
    }

    if (settings.onePlayerPerCategoryEnabled && state.currentCategory) {
      const existingPlayerInCategory = await Player.findOne({
        organizer: organizerId,
        soldTo: teamId,
        category: state.currentCategory,
      });
      if (existingPlayerInCategory) {
        throw new Error('ONE_PLAYER_PER_CATEGORY_LIMIT');
      }
    }

    if (state.currentBidTeam && state.currentBidTeam.equals(team._id)) {
      throw new Error(`${team.teamName} is already the highest bidder. Another team must bid before ${team.teamName} can bid again.`);
    }

    const nextAmount = getNextBidAmount(state.currentBidAmount, settings.bidIncrementRules);

    // If a mobile client sent the price they intended to bid, protect them from race-condition price jumps
    if (expectedBidAmount !== null && expectedBidAmount !== undefined && Number(expectedBidAmount) > 0) {
      if (Number(expectedBidAmount) !== nextAmount) {
        throw new Error(`Another team placed a bid just before you! The current bid is now ₹${Number(state.currentBidAmount || 0).toLocaleString('en-IN')}. Tap again to bid ₹${nextAmount.toLocaleString('en-IN')}.`);
      }
    }

    if (team.purseRemaining < nextAmount) {
      throw new Error(`${team.teamName} does not have enough purse remaining for this bid.`);
    }

  if (currentSquadSize >= settings.maxPlayersPerTeam) {
    throw new Error(`${team.teamName} has already reached the max squad size.`);
  }

  state.currentBidAmount = nextAmount;
  state.currentBidTeam = team._id;
  state.currentBidHistory.push({ team: team._id, amount: nextAmount, at: new Date() });

  // Reset countdown timer to full duration on every new valid bid
  if (state.countdownEnabled) {
    const now = new Date();
    state.biddingStartedAt = now;
    state.biddingEndsAt = new Date(now.getTime() + state.countdownDuration * 1000);
    const auctionTimerService = require('./auctionTimerService');
    auctionTimerService.startAuctionTimer(organizerId, state.countdownDuration);
  }

    await state.save();

    return state.populate(FAST_BID_POPULATE);
  });
}

// Reverts the most recent bid on the current player.
async function undoBid(organizerId) {
  const state = await getOrCreateState(organizerId);
  if (!state.currentPlayer) throw new Error('No player currently in auction');
  if (!state.currentBidHistory || state.currentBidHistory.length === 0) {
    throw new Error('No bids to undo for this player.');
  }

  state.currentBidHistory = state.currentBidHistory.slice(0, -1);

  if (state.currentBidHistory.length === 0) {
    const player = await Player.findById(state.currentPlayer);
    state.currentBidAmount = player.basePrice;
    state.currentBidTeam = null;
  } else {
    const lastBid = state.currentBidHistory[state.currentBidHistory.length - 1];
    state.currentBidAmount = lastBid.amount;
    state.currentBidTeam = lastBid.team;
  }

  // Reset countdown timer on undo
  if (state.countdownEnabled) {
    const now = new Date();
    state.biddingStartedAt = now;
    state.biddingEndsAt = new Date(now.getTime() + state.countdownDuration * 1000);
    const auctionTimerService = require('./auctionTimerService');
    auctionTimerService.startAuctionTimer(organizerId, state.countdownDuration);
  }

  await state.save();

  return state.populate(FAST_BID_POPULATE);
}

// Resolves current player as SOLD to highest bidder
async function resolveSold(organizerId) {
  const state = await getOrCreateState(organizerId);
  if (!state.currentPlayer) throw new Error('No player currently in auction');
  if (!state.currentBidTeam) throw new Error('No bids placed yet — mark as Unsold instead.');

  const player = await Player.findById(state.currentPlayer);
  const team = await Team.findById(state.currentBidTeam);
  if (!player || !team) throw new Error('Player or winning Team not found');

  const finalPrice = state.currentBidAmount;

  player.auctionStatus = 'SOLD';
  player.soldTo = team._id;
  player.soldPrice = finalPrice;
  await player.save();

  team.purseRemaining -= finalPrice;
  await team.save();

  await AuctionLog.create({
    organizer: organizerId,
    player: player._id,
    result: 'SOLD',
    finalTeam: team._id,
    finalPrice,
    round: state.currentRound,
    bids: state.currentBidHistory,
  });

  state.currentPlayer = null;
  state.currentBidAmount = 0;
  state.currentBidTeam = null;
  state.currentBidHistory = [];
  state.passedTeams = [];
  state.biddingStartedAt = null;
  state.biddingEndsAt = null;
  state.countdownEnabled = false;
  await state.save();

  return { player, team, finalPrice, state };
}

// Resolves current player as UNSOLD
async function resolveUnsold(organizerId) {
  const state = await getOrCreateState(organizerId);
  if (!state.currentPlayer) throw new Error('No player currently in auction');
  if (state.currentBidTeam || (state.currentBidHistory && state.currentBidHistory.length > 0)) {
    throw new Error('Cannot mark player unsold after bids have been placed. Use Mark Sold or Undo Bid first.');
  }

  const player = await Player.findById(state.currentPlayer);
  if (!player) throw new Error('Player not found');

  player.auctionStatus = 'UNSOLD';
  await player.save();

  await AuctionLog.create({
    organizer: organizerId,
    player: player._id,
    result: 'UNSOLD',
    round: state.currentRound,
    bids: state.currentBidHistory,
  });

  state.currentPlayer = null;
  state.currentBidAmount = 0;
  state.currentBidTeam = null;
  state.currentBidHistory = [];
  state.passedTeams = [];
  state.biddingStartedAt = null;
  state.biddingEndsAt = null;
  state.countdownEnabled = false;
  await state.save();

  return { player, state };
}

// Resolves current player via Right to Match (RTM) card by defending franchise
async function resolveRtm(organizerId) {
  const state = await getOrCreateState(organizerId);
  if (!state.currentPlayer) throw new Error('No player currently in auction');
  if (!state.currentBidTeam) throw new Error('No bids placed yet — RTM requires an active winning bid to match.');

  const [player, settings] = await Promise.all([
    Player.findById(state.currentPlayer),
    getCachedSettings(organizerId),
  ]);

  if (!player) throw new Error('Player not found');
  if (!settings?.rtmEnabled) throw new Error('Right to Match (RTM) feature is disabled in tournament settings.');
  if (!player.previousTeam) throw new Error(`${player.name} does not have an eligible previous franchise for RTM.`);

  if (player.previousTeam.equals(state.currentBidTeam)) {
    throw new Error('Defending franchise is already the highest bidder. RTM is not needed.');
  }

  const [defendingTeam, currentSquadSize] = await Promise.all([
    Team.findById(player.previousTeam),
    Player.countDocuments({ organizer: organizerId, soldTo: player.previousTeam }),
  ]);

  if (!defendingTeam) throw new Error('Defending franchise not found.');

  const rtmLimit = settings.rtmCardsPerTeam || 2;
  const cardsUsed = defendingTeam.rtmCardsUsed || 0;
  if (cardsUsed >= rtmLimit) {
    throw new Error(`${defendingTeam.teamName} has already used all available RTM cards (${rtmLimit}).`);
  }

  const finalPrice = state.currentBidAmount;
  if (defendingTeam.purseRemaining < finalPrice) {
    throw new Error(`${defendingTeam.teamName} does not have enough purse (₹${defendingTeam.purseRemaining.toLocaleString('en-IN')}) to match ₹${finalPrice.toLocaleString('en-IN')}.`);
  }

  if (currentSquadSize >= settings.maxPlayersPerTeam) {
    throw new Error(`${defendingTeam.teamName} has already reached the maximum squad size.`);
  }

  // One player per category check for defending team
  if (settings.onePlayerPerCategoryEnabled && state.currentCategory) {
    const existingPlayerInCategory = await Player.findOne({
      organizer: organizerId,
      soldTo: defendingTeam._id,
      category: state.currentCategory,
    });
    if (existingPlayerInCategory) {
      throw new Error(`${defendingTeam.teamName} already has a player in this category.`);
    }
  }

  // Execute RTM Match
  player.auctionStatus = 'SOLD';
  player.soldTo = defendingTeam._id;
  player.soldPrice = finalPrice;
  await player.save();

  defendingTeam.purseRemaining -= finalPrice;
  defendingTeam.rtmCardsUsed = cardsUsed + 1;
  await defendingTeam.save();

  await AuctionLog.create({
    organizer: organizerId,
    player: player._id,
    result: 'SOLD',
    finalTeam: defendingTeam._id,
    finalPrice,
    round: state.currentRound,
    bids: state.currentBidHistory,
    note: `RTM MATCHED by ${defendingTeam.teamName}`,
  });

  state.currentPlayer = null;
  state.currentBidAmount = 0;
  state.currentBidTeam = null;
  state.currentBidHistory = [];
  state.passedTeams = [];
  state.biddingStartedAt = null;
  state.biddingEndsAt = null;
  state.countdownEnabled = false;
  await state.save();

  return { player, team: defendingTeam, finalPrice, isRtm: true, state };
}

module.exports = {
  getOrCreateState,
  placeBid,
  undoBid,
  resolveSold,
  resolveUnsold,
  resolveRtm,
  POPULATE_PATH,
  FAST_BID_POPULATE,
  invalidateSettingsCache,
};