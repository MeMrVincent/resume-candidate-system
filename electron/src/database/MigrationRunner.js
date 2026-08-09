const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async runMigrations() {
    const db = await this.dbManager.init();

    db.run(`
      CREATE TABLE IF NOT EXISTS system_schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const res = db.exec('SELECT version FROM system_schema_migrations');
    const appliedVersions = new Set();
    if (res.length > 0 && res[0].values) {
      res[0].values.forEach((row) => appliedVersions.add(row[0]));
    }

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let migrationApplied = false;

    for (const file of files) {
      const version = file;
      if (!appliedVersions.has(version)) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        db.run('BEGIN TRANSACTION;');
        try {
          db.run(sql);
          db.run('INSERT INTO system_schema_migrations (version, applied_at) VALUES (?, ?);', [
            version,
            new Date().toISOString(),
          ]);
          db.run('COMMIT;');
          migrationApplied = true;
          console.log(`Successfully applied migration: ${version}`);
        } catch (err) {
          db.run('ROLLBACK;');
          throw err;
        }
      }
    }

    if (migrationApplied) {
      this.dbManager.save();
    }
  }
}

module.exports = MigrationRunner;
