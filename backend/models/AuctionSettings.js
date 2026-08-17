const mongoose = require('mongoose');

// Per-organizer auction configuration
const auctionSettingsSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, unique: true },

  // Registration limits
  maxPlayers: { type: Number, default: 100 },
  maxTeams: { type: Number, default: 8 },

  // Registration fees (collected via Razorpay from players/team owners)
  playerRegistrationFee: { type: Number, default: 0 },
  teamRegistrationFee: { type: Number, default: 0 },

  // Purse rules
  maxPursePerTeam: { type: Number, default: 100000 },
  minPlayersPerTeam: { type: Number, default: 11 },
  maxPlayersPerTeam: { type: Number, default: 15 },

  // Bid increment rules - array of {upTo, increment}. Applied in order.
  bidIncrementRules: {
    type: [{ upTo: Number, increment: Number }],
    default: [
      { upTo: 2000, increment: 100 },
      { upTo: 5000, increment: 250 },
      { upTo: 1000000, increment: 500 },
    ],
  },

  // Registration open/close toggles (auto-closes when max reached, but organizer can also force close)
  playerRegistrationOpen: { type: Boolean, default: true },
  teamRegistrationOpen: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('AuctionSettings', auctionSettingsSchema);
