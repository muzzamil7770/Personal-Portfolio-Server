const admin = require('firebase-admin');
const logger = require('./logger');

let db = null;
let rtdb = null;

const initFirebase = () => {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    rtdb = admin.database();
    logger.info('✅ Firebase already initialized — reusing existing instance');
    return;
  }

  try {
    // Validate required env vars
    if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'your-project-id') {
      logger.warn('⚠️  Firebase not configured properly in .env - skipping initialization');
      logger.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, etc. in your .env file');
      return; // Don't throw, just skip
    }

    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    db = admin.firestore();
    rtdb = admin.database();

    // Clean up stale presence entries every 2 minutes
    const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
    setInterval(async () => {
      try {
        const snap = await rtdb.ref('presence').get();
        if (!snap.exists()) return;
        const cutoff = Date.now() - SESSION_TIMEOUT_MS;
        const stale = Object.entries(snap.val()).filter(([, s]) => s.lastSeen < cutoff);
        await Promise.all(stale.map(([id]) => rtdb.ref(`presence/${id}`).remove()));
        if (stale.length) logger.info(`🧹 Removed ${stale.length} stale presence entries`);
      } catch (e) { logger.error('Presence cleanup error:', e.message); }
    }, 2 * 60 * 1000);

    logger.info('✅ Firebase initialized — Firestore + Realtime DB ready');
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error.message);
    // Don't throw - let the app continue without Firebase
    logger.warn('⚠️  App will continue running but Firebase features will be disabled');
  }
};

const getFirestore = () => {
  if (!db) {
    logger.warn('⚠️  Firestore not available - Firebase initialization may have failed');
    return null;
  }
  return db;
};

const getRTDB = () => {
  if (!rtdb) {
    logger.warn('⚠️  RTDB not available - Firebase initialization may have failed');
    return null;
  }
  return rtdb;
};

module.exports = { initFirebase, getFirestore, getRTDB };
