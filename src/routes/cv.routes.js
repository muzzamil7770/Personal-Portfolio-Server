const express = require('express');
const router = express.Router();
const { getCV, getCVInfo, getCVBase64 } = require('../controllers/cv.controller');

// Public — anyone can view/download
router.get('/', getCV);
router.get('/info', getCVInfo);
router.get('/base64', getCVBase64);

module.exports = router;
