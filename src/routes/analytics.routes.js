const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { track, heartbeat, live, stats, visitors, history } = require('../controllers/analytics.controller');

router.post('/track', track);          // public — called on every page load
router.post('/heartbeat', heartbeat);  // public — called every 30s to keep session alive
router.get('/live', live);             // public — watching count only
router.get('/visitors', verifyToken, visitors); // admin — filtered visitors with summary
router.get('/history', require('../controllers/analytics.controller').history); // public — fetch history by client IP
router.get('/stats', verifyToken, stats);     // admin only — full stats + logs

module.exports = router;
