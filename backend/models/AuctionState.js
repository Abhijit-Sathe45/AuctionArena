const mongoose = require('mongoose');

// Singleton (per organizer) live-auction runtime state, used to drive the real-time UI
const auctionStateSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, unique: true },

  status: { type: String, enum: ['NOT_STARTED', 'RUNNING', 'PAUSED', 'COMPLETED'], default: 'NOT_STARTED' },
  currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  currentBidAmount: { type: Number, default: 0 },
  currentBidTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  currentRound: { type: Number, default: 1 },

  // Full bid-by-bid history for whichever player is currently up for auction — cleared once
  // that player is sold/unsold. Lets the UI show every bid placed, and lets admin undo the last one.
  currentBidHistory: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    amount: Number,
    at: { type: Date, default: Date.now },
  }],

  // Category-wise auction flow: admin picks a category, builds/shuffles a player queue for it,
  // then works through that queue one player at a time before moving to the next category.
  currentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  playerQueue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],

  // Live auction countdown state
  countdownEnabled: { type: Boolean, default: false },
  countdownDuration: { type: Number, default: 60 },
  biddingStartedAt: { type: Date, default: null },
  biddingEndsAt: { type: Date, default: null },

  // Teams that clicked "Pass" for the current player
  passedTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
}, { timestamps: true });

module.exports = mongoose.model('AuctionState', auctionStateSchema);