'use strict';
// 用法: node src/import/import_runner.js <v3 JSON 目录> [db 文件，默认 ../data/recruitment_v2.db]
const path = require('path');
const fs = require('fs');
const { open } = require('../database/Database');
const { runMigrations } = require('../database/MigrationRunner');
const { ImportService } = require('./ImportService');

const dir = process.argv[2];
if (!dir) { console.error('请提供 v3 JSON 目录'); process.exit(1); }
const dbFile = process.argv[3] || path.join(__dirname, '..', '..', 'data', 'recruitment_v2.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = open(dbFile);
runMigrations(db);
const t0 = Date.now();
const res = new ImportService(db).importDirectory(dir, { onProgress: (i, n) => console.log(`${i}/${n}`) });
console.log(res, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
db.close();
