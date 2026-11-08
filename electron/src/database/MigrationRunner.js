const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async runMigrations() {
    const db = await this.dbManager.init();

    db.exec(`
      CREATE TABLE IF NOT EXISTS system_schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedVersions = new Set(
      db.prepare('SELECT version FROM system_schema_migrations').all().map((row) => row.version)
    );
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) return [];

    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    const appliedNow = [];

    for (const file of files) {
      if (appliedVersions.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const applyMigration = db.transaction(() => {
        db.exec(sql);
        db.prepare(
          'INSERT INTO system_schema_migrations (version, applied_at) VALUES (?, ?)'
        ).run(file, new Date().toISOString());
      });

      applyMigration();
      appliedNow.push(file);
      console.log(`Successfully applied migration: ${file}`);
    }

    return appliedNow;
  }
}

module.exports = MigrationRunner;
