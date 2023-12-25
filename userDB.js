const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'users.json');

function readDatabase() {
  const data = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(data);
}

function writeDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  readDatabase,
  writeDatabase
};
