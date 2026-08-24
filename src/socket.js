const { Server } = require('socket.io');
const logger = require('./utils/logger');
const { getRTDB, getFirestore } = require('./utils/firebase');

let io = null;
let liveByIp = new Map(); // ip -> { socketIds: Set, lastSeen, page }
let analyticsAdmins = new Set();

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

const getIpFromSocket = (socket) => {
  return (
    socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    socket.handshake.address ||
    'unknown'
  );
};

const sanitizePath = (str) => {
  return str.replace(/[.#$\[\]]/g, '_');
};

const updatePresence = async (rtdb, ip, page) => {
  const safeIp = sanitizePath(ip);
  const sessionRef = rtdb.ref(`presence/${safeIp}`);
  await sessionRef.set({ lastSeen: Date.now(), page: page || '/' });
};

const getWatchingCount = async (rtdb) => {
  try {
    const presenceSnap = await rtdb.ref('presence').get();
    if (!presenceSnap.exists()) return 0;
    const cutoff = Date.now() - SESSION_TIMEOUT_MS;
    return Object.values(presenceSnap.val()).filter(s => s.lastSeen > cutoff).length;
  } catch (err) {
    logger.error('Failed to get watching count:', err.message);
    return 0;
  }
};

const broadcastLiveUpdate = async (rtdb) => {
  const watching = await getWatchingCount(rtdb);
  io.emit('analytics:live-update', { watching });
  return watching;
};

const broadcastStatsUpdate = async (db, rtdb) => {
  try {
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

    const watching = await getWatchingCount(rtdb);
    const stats = {
      watching,
      today,
      thisMonth,
      allTime,
      monthlyChart,
      recentLogs: visits.slice(0, 50)
    };

    analyticsAdmins.forEach(socketId => {
      io.to(socketId).emit('analytics:stats-update', stats);
    });

    return stats;
  } catch (err) {
    logger.error('Failed to broadcast stats:', err.message);
    return null;
  }
};

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', async (socket) => {
        logger.info(`🔌 New socket connection: ${socket.id}`);
        
        const ip = getIpFromSocket(socket);
        
        if (!liveByIp.has(ip)) {
          liveByIp.set(ip, { socketIds: new Set(), lastSeen: Date.now(), page: '/' });
        }
        const entry = liveByIp.get(ip);
        entry.socketIds.add(socket.id);
        entry.lastSeen = Date.now();
        
        const rtdb = getRTDB();
        if (rtdb) {
          try {
            await updatePresence(rtdb, ip, entry.page);
            await broadcastLiveUpdate(rtdb);
          } catch (err) {
            logger.error('Failed to update presence:', err.message);
          }
        }

        socket.on('analytics:track', async (data) => {
          try {
            const db = getFirestore();
            if (!db || !rtdb) {
              socket.emit('analytics:tracked', { success: true });
              return;
            }

            const {
              sessionId, page, referrer, userAgent,
              browser, browserVersion, os, osVersion, device,
              screenWidth, screenHeight, language, timezone,
              colorDepth, cookiesEnabled, doNotTrack, connectionType
            } = data;

            if (!sessionId) {
              socket.emit('analytics:error', { message: 'sessionId required' });
              return;
            }

            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);

            const visitsRef = db.collection('visits');
            const existing = await visitsRef
              .where('sessionId', '==', sessionId)
              .where('date', '==', todayStr)
              .limit(1)
              .get();

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

            if (rtdb) {
              try {
                await updatePresence(rtdb, ip, page);
                await broadcastLiveUpdate(rtdb);
                await broadcastStatsUpdate(db, rtdb);
              } catch (err) {
                logger.error('Failed to update presence during analytics track:', err.message);
              }
            }

            socket.emit('analytics:tracked', { success: true });
          } catch (error) {
            logger.error('❌ Analytics track via socket failed:', error.message);
            socket.emit('analytics:error', { message: 'Tracking failed' });
          }
        });

        socket.on('analytics:heartbeat', async (data) => {
          try {
            const { sessionId, page } = data;
            if (!sessionId) {
              socket.emit('analytics:error', { message: 'sessionId required' });
              return;
            }

            if (!rtdb) {
              socket.emit('analytics:heartbeated', { success: true, watching: 0 });
              return;
            }

            if (liveByIp.has(ip)) {
              liveByIp.get(ip).page = page || '/';
              liveByIp.get(ip).lastSeen = Date.now();
            }

            if (rtdb) {
              try {
                await updatePresence(rtdb, ip, page);
                const watching = await broadcastLiveUpdate(rtdb);
                socket.emit('analytics:heartbeated', { success: true, watching });
              } catch (err) {
                logger.error('Failed to update presence during heartbeat:', err.message);
                socket.emit('analytics:heartbeated', { success: true, watching: 0 });
              }
            }
          } catch (error) {
            logger.error('❌ Heartbeat via socket failed:', error.message);
            socket.emit('analytics:error', { message: 'Heartbeat failed' });
          }
        });

        socket.on('analytics:admin-join', async () => {
          analyticsAdmins.add(socket.id);
          const db = getFirestore();
          if (db && rtdb) {
            const stats = await broadcastStatsUpdate(db, rtdb);
            if (stats) {
              socket.emit('analytics:stats-update', stats);
            }
          }
        });

        socket.on('analytics:admin-leave', () => {
          analyticsAdmins.delete(socket.id);
        });

        socket.on('analytics:request-stats', async () => {
          const db = getFirestore();
          if (db && rtdb) {
            const stats = await broadcastStatsUpdate(db, rtdb);
            if (stats) {
              socket.emit('analytics:stats-update', stats);
            }
          }
        });

        socket.on('join-room', (roomId, userId) => {
            socket.join(roomId);
            socket.to(roomId).emit('user-connected', userId);
        });

        socket.on('join-request', ({ roomId, userId, name, email }) => {
            socket.join(roomId);
            io.to(roomId).emit('join-request', { userId, name, email });
        });

        socket.on('admin-allow-user', ({ roomId, userId }) => {
            io.to(roomId).emit('user-allowed', userId);
        });

        socket.on('offer', (payload) => {
            io.to(payload.target).emit('offer', { caller: payload.caller, offer: payload.offer });
        });

        socket.on('answer', (payload) => {
            io.to(payload.target).emit('answer', { caller: socket.id, answer: payload.answer });
        });

        socket.on('ice-candidate', (payload) => {
            io.to(payload.target).emit('ice-candidate', { caller: payload.caller || socket.id, candidate: payload.candidate });
        });

        socket.on('admin-mute-user', ({ roomId, userId, mute }) => {
            io.to(roomId).emit('mute-instruction', { userId, mute });
        });

        socket.on('admin-kick-user', ({ roomId, userId }) => {
            io.to(roomId).emit('user-kicked', userId);
        });

        socket.on('update-notes', ({ roomId, notes }) => {
            socket.to(roomId).emit('notes-update', { userId: socket.id, notes });
        });

        socket.on('start-screen-share', (roomId) => {
            socket.to(roomId).emit('screen-share-started', socket.id);
        });

        socket.on('stop-screen-share', (roomId) => {
            socket.to(roomId).emit('screen-share-stopped', socket.id);
        });

        socket.on('live-meeting-start', ({ roomId }) => {
            socket.data.liveMeetingRoom = roomId;
            io.emit('live-meeting-update', { active: true, roomId });
        });

        socket.on('live-meeting-end', () => {
            io.emit('live-meeting-update', { active: false, roomId: null });
        });

        socket.on('disconnect', async () => {
            logger.info(`🚪 Socket disconnected: ${socket.id}`);
            analyticsAdmins.delete(socket.id);
            
            if (liveByIp.has(ip)) {
              const entry = liveByIp.get(ip);
              entry.socketIds.delete(socket.id);
              if (entry.socketIds.size === 0) {
                liveByIp.delete(ip);
                if (rtdb) {
                  try {
                    const safeIp = sanitizePath(ip);
                    await rtdb.ref(`presence/${safeIp}`).remove();
                    await broadcastLiveUpdate(rtdb);
                  } catch (err) {
                    logger.error('Failed to remove presence on disconnect:', err.message);
                  }
                }
              }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};

module.exports = { initSocket, getIO };
