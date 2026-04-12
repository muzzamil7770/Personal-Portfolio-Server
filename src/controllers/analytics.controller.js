const fs = require('fs');
const path = require('path');

const LOGS_DB = path.join(__dirname, '../../database/logs_db.json');

const readLogs = () => {
  if (!fs.existsSync(LOGS_DB)) return { visitors: [], visits: [] };
  return JSON.parse(fs.readFileSync(LOGS_DB, 'utf-8'));
};

const writeLogs = (data) => fs.writeFileSync(LOGS_DB, JSON.stringify(data, null, 2), 'utf-8');

// In-memory active sessions: { sessionId: lastSeenTimestamp }
const activeSessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 min

const cleanSessions = () => {
  const now = Date.now();
  for (const [id, ts] of activeSessions) {
    if (now - ts > SESSION_TIMEOUT) activeSessions.delete(id);
  }
};

// POST /api/analytics/track
exports.track = (req, res) => {
  const { sessionId, page, referrer, userAgent } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = new Date();
  const db = readLogs();

  // Update active session heartbeat
  activeSessions.set(sessionId, Date.now());
  cleanSessions();

  // Check if this session already has a visit today
  const todayStr = now.toISOString().slice(0, 10);
  const existingVisit = db.visits.find(v => v.sessionId === sessionId && v.date === todayStr);

  if (!existingVisit) {
    db.visits.push({
      id: Date.now().toString(),
      sessionId,
      ip,
      page: page || '/',
      referrer: referrer || '',
      userAgent: userAgent || '',
      date: todayStr,
      month: now.toISOString().slice(0, 7),
      timestamp: now.toISOString()
    });
    writeLogs(db);
  }

  res.json({ success: true, watching: activeSessions.size });
};

// GET /api/analytics/live  (public — only watching count)
exports.live = (req, res) => {
  cleanSessions();
  res.json({ success: true, watching: activeSessions.size });
};

// GET /api/analytics/stats  (admin only)
exports.stats = (req, res) => {
  cleanSessions();
  const db = readLogs();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  const today = db.visits.filter(v => v.date === todayStr).length;
  const thisMonth = db.visits.filter(v => v.month === monthStr).length;
  const allTime = db.visits.length;

  // Monthly breakdown for chart
  const byMonth = {};
  db.visits.forEach(v => {
    byMonth[v.month] = (byMonth[v.month] || 0) + 1;
  });
  const monthlyChart = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));

  // Recent logs (last 50)
  const recentLogs = [...db.visits].reverse().slice(0, 50);

  res.json({
    success: true,
    data: {
      watching: activeSessions.size,
      today,
      thisMonth,
      allTime,
      monthlyChart,
      recentLogs
    }
  });
};
