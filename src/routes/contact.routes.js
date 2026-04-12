const express = require('express');
const router = express.Router();
const { contactController, getContacts, getContactById, updateContact, deleteContact } = require('../controllers/contact.controller');
const auth = require('../middlewares/authMiddleware');

// Public — form submission
router.post('/', contactController);

// Admin CRUD (protected)
router.get('/', auth, getContacts);
router.get('/:id', auth, getContactById);
router.put('/:id', auth, updateContact);
router.delete('/:id', auth, deleteContact);

module.exports = router;
