const AuctionSettings = require('../models/AuctionSettings');
const Category = require('../models/Category');
const ExtraPointSet = require('../models/ExtraPointSet');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { deleteImages } = require('../utils/cloudinaryCleanup');

// ---------- SETTINGS ----------
async function getSettings(req, res) {
  const settings = await AuctionSettings.findOne({ organizer: req.user.id });
  res.json(settings);
}
async function updateSettings(req, res) {
  const allowed = [
    'maxPlayers', 'maxTeams', 'playerRegistrationFee', 'teamRegistrationFee',
    'maxPursePerTeam', 'minPlayersPerTeam', 'maxPlayersPerTeam', 'bidIncrementRules',
    'playerRegistrationOpen', 'teamRegistrationOpen',
    'countdownEnabled', 'countdownDuration',
    'teamOwnerBiddingEnabled',
  ];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  const settings = await AuctionSettings.findOneAndUpdate(
    { organizer: req.user.id }, update, { new: true, upsert: true }
  );
  res.json(settings);
}

// ---------- CATEGORIES ----------
async function listCategories(req, res) {
  const cats = await Category.find({ organizer: req.user.id }).sort('order');
  res.json(cats);
}
async function createCategory(req, res) {
  const { name, basePrice, order } = req.body;
  const cat = await Category.create({ organizer: req.user.id, name, basePrice, order: order || 0 });
  res.status(201).json(cat);
}
async function updateCategory(req, res) {
  const cat = await Category.findOneAndUpdate(
    { _id: req.params.id, organizer: req.user.id }, req.body, { new: true }
  );
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json(cat);
}
async function deleteCategory(req, res) {
  await Category.deleteOne({ _id: req.params.id, organizer: req.user.id });
  res.json({ message: 'Deleted' });
}

// ---------- EXTRA POINT SETS ----------
async function listExtraPointSets(req, res) {
  const sets = await ExtraPointSet.find({ organizer: req.user.id });
  res.json(sets);
}
async function createExtraPointSet(req, res) {
  const { name, points, description } = req.body;
  const set = await ExtraPointSet.create({ organizer: req.user.id, name, points, description });
  res.status(201).json(set);
}
async function grantExtraPointsToTeam(req, res) {
  const { teamId, setId } = req.body;
  const set = await ExtraPointSet.findOne({ _id: setId, organizer: req.user.id });
  if (!set) return res.status(404).json({ message: 'Extra point set not found' });

  const team = await Team.findOne({ _id: teamId, organizer: req.user.id });
  if (!team) return res.status(404).json({ message: 'Team not found' });

  team.purseRemaining += set.points;
  team.totalPurse += set.points;
  team.extraPointsReceived.push({ setName: set.name, points: set.points });
  await team.save();
  res.json(team);
}

// ---------- PLAYERS (admin management) ----------
async function listPlayers(req, res) {
  const filter = { organizer: req.user.id };
  if (req.query.status) filter.auctionStatus = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  const players = await Player.find(filter).populate('category').populate('soldTo');
  res.json(players);
}
async function updatePlayer(req, res) {
  // Used to: approve player, assign category, set base price, replace photo (admin fix-up)
  const allowed = ['category', 'basePrice', 'isApproved', 'photoUrl'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  if (update.category && update.basePrice === undefined) {
    const category = await Category.findOne({ _id: update.category, organizer: req.user.id });
    if (category) update.basePrice = category.basePrice;
  }

  const player = await Player.findOneAndUpdate(
    { _id: req.params.id, organizer: req.user.id }, update, { new: true }
  ).populate('category');
  if (!player) return res.status(404).json({ message: 'Player not found' });
  res.json(player);
}
async function deletePlayer(req, res) {
  const player = await Player.findOne({ _id: req.params.id, organizer: req.user.id });
  if (player) {
    if (player.photoUrl) await deleteImages([player.photoUrl]);
    await Player.deleteOne({ _id: req.params.id, organizer: req.user.id });
  }
  res.json({ message: 'Deleted' });
}

// ---------- TEAMS (admin management) ----------
async function listTeams(req, res) {
  const teams = await Team.find({ organizer: req.user.id });
  // Backfill 4-digit PINs if any existing team has null
  for (const t of teams) {
    if (!t.biddingPin) {
      t.biddingPin = Math.floor(1000 + Math.random() * 9000).toString();
      await t.save();
    }
  }
  res.json(teams);
}
async function createTeamByAdmin(req, res) {
  // Admin manually adds an owner/team (no payment flow)
  let settings = await AuctionSettings.findOne({ organizer: req.user.id });
  if (!settings) {
    settings = await AuctionSettings.create({ organizer: req.user.id });
  }
  const { ownerName, teamName, ownerPlaysMatch, ownerPhotoUrl, teamLogoUrl, phone, biddingPin } = req.body;
  const pin = biddingPin || Math.floor(1000 + Math.random() * 9000).toString();
  const purse = settings.maxPursePerTeam || 10000;
  const team = await Team.create({
    organizer: req.user.id, ownerName, teamName, ownerPlaysMatch: !!ownerPlaysMatch,
    ownerPhotoUrl, teamLogoUrl, phone, paymentStatus: 'FREE',
    totalPurse: purse, purseRemaining: purse,
    biddingPin: pin,
    isApproved: true,
  });
  res.status(201).json(team);
}
async function updateTeam(req, res) {
  const allowed = ['isApproved', 'ownerName', 'teamName', 'ownerPlaysMatch', 'biddingPin', 'teamLogoUrl'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  const team = await Team.findOneAndUpdate({ _id: req.params.id, organizer: req.user.id }, update, { new: true });
  if (!team) return res.status(404).json({ message: 'Team not found' });
  res.json(team);
}
async function deleteTeam(req, res) {
  const team = await Team.findOne({ _id: req.params.id, organizer: req.user.id });
  if (team) {
    const urls = [];
    if (team.ownerPhotoUrl) urls.push(team.ownerPhotoUrl);
    if (team.teamLogoUrl) urls.push(team.teamLogoUrl);
    if (urls.length) await deleteImages(urls);
    await Team.deleteOne({ _id: req.params.id, organizer: req.user.id });
  }
  res.json({ message: 'Deleted' });
}

// ---------- DASHBOARD OVERVIEW ----------
async function getDashboardOverview(req, res) {
  const organizerId = req.user.id;
  const [totalPlayers, soldPlayers, unsoldPlayers, pendingPlayers, teams] = await Promise.all([
    Player.countDocuments({ organizer: organizerId }),
    Player.countDocuments({ organizer: organizerId, auctionStatus: 'SOLD' }),
    Player.countDocuments({ organizer: organizerId, auctionStatus: 'UNSOLD' }),
    Player.countDocuments({ organizer: organizerId, auctionStatus: 'PENDING' }),
    Team.find({ organizer: organizerId }),
  ]);
  res.json({
    totalPlayers, soldPlayers, unsoldPlayers, pendingPlayers,
    teams: teams.map(t => ({
      id: t._id, teamName: t.teamName, ownerName: t.ownerName,
      totalPurse: t.totalPurse, purseRemaining: t.purseRemaining, logoUrl: t.teamLogoUrl,
    })),
  });
}

module.exports = {
  getSettings, updateSettings,
  listCategories, createCategory, updateCategory, deleteCategory,
  listExtraPointSets, createExtraPointSet, grantExtraPointsToTeam,
  listPlayers, updatePlayer, deletePlayer,
  listTeams, createTeamByAdmin, updateTeam, deleteTeam,
  getDashboardOverview,
};
