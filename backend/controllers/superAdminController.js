const PricingPlan = require('../models/PricingPlan');
const Organizer = require('../models/Organizer');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Category = require('../models/Category');
const ExtraPointSet = require('../models/ExtraPointSet');
const AuctionSettings = require('../models/AuctionSettings');
const AuctionState = require('../models/AuctionState');
const AuctionLog = require('../models/AuctionLog');

// ---------- PRICING PLANS ----------
async function listPricingPlans(req, res) {
  const plans = await PricingPlan.find();
  res.json(plans);
}
async function upsertPricingPlan(req, res) {
  const { planType, label, price, durationInDays, isActive } = req.body;
  const plan = await PricingPlan.findOneAndUpdate(
    { planType },
    { label, price, durationInDays, isActive: isActive !== undefined ? isActive : true },
    { new: true, upsert: true }
  );
  res.json(plan);
}

// ---------- ORGANIZERS ----------
async function listOrganizers(req, res) {
  const organizers = await Organizer.find().sort({ createdAt: -1 });
  res.json(organizers);
}
async function getOrganizer(req, res) {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ message: 'Not found' });
  res.json(organizer);
}
async function suspendOrganizer(req, res) {
  const organizer = await Organizer.findByIdAndUpdate(
    req.params.id, { status: 'SUSPENDED', isActive: false }, { new: true }
  );
  res.json(organizer);
}
async function reactivateOrganizer(req, res) {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ message: 'Not found' });
  const stillValid = organizer.passExpiryDate && organizer.passExpiryDate > new Date();
  organizer.status = stillValid ? 'ACTIVE' : 'EXPIRED';
  organizer.isActive = stillValid;
  await organizer.save();
  res.json(organizer);
}
async function extendPass(req, res) {
  const { days } = req.body;
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ message: 'Not found' });
  const base = organizer.passExpiryDate && organizer.passExpiryDate > new Date() ? organizer.passExpiryDate : new Date();
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + Number(days));
  organizer.passExpiryDate = newExpiry;
  organizer.status = 'ACTIVE';
  organizer.isActive = true;
  await organizer.save();
  res.json(organizer);
}

// DELETE /api/super-admin/organizers/:id
// Permanently deletes a SUSPENDED organizer and every piece of data that belongs to them
// (players, teams, categories, extra point sets, auction settings/state, and the full auction
// history log). Only allowed while suspended — an organizer must be suspended first, as a
// deliberate two-step safety gate against accidentally wiping an active tournament's data.
async function deleteOrganizer(req, res) {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

  if (organizer.status !== 'SUSPENDED') {
    return res.status(400).json({
      message: 'Only suspended organizers can be deleted. Suspend this organizer first, then delete.',
    });
  }

  const organizerId = organizer._id;

  await Promise.all([
    Player.deleteMany({ organizer: organizerId }),
    Team.deleteMany({ organizer: organizerId }),
    Category.deleteMany({ organizer: organizerId }),
    ExtraPointSet.deleteMany({ organizer: organizerId }),
    AuctionSettings.deleteMany({ organizer: organizerId }),
    AuctionState.deleteMany({ organizer: organizerId }),
    AuctionLog.deleteMany({ organizer: organizerId }),
  ]);

  await Organizer.deleteOne({ _id: organizerId });

  res.json({ message: `${organizer.tournamentName} and all associated players, teams, and auction data have been permanently deleted.` });
}

module.exports = {
  listPricingPlans, upsertPricingPlan,
  listOrganizers, getOrganizer, suspendOrganizer, reactivateOrganizer, extendPass, deleteOrganizer,
};