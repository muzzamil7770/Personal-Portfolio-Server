const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { generate2FACode, store2FACode, verify2FACode } = require('../services/twoFA.service');
const { send2FAVerification } = require('../services/email.service');

/**
 * Step 1: Verify username/password, then send 2FA code
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required.' });

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  const code = generate2FACode();
  const adminEmail = process.env.EMAIL_USER;
  store2FACode(adminEmail, code);

  // Always log OTP to server logs
  logger.info(`🔐 2FA OTP for admin login: [ ${code} ] (expires in 5 minutes)`);

  if (!config.email.enabled) {
    logger.warn('⚠️  EMAIL_ENABLED=false — OTP not sent via email. Use the OTP printed in server logs.');
    return res.json({
      success: true,
      message: '2FA code generated. Email is disabled — check server logs for the OTP.',
      requires2FA: true
    });
  }

  try {
    await send2FAVerification(adminEmail, code);
    logger.info(`📨 2FA code emailed to admin: ${adminEmail}`);
    res.json({
      success: true,
      message: '2FA code sent to your email. Please verify to complete login.',
      requires2FA: true
    });
  } catch (error) {
    logger.error('❌ Failed to send 2FA code:', error);
    res.status(500).json({ success: false, message: 'Failed to send 2FA code. Please try again.' });
  }
});

/**
 * Step 2: Verify 2FA code and return JWT token
 */
router.post('/verify-2fa', (req, res) => {
  const { code } = req.body;

  if (!code || code.length !== 6)
    return res.status(400).json({ success: false, message: 'Invalid 2FA code format.' });

  const adminEmail = process.env.EMAIL_USER;
  const verification = verify2FACode(adminEmail, code);

  if (!verification.valid)
    return res.status(401).json({ success: false, message: verification.message });

  const token = jwt.sign({ role: 'admin', email: adminEmail }, process.env.JWT_SECRET, { expiresIn: '8h' });

  logger.info('✅ Admin login successful with 2FA verification');

  res.json({
    success: true,
    token,
    message: 'Login successful! Welcome back, Muhammad.'
  });
});

/**
 * Resend 2FA code
 */
router.post('/resend-2fa', async (req, res) => {
  const adminEmail = process.env.EMAIL_USER;
  const code = generate2FACode();
  store2FACode(adminEmail, code);

  logger.info(`🔐 2FA OTP resent for admin: [ ${code} ] (expires in 5 minutes)`);

  if (!config.email.enabled) {
    logger.warn('⚠️  EMAIL_ENABLED=false — OTP not sent via email. Use the OTP printed in server logs.');
    return res.json({ success: true, message: 'New 2FA code generated. Check server logs for the OTP.' });
  }

  try {
    await send2FAVerification(adminEmail, code);
    res.json({ success: true, message: 'New 2FA code sent to your email.' });
  } catch (error) {
    logger.error('❌ Failed to resend 2FA code:', error);
    res.status(500).json({ success: false, message: 'Failed to resend 2FA code. Please try again.' });
  }
});

module.exports = router;
