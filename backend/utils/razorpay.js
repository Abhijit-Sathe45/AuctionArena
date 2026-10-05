const Razorpay = require('razorpay');
const crypto = require('crypto');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config');

let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('[Razorpay] Keys not configured in environment variables. Payment orders will be disabled.');
}

// amountInRupees -> creates a Razorpay order (amount must be in paise)
async function createOrder(amountInRupees, receipt) {
  if (!amountInRupees || amountInRupees <= 0) {
    // Free registration (fee = 0) - no order needed
    return null;
  }
  if (!razorpay) {
    throw new Error('Razorpay is not configured on the server. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt,
  });
}

// Verifies the signature Razorpay sends back after checkout completes
function verifySignature({ orderId, paymentId, signature }) {
  if (!RAZORPAY_KEY_SECRET) return false;
  const generated = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return generated === signature;
}

module.exports = { razorpay, createOrder, verifySignature };
