const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Email template paths
const TEMPLATE_DIR = path.join(__dirname, '../../templates');

/**
 * Load and compile email template with data
 */
const loadTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace template variables with actual data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      template = template.replace(regex, data[key] || '');
    });
    
    return template;
  } catch (error) {
    logger.error(`❌ Failed to load template ${templateName}:`, error.message);
    throw error;
  }
};

/**
 * Get professional email subject based on template type
 */
const getSubject = (type, data) => {
  const subjects = {
    'contact-notification': `🚀 New Portfolio Inquiry from ${data.name} — ${data.subject}`,
    'contact-thankyou': `✅ Thank You for Reaching Out! — Muhammad Muzzamil`,
    'hire-notification': `💼 [URGENT] New Hire Request: ${data.name} — ${data.budget || 'Budget TBA'}`,
    'hire-thankyou': `🎉 Your Project Request is Received! — Next Steps Inside`
  };
  return subjects[type] || 'Portfolio Contact';
};

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('❌ Email transporter verification failed:', error.message);
    logger.error('Please check your .env file and ensure EMAIL_PASS is set correctly.');
  } else {
    logger.info('✅ Email transporter is ready to send messages');
  }
});

/**
 * Send contact notification to PORTFOLIO OWNER
 */
const sendContactNotification = async (data) => {
  const { name, email, subject, message } = data;

  const now = new Date();
  const htmlContent = loadTemplate('contact-notification', {
    name, email, subject, message,
    timestamp: now.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }),
    year: now.getFullYear()
  });

  const mailOptions = {
    from: `"Muhammad Muzzamil's Portfolio" <${config.email.user}>`,
    to: config.email.user,
    replyTo: email,
    subject: getSubject('contact-notification', { name, subject }),
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`✅ Contact notification sent to ${config.email.user} from ${email}`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to send contact notification:', error);
    throw error;
  }
};

/**
 * Send thank you email to CLIENT
 */
const sendContactThankYou = async (data) => {
  const { name, email, subject, message } = data;

  const now = new Date();
  const htmlContent = loadTemplate('contact-thankyou', {
    name, email, subject, message,
    timestamp: now.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }),
    year: now.getFullYear()
  });

  const mailOptions = {
    from: `"Muhammad Muzzamil" <${config.email.user}>`,
    to: email,
    replyTo: config.email.user,
    subject: getSubject('contact-thankyou', { name }),
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`✅ Thank you email sent to client: ${email}`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to send thank you email:', error);
    throw error;
  }
};

/**
 * Send hire notification to PORTFOLIO OWNER
 */
const sendHireNotification = async (data) => {
  const { name, email, budget, message, services } = data;

  const now = new Date();
  const budgetRow = budget
    ? `<div class="info-row"><span class="info-label">Project Budget</span><span class="info-value highlight">💰 ${budget}</span></div>`
    : '';
  const servicesRow = services
    ? `<div class="info-row"><span class="info-label">Requested Services</span><span class="info-value">${services}</span></div>`
    : '';
  const budgetBadge = budget
    ? `<div style="text-align:center;margin:25px 0;"><span class="urgency-badge">🎯 Budget Confirmed: ${budget}</span></div>`
    : '';

  const htmlContent = loadTemplate('hire-notification', {
    name, email, message,
    budgetRow, servicesRow, budgetBadge,
    timestamp: now.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }),
    year: now.getFullYear()
  });

  const mailOptions = {
    from: `"Muhammad Muzzamil's Portfolio" <${config.email.user}>`,
    to: config.email.user,
    replyTo: email,
    subject: getSubject('hire-notification', { name, budget }),
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`✅ Hire notification sent to ${config.email.user} from ${name}`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to send hire notification:', error);
    throw error;
  }
};

/**
 * Send hire thank you to CLIENT
 */
const sendHireThankYou = async (data) => {
  const { name, email, budget, message, services } = data;

  const now = new Date();
  const budgetRow = budget
    ? `<div class="info-row"><span class="info-label">Project Budget</span><span class="info-value highlight">💰 ${budget}</span></div>`
    : '';
  const servicesRow = services
    ? `<div class="info-row"><span class="info-label">Requested Services</span><span class="info-value">${services}</span></div>`
    : '';

  const htmlContent = loadTemplate('hire-thankyou', {
    name, email, message,
    budgetRow, servicesRow,
    timestamp: now.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }),
    year: now.getFullYear()
  });

  const mailOptions = {
    from: `"Muhammad Muzzamil" <${config.email.user}>`,
    to: email,
    replyTo: config.email.user,
    subject: getSubject('hire-thankyou', { name }),
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`✅ Hire thank you email sent to client: ${email}`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to send hire thank you email:', error);
    throw error;
  }
};

/**
 * Send 2FA verification code email
 */
const send2FAVerification = async (email, code) => {
  const now = new Date();
  const expiry = new Date(now.getTime() + 5 * 60 * 1000);

  // Load professional template
  const htmlContent = loadTemplate('twoFA-verification', {
    code,
    email,
    timestamp: now.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'medium' }),
    expiry: expiry.toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'medium' })
  });

  const mailOptions = {
    from: `"Portfolio Security" <${config.email.user}>`,
    to: email,
    subject: `🔐 Your 2FA Verification Code - ${code}`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`✅ 2FA code sent to: ${email}`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to send 2FA code:', error);
    throw error;
  }
};

module.exports = {
  sendContactNotification,
  sendContactThankYou,
  sendHireNotification,
  sendHireThankYou,
  send2FAVerification
};
