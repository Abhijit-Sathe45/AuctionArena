const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const Organizer = require('../models/Organizer');
const AuctionSettings = require('../models/AuctionSettings');
const AuctionState = require('../models/AuctionState');
const auctionService = require('../services/auctionService');

// In-memory organizer pass verification cache (20s TTL) for fast-path socket bidding
const authCache = new Map();

// Verifies the organizer's JWT and confirms their pass is still active.
// Returns the organizer's id on success, or throws with a user-facing message.
async function authenticateOrganizerSocket(token) {
  if (!token) throw new Error('Not authorized, no token');
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error('Not authorized, invalid token');
  }
  if (decoded.role !== 'ORGANIZER') throw new Error('Forbidden: organizer account required');

  const now = Date.now();
  const cached = authCache.get(decoded.id);
  if (cached && cached.expiresAt > now) {
    return decoded.id;
  }

  const organizer = await Organizer.findById(decoded.id).select('status passExpiryDate').lean();
  if (!organizer) throw new Error('Organizer not found');
  if (organizer.status === 'SUSPENDED') throw new Error('Your account has been suspended.');
  if (organizer.status === 'EXPIRED' || (organizer.passExpiryDate && organizer.passExpiryDate < new Date())) {
    throw new Error('PASS_EXPIRED');
  }

  // Cache valid auth for 20 seconds
  authCache.set(decoded.id, { expiresAt: now + 20000 });
  return decoded.id;
}

// Verifies the team owner's JWT token
function authenticateTeamSocket(token) {
  if (!token) throw new Error('Not authorized, no token');
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error('Not authorized, invalid token');
  }
  if (decoded.role !== 'TEAM_OWNER' || !decoded.teamId || !decoded.organizerId) {
    throw new Error('Forbidden: team owner account required');
  }
  return decoded; // { id, teamId, organizerId }
}

function registerAuctionSocketHandlers(io, socket) {
  // Everyone (organizer admin panel + public spectators + team remotes) joins a room to receive broadcasts.
  socket.on('join-auction', (organizerId) => {
    if (organizerId) socket.join(`auction-${organizerId}`);
  });

  // Fast-path bid (Organizer) — { token, teamId } -> ack(err, state)
  socket.on('auction:bid', async ({ token, teamId } = {}, ack) => {
    try {
      const organizerId = await authenticateOrganizerSocket(token);
      const state = await auctionService.placeBid(organizerId, teamId);
      io.to(`auction-${organizerId}`).emit('auction-update', { event: 'BID_PLACED', state });
      if (typeof ack === 'function') ack({ ok: true, state });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, message: err.message });
    }
  });

  // Fast-path undo (Organizer) — { token } -> ack(err, state)
  socket.on('auction:undo-bid', async ({ token } = {}, ack) => {
    try {
      const organizerId = await authenticateOrganizerSocket(token);
      const state = await auctionService.undoBid(organizerId);
      io.to(`auction-${organizerId}`).emit('auction-update', { event: 'BID_UNDONE', state });
      if (typeof ack === 'function') ack({ ok: true, state });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, message: err.message });
    }
  });

  // Fast-path team owner mobile remote bid — { token } -> ack(err, state)
  socket.on('auction:team-bid', async ({ token } = {}, ack) => {
    try {
      const { teamId, organizerId } = authenticateTeamSocket(token);

      const settings = await AuctionSettings.findOne({ organizer: organizerId }).lean();
      if (!settings?.teamOwnerBiddingEnabled) {
        throw new Error('Team owner remote bidding is disabled by the tournament organizer.');
      }

      const state = await auctionService.placeBid(organizerId, teamId);
      io.to(`auction-${organizerId}`).emit('auction-update', { event: 'BID_PLACED', state });
      if (typeof ack === 'function') ack({ ok: true, state });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, message: err.message });
    }
  });

  // Team owner mobile remote pass — { token } -> ack(err, state)
  socket.on('auction:team-pass', async ({ token } = {}, ack) => {
    try {
      const { teamId, organizerId } = authenticateTeamSocket(token);

      const state = await AuctionState.findOneAndUpdate(
        { organizer: organizerId },
        { $addToSet: { passedTeams: teamId } },
        { new: true }
      ).populate(auctionService.POPULATE_PATH);

      io.to(`auction-${organizerId}`).emit('auction-update', { event: 'TEAM_PASSED', state, teamId });
      if (typeof ack === 'function') ack({ ok: true, state });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, message: err.message });
    }
  });

  // Organizer live announcement / custom commentary broadcast
  socket.on('auction:post-announcement', async ({ token, message, author = 'Auctioneer' } = {}, ack) => {
    try {
      const organizerId = await authenticateOrganizerSocket(token);
      if (!message || !message.trim()) throw new Error('Announcement message cannot be empty');

      const payload = {
        event: 'ANNOUNCEMENT',
        message: message.trim(),
        author: author.trim() || 'Auctioneer',
        timestamp: new Date(),
      };

      io.to(`auction-${organizerId}`).emit('auction-update', payload);
      if (typeof ack === 'function') ack({ ok: true, payload });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, message: err.message });
    }
  });
}

module.exports = registerAuctionSocketHandlers;