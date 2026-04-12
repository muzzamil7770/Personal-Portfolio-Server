const { hireSchema } = require('../middlewares/validator');
const { sendHireNotification, sendHireThankYou } = require('../services/email.service');
const { readDb, writeDb } = require('../utils/db');
const logger = require('../utils/logger');

const hireController = async (req, res, next) => {
  try {
    const { error, value } = hireSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(d => d.message)
      });
    }

    const { name, email, budget, message, services } = value;

    // Save to db.json
    const db = readDb();
    const record = {
      id: Date.now().toString(),
      name, email, budget: budget || '', message, services: services || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.hires.push(record);
    writeDb(db);
    logger.info(`💾 Hire request saved to db: ${record.id}`);

    // Send emails (non-blocking)
    try {
      await Promise.all([
        sendHireNotification({ name, email, budget, message, services }),
        sendHireThankYou({ name, email, budget, message, services })
      ]);
      logger.info(`✅ Hire emails sent successfully`);
    } catch (emailError) {
      logger.error('⚠️ Email sending failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: "Hire request sent successfully! I'll review your project and get back to you within 24 hours.",
      data: record
    });

  } catch (error) {
    logger.error('❌ Hire form submission failed:', error);
    next(error);
  }
};

// GET all hires
const getHires = (req, res) => {
  const { hires } = readDb();
  res.json({ success: true, data: hires });
};

// GET hire by id
const getHireById = (req, res) => {
  const { hires } = readDb();
  const record = hires.find(h => h.id === req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Hire request not found' });
  res.json({ success: true, data: record });
};

// PUT update hire by id
const updateHire = (req, res) => {
  const db = readDb();
  const index = db.hires.findIndex(h => h.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Hire request not found' });
  db.hires[index] = { ...db.hires[index], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ success: true, data: db.hires[index] });
};

// DELETE hire by id
const deleteHire = (req, res) => {
  const db = readDb();
  const index = db.hires.findIndex(h => h.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Hire request not found' });
  db.hires.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: 'Hire request deleted successfully' });
};

module.exports = { hireController, getHires, getHireById, updateHire, deleteHire };
