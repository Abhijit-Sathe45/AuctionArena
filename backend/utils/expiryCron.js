const cron = require('node-cron');
const Organizer = require('../models/Organizer');

// Runs every hour: flips any organizer whose pass has expired to status EXPIRED / isActive=false
function startExpiryCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const result = await Organizer.updateMany(
        { passExpiryDate: { $lt: now }, status: { $ne: 'EXPIRED' } },
        { $set: { status: 'EXPIRED', isActive: false } }
      );
      if (result.modifiedCount) {
        console.log(`[expiryCron] Expired ${result.modifiedCount} organizer pass(es).`);
      }
    } catch (err) {
      console.error('[expiryCron] error:', err.message);
    }
  });
  console.log('Expiry cron scheduled (runs hourly).');
}

module.exports = startExpiryCron;
