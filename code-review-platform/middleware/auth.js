const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ensureAuth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/auth/login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).lean();
    if (!req.user) return res.redirect('/auth/login');
    next();
  } catch (error) {
    res.redirect('/auth/login');
  }
};

module.exports = { ensureAuth };
