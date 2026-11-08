const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor(dbPath) {
    if (!dbPath) {
      throw new Error('Database path is required');
    }

    this.dbPath = path.resolve(dbPath);
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath, { timeout: 5000 });
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');

    return this.db;
  }

  getDb() {
    if (!this.db) throw new Error('Database has not been initialized');
    return this.db;
  }

  // 保持与现有调用者的兼容性。原生 SQLite 会自动持久化每个已提交的事务，无需全库导出。
  // EN: Kept for compatibility with existing callers. Native SQLite persists each committed transaction; no full-database export is required.
  // JA: 既存の呼び出し元との互換性のために保持。ネイティブ SQLite はコミットされた各トランザクションを自動永続化するため、全DBエクスポートは不要です。
  save() {
    if (this.db) this.db.pragma('wal_checkpoint(PASSIVE)');
  }

  async backup(destinationPath) {
    if (!this.db) throw new Error('Database has not been initialized');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    await this.db.backup(destinationPath);
    return destinationPath;
  }

  close() {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }
}

module.exports = DatabaseManager;
