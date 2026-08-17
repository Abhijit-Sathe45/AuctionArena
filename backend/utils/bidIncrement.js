// Given current bid amount and organizer's configured rules, returns the next bid amount
function getNextBidAmount(currentAmount, rules) {
  const sorted = [...rules].sort((a, b) => a.upTo - b.upTo);
  const applicable = sorted.find(r => currentAmount < r.upTo) || sorted[sorted.length - 1];
  const increment = applicable ? applicable.increment : 100;
  return currentAmount + increment;
}

module.exports = { getNextBidAmount };
