const fs = require('fs');
const path = require('path');

// Path to the CV PDF file on the server
const CV_FILE_PATH = path.join(__dirname, '../assets/MUZZAMIL Full Stack Web Developer.pdf');

/**
 * GET /api/cv
 * Streams the CV PDF as base64 chunks with progress tracking.
 * Supports both full download and view (inline) modes.
 * Query param: ?download=true forces attachment download
 */
const getCV = (req, res) => {
  // Check if CV file exists
  if (!fs.existsSync(CV_FILE_PATH)) {
    return res.status(404).json({
      success: false,
      message: 'CV file not found on server.'
    });
  }

  try {
    const fileStat = fs.statSync(CV_FILE_PATH);
    const fileSize = fileStat.size;
    const isDownload = req.query.download === 'true';

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('X-File-Size', fileSize);

    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="MUZZAMIL_Full_Stack_Web_Developer.pdf"`);
    } else {
      res.setHeader('Content-Disposition', 'inline; filename="MUZZAMIL_Full_Stack_Web_Developer.pdf"');
    }

    // Stream the file
    const readStream = fs.createReadStream(CV_FILE_PATH);

    readStream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to read CV file.' });
      }
    });

    readStream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error serving CV file.' });
  }
};

/**
 * GET /api/cv/info
 * Returns metadata about the CV file without streaming the full content.
 */
const getCVInfo = (req, res) => {
  if (!fs.existsSync(CV_FILE_PATH)) {
    return res.status(404).json({
      success: false,
      message: 'CV file not found on server.'
    });
  }

  try {
    const stat = fs.statSync(CV_FILE_PATH);
    res.json({
      success: true,
      data: {
        fileName: 'MUZZAMIL Full Stack Web Developer.pdf',
        fileSize: stat.size,
        fileSizeFormatted: formatFileSize(stat.size),
        lastModified: stat.mtime,
        mimeType: 'application/pdf'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error reading CV file info.' });
  }
};

/**
 * GET /api/cv/base64
 * Returns the CV as a base64-encoded string with chunked progress events.
 * This endpoint sends Server-Sent Events (SSE) for real-time progress.
 */
const getCVBase64 = (req, res) => {
  if (!fs.existsSync(CV_FILE_PATH)) {
    return res.status(404).json({
      success: false,
      message: 'CV file not found on server.'
    });
  }

  try {
    const stat = fs.statSync(CV_FILE_PATH);
    const fileSize = stat.size;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const readStream = fs.createReadStream(CV_FILE_PATH, { highWaterMark: 64 * 1024 }); // 64KB chunks
    let bytesReceived = 0;
    const chunks = [];

    readStream.on('data', (chunk) => {
      bytesReceived += chunk.length;
      chunks.push(chunk);

      const progress = Math.round((bytesReceived / fileSize) * 100);

      // Send progress event
      res.write(`data: ${JSON.stringify({ type: 'progress', percent: progress, loaded: bytesReceived, total: fileSize })}\n\n`);
    });

    readStream.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);
      const base64 = fullBuffer.toString('base64');

      // Send complete event with base64
      res.write(`data: ${JSON.stringify({ type: 'complete', base64, percent: 100, loaded: bytesReceived, total: fileSize })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    readStream.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to read file' })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      readStream.destroy();
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Server error' })}\n\n`);
    res.end();
  }
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

module.exports = { getCV, getCVInfo, getCVBase64 };
