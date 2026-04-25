const express = require('express');
const router = express.Router();
const { scheduleMeeting, checkAvailability, getMeetings, getPublicMeetings } = require('../controllers/meeting.controller');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rate limiter for meeting scheduling
const meetingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many meeting requests from this IP, please try again after an hour.'
    }
});

router.post('/schedule', meetingLimiter, scheduleMeeting);
router.get('/check-availability', checkAvailability);
router.get('/public', getPublicMeetings);
router.get('/', verifyToken, getMeetings);

module.exports = router;
