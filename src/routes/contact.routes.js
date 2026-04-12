const express = require('express');
const router = express.Router();
const { contactController, getContacts, getContactById, updateContact, deleteContact } = require('../controllers/contact.controller');
const { verifyToken } = require('../middlewares/authMiddleware');
const dailyIpLimit = require('../middlewares/dailyIpLimit');

// Public — form submission (daily IP limit applies in production)
router.post('/', dailyIpLimit, contactController);

// Admin CRUD (protected)
router.get('/', verifyToken, getContacts);
router.get('/:id', verifyToken, getContactById);
router.put('/:id', verifyToken, updateContact);
router.delete('/:id', verifyToken, deleteContact);

module.exports = router;
