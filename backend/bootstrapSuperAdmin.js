const bcrypt = require('bcryptjs');
const SuperAdmin = require('./models/SuperAdmin');
const PricingPlan = require('./models/PricingPlan');
const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = require('./config');

// On first server start: creates the Super Admin account (from .env) if it doesn't exist yet,
// and seeds default pricing plans so the Super Admin panel has something to edit right away.
async function bootstrapSuperAdmin() {
  const existing = await SuperAdmin.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() });
  if (!existing) {
    const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    await SuperAdmin.create({ email: SUPER_ADMIN_EMAIL.toLowerCase(), password: hashed });
    console.log(`Super Admin created: ${SUPER_ADMIN_EMAIL} (change password after first login is recommended)`);
  }

  const defaults = [
    { planType: '1_MONTH', label: '1 Month Pass', price: 999, durationInDays: 30 },
    { planType: '4_MONTH', label: '4 Month Pass', price: 2999, durationInDays: 120 },
    { planType: '12_MONTH', label: '12 Month Pass', price: 7999, durationInDays: 365 },
  ];
  for (const plan of defaults) {
    const found = await PricingPlan.findOne({ planType: plan.planType });
    if (!found) await PricingPlan.create(plan);
  }
}

module.exports = bootstrapSuperAdmin;
