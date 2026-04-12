const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/db.json');

const readDb = () => {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeDb = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

module.exports = { readDb, writeDb };
