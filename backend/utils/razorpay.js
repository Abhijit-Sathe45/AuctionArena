const Razorpay = require('razorpay');
const crypto = require('crypto');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config');

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// amountInRupees -> creates a Razorpay order (amount must be in paise)
async function createOrder(amountInRupees, receipt) {
  if (!amountInRupees || amountInRupees <= 0) {
    // Free registration (fee = 0) - no order needed
    return null;
  }
  return razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt,
  });
}

// Verifies the signature Razorpay sends back after checkout completes
function verifySignature({ orderId, paymentId, signature }) {
  const generated = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return generated === signature;
}

module.exports = { razorpay, createOrder, verifySignature };
