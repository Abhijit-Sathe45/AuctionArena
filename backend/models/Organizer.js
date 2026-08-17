const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  tournamentName: { type: String, required: true, trim: true },
  tournamentDate: { type: Date, required: true },
  organizerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  logoUrl: { type: String, default: null },
  slug: { type: String, required: true, unique: true },
  loginId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  planType: { type: String, enum: ['1_MONTH', '4_MONTH', '12_MONTH'], required: true },
  pricePaid: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  passStartDate: { type: Date },
  passExpiryDate: { type: Date },
  isActive: { type: Boolean, default: false },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Organizer', organizerSchema);