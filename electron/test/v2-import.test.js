'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { openSqliteDatabase } = require('../src/database/SqliteDatabase');
const { applyPendingMigrations } = require('../src/database/MigrationRunner');
const { CandidateImportService } = require('../src/services/CandidateImportService');
const { parseResumeMergeV3 } = require('../src/candidate/resume/ResumeMergeV3Parser');
const { convertToIsoDate, normalizeMobilePhone } = require('../src/candidate/resume/ValueNormalizers');

const FIX = path.join(__dirname, 'fixtures', 'sample-v3');
const fresh = () => { const db = openSqliteDatabase(':memory:'); applyPendingMigrations(db); return db; };
const one = (db, sql, ...p) => db.prepare(sql).get(...p);
const all = (db, sql, ...p) => db.prepare(sql).all(...p);

test('migrations create schema + system user', () => {
  const db = fresh();
  assert.equal(one(db, 'SELECT username FROM system_users WHERE id=1').username, 'system');
  assert.ok(one(db, "SELECT 1 x FROM sqlite_master WHERE name='v_candidate_stats'"));
});

test('normalize', () => {
  assert.equal(convertToIsoDate('2011年06月01日').isoDate, '2011-06-01');
  assert.equal(convertToIsoDate('2011年06月').isoDate, '2011-06');
  assert.equal(convertToIsoDate('2011/06').isoDate, '2011-06');
  assert.equal(convertToIsoDate('至今').isoDate, '');
  assert.equal(convertToIsoDate('2014-2015学年').isoDate, '2014');
  assert.equal(convertToIsoDate('1996年、1997年').isoDate, '1996');
  assert.equal(convertToIsoDate('2009年12年').isUnrecognized, true);
  assert.equal(normalizeMobilePhone('+86 138-0013-8000'), '13800138000');
});

test('import samples, idempotent re-run', () => {
  const db = fresh(); const svc = new CandidateImportService(db);
  const r1 = svc.importResumeDirectory(FIX);
  assert.equal(r1.created, 10); assert.equal(r1.failed, 0);
  assert.equal(one(db, 'SELECT COUNT(*) c FROM candidate_profiles').c, 10);
  assert.equal(one(db, 'SELECT COUNT(*) c FROM candidate_search_documents').c, 10);
  const r2 = svc.importResumeDirectory(FIX);
  assert.equal(r2.skipped, 10); assert.equal(r2.created, 0);
  assert.equal(one(db, 'SELECT COUNT(*) c FROM candidate_profiles').c, 10);
});

test('primary phone/email unique constraints', () => {
  const db = fresh(); new CandidateImportService(db).importResumeDirectory(FIX);
  const p = one(db, "SELECT primary_phone FROM candidate_profiles WHERE full_name='艾华'");
  assert.equal(p.primary_phone, '13917035118');
  assert.throws(() => db.prepare("UPDATE candidate_profiles SET primary_phone='13917035118' WHERE full_name='艾珂'").run());
  assert.throws(() => db.prepare(`INSERT INTO candidate_contacts (candidate_id, contact_type, contact_value, normalized_value, is_primary, is_shared, created_at, updated_at)
    SELECT id,'mobile','x','13917035118',0,0,'t','t' FROM candidate_profiles WHERE full_name='艾珂'`).run());
  // primary+shared 禁止
  // primary + shared is forbidden
  // 主番号かつ共用は禁止
  assert.throws(() => db.prepare("UPDATE candidate_contacts SET is_shared=1 WHERE is_primary=1").run());
});

test('multilingual: zh primary + jp, lists aligned', () => {
  const db = fresh(); new CandidateImportService(db).importResumeDirectory(FIX);
  const c = one(db, "SELECT id FROM candidate_profiles WHERE full_name='白宇天'");
  const rs = all(db, 'SELECT language_code, is_primary FROM candidate_resumes WHERE candidate_id=? ORDER BY sequence_no', c.id);
  assert.deepEqual(rs.map((r) => r.language_code), ['zh', 'jp']);
  assert.deepEqual(rs.map((r) => r.is_primary), [1, 0]);
  assert.equal(one(db, "SELECT COUNT(*) c FROM candidate_import_errors WHERE error_code='list_misaligned'").c, 0);
  const raw = one(db, 'SELECT raw_text FROM candidate_search_documents WHERE candidate_id=?', c.id).raw_text;
  assert.ok(raw.includes('白宇天') && raw.includes('\n'));
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(raw), 'no uuid in raw_text');
});

test('misaligned multilingual lists produce a warning', () => {
  const json = JSON.parse(fs.readFileSync(path.join(FIX, '白宇天_15618550105.json'), 'utf8'));
  json.structured_data.resumes[1].work_experiences.pop();
  const m = parseResumeMergeV3(json);
  assert.ok(m.warnings.some((w) => w.warningCode === 'list_misaligned'));
});

test('FTS: >=3 chars via trigram, raw_text built from fields', () => {
  const db = fresh(); new CandidateImportService(db).importResumeDirectory(FIX);
  const hit = all(db, "SELECT rowid FROM candidate_search_fts WHERE candidate_search_fts MATCH '\"13917035118\"'");
  assert.equal(hit.length, 1);
  const short = all(db, "SELECT candidate_id FROM candidate_search_documents WHERE raw_text LIKE '%艾华%'");
  assert.ok(short.length >= 1);
});

test('shared/conflicting contact: first come wins, second becomes shared + warning', () => {
  const db = fresh(); const svc = new CandidateImportService(db);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v3-'));
  const base = JSON.parse(fs.readFileSync(path.join(FIX, '艾华_13917035118.json'), 'utf8'));
  const a = JSON.parse(JSON.stringify(base));
  const b = JSON.parse(JSON.stringify(base));
  b.record_id = 'merge-v3-other'; b.merge_info.primary_phone = '13900000000'; b.merge_info.primary_email = 'b@x.com';
  // 与 a 的主号冲突
  // Conflicts with a's primary number
  // a の主番号と競合する
  b.merge_info.other_phones = ['13917035118'];
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(a));
  fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify(b));
  const r = svc.importResumeDirectory(dir);
  assert.equal(r.created, 2); assert.equal(r.warnings, 1);
  const row = one(db, "SELECT is_shared, is_primary FROM candidate_contacts c JOIN candidate_profiles p ON p.id=c.candidate_id WHERE p.record_id='merge-v3-other' AND normalized_value='13917035118'");
  assert.deepEqual({ ...row }, { is_shared: 1, is_primary: 0 });
  assert.equal(one(db, "SELECT COUNT(*) c FROM candidate_import_errors WHERE error_code='contact_conflict'").c, 1);
});

test('re-import changed content updates in place, no duplicates', () => {
  const db = fresh(); const svc = new CandidateImportService(db);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v3-'));
  const j = JSON.parse(fs.readFileSync(path.join(FIX, '艾华_13917035118.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(j));
  svc.importResumeDirectory(dir);
  j.structured_data.resumes[0].skills_list.push({ skill_name: 'ZZZ新技能', skill_level: '' });
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(j));
  const r = svc.importResumeDirectory(dir);
  assert.equal(r.updated, 1);
  assert.equal(one(db, 'SELECT COUNT(*) c FROM candidate_profiles').c, 1);
  assert.ok(one(db, 'SELECT raw_text FROM candidate_search_documents').raw_text.includes('ZZZ新技能'));
});

test('imported_resume communications excluded from communication_count', () => {
  const db = fresh(); const svc = new CandidateImportService(db);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v3-'));
  const j = JSON.parse(fs.readFileSync(path.join(FIX, '艾华_13917035118.json'), 'utf8'));
  j.structured_data.resumes[0].communication_list = [{ communicate_time: '', communicate_content: '自我评价内容' }];
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(j));
  svc.importResumeDirectory(dir);
  const id = one(db, 'SELECT id FROM candidate_profiles').id;
  assert.equal(one(db, 'SELECT COUNT(*) c FROM candidate_communications WHERE candidate_id=?', id).c, 1);
  assert.equal(one(db, 'SELECT communication_count n FROM v_candidate_stats WHERE candidate_id=?', id).n, 0);
  db.prepare(`INSERT INTO candidate_communications (candidate_id, source_type, communicate_content, created_at, updated_at) VALUES (?,?,?,?,?)`).run(id, 'manual', '电话沟通', 't', 't');
  assert.equal(one(db, 'SELECT communication_count n FROM v_candidate_stats WHERE candidate_id=?', id).n, 1);
});

test('company/position/match flow constraints + stats views', () => {
  const db = fresh(); new CandidateImportService(db).importResumeDirectory(FIX);
  const t = 'ts';
  db.prepare("INSERT INTO company_profiles (company_uuid, company_name, created_at, updated_at) VALUES ('c1','公司A',?,?)").run(t, t);
  db.prepare("INSERT INTO company_profiles (company_uuid, company_name, created_at, updated_at) VALUES ('c2','公司B',?,?)").run(t, t);
  db.prepare("INSERT INTO company_contacts (company_id, contact_name, created_at, updated_at) VALUES (1,'张三',?,?)").run(t, t);
  db.prepare("INSERT INTO company_contacts (company_id, contact_name, created_at, updated_at) VALUES (2,'李四',?,?)").run(t, t);
  const insPos = (cid, ct) => db.prepare("INSERT INTO position_openings (position_uuid, company_id, contact_id, title, guarantee_days, created_at, updated_at) VALUES (?,?,?,?,90,?,?)").run('p' + Math.random(), cid, ct, '岗位', t, t);
  // 对接人必须属于该公司
  // The contact must belong to the company
  // 担当者はその企業に属していなければならない
  assert.throws(() => insPos(1, 2), /belong/);
  insPos(1, 1);
  const ins = (dec, stage) => db.prepare("INSERT INTO position_candidate_matches (position_id, candidate_id, decision, stage, created_at, updated_at) VALUES (1,?,?,?,?,?)");
  // 非 accepted 不能有 stage
  // Only an accepted match may have a stage
  // accepted 以外はステージを持てない
  assert.throws(() => ins().run(1, 'suggested', 'contacting', t, t));
  // accepted 必须有 stage
  // An accepted match must have a stage
  // accepted にはステージが必須
  assert.throws(() => ins().run(1, 'accepted', null, t, t));
  ins().run(1, 'accepted', 'pending_contact', t, t);
  // 唯一(position,candidate)
  // Unique (position, candidate)
  // (position, candidate) は一意
  assert.throws(() => ins().run(1, 'suggested', null, t, t));
  const mh = (from, to) => db.prepare("INSERT INTO position_candidate_history (match_id, change_type, from_value, to_value, created_at) VALUES (1,'stage',?,?,?)").run(from, to, t);
  mh('pending_contact', 'submitted'); mh('submitted', 'hired');
  const s = one(db, 'SELECT recommend_count r, success_count s FROM v_candidate_stats WHERE candidate_id=1');
  assert.deepEqual({ ...s }, { r: 1, s: 1 });
  assert.equal(one(db, 'SELECT position_total n FROM v_company_position_counts WHERE company_id=1').n, 1);
  // 被职位引用，RESTRICT
  // Referenced by a position, RESTRICT
  // 求人から参照されているため RESTRICT
  assert.throws(() => db.prepare('DELETE FROM company_contacts WHERE id=1').run());
});

test('landline shared by many candidates: no conflict; one-sided empty date is not misaligned', () => {
  const db = fresh(); const svc = new CandidateImportService(db);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v3-'));
  const base = JSON.parse(fs.readFileSync(path.join(FIX, '艾华_13917035118.json'), 'utf8'));
  for (const [i, ph] of ['13900000001', '13900000002'].entries()) {
    const j = JSON.parse(JSON.stringify(base));
    j.record_id = 'r' + i; j.merge_info.primary_phone = ph; j.merge_info.primary_email = `x${i}@x.com`;
    j.merge_info.landlines = ['021-61363959'];
    fs.writeFileSync(path.join(dir, `${i}.json`), JSON.stringify(j));
  }
  const r = svc.importResumeDirectory(dir);
  assert.equal(r.created, 2); assert.equal(r.warnings, 0);
  assert.equal(one(db, "SELECT COUNT(*) c FROM candidate_contacts WHERE contact_type='landline' AND is_shared=0").c, 2);

  const json = JSON.parse(fs.readFileSync(path.join(FIX, '白宇天_15618550105.json'), 'utf8'));
  json.structured_data.resumes[0].work_experiences[0].position_start = '';
  assert.ok(!parseResumeMergeV3(json).warnings.some((w) => w.warningCode === 'list_misaligned'));
});

test('small date drift between language versions is tolerated, large drift warns', () => {
  const json = JSON.parse(fs.readFileSync(path.join(FIX, '白宇天_15618550105.json'), 'utf8'));
  const w = json.structured_data.resumes[1].work_experiences[0];
  const orig = w.position_start;
  const [y, rest] = [Number(orig.slice(0, 4)), orig.slice(4)];
  w.position_start = `${y + 1}${rest}`;
  assert.ok(!parseResumeMergeV3(json).warnings.some((x) => x.warningCode === 'list_misaligned'));
  w.position_start = `${y + 5}${rest}`;
  assert.ok(parseResumeMergeV3(json).warnings.some((x) => x.warningCode === 'list_misaligned'));
});
