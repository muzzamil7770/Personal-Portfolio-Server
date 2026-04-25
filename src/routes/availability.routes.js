const express = require('express');
const router = express.Router();
const { getAvailability, setAvailability, removeAvailability } = require('../controllers/availability.controller');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Public route to see what dates/slots are available
router.get('/', getAvailability);

// Admin only routes to set or remove availability
router.post('/', verifyToken, isAdmin, setAvailability);
router.delete('/:id', verifyToken, isAdmin, removeAvailability);

module.exports = router;
