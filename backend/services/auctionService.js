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

const POPULATE_PATH = 'currentPlayer currentBidTeam currentCategory currentBidHistory.team passedTeams';

// Places the next-increment bid for a team on whichever player is currently up for auction.
async function placeBid(organizerId, teamId) {
  // Ultra-fast parallel database execution: fetch state, settings, team, and squad count simultaneously
  const [state, settings, team, currentSquadSize] = await Promise.all([
    getOrCreateState(organizerId),
    AuctionSettings.findOne({ organizer: organizerId }).lean(),
    Team.findOne({ _id: teamId, organizer: organizerId }).lean(),
    Player.countDocuments({ organizer: organizerId, soldTo: teamId }),
  ]);

  if (!state.currentPlayer) throw new Error('No player currently in auction');
  if (!team) throw new Error('Team not found');
  if (!settings) throw new Error('Auction settings not found');

  // Server-side countdown validation: reject bids if time has expired
  if (state.countdownEnabled && state.biddingEndsAt) {
    const now = new Date();
    if (now > new Date(state.biddingEndsAt)) {
      throw new Error('Bidding time has expired for this player.');
    }
  }

  if (state.currentBidTeam && state.currentBidTeam.equals(team._id)) {
    throw new Error(`${team.teamName} is already the highest bidder. Another team must bid before ${team.teamName} can bid again.`);
  }

  const nextAmount = getNextBidAmount(state.currentBidAmount, settings.bidIncrementRules);

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

  return state.populate(POPULATE_PATH);
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

  return state.populate(POPULATE_PATH);
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

module.exports = {
  getOrCreateState,
  placeBid,
  undoBid,
  resolveSold,
  resolveUnsold,
  POPULATE_PATH,
};