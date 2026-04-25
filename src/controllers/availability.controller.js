const { saveAvailability, getAllAvailability, deleteAvailability } = require('../utils/db');
const logger = require('../utils/logger');

const getAvailability = async (req, res, next) => {
    try {
        const data = await getAllAvailability();
        res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error('❌ Failed to fetch availability:', error);
        next(error);
    }
};

const setAvailability = async (req, res, next) => {
    try {
        const { date, slots } = req.body; // slots: string[] e.g. ["09:00", "10:00"]
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const record = {
            id: date,
            date,
            slots: slots || [],
            updatedAt: new Date().toISOString()
        };

        await saveAvailability(record);

        // Emit realtime update
        try {
            const { getIO } = require('../socket');
            getIO().emit('calendar-update', { type: 'availability', data: record });
        } catch (ioErr) {
            logger.warn('Socket emit failed:', ioErr.message);
        }

        res.status(200).json({ success: true, message: 'Availability updated', data: record });
    } catch (error) {
        logger.error('❌ Failed to set availability:', error);
        next(error);
    }
};

const removeAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteAvailability(id);
        res.status(200).json({ success: true, message: 'Availability deleted' });
    } catch (error) {
        logger.error('❌ Failed to delete availability:', error);
        next(error);
    }
};

module.exports = {
    getAvailability,
    setAvailability,
    removeAvailability
};
