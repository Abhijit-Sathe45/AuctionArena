const Organizer = require('../models/Organizer');
const AuctionSettings = require('../models/AuctionSettings');
const AuctionState = require('../models/AuctionState');
const AuctionLog = require('../models/AuctionLog');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { createOrder, verifySignature } = require('../utils/razorpay');

// Notifies the organizer's admin panel (Dashboard, Players, Teams — whichever pages are
// open) that a new registration just completed, so those pages can refresh themselves
// automatically instead of requiring a manual page reload.
function emitRegistrationUpdate(req, organizerId, kind) {
  const io = req.app.get('io');
  if (io) io.to(`auction-${organizerId}`).emit('registration-update', { kind });
}

// GET /api/public/:slug/info  -> tournament info + registration status for public landing page
async function getTournamentInfo(req, res) {
  try {
    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found or inactive' });

    const settings = await AuctionSettings.findOne({ organizer: organizer._id });
    const playerCount = await Player.countDocuments({ organizer: organizer._id, paymentStatus: { $in: ['PAID', 'FREE'] } });
    const teamCount = await Team.countDocuments({ organizer: organizer._id, paymentStatus: { $in: ['PAID', 'FREE'] } });

    res.json({
      tournamentName: organizer.tournamentName,
      tournamentDate: organizer.tournamentDate,
      logoUrl: organizer.logoUrl,
      playerRegistrationOpen: settings.playerRegistrationOpen && playerCount < settings.maxPlayers,
      teamRegistrationOpen: settings.teamRegistrationOpen && teamCount < settings.maxTeams,
      playerRegistrationFee: settings.playerRegistrationFee,
      teamRegistrationFee: settings.teamRegistrationFee,
      slotsLeft: { players: Math.max(settings.maxPlayers - playerCount, 0), teams: Math.max(settings.maxTeams - teamCount, 0) },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/public/:slug/player/register
async function registerPlayer(req, res) {
  try {
    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found' });

    const settings = await AuctionSettings.findOne({ organizer: organizer._id });
    const playerCount = await Player.countDocuments({ organizer: organizer._id, paymentStatus: { $in: ['PAID', 'FREE'] } });

    if (!settings.playerRegistrationOpen) {
      return res.status(400).json({ message: 'Player registration is currently closed by the organizer.' });
    }
    if (playerCount >= settings.maxPlayers) {
      return res.status(400).json({ message: 'Player registration is full. No more slots available.' });
    }

    const { name, battingStyle, bowlingStyle, playerType, age, photoUrl, phone } = req.body;
    if (!name || !battingStyle || !playerType || !age) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const fee = settings.playerRegistrationFee;
    const player = await Player.create({
      organizer: organizer._id, name, battingStyle, bowlingStyle: bowlingStyle || 'NA',
      playerType, age, photoUrl, phone,
      registrationFeePaid: fee, paymentStatus: fee > 0 ? 'PENDING' : 'FREE',
    });

    if (fee > 0) {
      const order = await createOrder(fee, `player_${player._id}`);
      player.razorpayOrderId = order.id;
      await player.save();
      return res.json({ playerId: player._id, razorpayOrder: order, amount: fee });
    }


res.json({ playerId: player._id, message: 'Registered successfully (no fee required).' });
    emitRegistrationUpdate(req, organizer._id, 'player');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error registering player' });
  }
}

// POST /api/public/:slug/player/verify-payment
async function verifyPlayerPayment(req, res) {
  try {
    const { playerId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Player not found' });

    const valid = verifySignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature });
    if (!valid) {
      player.paymentStatus = 'FAILED';
      await player.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }
   player.paymentStatus = 'PAID';
    player.razorpayPaymentId = razorpay_payment_id;
    await player.save();
    res.json({ message: 'Payment verified. Registration complete!' });
    emitRegistrationUpdate(req, player.organizer, 'player');
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/public/:slug/team/register
async function registerTeam(req, res) {
  try {
    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found' });

    const settings = await AuctionSettings.findOne({ organizer: organizer._id });
    const teamCount = await Team.countDocuments({ organizer: organizer._id, paymentStatus: { $in: ['PAID', 'FREE'] } });

    if (!settings.teamRegistrationOpen) {
      return res.status(400).json({ message: 'Team registration is currently closed by the organizer.' });
    }
    if (teamCount >= settings.maxTeams) {
      return res.status(400).json({ message: 'Team registration is full. No more slots available.' });
    }

    const { ownerName, teamName, ownerPlaysMatch, ownerPhotoUrl, teamLogoUrl, phone } = req.body;
    if (!ownerName || !teamName) return res.status(400).json({ message: 'Missing required fields' });

    const fee = settings.teamRegistrationFee;
    const team = await Team.create({
      organizer: organizer._id, ownerName, teamName,
      ownerPlaysMatch: !!ownerPlaysMatch, ownerPhotoUrl, teamLogoUrl, phone,
      registrationFeePaid: fee, paymentStatus: fee > 0 ? 'PENDING' : 'FREE',
      totalPurse: settings.maxPursePerTeam, purseRemaining: settings.maxPursePerTeam,
    });

    if (fee > 0) {
      const order = await createOrder(fee, `team_${team._id}`);
      team.razorpayOrderId = order.id;
      await team.save();
      return res.json({ teamId: team._id, razorpayOrder: order, amount: fee });
    }

   res.json({ teamId: team._id, message: 'Registered successfully (no fee required).' });
    emitRegistrationUpdate(req, organizer._id, 'team');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error registering team' });
  }
}

// POST /api/public/:slug/team/verify-payment
async function verifyTeamPayment(req, res) {
  try {
    const { teamId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const valid = verifySignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature });
    if (!valid) {
      team.paymentStatus = 'FAILED';
      await team.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }
    team.paymentStatus = 'PAID';
    team.razorpayPaymentId = razorpay_payment_id;
    await team.save();
    res.json({ message: 'Payment verified. Registration complete!' });
    emitRegistrationUpdate(req, team.organizer, 'team');
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/public/:slug/live-auction  -> read-only live auction view for anyone with the link.
// No login required. Used to power the public "Watch Live" spectator page.
async function getLiveAuctionSpectatorView(req, res) {
  try {
    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found or inactive' });

    const state = await AuctionState.findOne({ organizer: organizer._id })
      .populate('currentPlayer currentBidTeam currentCategory currentBidHistory.team');

    const teams = await Team.find({ organizer: organizer._id, isApproved: true })
      .select('teamName teamLogoUrl ownerName totalPurse purseRemaining');

    // A short "recently sold" ticker so spectators who just joined can see what happened last
    const recentSales = await AuctionLog.find({ organizer: organizer._id, result: 'SOLD' })
      .sort({ createdAt: -1 }).limit(8)
      .populate('player', 'name playerType photoUrl')
      .populate('finalTeam', 'teamName teamLogoUrl');

    res.json({
      organizerId: organizer._id,
      tournamentName: organizer.tournamentName,
      logoUrl: organizer.logoUrl,
      state: state || null,
      teams,
      recentSales,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading live auction' });
  }
}

// GET /api/public/:slug/teams-list  -> for team remote login page (/bid/:slug)
async function getTeamsListForRemote(req, res) {
  try {
    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found or inactive' });

    const settings = await AuctionSettings.findOne({ organizer: organizer._id });
    const teams = await Team.find({ organizer: organizer._id, isApproved: true })
      .select('teamName teamLogoUrl ownerName');

    res.json({
      tournamentName: organizer.tournamentName,
      logoUrl: organizer.logoUrl,
      organizerId: organizer._id,
      teamOwnerBiddingEnabled: !!settings?.teamOwnerBiddingEnabled,
      teams,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching teams list' });
  }
}

// POST /api/public/:slug/team-login  -> 4-digit PIN login for team owners
async function teamLogin(req, res) {
  try {
    const { teamId, pin } = req.body;
    if (!teamId || !pin) {
      return res.status(400).json({ message: 'Please select a team and enter 4-digit PIN' });
    }

    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found' });

    const settings = await AuctionSettings.findOne({ organizer: organizer._id });
    if (!settings?.teamOwnerBiddingEnabled) {
      return res.status(403).json({ message: 'Team owner mobile bidding is currently disabled by the tournament organizer.' });
    }

    const team = await Team.findOne({ _id: teamId, organizer: organizer._id, isApproved: true });
    if (!team) {
      return res.status(404).json({ message: 'Team not found or not approved' });
    }

    if (!team.biddingPin || team.biddingPin.trim() !== pin.toString().trim()) {
      return res.status(401).json({ message: 'Invalid 4-digit PIN for ' + team.teamName });
    }

    const generateToken = require('../utils/generateToken');
    const token = generateToken({
      id: team._id,
      teamId: team._id,
      organizerId: organizer._id,
      role: 'TEAM_OWNER',
    });

    res.json({
      token,
      team: {
        _id: team._id,
        teamName: team.teamName,
        teamLogoUrl: team.teamLogoUrl,
        ownerName: team.ownerName,
        totalPurse: team.totalPurse,
        purseRemaining: team.purseRemaining,
      },
      tournamentName: organizer.tournamentName,
      logoUrl: organizer.logoUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during team login' });
  }
}

// GET /api/public/:slug/team-remote-state -> live status & purse shield for logged-in team owner
async function getTeamRemoteState(req, res) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authorization token' });
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config');
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);

    if (decoded.role !== 'TEAM_OWNER' || !decoded.teamId) {
      return res.status(403).json({ message: 'Invalid token for team remote' });
    }

    const organizer = await Organizer.findOne({ slug: req.params.slug, isActive: true });
    if (!organizer) return res.status(404).json({ message: 'Tournament not found' });

    const [settings, state, team, squadCount] = await Promise.all([
      AuctionSettings.findOne({ organizer: organizer._id }),
      AuctionState.findOne({ organizer: organizer._id })
        .populate('currentPlayer currentBidTeam currentCategory passedTeams'),
      Team.findById(decoded.teamId),
      Player.countDocuments({ organizer: organizer._id, soldTo: decoded.teamId }),
    ]);

    if (!team) return res.status(404).json({ message: 'Team not found' });

    const minSquad = settings?.minPlayersPerTeam || 11;
    const maxSquad = settings?.maxPlayersPerTeam || 15;
    const slotsNeeded = Math.max(minSquad - squadCount, 0);
    const minReserve = Math.max((slotsNeeded - 1) * 100, 0); // basic minimum buffer

    const hasPassed = state?.passedTeams?.some(t => (t._id || t).toString() === team._id.toString());
    const isHighestBidder = state?.currentBidTeam && ((state.currentBidTeam._id || state.currentBidTeam).toString() === team._id.toString());

    res.json({
      organizerId: organizer._id,
      tournamentName: organizer.tournamentName,
      logoUrl: organizer.logoUrl,
      teamOwnerBiddingEnabled: !!settings?.teamOwnerBiddingEnabled,
      team: {
        _id: team._id,
        teamName: team.teamName,
        teamLogoUrl: team.teamLogoUrl,
        ownerName: team.ownerName,
        totalPurse: team.totalPurse,
        purseRemaining: team.purseRemaining,
        squadCount,
        minSquad,
        maxSquad,
        minReserve,
      },
      state: state || null,
      hasPassed: !!hasPassed,
      isHighestBidder: !!isHighestBidder,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Session expired or invalid' });
  }
}

module.exports = {
  getTournamentInfo, registerPlayer, verifyPlayerPayment, registerTeam, verifyTeamPayment,
  getLiveAuctionSpectatorView, getTeamsListForRemote, teamLogin, getTeamRemoteState,
};