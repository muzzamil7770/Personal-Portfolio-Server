const { meetingSchema } = require('../middlewares/validator');
const { sendMeetingNotification, sendMeetingThankYou } = require('../services/email.service');
const { saveMeeting, getMeetingByDateTime, getMeetingsByDateAndIP, getAllMeetings, saveNotification } = require('../utils/db');
const logger = require('../utils/logger');

// ── Helper: resolve client IP ─────────────────────────────────────────────────
const getClientIp = (req) => {
    return (
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        'unknown'
    );
};

// ── POST /api/meetings ─────────────────────────────────────────────────────────
const scheduleMeeting = async (req, res, next) => {
    try {
        const { error, value } = meetingSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: error.details.map(d => d.message)
            });
        }

        const { name, email, date, time, topic } = value;
        const clientIp = getClientIp(req);

        // 1. Weekend check (Mon–Fri only)
        const selectedDate = new Date(date);
        const day = selectedDate.getDay();
        if (day === 0 || day === 6) {
            return res.status(400).json({
                success: false,
                message: 'Meetings are only available on weekdays (Mon–Fri).'
            });
        }

        // 2. Check if the exact slot is already booked
        const existing = await getMeetingByDateTime(date, time);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'This date and time is not available. Please select another slot.'
            });
        }

        // 3. Enforce max-2-meetings-per-day-per-IP rule
        const todayBookings = await getMeetingsByDateAndIP(date, clientIp);
        if (todayBookings.length >= 2) {
            logger.warn(`🚫 IP ${clientIp} exceeded daily meeting limit on ${date}`);
            return res.status(429).json({
                success: false,
                message: 'You have already requested 2 meetings on this date. Please choose a different day.'
            });
        }

        const record = {
            id: Date.now().toString(),
            name, email, date, time, topic,
            clientIp,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };

        // 4. Save to Firestore
        await saveMeeting(record);
        logger.info(`💾 Meeting saved: ${record.id} | IP: ${clientIp}`);

        // 5. Emit real-time calendar update + notification
        try {
            const { getIO } = require('../socket');
            const io = getIO();
            io.emit('calendar-update', { type: 'meeting', data: record });
            io.emit('new-notification', {
                type: 'meeting',
                title: '📅 New Meeting Request',
                message: `${name} (${email}) scheduled a meeting on ${date} at ${time}.`,
                data: record,
                time: new Date().toISOString()
            });

            // Persist to history by IP
            await saveNotification({
                clientIp,
                type: 'meeting',
                title: '📅 Meeting Scheduled',
                message: `You scheduled a meeting for ${date} at ${time}.`,
                data: record,
                status: 'success'
            });
        } catch (ioErr) {
            logger.warn('Socket emit failed:', ioErr.message);
        }

        // 6. Send confirmation emails (non-blocking)
        try {
            await Promise.all([
                sendMeetingNotification({ name, email, date, time, topic }),
                sendMeetingThankYou({ name, email, date, time, topic })
            ]);
            logger.info('✅ Meeting emails sent successfully');
        } catch (emailError) {
            logger.error('⚠️ Meeting email sending failed:', emailError.message);
        }

        res.status(200).json({
            success: true,
            message: 'Meeting scheduled successfully! Check your email for details.',
            data: record
        });

    } catch (error) {
        logger.error('❌ Meeting scheduling failed:', error);
        next(error);
    }
};

// ── GET /api/meetings/check ────────────────────────────────────────────────────
const checkAvailability = async (req, res, next) => {
    try {
        const { date, time } = req.query;
        if (!date || !time) {
            return res.status(400).json({ success: false, message: 'Date and time are required' });
        }

        // Weekend check
        const selectedDate = new Date(date);
        const day = selectedDate.getDay();
        if (day === 0 || day === 6) {
            return res.json({ success: true, available: false, message: 'Weekends are not available' });
        }

        const existing = await getMeetingByDateTime(date, time);
        if (existing) {
            return res.json({ success: true, available: false, message: 'This slot is already booked' });
        }

        res.json({ success: true, available: true, message: 'Date and time is available' });
    } catch (error) {
        next(error);
    }
};

// ── GET /api/meetings (Admin - Full Data) ────────────────────────────────────
const getMeetings = async (req, res, next) => {
    try {
        const meetings = await getAllMeetings();
        res.json({ success: true, data: meetings });
    } catch (error) {
        next(error);
    }
};

// ── GET /api/meetings/public (Public - Slots Only) ────────────────────────────
const getPublicMeetings = async (req, res, next) => {
    try {
        const meetings = await getAllMeetings();
        // Strip sensitive info
        const publicData = meetings.map(m => ({
            date: m.date,
            time: m.time
        }));
        res.json({ success: true, data: publicData });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    scheduleMeeting,
    checkAvailability,
    getMeetings,
    getPublicMeetings
};
