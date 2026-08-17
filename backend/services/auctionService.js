// Pure business logic for the live auction, shared by both the REST controller (auctionController)
// and the WebSocket handler (socket/auctionSocket.js). Keeping this logic in one place means the
// fast WebSocket bidding path and the regular HTTP API can never drift out of sync with each other.
//
// Every function here throws a plain Error with a user-facing message on failure — callers
// (REST controller or socket handler) decide how to present that (HTTP status vs socket ack error).

const AuctionState = require('../models/AuctionState');
const AuctionSettings = require('../models/AuctionSettings');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { getNextBidAmount } = require('../utils/bidIncrement');

async function getOrCreateState(organizerId) {
  let state = await AuctionState.findOne({ organizer: organizerId });
  if (!state) state = await AuctionState.create({ organizer: organizerId });
  return state;
}

const POPULATE_PATH = 'currentPlayer currentBidTeam currentCategory currentBidHistory.team';

// Places the next-increment bid for a team on whichever player is currently up for auction.
async function placeBid(organizerId, teamId) {
  const state = await getOrCreateState(organizerId);
  if (!state.currentPlayer) throw new Error('No player currently in auction');

  const settings = await AuctionSettings.findOne({ organizer: organizerId });
  const team = await Team.findOne({ _id: teamId, organizer: organizerId });
  if (!team) throw new Error('Team not found');

  if (state.currentBidTeam && state.currentBidTeam.equals(team._id)) {
    throw new Error(`${team.teamName} is already the highest bidder. Another team must bid before ${team.teamName} can bid again.`);
  }

  const nextAmount = getNextBidAmount(state.currentBidAmount, settings.bidIncrementRules);

  if (team.purseRemaining < nextAmount) {
    throw new Error(`${team.teamName} does not have enough purse remaining for this bid.`);
  }

  const currentSquadSize = await Player.countDocuments({ organizer: organizerId, soldTo: team._id });
  if (currentSquadSize >= settings.maxPlayersPerTeam) {
    throw new Error(`${team.teamName} has already reached the max squad size.`);
  }

  state.currentBidAmount = nextAmount;
  state.currentBidTeam = team._id;
  state.currentBidHistory.push({ team: team._id, amount: nextAmount, at: new Date() });
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
  await state.save();

  return state.populate(POPULATE_PATH);
}

module.exports = { getOrCreateState, placeBid, undoBid, POPULATE_PATH };