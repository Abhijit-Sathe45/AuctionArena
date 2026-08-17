const mongoose = require('mongoose');

// Full audit trail of every player's auction journey, including bid-by-bid history
const auctionLogSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, index: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },

  bids: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    amount: Number,
    at: { type: Date, default: Date.now },
  }],

  result: { type: String, enum: ['SOLD', 'UNSOLD'], required: true },
  finalTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  finalPrice: { type: Number, default: 0 },

  round: { type: Number, default: 1 }, // supports re-auction rounds for unsold players
}, { timestamps: true });

module.exports = mongoose.model('AuctionLog', auctionLogSchema);
