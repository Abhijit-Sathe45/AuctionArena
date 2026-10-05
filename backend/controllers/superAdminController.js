const PricingPlan = require('../models/PricingPlan');
const Organizer = require('../models/Organizer');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Category = require('../models/Category');
const ExtraPointSet = require('../models/ExtraPointSet');
const AuctionSettings = require('../models/AuctionSettings');
const AuctionState = require('../models/AuctionState');
const AuctionLog = require('../models/AuctionLog');
const { deleteImages } = require('../utils/cloudinaryCleanup');

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
// Permanently deletes an organizer and every piece of data that belongs to them
// (players, teams, categories, extra point sets, auction settings/state, auction
// history log, and all uploaded images from Cloudinary).
async function deleteOrganizer(req, res) {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

  const organizerId = organizer._id;

  // 1. Gather all image URLs belonging to this tournament (logo, players, team logos/photos)
  const [players, teams] = await Promise.all([
    Player.find({ organizer: organizerId }).select('photoUrl'),
    Team.find({ organizer: organizerId }).select('ownerPhotoUrl teamLogoUrl logoUrl'),
  ]);

  const imageUrls = [];
  if (organizer.logoUrl) imageUrls.push(organizer.logoUrl);
  players.forEach((p) => {
    if (p.photoUrl) imageUrls.push(p.photoUrl);
  });
  teams.forEach((t) => {
    if (t.ownerPhotoUrl) imageUrls.push(t.ownerPhotoUrl);
    if (t.teamLogoUrl) imageUrls.push(t.teamLogoUrl);
    if (t.logoUrl) imageUrls.push(t.logoUrl);
  });

  const uniqueImageUrls = [...new Set(imageUrls.filter(Boolean))];

  // 2. Permanently delete all associated images from Cloudinary & local storage
  let deletedImagesCount = 0;
  if (uniqueImageUrls.length > 0) {
    try {
      const cleanupResult = await deleteImages(uniqueImageUrls);
      deletedImagesCount = cleanupResult.deletedCount || 0;
      console.log(`[Cloudinary Cleanup] Deleted ${deletedImagesCount} images for tournament "${organizer.tournamentName}"`);
    } catch (err) {
      console.error('Error cleaning up tournament images from Cloudinary:', err);
    }
  }

  // 3. Delete all database records belonging to this organizer
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

  res.json({
    message: `${organizer.tournamentName}, all associated players, teams, auction data, and ${deletedImagesCount} image(s) have been permanently deleted.`,
    deletedImagesCount,
  });
}

module.exports = {
  listPricingPlans, upsertPricingPlan,
  listOrganizers, getOrganizer, suspendOrganizer, reactivateOrganizer, extendPass, deleteOrganizer,
};