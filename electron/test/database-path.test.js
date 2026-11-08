const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  getDatabasePath,
  ensurePackagedDatabase,
} = require('../src/database/DatabasePath');

test('development database is kept in the project data directory', () => {
  const electronDirectory = path.join('E:', 'workspace', 'code', 'electron');
  assert.equal(
    getDatabasePath({ isPackaged: false }, electronDirectory),
    path.resolve(electronDirectory, '..', 'data', 'recruitment.db')
  );
});

test('packaged seed is copied once and never overwrites the formal database', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'recruitment-path-test-'));
  const resourcesPath = path.join(directory, 'resources');
  const seedPath = path.join(resourcesPath, 'seed', 'recruitment.db');
  const databasePath = path.join(directory, 'application', 'data', 'recruitment.db');
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, 'seed-v1');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  ensurePackagedDatabase({ isPackaged: true }, databasePath, resourcesPath);
  assert.equal(fs.readFileSync(databasePath, 'utf8'), 'seed-v1');

  fs.writeFileSync(seedPath, 'seed-v2');
  ensurePackagedDatabase({ isPackaged: true }, databasePath, resourcesPath);
  assert.equal(fs.readFileSync(databasePath, 'utf8'), 'seed-v1');
});
