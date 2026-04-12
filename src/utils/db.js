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

module.exports = {
  saveContact, getAllContacts, getContactById, updateContact, deleteContact,
  saveHire, getAllHires, getHireById, updateHire, deleteHire
};
