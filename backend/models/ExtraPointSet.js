const mongoose = require('mongoose');

// Admin-defined bonus-purse packs (sets) that can be granted to teams, e.g. "Bonus Set A = +5000"
const extraPointSetSchema = new mongoose.Schema({
 organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true, index: true },
  name: { type: String, required: true, trim: true },
  points: { type: Number, required: true },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ExtraPointSet', extraPointSetSchema);
