const { getFirestore } = require('./firebase');
const logger = require('./logger');

// ── Contacts ──────────────────────────────────────────────────────────────────

const saveContact = async (record) => {
  const db = getFirestore();
  if (!db) {
    logger.warn('⚠️  Skipping contact save - Firebase not available');
    return; // Gracefully skip instead of crashing
  }
  await db.collection('contacts').doc(record.id).set(record);
};

const getAllContacts = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('contacts').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => d.data());
};

const getContactById = async (id) => {
  const db = getFirestore();
  if (!db) return null;
  const doc = await db.collection('contacts').doc(id).get();
  return doc.exists ? doc.data() : null;
};

const updateContact = async (id, updates) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  const { id: _id, createdAt, ...safeUpdates } = updates;
  if (!Object.keys(safeUpdates).length) throw new Error('No valid fields to update');
  await db.collection('contacts').doc(id).update(safeUpdates);
  const doc = await db.collection('contacts').doc(id).get();
  return doc.data();
};

const deleteContact = async (id) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  await db.collection('contacts').doc(id).delete();
};

// ── Hires ─────────────────────────────────────────────────────────────────────

const saveHire = async (record) => {
  const db = getFirestore();
  if (!db) {
    logger.warn('⚠️  Skipping hire save - Firebase not available');
    return;
  }
  await db.collection('hires').doc(record.id).set(record);
};

const getAllHires = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('hires').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => d.data());
};

const getHireById = async (id) => {
  const db = getFirestore();
  if (!db) return null;
  const doc = await db.collection('hires').doc(id).get();
  return doc.exists ? doc.data() : null;
};

const updateHire = async (id, updates) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  const { id: _id, createdAt, ...safeUpdates } = updates;
  if (!Object.keys(safeUpdates).length) throw new Error('No valid fields to update');
  await db.collection('hires').doc(id).update(safeUpdates);
  const doc = await db.collection('hires').doc(id).get();
  return doc.data();
};

const deleteHire = async (id) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  await db.collection('hires').doc(id).delete();
};

// ── Meetings ──────────────────────────────────────────────────────────────────

const saveMeeting = async (record) => {
  const db = getFirestore();
  if (!db) {
    logger.warn('⚠️  Skipping meeting save - Firebase not available');
    return;
  }
  await db.collection('meetings').doc(record.id).set(record);
};

const getAllMeetings = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('meetings').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => d.data());
};

const getMeetingByDateTime = async (date, time) => {
  const db = getFirestore();
  if (!db) return null;
  const snap = await db.collection('meetings')
    .where('date', '==', date)
    .where('time', '==', time)
    .get();
  return snap.empty ? null : snap.docs[0].data();
};

const getMeetingsByDateAndIP = async (date, ip) => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('meetings')
    .where('date', '==', date)
    .where('clientIp', '==', ip)
    .get();
  return snap.docs.map(d => d.data());
};

const updateMeeting = async (id, updates) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  const { id: _id, createdAt, ...safeUpdates } = updates;
  await db.collection('meetings').doc(id).update(safeUpdates);
  const doc = await db.collection('meetings').doc(id).get();
  return doc.data();
};

const deleteMeeting = async (id) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  await db.collection('meetings').doc(id).delete();
};

// ── Availability ──────────────────────────────────────────────────────────────

const saveAvailability = async (record) => {
  const db = getFirestore();
  if (!db) {
    logger.warn('⚠️  Skipping availability save - Firebase not available');
    return;
  }
  // Store by date string e.g. "2024-05-12"
  await db.collection('availability').doc(record.id).set(record);
};

const getAllAvailability = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('availability').get();
  return snap.docs.map(d => d.data());
};

const deleteAvailability = async (id) => {
  const db = getFirestore();
  if (!db) return;
  await db.collection('availability').doc(id).delete();
};

// ── Notifications (History by IP) ─────────────────────────────────────────────

const saveNotification = async (data) => {
  const db = getFirestore();
  if (!db) return;
  await db.collection('notifications').add({
    ...data,
    timestamp: new Date().toISOString()
  });
};

const getNotificationsByIP = async (ip) => {
  const db = getFirestore();
  if (!db) return [];
  // NOTE: Avoid .orderBy() + .where() combo — requires a Firestore composite index.
  // Sort in-memory instead (limit is only 20, so this is trivially fast).
  const snap = await db.collection('notifications')
    .where('clientIp', '==', ip)
    .limit(20)
    .get();
  const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return docs.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
};

// ── Blogs ──────────────────────────────────────────────────────────────────────

const saveBlog = async (record) => {
  const db = getFirestore();
  if (!db) {
    logger.warn('Skipping blog save - Firebase not available');
    return;
  }
  await db.collection('blogs').doc(record.id).set(record);
};

const getAllBlogs = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('blogs').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const getPublishedBlogs = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('blogs')
    .where('status', 'in', ['published'])
    .get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
};

const getScheduledBlogs = async () => {
  const db = getFirestore();
  if (!db) return [];
  const snap = await db.collection('blogs')
    .where('status', '==', 'scheduled')
    .orderBy('scheduledAt', 'asc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const getBlogById = async (id) => {
  const db = getFirestore();
  if (!db) return null;
  const doc = await db.collection('blogs').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const updateBlog = async (id, updates) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  const { id: _id, createdAt, ...safeUpdates } = updates;
  if (!Object.keys(safeUpdates).length) throw new Error('No valid fields to update');
  await db.collection('blogs').doc(id).update(safeUpdates);
  const doc = await db.collection('blogs').doc(id).get();
  return { id: doc.id, ...doc.data() };
};

const deleteBlog = async (id) => {
  const db = getFirestore();
  if (!db) throw new Error('Firebase not available');
  await db.collection('blogs').doc(id).delete();
};

module.exports = {
  saveContact, getAllContacts, getContactById, updateContact, deleteContact,
  saveHire, getAllHires, getHireById, updateHire, deleteHire,
  saveMeeting, getAllMeetings, getMeetingByDateTime, getMeetingsByDateAndIP, updateMeeting, deleteMeeting,
  saveAvailability, getAllAvailability, deleteAvailability,
  saveNotification, getNotificationsByIP,
  saveBlog, getAllBlogs, getPublishedBlogs, getScheduledBlogs, getBlogById, updateBlog, deleteBlog
};
