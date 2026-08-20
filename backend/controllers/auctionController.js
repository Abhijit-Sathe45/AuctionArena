const AuctionState = require('../models/AuctionState');
const AuctionLog = require('../models/AuctionLog');
const AuctionSettings = require('../models/AuctionSettings');
const Category = require('../models/Category');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { getNextBidAmount } = require('../utils/bidIncrement');
const auctionService = require('../services/auctionService');
const auctionTimerService = require('../services/auctionTimerService');

// Helper: get or create the auction state doc for this organizer
async function getOrCreateState(organizerId) {
  let state = await AuctionState.findOne({ organizer: organizerId });
  if (!state) state = await AuctionState.create({ organizer: organizerId });
  return state;
}

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// GET /api/auction/state
async function getState(req, res) {
  const state = await getOrCreateState(req.user.id);
  await state.populate('currentPlayer currentBidTeam currentCategory currentBidHistory.team');
  res.json(state);
}

// GET /api/auction/category-players/:categoryId
// Returns approved, still-pending players in a category — used to preview before starting.
async function getCategoryPlayers(req, res) {
  const players = await Player.find({
    organizer: req.user.id, category: req.params.categoryId, isApproved: true, auctionStatus: 'PENDING',
  }).sort({ createdAt: 1 });
  res.json(players);
}

// POST /api/auction/select-category  { categoryId }
// Step 1 of the category-wise flow: pick a category, build its player queue in registration order.
async function selectCategory(req, res) {
  const organizerId = req.user.id;
  const { categoryId } = req.body;

  const category = await Category.findOne({ _id: categoryId, organizer: organizerId });
  if (!category) return res.status(404).json({ message: 'Category not found' });

  const state = await getOrCreateState(organizerId);
  if (state.currentPlayer) {
    return res.status(400).json({ message: 'Finish (Sold/Unsold) the current player before switching categories.' });
  }

  const players = await Player.find({
    organizer: organizerId, category: categoryId, isApproved: true, auctionStatus: 'PENDING',
  }).sort({ createdAt: 1 });

  state.currentCategory = category._id;
  state.playerQueue = players.map(p => p._id);
  await state.save();

  const populated = await state.populate('currentCategory');
  emitAuctionUpdate(req, { event: 'CATEGORY_SELECTED', state: populated });
  res.json({ state: populated, players });
}

// POST /api/auction/shuffle-queue
// Step 2: randomize the order of the current category's player queue.
async function shuffleQueue(req, res) {
  const organizerId = req.user.id;
  const state = await getOrCreateState(organizerId);
  if (!state.currentCategory) return res.status(400).json({ message: 'Select a category first.' });
  if (state.currentPlayer) return res.status(400).json({ message: 'Finish the current player before reshuffling.' });

  state.playerQueue = shuffleArray(state.playerQueue);
  await state.save();

  const players = await Player.find({ _id: { $in: state.playerQueue } });
  const orderedPlayers = state.playerQueue.map(id => players.find(p => p._id.equals(id))).filter(Boolean);

  emitAuctionUpdate(req, { event: 'QUEUE_SHUFFLED' });
  res.json({ message: 'Player order shuffled.', players: orderedPlayers });
}

// POST /api/auction/next-player  { playerId? }
// Step 3: start auctioning the next player — either the next one in the shuffled queue,
// or a specific player if the admin manually picked one.
async function nextPlayer(req, res) {
  const organizerId = req.user.id;
  const state = await getOrCreateState(organizerId);

  let player;
  if (req.body.playerId) {
    player = await Player.findOne({ _id: req.body.playerId, organizer: organizerId, isApproved: true });
    // If this player was in the queue, remove it so it isn't offered again
    state.playerQueue = state.playerQueue.filter(id => !id.equals(player?._id));
  } else {
    if (!state.currentCategory) {
      return res.status(400).json({ message: 'Select a category first before starting the auction.' });
    }
    if (!state.playerQueue || state.playerQueue.length === 0) {
      return res.status(400).json({ message: 'No more players left in this category\'s queue. Pick another category.' });
    }
    const nextId = state.playerQueue[0];
    state.playerQueue = state.playerQueue.slice(1);
    player = await Player.findOne({ _id: nextId, organizer: organizerId, isApproved: true, auctionStatus: 'PENDING' });
  }
  if (!player) return res.status(400).json({ message: 'No pending players available for auction' });

  player.auctionStatus = 'IN_AUCTION';
  await player.save();

  const settings = await AuctionSettings.findOne({ organizer: organizerId });

  state.status = 'RUNNING';
  state.currentPlayer = player._id;
  state.currentBidAmount = player.basePrice;
  state.currentBidTeam = null;
  state.currentBidHistory = [];
  state.passedTeams = [];

  // Countdown timer settings
  state.countdownEnabled = !!settings?.countdownEnabled;
  state.countdownDuration = settings?.countdownDuration || 60;

  if (state.countdownEnabled) {
    const now = new Date();
    state.biddingStartedAt = now;
    state.biddingEndsAt = new Date(now.getTime() + state.countdownDuration * 1000);
    auctionTimerService.startAuctionTimer(organizerId, state.countdownDuration);
  } else {
    state.biddingStartedAt = null;
    state.biddingEndsAt = null;
    auctionTimerService.clearAuctionTimer(organizerId);
  }

  await state.save();

  const populated = await state.populate('currentPlayer currentCategory');
  emitAuctionUpdate(req, { event: 'NEXT_PLAYER', state: populated });
  res.json(populated);
}

// POST /api/auction/bid  { teamId }  -- places next-increment bid for a team on current player
async function placeBid(req, res) {
  try {
    const populated = await auctionService.placeBid(req.user.id, req.body.teamId);
    emitAuctionUpdate(req, { event: 'BID_PLACED', state: populated });
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/auction/undo-bid  -- reverts the most recent bid on the current player
async function undoBid(req, res) {
  try {
    const populated = await auctionService.undoBid(req.user.id);
    emitAuctionUpdate(req, { event: 'BID_UNDONE', state: populated });
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/auction/sold  -- marks current player SOLD to current highest bidder
async function markSold(req, res) {
  const organizerId = req.user.id;
  auctionTimerService.clearAuctionTimer(organizerId);

  try {
    const { player, team, finalPrice } = await auctionService.resolveSold(organizerId);
    emitAuctionUpdate(req, { event: 'PLAYER_SOLD', player, team, finalPrice });
    res.json({ message: `${player.name} sold to ${team.teamName} for Rs. ${finalPrice}`, player, team });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/auction/unsold -- marks current player UNSOLD
async function markUnsold(req, res) {
  const organizerId = req.user.id;
  auctionTimerService.clearAuctionTimer(organizerId);

  try {
    const { player } = await auctionService.resolveUnsold(organizerId);
    emitAuctionUpdate(req, { event: 'PLAYER_UNSOLD', player });
    res.json({ message: `${player.name} marked unsold`, player });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/auction/re-auction-unsold -- moves all UNSOLD players back to PENDING for a new round
// If a category is currently selected, also rebuilds & reshuffles that category's queue automatically.
async function reAuctionUnsold(req, res) {
  const organizerId = req.user.id;
  auctionTimerService.clearAuctionTimer(organizerId);

  const state = await getOrCreateState(organizerId);
  await Player.updateMany(
    { organizer: organizerId, auctionStatus: 'UNSOLD' },
    { $set: { auctionStatus: 'PENDING' } }
  );
  state.currentRound += 1;

  if (state.currentCategory) {
    const players = await Player.find({
      organizer: organizerId, category: state.currentCategory, isApproved: true, auctionStatus: 'PENDING',
    }).sort({ createdAt: 1 });
    state.playerQueue = shuffleArray(players.map(p => p._id));
  }
  await state.save();

  emitAuctionUpdate(req, { event: 'RE_AUCTION_STARTED', round: state.currentRound });
  res.json({ message: 'Unsold players moved back into the pool for a new round', round: state.currentRound });
}

// GET /api/auction/history
async function getHistory(req, res) {
  const logs = await AuctionLog.find({ organizer: req.user.id })
    .populate('player').populate('finalTeam').populate('bids.team')
    .sort({ createdAt: -1 });
  res.json(logs);
}

// Emits real-time update to all clients watching this organizer's auction room
function emitAuctionUpdate(req, payload) {
  const io = req.app.get('io');
  if (io) io.to(`auction-${req.user.id}`).emit('auction-update', payload);
}

module.exports = {
  getState, getCategoryPlayers, selectCategory, shuffleQueue,
  nextPlayer, placeBid, undoBid, markSold, markUnsold, reAuctionUnsold, getHistory,
};