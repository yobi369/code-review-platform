'use strict';

// Per-process fallback limiter. Use a shared store (e.g. Redis) before scaling horizontally.
function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    // Bound memory even under high-cardinality traffic.
    while (buckets.size > 10000) buckets.delete(buckets.keys().next().value);
  }, Math.min(windowMs, 60000));
  cleanup.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }
    return next();
  };
}
module.exports = { createRateLimiter };
