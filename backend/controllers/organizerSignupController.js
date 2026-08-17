const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const Organizer = require('../models/Organizer');
const AuctionSettings = require('../models/AuctionSettings');
const PricingPlan = require('../models/PricingPlan');
const { createOrder, verifySignature } = require('../utils/razorpay');

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + nanoid(5);
}
// Login ID is simply the organizer's registered email — easy to remember, already unique.
function genLoginId(email) {
  return email.toLowerCase().trim();
}
// Password is the tournament name (letters/numbers only, no spaces) + a random 4-digit number,
// e.g. tournament "Yara Cricket Cup" -> "YaraCricketCup4821". Easy to remember, still hard to guess.
function genPassword(tournamentName) {
  const namePart = tournamentName.replace(/[^a-zA-Z0-9]+/g, '');
  const numberPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${namePart}${numberPart}`;
}

// STEP 1 — POST /api/organizer-signup/initiate
// Body: tournamentName, tournamentDate, organizerName, email, phone, planType, logoUrl(optional, from upload endpoint)
async function initiateSignup(req, res) {
  try {
    const { tournamentName, tournamentDate, organizerName, email, phone, planType, logoUrl } = req.body;

    if (!tournamentName || !tournamentDate || !organizerName || !email || !planType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const plan = await PricingPlan.findOne({ planType, isActive: true });
    if (!plan) return res.status(400).json({ message: 'Invalid or inactive plan selected' });

    const existing = await Organizer.findOne({ email: email.toLowerCase() });
    if (existing && existing.paymentStatus === 'PAID' && existing.status !== 'EXPIRED') {
      return res.status(400).json({ message: 'An account with this email already exists and is active.' });
    }

    const slug = slugify(tournamentName);
    const loginId = genLoginId(email);
    const rawPassword = genPassword(tournamentName);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const organizer = existing || new Organizer({});
    Object.assign(organizer, {
      tournamentName, tournamentDate, organizerName,
      email: email.toLowerCase(), phone, logoUrl: logoUrl || null,
      slug: existing ? existing.slug : slug,
      loginId: existing ? existing.loginId : loginId,
      password: hashedPassword,
      planType, pricePaid: plan.price,
      paymentStatus: 'PENDING',
    });
    await organizer.save();

    const order = await createOrder(plan.price, `org_${organizer._id}`);
    organizer.razorpayOrderId = order ? order.id : null;

    // Free plan (price = 0, e.g. for testing) — activate immediately, no payment step needed
    if (!order) {
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + (plan.durationInDays || 30));

      organizer.paymentStatus = 'PAID';
      organizer.passStartDate = startDate;
      organizer.passExpiryDate = expiryDate;
      organizer.isActive = true;
      organizer.status = 'ACTIVE';
      await organizer.save();

      const existingSettings = await AuctionSettings.findOne({ organizer: organizer._id });
      if (!existingSettings) await AuctionSettings.create({ organizer: organizer._id });

      return res.json({
        organizerId: organizer._id,
        razorpayOrder: null,
        amount: 0,
        activatedImmediately: true,
        loginId: organizer.loginId,
        slug: organizer.slug,
        rawPasswordPreview: rawPassword,
      });
    }

    await organizer.save();

    res.json({
      organizerId: organizer._id,
      razorpayOrder: order,
      amount: plan.price,
      rawPasswordPreview: rawPassword, // shown once so organizer can note it down; also confirmed after payment success
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error initiating signup' });
  }
}

// STEP 2 — POST /api/organizer-signup/verify-payment
// Body: organizerId, razorpay_order_id, razorpay_payment_id, razorpay_signature
async function verifyPayment(req, res) {
  try {
    const { organizerId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const valid = verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      organizer.paymentStatus = 'FAILED';
      await organizer.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const plan = await PricingPlan.findOne({ planType: organizer.planType });
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + (plan?.durationInDays || 30));

    organizer.paymentStatus = 'PAID';
    organizer.razorpayPaymentId = razorpay_payment_id;
    organizer.passStartDate = startDate;
    organizer.passExpiryDate = expiryDate;
    organizer.isActive = true;
    organizer.status = 'ACTIVE';
    await organizer.save();

    // Create default AuctionSettings for this organizer if not present
    const existingSettings = await AuctionSettings.findOne({ organizer: organizer._id });
    if (!existingSettings) {
      await AuctionSettings.create({ organizer: organizer._id });
    }

    res.json({
      message: 'Payment verified. Account activated.',
      loginId: organizer.loginId,
      slug: organizer.slug,
      passExpiryDate: organizer.passExpiryDate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error verifying payment' });
  }
}

// Organizer buys a fresh/renewal pass while logged in (used after expiry)
async function renewPass(req, res) {
  try {
    const { planType } = req.body;
    const plan = await PricingPlan.findOne({ planType, isActive: true });
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const organizer = req.organizer || await Organizer.findById(req.user.id);
    const order = await createOrder(plan.price, `renew_${organizer._id}_${Date.now()}`);
    organizer.planType = planType;
    organizer.pricePaid = plan.price;
    organizer.paymentStatus = 'PENDING';
    organizer.razorpayOrderId = order ? order.id : null;
    await organizer.save();

    res.json({ razorpayOrder: order, amount: plan.price, organizerId: organizer._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error initiating renewal' });
  }
}

async function verifyRenewPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const organizer = await Organizer.findById(req.user.id);
    const valid = verifySignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature });
    if (!valid) return res.status(400).json({ message: 'Payment verification failed' });

    const plan = await PricingPlan.findOne({ planType: organizer.planType });
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + (plan?.durationInDays || 30));

    organizer.paymentStatus = 'PAID';
    organizer.razorpayPaymentId = razorpay_payment_id;
    organizer.passStartDate = startDate;
    organizer.passExpiryDate = expiryDate;
    organizer.isActive = true;
    organizer.status = 'ACTIVE';
    await organizer.save();

    res.json({ message: 'Pass renewed successfully', passExpiryDate: organizer.passExpiryDate });
  } catch (err) {
    res.status(500).json({ message: 'Server error verifying renewal' });
  }
}

module.exports = { initiateSignup, verifyPayment, renewPass, verifyRenewPayment };