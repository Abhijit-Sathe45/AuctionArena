// WebSocket handlers for the live-auction fast path (bid / undo-bid). These skip the usual
// HTTP request/response cycle entirely — the client emits an event over the already-open
// WebSocket connection and gets an ack back directly, which is faster than opening a new
// HTTP request each time, especially during a fast back-and-forth bidding war.
//
// Every organizer-only action here re-verifies the JWT itself (sockets aren't covered by the
// Express auth middleware), so a forged socket event still can't bid on someone else's behalf.

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const Organizer = require('../models/Organizer');
const auctionService = require('../services/auctionService');

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

  const organizer = await Organizer.findById(decoded.id);
  if (!organizer) throw new Error('Organizer not found');
  if (organizer.status === 'SUSPENDED') throw new Error('Your account has been suspended.');
  if (organizer.status === 'EXPIRED' || (organizer.passExpiryDate && organizer.passExpiryDate < new Date())) {
    throw new Error('PASS_EXPIRED');
  }
  return decoded.id;
}

function registerAuctionSocketHandlers(io, socket) {
  // Everyone (organizer admin panel + public spectators) joins a room to receive broadcasts.
  socket.on('join-auction', (organizerId) => {
    if (organizerId) socket.join(`auction-${organizerId}`);
  });

  // Fast-path bid — { token, teamId } -> ack(err, state)
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

  // Fast-path undo — { token } -> ack(err, state)
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
}

module.exports = registerAuctionSocketHandlers;