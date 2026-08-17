const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema({
  planType: { type: String, enum: ['1_MONTH', '4_MONTH', '12_MONTH'], required: true, unique: true },
  label: { type: String, required: true },
  price: { type: Number, required: true },
  durationInDays: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);