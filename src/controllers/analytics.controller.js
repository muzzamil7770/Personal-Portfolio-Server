const { getFirestore, getRTDB } = require('../utils/firebase');
const { getNotificationsByIP } = require('../utils/db');
const logger = require('../utils/logger');

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Helper: update presence in RTDB ─────────────────────────────────────────
const updatePresence = async (rtdb, sessionId, page) => {
  const sessionRef = rtdb.ref(`presence/${sessionId}`);
  await sessionRef.set({ lastSeen: Date.now(), page: page || '/' });
};

// ── POST /api/analytics/heartbeat ────────────────────────────────────────────
exports.heartbeat = async (req, res) => {
  const { sessionId, page } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required' });

  try {
    const rtdb = getRTDB();
    if (!rtdb) {
      // RTDB not available, just return success without tracking
      return res.json({ success: true, watching: 0 });
    }
    
    await updatePresence(rtdb, sessionId, page);

    const presenceSnap = await rtdb.ref('presence').get();
    let watching = 0;
    if (presenceSnap.exists()) {
      const cutoff = Date.now() - SESSION_TIMEOUT_MS;
      watching = Object.values(presenceSnap.val()).filter(s => s.lastSeen > cutoff).length;
    }

    res.json({ success: true, watching });
  } catch (error) {
    logger.error('❌ Heartbeat failed:', error.message);
    res.status(500).json({ success: false, message: 'Heartbeat failed' });
  }
};

// ── POST /api/analytics/track ─────────────────────────────────────────────────
exports.track = async (req, res) => {
  const {
    sessionId, page, referrer, userAgent,
    browser, browserVersion, os, osVersion, device,
    screenWidth, screenHeight, language, timezone,
    colorDepth, cookiesEnabled, doNotTrack, connectionType
  } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  try {
    const db = getFirestore();
    const rtdb = getRTDB();

    // If Firebase is not available, just return success without tracking
    if (!db || !rtdb) {
      return res.json({ success: true, message: 'Analytics tracking skipped (Firebase not configured)' });
    }

    await updatePresence(rtdb, sessionId, page);

    const visitsRef = db.collection('visits');
    const existing = await visitsRef
      .where('sessionId', '==', sessionId)
      .where('date', '==', todayStr)
      .limit(1)
      .get();

    let watching = 0;
    const presenceSnap = await rtdb.ref('presence').get();
    if (presenceSnap.exists()) {
      const cutoff = Date.now() - SESSION_TIMEOUT_MS;
      watching = Object.values(presenceSnap.val()).filter(s => s.lastSeen > cutoff).length;
    }

    if (existing.empty) {
      const visitRecord = {
        id: Date.now().toString(),
        sessionId, ip,
        page: page || '/',
        referrer: referrer || '',
        userAgent: userAgent || '',
        browser: browser || '',
        browserVersion: browserVersion || '',
        os: os || '',
        osVersion: osVersion || '',
        device: device || 'desktop',
        screenWidth: screenWidth || 0,
        screenHeight: screenHeight || 0,
        language: language || '',
        timezone: timezone || '',
        colorDepth: colorDepth || 0,
        cookiesEnabled: cookiesEnabled ?? true,
        doNotTrack: doNotTrack || 'unspecified',
        connectionType: connectionType || '',
        date: todayStr,
        month: now.toISOString().slice(0, 7),
        timestamp: now.toISOString()
      };
      await visitsRef.doc(visitRecord.id).set(visitRecord);
    }

    res.json({ success: true, watching });
  } catch (error) {
    logger.error('❌ Analytics track failed:', error.message);
    res.status(500).json({ success: false, message: 'Tracking failed' });
  }
};

// ── GET /api/analytics/live ───────────────────────────────────────────────────
exports.live = async (req, res) => {
  try {
    const rtdb = getRTDB();
    const presenceSnap = await rtdb.ref('presence').get();
    let watching = 0;

    if (presenceSnap.exists()) {
      const cutoff = Date.now() - SESSION_TIMEOUT_MS;
      watching = Object.values(presenceSnap.val()).filter(s => s.lastSeen > cutoff).length;
    }

    res.json({ success: true, watching });
  } catch (error) {
    logger.error('❌ Analytics live failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get live count' });
  }
};

// ── GET /api/analytics/stats (admin only) ─────────────────────────────────────
exports.stats = async (req, res) => {
  try {
    const db = getFirestore();
    const rtdb = getRTDB();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    // Get all visits from Firestore
    const visitsSnap = await db.collection('visits').orderBy('timestamp', 'desc').get();
    const visits = visitsSnap.docs.map(d => d.data());

    const today = visits.filter(v => v.date === todayStr).length;
    const thisMonth = visits.filter(v => v.month === monthStr).length;
    const allTime = visits.length;

    // Monthly breakdown for chart
    const byMonth = {};
    visits.forEach(v => {
      byMonth[v.month] = (byMonth[v.month] || 0) + 1;
    });
    const monthlyChart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    // Live count from Realtime DB
    let watching = 0;
    const presenceSnap = await rtdb.ref('presence').get();
    if (presenceSnap.exists()) {
      const cutoff = Date.now() - SESSION_TIMEOUT_MS;
      watching = Object.values(presenceSnap.val()).filter(s => s.lastSeen > cutoff).length;
    }

    res.json({
      success: true,
      data: {
        watching,
        today,
        thisMonth,
        allTime,
        monthlyChart,
        recentLogs: visits.slice(0, 50)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get analytics stats' });
  }
};

// ── GET /api/analytics/history ────────────────────────────────────────────────
exports.history = async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const history = await getNotificationsByIP(ip);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('❌ Analytics history failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
};
