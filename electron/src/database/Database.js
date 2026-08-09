const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath || path.resolve(__dirname, '../../../../data/recruitment.db');
    this.db = null;
    this.SQL = null;
  }

  async init() {
    if (!this.SQL) {
      this.SQL = await initSqlJs();
    }

    if (!this.db) {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
      } else {
        this.db = new this.SQL.Database();
      }
    }
    return this.db;
  }

  getDb() {
    return this.db;
  }

  save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = DatabaseManager;
