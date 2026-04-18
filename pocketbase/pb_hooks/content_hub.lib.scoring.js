/// <reference path="../pb_data/types.d.ts" />

function computeSignalScore(trend) {
  const velocity = Math.min(trend.velocity || 0, 20);
  const views = Math.max(trend.views || 0, 1);
  const crossPlatform = trend.cross_platform_count || 0;
  const signalCount = Math.min(trend.signal_count || 0, 10);

  const lastSeen = trend.last_seen_at ? new Date(trend.last_seen_at).getTime() : Date.now();
  const hoursSinceLastSeen = (Date.now() - lastSeen) / (1000 * 60 * 60);
  const recencyDecay = Math.exp(-hoursSinceLastSeen / 72);

  return (
    (velocity * 0.3) +
    (Math.log10(views) * 0.2) +
    (crossPlatform * 2.5) +
    (signalCount * 0.15) +
    (recencyDecay * 0.1)
  );
}

module.exports = { computeSignalScore };
