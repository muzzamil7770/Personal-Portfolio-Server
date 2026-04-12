const { Transport } = require('winston');
const { getFirestore } = require('./firebase');

class FirebaseLogTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'FirebaseLogTransport';
    this.level = opts?.level || 'info';
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    const db = getFirestore();
    if (!db) return callback();

    const negativeTs = -Date.now();

    db.collection('Server-Logs').doc(String(negativeTs)).set({
      level: info.level,
      message: info.message,
      timestamp: info.timestamp || new Date().toISOString(),
      service: info.service || 'portfolio-api',
      ...(info.stack ? { stack: info.stack } : {})
    }).catch(() => {});

    callback();
  }
}

module.exports = FirebaseLogTransport;
