'use strict';
// 用法: node src/import/report_warnings.js [db 文件]   —— 汇总最近一批导入的警告，并输出到 data/import_warnings_report.txt
const path = require('path');
const fs = require('fs');
const { open } = require('../database/Database');
const dbFile = process.argv[2] || path.join(__dirname, '..', '..', 'data', 'recruitment_v2.db');
const db = open(dbFile);
const batch = db.prepare('SELECT MAX(id) id FROM candidate_import_batches').get().id;
const out = [];
const log = (s = '') => { out.push(s); console.log(s); };

log(`批次 #${batch}`);
const byCode = db.prepare(`SELECT error_code, severity, COUNT(*) n FROM candidate_import_errors WHERE batch_id=? GROUP BY 1,2 ORDER BY n DESC`).all(batch);
for (const r of byCode) log(`${r.severity}\t${r.error_code}\t${r.n}`);

for (const r of byCode) {
  log(`\n=== ${r.error_code}（前 15 条样例）===`);
  for (const e of db.prepare(`SELECT file_name, message FROM candidate_import_errors WHERE batch_id=? AND error_code=? LIMIT 15`).all(batch, r.error_code))
    log(`${e.file_name}\t${e.message}`);
}

log('\n=== 冲突联系方式涉及的类型分布 ===');
for (const e of db.prepare(`SELECT json_extract(detail_json,'$.type') t, COUNT(*) n FROM candidate_import_errors WHERE batch_id=? AND error_code='contact_conflict' GROUP BY 1`).all(batch))
  log(`${e.t}\t${e.n}`);

log('\n=== 无主手机 / 无主邮箱的候选人数 ===');
log(JSON.stringify(db.prepare(`SELECT SUM(primary_phone='') no_phone, SUM(primary_email='') no_email, COUNT(*) total FROM candidate_profiles`).get()));

log('\n=== 无主手机样例（前 10）===');
for (const r of db.prepare(`SELECT p.id, p.full_name, p.record_id, (SELECT group_concat(contact_type||':'||contact_value, ' | ') FROM candidate_contacts WHERE candidate_id=p.id) cs FROM candidate_profiles p WHERE primary_phone='' LIMIT 10`).all())
  log(`#${r.id}\t${r.full_name}\t${r.record_id}\t${r.cs || '(无任何联系方式)'}`);
log('\n=== 无主手机且无主邮箱 ===');
log(String(db.prepare(`SELECT COUNT(*) n FROM candidate_profiles WHERE primary_phone='' AND primary_email=''`).get().n));

fs.writeFileSync(path.join(path.dirname(dbFile), 'import_warnings_report.txt'), out.join('\n'), 'utf8');
db.close();
