'use strict';
// 优先 better-sqlite3；不可用时（如沙箱）回退到 node:sqlite 的薄封装。
function open(file) {
  let db;
  try {
    const BetterSqlite3 = require('better-sqlite3');
    db = new BetterSqlite3(file);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    const { DatabaseSync } = require('node:sqlite');
    const raw = new DatabaseSync(file);
    db = {
      raw,
      exec: (sql) => raw.exec(sql),
      prepare: (sql) => raw.prepare(sql),
      close: () => raw.close(),
      pragma(str) {
        const rows = raw.prepare(`PRAGMA ${str}`).all();
        return rows;
      },
      transaction(fn) {
        return (...args) => {
          raw.exec('BEGIN');
          try { const r = fn(...args); raw.exec('COMMIT'); return r; }
          catch (err) { raw.exec('ROLLBACK'); throw err; }
        };
      },
    };
  }
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
module.exports = { open };
