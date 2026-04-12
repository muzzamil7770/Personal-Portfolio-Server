const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { track, live, stats } = require('../controllers/analytics.controller');

router.post('/track', track);       // public — called on every page load
router.get('/live', live);          // public — watching count only
router.get('/stats', auth, stats);  // admin only — full stats + logs

module.exports = router;
