const express = require('express');
const router = express.Router();
const { scheduleMeeting, checkAvailability, getMeetings, getPublicMeetings } = require('../controllers/meeting.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/schedule', scheduleMeeting);
router.get('/check-availability', checkAvailability);
router.get('/public', getPublicMeetings);
router.get('/', verifyToken, getMeetings);

module.exports = router;
