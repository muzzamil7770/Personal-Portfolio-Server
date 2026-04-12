const { getFirestore } = require('../utils/firebase');
const logger = require('../utils/logger');
const config = require('../config');

const DAILY_LIMIT = 3;

const dailyIpLimit = async (req, res, next) => {
  // Only enforce in production
  if (config.nodeEnv !== 'production') return next();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const docId = `${ip}_${today}`;

  try {
    const db = getFirestore();
    const ref = db.collection('ip_limits').doc(docId);
    const snap = await ref.get();

    const count = snap.exists ? (snap.data().count || 0) : 0;

    if (count >= DAILY_LIMIT) {
      logger.warn(`🚫 Daily IP limit exceeded — IP: ${ip}, count: ${count}, date: ${today}`);
      return res.status(429).json({
        success: false,
        message: `You have reached the daily limit of ${DAILY_LIMIT} submissions. Please try again tomorrow.`,
        retryAfter: 'tomorrow',
        limitExceeded: true
      });
    }

    // Increment count — use set with merge so it creates or updates
    await ref.set({ ip, date: today, count: count + 1 }, { merge: true });

    next();
  } catch (error) {
    logger.error('❌ dailyIpLimit middleware error:', error.message);
    next(); // fail open — don't block user if Firestore has an issue
  }
};

module.exports = dailyIpLimit;
