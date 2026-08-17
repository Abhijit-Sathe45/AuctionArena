const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const Organizer = require('../models/Organizer');

// Verifies JWT and attaches decoded payload to req.user
function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// For organizer-role requests: verifies their pass is still active (not expired/suspended)
async function requireActivePass(req, res, next) {
  try {
    const organizer = await Organizer.findById(req.user.id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    if (organizer.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }
    if (organizer.status === 'EXPIRED' || (organizer.passExpiryDate && organizer.passExpiryDate < new Date())) {
      organizer.status = 'EXPIRED';
      organizer.isActive = false;
      await organizer.save();
      return res.status(402).json({ message: 'PASS_EXPIRED', redirect: 'BUY_PASS' });
    }
    req.organizer = organizer;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error validating pass' });
  }
}

module.exports = { protect, requireRole, requireActivePass };
