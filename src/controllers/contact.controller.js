const { contactSchema } = require('../middlewares/validator');
const { sendContactNotification, sendContactThankYou } = require('../services/email.service');
const { saveContact, getAllContacts, getContactById, updateContact, deleteContact, saveNotification } = require('../utils/db');
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
    const record = {
      id: Date.now().toString(),
      name, email, subject, message,
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    await saveContact(record);
    logger.info(`💾 Contact saved to Firestore: ${record.id}`);

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    // Socket emit + Persistent notification
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      io.emit('new-notification', {
        type: 'contact',
        title: '✉ New Contact Message',
        message: `Message from ${name} (${email}): ${subject}`,
        data: record,
        time: new Date().toISOString()
      });

      await saveNotification({
        clientIp,
        type: 'contact',
        title: '✉ Message Sent',
        message: `Your message regarding "${subject}" was sent successfully.`,
        data: record,
        status: 'success'
      });
    } catch (ioErr) {
      logger.warn('Socket/Notification failed:', ioErr.message);
    }

    try {
      await Promise.all([
        sendContactNotification({ name, email, subject, message }),
        sendContactThankYou({ name, email, subject, message })
      ]);
      logger.info('✅ Contact emails sent successfully');
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

const getContacts = async (req, res, next) => {
  try {
    const contacts = await getAllContacts();
    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
};

const getContactByIdHandler = async (req, res, next) => {
  try {
    const record = await getContactById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

const updateContactHandler = async (req, res, next) => {
  try {
    const updated = await updateContact(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteContactHandler = async (req, res, next) => {
  try {
    await deleteContact(req.params.id);
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  contactController,
  getContacts,
  getContactById: getContactByIdHandler,
  updateContact: updateContactHandler,
  deleteContact: deleteContactHandler
};
