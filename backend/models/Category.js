const mongoose = require('mongoose');

// e.g. "Icon Player", "Category A", "Category B" - each with a starting/base price
const categorySchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, index: true },
  name: { type: String, required: true, trim: true },
  basePrice: { type: Number, required: true },
  order: { type: Number, default: 0 }, // auction sequence order
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
