// Given current bid amount and organizer's configured rules, returns the next bid amount
export function getNextBidAmount(currentAmount, rules = []) {
  if (!rules || rules.length === 0) {
    // Default fallback rules
    if (currentAmount < 2000) return currentAmount + 100;
    if (currentAmount < 5000) return currentAmount + 250;
    return currentAmount + 500;
  }
  const sorted = [...rules].sort((a, b) => a.upTo - b.upTo);
  const applicable = sorted.find((r) => currentAmount < r.upTo) || sorted[sorted.length - 1];
  const increment = applicable ? applicable.increment : 100;
  return currentAmount + increment;
}
