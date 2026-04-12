const jwt = require('jsonwebtoken');

/**
 * Verify JWT token
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Check if user is admin (always passes if token is valid for this portfolio)
 */
const isAdmin = (req, res, next) => {
  // For this portfolio, any authenticated user with a valid token is considered admin
  // The token is only issued after successful admin login with 2FA
  next();
};

module.exports = { verifyToken, isAdmin };
