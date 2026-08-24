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
        year: now.getFullYear().toString(),
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

    const visitsSnap = await db.collection('visits').orderBy('timestamp', 'desc').get();
    const visits = visitsSnap.docs.map(d => d.data());

    const today = visits.filter(v => v.date === todayStr).length;
    const thisMonth = visits.filter(v => v.month === monthStr).length;
    const allTime = visits.length;

    const byMonth = {};
    visits.forEach(v => {
      byMonth[v.month] = (byMonth[v.month] || 0) + 1;
    });
    const monthlyChart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

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

// ── GET /api/analytics/visitors ───────────────────────────────────────────────
exports.visitors = async (req, res) => {
  try {
    const db = getFirestore();
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database not available' });
    }

    const {
      startDate,
      endDate,
      device,
      ip
    } = req.query;

    let query = db.collection('visits').orderBy('timestamp', 'desc');

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    if (device) {
      query = query.where('device', '==', device);
    }
    if (ip) {
      query = query.where('ip', '==', ip);
    }

    const visitsSnap = await query.get();
    const visits = visitsSnap.docs.map(d => d.data());

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentWeek = getWeekRange(now);
    const currentMonth = now.toISOString().slice(0, 7);
    const currentYear = now.getFullYear().toString();

    const todayCount = visits.filter(v => v.date === todayStr).length;
    const thisWeekCount = visits.filter(v => {
      const d = new Date(v.timestamp);
      return d >= currentWeek.start && d <= currentWeek.end;
    }).length;
    const thisMonthCount = visits.filter(v => v.month === currentMonth).length;
    const thisYearCount = visits.filter(v => v.year === currentYear).length;

    const devices = [...new Set(visits.map(v => v.device).filter(Boolean))];
    const locations = [...new Set(visits.map(v => v.ip).filter(Boolean))];

    res.json({
      success: true,
      data: {
        visitors: visits,
        summary: {
          today: todayCount,
          thisWeek: thisWeekCount,
          thisMonth: thisMonthCount,
          thisYear: thisYearCount
        },
        filters: {
          devices,
          locations
        }
      }
    });
  } catch (error) {
    logger.error('❌ Analytics visitors failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get visitors' });
  }
};

const getWeekRange = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
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
