const express = require('express');
const router = express.Router();
const { hireController, getHires, getHireById, updateHire, deleteHire } = require('../controllers/hire.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public — form submission
router.post('/', hireController);

// Admin CRUD (protected)
router.get('/', verifyToken, getHires);
router.get('/:id', verifyToken, getHireById);
router.put('/:id', verifyToken, updateHire);
router.delete('/:id', verifyToken, deleteHire);

module.exports = router;
