const { hireSchema } = require('../middlewares/validator');
const { sendHireNotification, sendHireThankYou } = require('../services/email.service');
const { saveHire, getAllHires, getHireById, updateHire, deleteHire, saveNotification } = require('../utils/db');
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
    const record = {
      id: Date.now().toString(),
      name, email,
      budget: budget || '',
      message,
      services: services || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await saveHire(record);
    logger.info(`💾 Hire request saved to Firestore: ${record.id}`);

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    // Socket emit + Persistent notification
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      io.emit('new-notification', {
        type: 'hire',
        title: '💼 New Hire Request',
        message: `Inquiry from ${name} (${email}) - Budget: ${budget}`,
        data: record,
        time: new Date().toISOString()
      });

      await saveNotification({
        clientIp,
        type: 'hire',
        title: '💼 Inquiry Received',
        message: `Your project inquiry regarding "${services}" was received.`,
        data: record,
        status: 'success'
      });
    } catch (ioErr) {
      logger.warn('Socket/Notification failed:', ioErr.message);
    }

    try {
      await Promise.all([
        sendHireNotification({ name, email, budget, message, services }),
        sendHireThankYou({ name, email, budget, message, services })
      ]);
      logger.info('✅ Hire emails sent successfully');
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

const getHires = async (req, res, next) => {
  try {
    const hires = await getAllHires();
    res.json({ success: true, data: hires });
  } catch (error) {
    next(error);
  }
};

const getHireByIdHandler = async (req, res, next) => {
  try {
    const record = await getHireById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Hire request not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

const updateHireHandler = async (req, res, next) => {
  try {
    const updated = await updateHire(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteHireHandler = async (req, res, next) => {
  try {
    await deleteHire(req.params.id);
    res.json({ success: true, message: 'Hire request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  hireController,
  getHires,
  getHireById: getHireByIdHandler,
  updateHire: updateHireHandler,
  deleteHire: deleteHireHandler
};
