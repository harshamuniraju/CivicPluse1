function governanceScore(positive, negative) {
  const total = positive + negative;
  if (total === 0) return 50; // neutral default
  let score = ((positive - negative * 0.7) / total) * 100 + 50;
  if (Number.isNaN(score) || !isFinite(score)) score = 50;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score * 100) / 100;
}

module.exports = governanceScore;
