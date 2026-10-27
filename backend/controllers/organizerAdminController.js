const Organizer = require('../models/Organizer');
const AuctionSettings = require('../models/AuctionSettings');
const Category = require('../models/Category');
const ExtraPointSet = require('../models/ExtraPointSet');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { deleteImages } = require('../utils/cloudinaryCleanup');

// ---------- PROFILE ----------
async function getProfile(req, res) {
  const organizer = await Organizer.findById(req.user.id).select(
    'tournamentName organizerName email phone logoUrl slug loginId tournamentDate planType status passExpiryDate'
  );
  if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
  res.json(organizer);
}

async function updateProfile(req, res) {
  const { tournamentName, organizerName, phone, tournamentDate, logoUrl } = req.body;
  const organizer = await Organizer.findById(req.user.id);
  if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

  if (tournamentName !== undefined) {
    const trimmed = String(tournamentName).trim();
    if (!trimmed) {
      return res.status(400).json({ message: 'Tournament name cannot be empty' });
    }
    organizer.tournamentName = trimmed;
  }

  if (organizerName !== undefined) {
    organizer.organizerName = String(organizerName).trim();
  }

  if (phone !== undefined) {
    organizer.phone = String(phone).trim();
  }

  if (tournamentDate !== undefined && tournamentDate) {
    const d = new Date(tournamentDate);
    if (!isNaN(d.getTime())) {
      organizer.tournamentDate = d;
    }
  }

  if (logoUrl !== undefined) {
    const oldLogo = organizer.logoUrl;
    const newLogo = logoUrl ? String(logoUrl).trim() : null;
    if (oldLogo && oldLogo !== newLogo) {
      try {
        await deleteImages([oldLogo]);
      } catch (e) {
        console.error('Failed to cleanup old logo image:', e);
      }
    }
    organizer.logoUrl = newLogo;
  }

  await organizer.save();

  // Notify socket room
  try {
    const io = req.app.get('io');
    if (io) {
      io.to(`auction-${organizer._id}`).emit('tournament-updated', {
        tournamentName: organizer.tournamentName,
        logoUrl: organizer.logoUrl,
      });
    }
  } catch (e) {
    // ignore
  }

  res.json({
    id: organizer._id,
    tournamentName: organizer.tournamentName,
    organizerName: organizer.organizerName,
    email: organizer.email,
    phone: organizer.phone,
    logoUrl: organizer.logoUrl,
    slug: organizer.slug,
    loginId: organizer.loginId,
    tournamentDate: organizer.tournamentDate,
    planType: organizer.planType,
    status: organizer.status,
    passExpiryDate: organizer.passExpiryDate,
  });
}

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
    'teamOwnerBiddingEnabled', 'onePlayerPerCategoryEnabled',
    'rtmEnabled', 'rtmCardsPerTeam'
  ];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  const settings = await AuctionSettings.findOneAndUpdate(
    { organizer: req.user.id }, update, { new: true, upsert: true }
  );
  try {
    const auctionService = require('../services/auctionService');
    auctionService.invalidateSettingsCache(req.user.id);
  } catch (e) {
    // ignore
  }
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
  if (req.query.teamId) filter.soldTo = req.query.teamId;
  const players = await Player.find(filter).populate('category').populate('soldTo');
  res.json(players);
}

// ---------- SQUAD POSTERS & BOUGHT PLAYERS ----------
async function getSquadPostersData(req, res) {
  const organizer = await Organizer.findById(req.user.id);
  if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

  const teams = await Team.find({ organizer: req.user.id }).sort({ teamName: 1 });
  const players = await Player.find({ organizer: req.user.id, auctionStatus: 'SOLD' })
    .populate('category')
    .sort({ soldPrice: -1, name: 1 });

  const teamMap = {};
  teams.forEach(t => {
    teamMap[t._id.toString()] = {
      _id: t._id,
      teamName: t.teamName,
      teamLogoUrl: t.teamLogoUrl,
      ownerName: t.ownerName,
      ownerPlaysMatch: t.ownerPlaysMatch,
      phone: t.phone,
      totalPurse: t.totalPurse,
      purseRemaining: t.purseRemaining,
      extraPointsReceived: t.extraPointsReceived || [],
      players: []
    };
  });

  players.forEach(p => {
    const tId = p.soldTo?.toString();
    if (tId && teamMap[tId]) {
      teamMap[tId].players.push({
        _id: p._id,
        name: p.name,
        photoUrl: p.photoUrl,
        playerType: p.playerType,
        battingStyle: p.battingStyle,
        bowlingStyle: p.bowlingStyle,
        jerseyNumber: p.jerseyNumber,
        jerseyName: p.jerseyName,
        tShirtSize: p.tShirtSize,
        soldPrice: p.soldPrice,
        categoryName: p.category?.name || 'General'
      });
    }
  });

  res.json({
    tournament: {
      tournamentName: organizer.tournamentName,
      logoUrl: organizer.logoUrl,
      tournamentDate: organizer.tournamentDate,
      slug: organizer.slug,
    },
    teams: Object.values(teamMap)
  });
}
async function updatePlayer(req, res) {
  const allowed = [
    'category', 'basePrice', 'isApproved', 'photoUrl', 'previousTeam',
    'phone', 'tShirtSize', 'jerseyNumber', 'jerseyName', 'villageCity'
  ];
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
  getProfile, updateProfile,
  getSettings, updateSettings,
  listCategories, createCategory, updateCategory, deleteCategory,
  listExtraPointSets, createExtraPointSet, grantExtraPointsToTeam,
  listPlayers, updatePlayer, deletePlayer,
  listTeams, createTeamByAdmin, updateTeam, deleteTeam,
  getDashboardOverview,
  getSquadPostersData,
};
