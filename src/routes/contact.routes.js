const express = require('express');
const router = express.Router();
const { contactController, getContacts, getContactById, updateContact, deleteContact } = require('../controllers/contact.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public — form submission
router.post('/', contactController);

// Admin CRUD (protected)
router.get('/', verifyToken, getContacts);
router.get('/:id', verifyToken, getContactById);
router.put('/:id', verifyToken, updateContact);
router.delete('/:id', verifyToken, deleteContact);

module.exports = router;
