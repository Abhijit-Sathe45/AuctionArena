const AuctionState = require('../models/AuctionState');
const auctionService = require('./auctionService');

class AuctionTimerService {
  constructor() {
    this.timers = new Map(); // organizerId string -> NodeJS.Timeout
    this.io = null;
  }

  setIo(io) {
    this.io = io;
  }

  startAuctionTimer(organizerId, durationSeconds) {
    const orgIdStr = organizerId.toString();
    this.clearAuctionTimer(orgIdStr);

    const ms = Math.max(0, Math.round(durationSeconds * 1000));
    const timer = setTimeout(async () => {
      await this.autoResolve(orgIdStr);
    }, ms);

    this.timers.set(orgIdStr, timer);
  }

  clearAuctionTimer(organizerId) {
    const orgIdStr = organizerId.toString();
    if (this.timers.has(orgIdStr)) {
      clearTimeout(this.timers.get(orgIdStr));
      this.timers.delete(orgIdStr);
    }
  }

  async autoResolve(organizerId) {
    this.clearAuctionTimer(organizerId);
    try {
      const state = await AuctionState.findOne({ organizer: organizerId });
      if (!state || !state.currentPlayer || state.status !== 'RUNNING') return;

      if (state.currentBidTeam) {
        const { player, team, finalPrice } = await auctionService.resolveSold(organizerId);
        if (this.io) {
          this.io.to(`auction-${organizerId}`).emit('auction-update', {
            event: 'PLAYER_SOLD',
            player,
            team,
            finalPrice,
          });
        }
      } else {
        const { player } = await auctionService.resolveUnsold(organizerId);
        if (this.io) {
          this.io.to(`auction-${organizerId}`).emit('auction-update', {
            event: 'PLAYER_UNSOLD',
            player,
          });
        }
      }
    } catch (err) {
      console.error(`[AuctionTimerService] Error auto-resolving auction for organizer ${organizerId}:`, err);
    }
  }

  async recoverActiveTimers() {
    try {
      const activeStates = await AuctionState.find({
        status: 'RUNNING',
        currentPlayer: { $ne: null },
        countdownEnabled: true,
        biddingEndsAt: { $ne: null },
      });

      for (const state of activeStates) {
        const remainingMs = new Date(state.biddingEndsAt).getTime() - Date.now();
        if (remainingMs <= 0) {
          await this.autoResolve(state.organizer.toString());
        } else {
          this.startAuctionTimer(state.organizer.toString(), remainingMs / 1000);
        }
      }
    } catch (err) {
      console.error('[AuctionTimerService] Failed to recover active timers on startup:', err);
    }
  }
}

const instance = new AuctionTimerService();
module.exports = instance;
