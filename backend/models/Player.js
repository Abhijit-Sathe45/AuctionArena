const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, index: true },
  name: { type: String, required: true, trim: true },
  battingStyle: { type: String, enum: ['RIGHT_HANDED', 'LEFT_HANDED'], required: true },
  bowlingStyle: {
    type: String,
    enum: [
      'RIGHT_ARM_FAST',
      'RIGHT_ARM_MEDIUM',
      'RIGHT_ARM_SPIN',
      'LEFT_ARM_FAST',
      'LEFT_ARM_MEDIUM',
      'LEFT_ARM_SPIN',
      'RIGHT_HANDED',
      'LEFT_HANDED',
      'NA'
    ],
    default: 'NA'
  },
  playerType: { type: String, enum: ['BATSMAN', 'BOWLER', 'ALLROUNDER', 'ALL_ROUNDER', 'WICKET_KEEPER'], required: true },
  age: { type: Number, required: true },
  photoUrl: { type: String, default: null },
  phone: { type: String, trim: true },

  // Payment for player registration
  registrationFeePaid: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'FREE'], default: 'PENDING' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },

  // Auction categorization (set by admin after registration closes)
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  basePrice: { type: Number, default: 0 },

  // Auction result
  auctionStatus: {
    type: String,
    enum: ['PENDING', 'IN_AUCTION', 'SOLD', 'UNSOLD'],
    default: 'PENDING',
  },
  soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  soldPrice: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false }, // admin approves registered players before auction
}, { timestamps: true });

// Speeds up the most frequent live-auction queries: "pending, approved players in category X"
playerSchema.index({ organizer: 1, category: 1, auctionStatus: 1 });
playerSchema.index({ organizer: 1, auctionStatus: 1 });
playerSchema.index({ organizer: 1, soldTo: 1 });

module.exports = mongoose.model('Player', playerSchema);