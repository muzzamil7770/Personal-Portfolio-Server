const { contactSchema } = require('../middlewares/validator');
const { sendContactNotification, sendContactThankYou } = require('../services/email.service');
const { readDb, writeDb } = require('../utils/db');
const logger = require('../utils/logger');

const contactController = async (req, res, next) => {
  try {
    const { error, value } = contactSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(d => d.message)
      });
    }

    const { name, email, subject, message } = value;

    // Save to db.json
    const db = readDb();
    const record = {
      id: Date.now().toString(),
      name, email, subject, message,
      status: 'unread',
      createdAt: new Date().toISOString()
    };
    db.contacts.push(record);
    writeDb(db);
    logger.info(`💾 Contact saved to db: ${record.id}`);

    // Send emails (non-blocking)
    try {
      await Promise.all([
        sendContactNotification({ name, email, subject, message }),
        sendContactThankYou({ name, email, subject, message })
      ]);
      logger.info(`✅ Contact emails sent successfully`);
    } catch (emailError) {
      logger.error('⚠️ Email sending failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully! I'll get back to you within 24 hours.",
      data: record
    });

  } catch (error) {
    logger.error('❌ Contact form submission failed:', error);
    next(error);
  }
};

// GET all contacts
const getContacts = (req, res) => {
  const { contacts } = readDb();
  res.json({ success: true, data: contacts });
};

// GET contact by id
const getContactById = (req, res) => {
  const { contacts } = readDb();
  const record = contacts.find(c => c.id === req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Contact not found' });
  res.json({ success: true, data: record });
};

// PUT update contact by id
const updateContact = (req, res) => {
  const db = readDb();
  const index = db.contacts.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Contact not found' });
  db.contacts[index] = { ...db.contacts[index], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ success: true, data: db.contacts[index] });
};

// DELETE contact by id
const deleteContact = (req, res) => {
  const db = readDb();
  const index = db.contacts.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Contact not found' });
  db.contacts.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: 'Contact deleted successfully' });
};

module.exports = { contactController, getContacts, getContactById, updateContact, deleteContact };
