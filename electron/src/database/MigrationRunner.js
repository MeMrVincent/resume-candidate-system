'use strict';
const fs = require("fs");
const path = require("path");

/**
 * @description 按文件名顺序执行 migrations 目录下尚未执行的 .sql 脚本，每个脚本一个事务。
 * Runs the not-yet-applied .sql scripts in the migrations directory in file-name order, one transaction per script.
 * migrations ディレクトリ内の未実行の .sql スクリプトをファイル名順に実行する。スクリプトごとに 1 トランザクション。
 * @param {object} database 已打开的数据库 | An opened database | 開いているデータベース
 * @param {string} migrationsDirectoryPath 迁移脚本目录，默认为同级 migrations | Migration scripts directory, defaults to the sibling migrations folder | マイグレーションスクリプトのディレクトリ。既定は同階層の migrations
 * @returns {string[]} 本次新执行的脚本文件名 | File names of the scripts applied this time | 今回新たに実行したスクリプトのファイル名
 */
function applyPendingMigrations(database, migrationsDirectoryPath = path.join(__dirname, "migrations")) {
  database.exec(`CREATE TABLE IF NOT EXISTS system_schema_migrations (
    version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const appliedVersions = new Set(
    database.prepare("SELECT version FROM system_schema_migrations").all().map(row => row.version)
  );
  const migrationFileNames = fs.readdirSync(migrationsDirectoryPath).filter(fileName => fileName.endsWith(".sql")).sort();
  const newlyAppliedFileNames = [];

  for (const migrationFileName of migrationFileNames) {
    if (appliedVersions.has(migrationFileName)) continue;
    const migrationSql = fs.readFileSync(path.join(migrationsDirectoryPath, migrationFileName), "utf8");
    database.exec("BEGIN");
    try {
      database.exec(migrationSql);
      database
        .prepare("INSERT INTO system_schema_migrations(version, applied_at) VALUES (?, ?)")
        .run(migrationFileName, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw new Error(`迁移脚本 ${migrationFileName} 执行失败：${error.message}`);
    }
    newlyAppliedFileNames.push(migrationFileName);
  }
  return newlyAppliedFileNames;
}

module.exports = { applyPendingMigrations };
