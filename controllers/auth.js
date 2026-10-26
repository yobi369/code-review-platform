'use strict';
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const PASSWORD_BYTES = 64;
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, PASSWORD_BYTES);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3 || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
    const actual = await scrypt(password, parts[1], PASSWORD_BYTES);
    return crypto.timingSafeEqual(actual, Buffer.from(parts[2], 'hex'));
  }
  // One-time compatibility for accounts created by the original plaintext-password implementation.
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function validCredentials(username, password) {
  return typeof username === 'string' && username.trim().length >= 3 && username.trim().length <= 80 &&
    typeof password === 'string' && password.length >= 12 && password.length <= 256;
}
exports.register = async (req, res) => {
  const username = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = req.body && req.body.password;
  if (!validCredentials(username, password)) {
    return res.status(400).json({ error: 'Username must be 3–80 characters and password must be 12–256 characters.' });
  }
  try {
    const user = new User({ username, password: await hashPassword(password) });
    await user.save();
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error && error.code === 11000) return res.status(409).json({ error: 'Username is already registered' });
    if (error && error.name === 'ValidationError') return res.status(400).json({ error: 'Invalid registration data' });
    console.error('Registration failed:', error && error.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
};
exports.login = async (req, res) => {
  const username = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = req.body && req.body.password;
  if (typeof password !== 'string' || !username || password.length > 256) return res.status(400).json({ error: 'Username and password are required' });
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'your_jwt_secret') {
    return res.status(503).json({ error: 'Authentication is not configured securely on this server' });
  }
  try {
    const user = await User.findOne({ username }).select('+password');
    if (!user || !(await verifyPassword(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });
    // Upgrade a legacy plaintext password immediately after a successful login.
    if (!user.password.startsWith('scrypt$')) {
      user.password = await hashPassword(password);
      await user.save();
    }
    const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h', issuer: 'code-review-platform', audience: 'code-review-platform-api', algorithm: 'HS256' });
    return res.status(200).json({ token, tokenType: 'Bearer', expiresIn: 3600 });
  } catch (error) {
    console.error('Login failed:', error && error.message);
    return res.status(500).json({ error: 'Login failed' });
  }
};
