'use strict';
// 加 --strict 为严格模式：有警告的文件不写库 | Add --strict for strict mode: files with warnings are not written | --strict を付けると厳格モード：警告のあるファイルは書き込まない
// 用法: node src/import_runner.js <v3 JSON 目录> [db 文件，默认 ../data/recruitment_v2.db] | Usage: node src/import_runner.js <v3 JSON dir> [db file, default ../data/recruitment_v2.db] | 使い方: node src/import_runner.js <v3 JSON ディレクトリ> [DB ファイル。既定 ../data/recruitment_v2.db]
const path = require('path');
const { getDatabasePath } = require('./database/DatabasePath');
const fs = require('fs');
const { openSqliteDatabase } = require('./database/SqliteDatabase');
const { applyPendingMigrations } = require('./database/MigrationRunner');
const { CandidateImportService } = require('./services/CandidateImportService');

const isStrictMode = process.argv.includes('--strict');
const positionalArgs = process.argv.slice(2).filter(arg => arg !== '--strict');
const dir = positionalArgs[0];
if (!dir) { console.error('请提供 v3 JSON 目录'); process.exit(1); }
const dbFile = positionalArgs[1] || getDatabasePath(null, path.join(__dirname, '..'));
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = openSqliteDatabase(dbFile);
applyPendingMigrations(db);
const t0 = Date.now();
const res = new CandidateImportService(db).importResumeDirectory(dir, { strictMode: isStrictMode, onProgress: (i, n) => console.log(`${i}/${n}`) });
console.log(res, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
db.close();
