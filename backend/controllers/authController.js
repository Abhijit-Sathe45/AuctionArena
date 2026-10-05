const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const Organizer = require('../models/Organizer');
const generateToken = require('../utils/generateToken');

// POST /api/auth/superadmin/login
async function superAdminLogin(req, res) {
  const { email, password } = req.body;
  try {
    const admin = await SuperAdmin.findOne({ email: email?.toLowerCase() });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken({ id: admin._id, role: 'SUPER_ADMIN' });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/auth/organizer/login   { loginId, password }
async function organizerLogin(req, res) {
  const { loginId, password } = req.body;
  try {
    const normalized = (loginId || '').toLowerCase().trim();
    const organizer = await Organizer.findOne({
      $or: [
        { loginId: normalized },
        { email: normalized },
        { loginId: (loginId || '').trim() },
      ],
    });
    if (!organizer) return res.status(401).json({ message: 'Invalid login ID or password' });

    const match = await bcrypt.compare(password, organizer.password);
    if (!match) return res.status(401).json({ message: 'Invalid login ID or password' });

    if (organizer.paymentStatus !== 'PAID') {
      return res.status(402).json({ message: 'Payment not completed for this account.' });
    }

    if (organizer.status === 'EXPIRED' || (organizer.passExpiryDate && organizer.passExpiryDate < new Date())) {
      organizer.status = 'EXPIRED';
      organizer.isActive = false;
      await organizer.save();
      return res.status(402).json({ message: 'PASS_EXPIRED', redirect: 'BUY_PASS' });
    }
    if (organizer.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Account suspended. Contact support.' });
    }

    const token = generateToken({ id: organizer._id, role: 'ORGANIZER' });
    res.json({
      token,
      organizer: {
        id: organizer._id,
        tournamentName: organizer.tournamentName,
        slug: organizer.slug,
        logoUrl: organizer.logoUrl,
        passExpiryDate: organizer.passExpiryDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { superAdminLogin, organizerLogin };
