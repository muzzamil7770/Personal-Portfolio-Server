const express = require('express');
const router = express.Router();
const { hireController, getHires, getHireById, updateHire, deleteHire } = require('../controllers/hire.controller');
const auth = require('../middlewares/authMiddleware');

// Public — form submission
router.post('/', hireController);

// Admin CRUD (protected)
router.get('/', auth, getHires);
router.get('/:id', auth, getHireById);
router.put('/:id', auth, updateHire);
router.delete('/:id', auth, deleteHire);

module.exports = router;
