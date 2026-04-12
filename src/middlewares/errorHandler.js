const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Joi validation error
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.details.map(detail => detail.message)
    });
  }

  // Nodemailer error
  if (err.name === 'EmailError') {
    return res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Something went wrong!' : message
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
