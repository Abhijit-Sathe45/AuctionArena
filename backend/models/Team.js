const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
 organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, index: true },
  ownerName: { type: String, required: true, trim: true },
  teamName: { type: String, required: true, trim: true },
  ownerPlaysMatch: { type: Boolean, default: false },
  ownerPhotoUrl: { type: String, default: null },
  teamLogoUrl: { type: String, default: null },
  phone: { type: String, trim: true },

  // Payment for team registration
  registrationFeePaid: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'FREE'], default: 'PENDING' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },

  // Purse tracking
  totalPurse: { type: Number, required: true }, // copied from AuctionSettings.maxPursePerTeam at creation time
  purseRemaining: { type: Number, required: true },

  // Extra points/bonus purse granted by admin
  extraPointsReceived: [{
    setName: String,
    points: Number,
    grantedAt: { type: Date, default: Date.now },
  }],

  // Secret 4-digit PIN for mobile bidding remote (/bid/:slug)
  biddingPin: { type: String, default: null },

  isApproved: { type: Boolean, default: false }, // admin approves registered teams before auction
}, { timestamps: true });

// Auto-generate a 4-digit PIN if not already set
teamSchema.pre('save', function(next) {
  if (!this.biddingPin) {
    this.biddingPin = Math.floor(1000 + Math.random() * 9000).toString();
  }
  next();
});

module.exports = mongoose.model('Team', teamSchema);
