'use strict';
const jwt = require('jsonwebtoken');
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  const match = typeof header === 'string' && header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Bearer token required' });
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'your_jwt_secret' || secret === 'replace-with-a-long-random-secret-at-least-32-characters') return res.status(503).json({ error: 'Authentication is not configured securely' });
  jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer: 'code-review-platform', audience: 'code-review-platform-api' }, (err, decoded) => {
    if (err || !decoded || typeof decoded.id !== 'string') return res.status(401).json({ error: 'Invalid or expired token' });
    req.userId = decoded.id;
    return next();
  });
};
module.exports = authenticate;
