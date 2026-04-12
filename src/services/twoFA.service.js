const crypto = require('crypto');
const logger = require('../utils/logger');

// In-memory store for 2FA codes (in production, use Redis/database)
const twoFACodes = new Map();

/**
 * Generate a secure 6-digit 2FA code
 */
const generate2FACode = () => {
  // Generate cryptographically secure random 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
};

/**
 * Store 2FA code with expiry (5 minutes)
 */
const store2FACode = (email, code) => {
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  twoFACodes.set(email, { code, expiry });
  logger.info(`✅ 2FA code generated for: ${email}`);
  return { code, expiry };
};

/**
 * Verify 2FA code
 */
const verify2FACode = (email, code) => {
  const stored = twoFACodes.get(email);
  
  if (!stored) {
    return { valid: false, message: 'No 2FA code found. Please login again.' };
  }
  
  if (Date.now() > stored.expiry) {
    twoFACodes.delete(email);
    return { valid: false, message: '2FA code has expired. Please request a new one.' };
  }
  
  if (stored.code !== code) {
    return { valid: false, message: 'Invalid 2FA code. Please try again.' };
  }
  
  // Code is valid, remove it to prevent reuse
  twoFACodes.delete(email);
  logger.info(`✅ 2FA verification successful for: ${email}`);
  return { valid: true, message: '2FA verification successful!' };
};

/**
 * Clean up expired codes (run periodically)
 */
const cleanupExpiredCodes = () => {
  const now = Date.now();
  for (const [email, data] of twoFACodes.entries()) {
    if (now > data.expiry) {
      twoFACodes.delete(email);
    }
  }
  logger.info(`🧹 Cleaned up expired 2FA codes. Active codes: ${twoFACodes.size}`);
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredCodes, 10 * 60 * 1000);

module.exports = {
  generate2FACode,
  store2FACode,
  verify2FACode,
  cleanupExpiredCodes
};
