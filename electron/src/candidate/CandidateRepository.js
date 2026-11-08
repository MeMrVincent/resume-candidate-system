'use strict';
const crypto = require('crypto');
const { LIST_SPECS, BASE_COLS } = require('./listSpecs');
const { buildRawText } = require('./CandidateRawTextBuilder');

const now = () => new Date().toISOString();

class CandidateRepository {
  constructor(db) { this.db = db; }

  findByRecordId(recordId) {
    if (!recordId) return null;
    return this.db.prepare('SELECT * FROM candidate_profiles WHERE record_id = ?').get(recordId) || null;
  }
  findByContact(type, normalized) {
    return this.db.prepare(`SELECT p.* FROM candidate_contacts c JOIN candidate_profiles p ON p.id = c.candidate_id
      WHERE c.contact_type = ? AND c.normalized_value = ? AND c.is_shared = 0`).get(type, normalized) || null;
  }

  // 保存（新建或按 record_id / 联系方式覆盖）候选人整档；必须在调用方事务内。
  // 返回 { candidateId, created, warnings[] }
  saveFromModel(model, userId = 1) {
    const db = this.db, ts = now(), warnings = [];
    let existing = this.findByRecordId(model.recordId);
    if (!existing) {
      for (const c of model.contacts) {
        if (c.isPrimary && !c.isShared) { existing = this.findByContact(c.type, c.normalized); if (existing) break; }
      }
    }

    let candidateId;
    const common = [model.recordId, model.fullName, model.englishName, model.gender, model.birthDate, model.city,
      model.currentCompany, model.currentPosition, model.highestDegree, model.workYears];
    if (existing) {
      candidateId = existing.id;
      db.prepare(`UPDATE candidate_profiles SET record_id=?, full_name=?, english_name=?, gender=?, birth_date=?, city=?,
        current_company=?, current_position=?, highest_degree=?, work_years=?, primary_phone='', primary_email='',
        updated_by=?, updated_at=? WHERE id=?`).run(...common, userId, ts, candidateId);
      db.prepare("DELETE FROM candidate_contacts WHERE candidate_id=? AND source='import'").run(candidateId);
      db.prepare('DELETE FROM candidate_resumes WHERE candidate_id=?').run(candidateId);
      db.prepare("DELETE FROM candidate_communications WHERE candidate_id=? AND source_type='imported_resume'").run(candidateId);
    } else {
      const r = db.prepare(`INSERT INTO candidate_profiles (candidate_uuid, record_id, full_name, english_name, gender,
        birth_date, city, current_company, current_position, highest_degree, work_years, source_type,
        owner_user_id, created_by, updated_by, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)`)
        .run(crypto.randomUUID(), ...common, 'import', userId, userId, ts, ts);
      candidateId = Number(r.lastInsertRowid);
    }

    // 联系方式：规则 A —— 已被他人占用的非共用号码，本档降级为共用(灰)并记 warning
    let primaryPhone = '', primaryEmail = '';
    const insC = db.prepare(`INSERT INTO candidate_contacts (candidate_id, contact_type, contact_value, normalized_value,
      is_primary, is_shared, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    for (const c of model.contacts) {
      let shared = c.isShared, primary = c.isPrimary;
      if (!shared && c.type !== 'landline') {   // 座机多为公司总机，允许多人共有，不做归属冲突
        const owner = db.prepare(`SELECT candidate_id FROM candidate_contacts WHERE contact_type=? AND normalized_value=?
          AND is_shared=0 AND candidate_id<>?`).get(c.type, c.normalized, candidateId);
        if (owner) {
          shared = 1; primary = 0;
          warnings.push({ code: 'contact_conflict', message: `${c.type} ${c.value} 已归属候选人 #${owner.candidate_id}，本档标记为共用`,
            detail: { type: c.type, value: c.value, ownerCandidateId: owner.candidate_id } });
        }
      }
      if (primary) {
        const has = db.prepare('SELECT 1 FROM candidate_contacts WHERE candidate_id=? AND contact_type=? AND is_primary=1').get(candidateId, c.type);
        if (has) primary = 0;
      }
      if (shared) primary = 0;
      insC.run(candidateId, c.type, c.value, c.normalized, primary, shared, 'import', ts, ts);
      if (primary && c.type === 'mobile') primaryPhone = c.normalized;
      if (primary && c.type === 'email') primaryEmail = c.normalized;
    }
    db.prepare('UPDATE candidate_profiles SET primary_phone=?, primary_email=? WHERE id=?').run(primaryPhone, primaryEmail, candidateId);

    // 简历及列表
    const baseCols = Object.keys(BASE_COLS);
    const insResume = db.prepare(`INSERT INTO candidate_resumes (candidate_id, sequence_no, language_code, is_primary,
      ${baseCols.join(',')}, created_at, updated_at) VALUES (?,?,?,?,${baseCols.map(() => '?').join(',')},?,?)`);
    const insComm = db.prepare(`INSERT INTO candidate_communications (candidate_id, resume_id, source_type,
      communicate_time, communicate_content, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`);
    model.resumes.forEach((r, i) => {
      const rr = insResume.run(candidateId, i, r.languageCode, r.isPrimary, ...baseCols.map((c) => r.base[c]), ts, ts);
      const resumeId = Number(rr.lastInsertRowid);
      for (const spec of LIST_SPECS) {
        const cols = Object.keys(spec.cols);
        const extra = spec.key === 'training_list' ? ['raw_json'] : [];
        const all = [...cols, ...extra];
        const st = db.prepare(`INSERT INTO ${spec.table} (resume_id, sequence_no, ${all.join(',')}) VALUES (?,?,${all.map(() => '?').join(',')})`);
        r[spec.key].forEach((row, k) => st.run(resumeId, k, ...all.map((c) => row[c])));
      }
      for (const c of r.communication_list) insComm.run(candidateId, resumeId, 'imported_resume', c.communicate_time, c.communicate_content, userId, ts, ts);
    });

    this.rebuildRawText(candidateId, model);
    return { candidateId, created: !existing, warnings };
  }

  rebuildRawText(candidateId, model) {
    const raw = buildRawText(model);
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    this.db.prepare(`INSERT INTO candidate_search_documents (candidate_id, raw_text, text_hash, updated_at) VALUES (?,?,?,?)
      ON CONFLICT(candidate_id) DO UPDATE SET raw_text=excluded.raw_text, text_hash=excluded.text_hash, updated_at=excluded.updated_at`)
      .run(candidateId, raw, hash, now());
    return raw;
  }
}
module.exports = { CandidateRepository };
