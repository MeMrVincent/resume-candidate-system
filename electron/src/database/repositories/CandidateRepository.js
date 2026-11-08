const CandidateRawTextBuilder = require('../../candidate/search/CandidateRawTextBuilder');

class CandidateRepository {
  constructor(dbManager) { this.dbManager = dbManager; this.rawTextBuilder = new CandidateRawTextBuilder(); }

  candidateInsertFull(snapshot, importRecordMeta) {
    const db = this.dbManager.getDb();
    const now = new Date().toISOString();
    const p = snapshot.profile || {};
    const profile = {
      candidate_uuid: p.candidate_uuid || importRecordMeta.record_id,
      full_name: p.full_name || '', gender: p.gender || '', age: this.toInteger(p.age),
      birth_date: p.birth_date || '', birth_year: this.toInteger(p.birth_year),
      marital_status: p.marital_status || '', children_status: p.children_status || '',
      political_status: p.political_status || '', height_cm: this.toNumber(p.height_cm),
      weight_kg: this.toNumber(p.weight_kg), household_registration: p.household_registration || '',
      address: p.address || '', postal_code: p.postal_code || '', platform_from: p.platform_from || '',
      platform_resume_id: p.platform_resume_id || '', phone: p.phone || '', email: p.email || '',
      city: p.city || '', nationality: p.nationality || '', pr: p.pr || '',
      raw_text: '',
      resume_updated_date: p.resume_updated_date || '', resume_download_date: p.resume_download_date || '',
      sys_created_date: p.sys_created_date || now, sys_updated_date: p.sys_updated_date || now,
    };
    const columns = Object.keys(profile);
    const result = db.prepare(`INSERT INTO candidate_profiles (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...columns.map((key) => profile[key]));
    const candidateId = Number(result.lastInsertRowid);

    db.prepare(`INSERT INTO candidate_import_records (
      candidate_id,record_id,schema_version,source_path,original_path,source_filename,source_extension,
      source_metadata_json,dates_json,extraction_json,classification_json,quality_json,original_json,imported_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      candidateId, importRecordMeta.record_id, importRecordMeta.schema_version || '1.0',
      importRecordMeta.source_path || '', importRecordMeta.original_path || '',
      importRecordMeta.source_filename || '', importRecordMeta.source_extension || '.json',
      JSON.stringify(importRecordMeta.source_metadata || {}), JSON.stringify(importRecordMeta.dates || {}),
      JSON.stringify(importRecordMeta.extraction || {}), JSON.stringify(importRecordMeta.classification || {}),
      JSON.stringify(importRecordMeta.quality || {}), importRecordMeta.original_json || '{}', now
    );

    for (const resume of snapshot.resumes || []) this.candidateResumeInsert(candidateId, resume, now);
    this.candidateRawTextReplace(candidateId, this.rawTextBuilder.build(this.candidateSearchSnapshotGet(candidateId)));
    return candidateId;
  }

  candidateResumeInsert(candidateId, resume, now) {
    const db = this.dbManager.getDb();
    const result = db.prepare(`INSERT INTO candidate_resumes (
      candidate_id,resume_uuid,resume_language,source_order,is_primary,source_path,source_filename,
      source_extension,raw_text,original_json,resume_updated_date,resume_download_date,
      sys_created_date,sys_updated_date,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      candidateId, resume.resumeUuid, resume.resumeLanguage, resume.sourceOrder,
      resume.isPrimary ? 1 : 0, resume.sourcePath || '', resume.sourceFilename || '',
      resume.sourceExtension || '', resume.rawText || '', resume.originalJson || '{}',
      resume.resumeUpdatedDate || '', resume.resumeDownloadDate || '',
      resume.sysCreatedDate || now, resume.sysUpdatedDate || now, now, now
    );
    const resumeId = Number(result.lastInsertRowid);
    this.resumeOneToOneInsert('candidate_resume_base_info', resumeId, resume.baseInfo, [
      'full_name','gender','age','birth_date','birth_year','marital_status','children_status',
      'political_status','height_cm','weight_kg','household_registration','address','postal_code',
      'platform_from','platform_resume_id','phone','email','city','nationality','pr',
    ], now);
    this.resumeOneToOneInsert('candidate_resume_current_info', resumeId, resume.currentInfo, [
      'company_name','company_industry','position_title','employment_status','work_years',
    ], now);
    this.resumeOneToOneInsert('candidate_resume_education_info', resumeId, resume.educationInfo, [
      'school_name','major_name','degree_type','degree_rank',
    ], now);
    this.resumeItemsInsert('candidate_resume_expectations', resumeId, resume.expectations, [
      'expected_city','expected_position','expected_industry','expected_salary',
      'expected_annual_salary_min','expected_annual_salary_max','expected_employment_type','expected_start_date',
    ], now);
    this.resumeItemsInsert('candidate_resume_work_experiences', resumeId, resume.workExperiences, [
      'company_name','company_employees','company_industry','position','position_type','position_salary',
      'position_dept','position_report_to','position_subordinate','employment_type','annual_salary_min',
      'annual_salary_max','status','position_start','position_resigned','resigned_reason',
      'position_responsibilities','position_achievements',
    ], now);
    this.resumeItemsInsert('candidate_resume_educations', resumeId, resume.educations, [
      'school_name','school_major_name','school_degree_type','school_degree_rank','school_education_type','school_start_ym','school_end_ym',
    ], now);
    this.resumeItemsInsert('candidate_resume_projects', resumeId, resume.projects, [
      'sequence_no','fingerprint','project_name','company_or_client','role_name','start_ym','end_ym','description','responsibilities','achievements','keywords',
    ], now);
    this.resumeItemsInsert('candidate_resume_trainings', resumeId, resume.trainings, [
      'sequence_no','organization_name','training_name','start_ym','end_ym','certificate_name','description',
    ], now);
    this.resumeItemsInsert('candidate_resume_languages', resumeId, resume.languages, [
      'language_name','language_level','language_certificate','language_certificate_time',
    ], now);
    this.resumeItemsInsert('candidate_resume_certificates', resumeId, resume.certificates, [
      'certificate_name','certificate_type','certificate_time',
    ], now);
    this.resumeItemsInsert('candidate_resume_skills', resumeId, resume.skills, ['skill_name','skill_level'], now);
    for (const item of resume.communications || []) this.candidateImportedCommunicationInsert(candidateId, item, now);
  }

  resumeOneToOneInsert(table, resumeId, item = {}, fields, now) {
    const columns = ['resume_id', ...fields, 'created_at', 'updated_at'];
    this.dbManager.getDb().prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(
      resumeId, ...fields.map((field) => this.normalizeField(field, item?.[field])), now, now
    );
  }

  resumeItemsInsert(table, resumeId, items, fields, now) {
    if (!Array.isArray(items) || items.length === 0) return;
    const columns = ['resume_id', ...fields, 'created_at', 'updated_at'];
    const statement = this.dbManager.getDb().prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
    for (const item of items) statement.run(resumeId, ...fields.map((field) => this.normalizeField(field, item?.[field])), now, now);
  }

  candidateIdFindByRecordId(recordId) {
    return this.dbManager.getDb().prepare('SELECT candidate_id FROM candidate_import_records WHERE record_id=?').get(recordId)?.candidate_id || null;
  }

  candidateGet(candidateId) { return this.candidateResumeGet(candidateId, null); }

  candidateResumeGet(candidateId, requestedResumeId) {
    const db = this.dbManager.getDb();
    const candidate = db.prepare('SELECT * FROM candidate_profiles WHERE id=?').get(candidateId);
    if (!candidate) return null;
    const resumeOptions = db.prepare(`SELECT id,resume_language,source_order,is_primary,source_filename,
      resume_updated_date,sys_updated_date FROM candidate_resumes WHERE candidate_id=? ORDER BY is_primary DESC,source_order ASC,id ASC`).all(candidateId);
    const resume = requestedResumeId
      ? db.prepare('SELECT * FROM candidate_resumes WHERE id=? AND candidate_id=?').get(requestedResumeId, candidateId)
      : db.prepare('SELECT * FROM candidate_resumes WHERE candidate_id=? ORDER BY is_primary DESC,source_order ASC,id ASC LIMIT 1').get(candidateId);
    if (!resume) return null;
    const base = db.prepare('SELECT * FROM candidate_resume_base_info WHERE resume_id=?').get(resume.id) || {};
    const current = db.prepare('SELECT * FROM candidate_resume_current_info WHERE resume_id=?').get(resume.id) || {};
    const education = db.prepare('SELECT * FROM candidate_resume_education_info WHERE resume_id=?').get(resume.id) || {};
    const getItems = (table) => db.prepare(`SELECT * FROM ${table} WHERE resume_id=? ORDER BY id ASC`).all(resume.id);
    return {
      candidate,
      resume: { ...resume },
      resumeId: resume.id,
      resumeLanguage: resume.resume_language,
      resumeOptions,
      profile: {
        ...base, id: candidate.id, candidate_uuid: candidate.candidate_uuid,
        current_company: current.company_name || '', current_position: current.position_title || '',
        current_industry: current.company_industry || '', current_employment_status: current.employment_status || '',
        work_years: current.work_years, highest_school: education.school_name || '',
        highest_major: education.major_name || '', highest_degree_type: education.degree_type || '',
        highest_degree_rank: education.degree_rank,
        resume_updated_date: resume.resume_updated_date, resume_download_date: resume.resume_download_date,
        sys_created_date: resume.sys_created_date, sys_updated_date: resume.sys_updated_date,
      },
      expectations: getItems('candidate_resume_expectations'),
      workExperiences: getItems('candidate_resume_work_experiences'),
      educations: getItems('candidate_resume_educations'),
      projects: getItems('candidate_resume_projects'), trainings: getItems('candidate_resume_trainings'),
      languages: getItems('candidate_resume_languages'), certificates: getItems('candidate_resume_certificates'),
      skills: getItems('candidate_resume_skills'),
      communications: db.prepare('SELECT * FROM candidate_communications WHERE candidate_id=? ORDER BY id ASC').all(candidateId),
    };
  }

  candidateSearchSnapshotGet(candidateId) {
    const first = this.candidateGet(candidateId); if (!first) return null;
    return { profile: first.candidate, communications: first.communications, resumes: first.resumeOptions.map((option) => this.candidateResumeGet(candidateId, option.id)) };
  }

  candidateResumeBaseInfoUpdate(candidateId, resumeId, changes) {
    const resume = this.requireResume(candidateId, resumeId);
    const aliases = { primary_phone:'phone', primary_email:'email', personal_summary:'pr' };
    const allowed = new Set(['full_name','gender','age','birth_date','birth_year','marital_status','children_status','political_status','height_cm','weight_kg','household_registration','address','postal_code','platform_from','platform_resume_id','phone','email','city','nationality','pr']);
    const normalized = {};
    for (const [sourceKey, value] of Object.entries(changes || {})) {
      const key = aliases[sourceKey] || sourceKey; if (allowed.has(key)) normalized[key] = value;
    }
    this.updateRow('candidate_resume_base_info', 'resume_id', resume.id, normalized);
    if (resume.is_primary) this.updateRow('candidate_profiles', 'id', candidateId, normalized);
    return this.candidateResumeGet(candidateId, resume.id);
  }

  candidateResumeExpectationsReplace(candidateId, resumeId, items) { return this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_expectations',items,['expected_city','expected_position','expected_industry','expected_salary','expected_annual_salary_min','expected_annual_salary_max','expected_employment_type','expected_start_date']); }
  candidateResumeWorkExperiencesReplace(candidateId, resumeId, items) {
    const result = this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_work_experiences',items,['company_name','company_employees','company_industry','position','position_type','position_salary','position_dept','position_report_to','position_subordinate','employment_type','annual_salary_min','annual_salary_max','status','position_start','position_resigned','resigned_reason','position_responsibilities','position_achievements']);
    const current = result.find((item) => ['在职', 'Employed', '在職中'].includes(item.status)) || result[0] || {};
    this.updateRow('candidate_resume_current_info','resume_id',resumeId,{company_name:current.company_name||'',company_industry:current.company_industry||'',position_title:current.position||'',employment_status:current.status||''});
    return result;
  }
  candidateResumeEducationsReplace(candidateId, resumeId, items) {
    const result = this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_educations',items,['school_name','school_major_name','school_degree_type','school_degree_rank','school_education_type','school_start_ym','school_end_ym']);
    const highest = [...result].sort((a,b)=>(Number(b.school_degree_rank)||0)-(Number(a.school_degree_rank)||0))[0] || {};
    this.updateRow('candidate_resume_education_info','resume_id',resumeId,{school_name:highest.school_name||'',major_name:highest.school_major_name||'',degree_type:highest.school_degree_type||'',degree_rank:highest.school_degree_rank||null});
    return result;
  }
  candidateResumeProjectsReplace(candidateId,resumeId,items){return this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_projects',items,['sequence_no','fingerprint','project_name','company_or_client','role_name','start_ym','end_ym','description','responsibilities','achievements','keywords']);}
  candidateResumeTrainingsReplace(candidateId,resumeId,items){return this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_trainings',items,['sequence_no','organization_name','training_name','start_ym','end_ym','certificate_name','description']);}
  candidateResumeCertificatesReplace(candidateId,resumeId,items){return this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_certificates',items,['certificate_name','certificate_type','certificate_time']);}
  candidateResumeSkillsReplace(candidateId,resumeId,items){return this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_skills',items,['skill_name','skill_level']);}
  candidateResumeLanguagesReplace(candidateId,resumeId,items){return this.resumeCollectionReplace(candidateId,resumeId,'candidate_resume_languages',items,['language_name','language_level','language_certificate','language_certificate_time']);}
  resumeCollectionReplace(candidateId, resumeId, table, items, fields) {
    this.requireResume(candidateId,resumeId); const db=this.dbManager.getDb(); const now=new Date().toISOString();
    db.prepare(`DELETE FROM ${table} WHERE resume_id=?`).run(resumeId);
    this.resumeItemsInsert(table,resumeId,Array.isArray(items)?items:[],fields,now);
    return db.prepare(`SELECT * FROM ${table} WHERE resume_id=? ORDER BY id ASC`).all(resumeId);
  }

  candidateCommunicationAdd(candidateId,item){const now=new Date().toISOString();const communicateTime=item.communicate_time||this.localDateTime();const result=this.dbManager.getDb().prepare(`INSERT INTO candidate_communications(candidate_id,communicate_time,communicate_content,created_at,updated_at) VALUES(?,?,?,?,?)`).run(candidateId,communicateTime,item.communicate_content||'',now,now);return Number(result.lastInsertRowid);}
  candidateImportedCommunicationInsert(candidateId,item,now){this.dbManager.getDb().prepare(`INSERT INTO candidate_communications(candidate_id,communicate_time,communicate_content,created_at,updated_at) VALUES(?,?,?,?,?)`).run(candidateId,item.communicate_time||'',item.communicate_content||'',now,now);}
  candidateCommunicationUpdate(candidateId,id,changes){const allowed=new Set(['communicate_time','communicate_content']);const data=Object.fromEntries(Object.entries(changes||{}).filter(([key])=>allowed.has(key)));if(!Object.keys(data).length)return;const entries=Object.entries(data);this.dbManager.getDb().prepare(`UPDATE candidate_communications SET ${entries.map(([key])=>`${key}=?`).join(',')},updated_at=? WHERE id=? AND candidate_id=?`).run(...entries.map(([,v])=>v??''),new Date().toISOString(),id,candidateId);}
  candidateCommunicationDelete(candidateId,id){return this.dbManager.getDb().prepare('DELETE FROM candidate_communications WHERE id=? AND candidate_id=?').run(id,candidateId).changes>0;}

  localDateTime(date=new Date()){const pad=(value)=>String(value).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;}

  candidateTouch(candidateId,resumeId){const now=new Date().toISOString();this.dbManager.getDb().prepare('UPDATE candidate_profiles SET sys_updated_date=? WHERE id=?').run(now,candidateId);if(resumeId)this.dbManager.getDb().prepare('UPDATE candidate_resumes SET sys_updated_date=?,updated_at=? WHERE id=? AND candidate_id=?').run(now,now,resumeId,candidateId);}
  candidateRawTextReplace(candidateId,rawText){this.dbManager.getDb().prepare('UPDATE candidate_profiles SET raw_text=? WHERE id=?').run(rawText||'',candidateId);}
  candidatesCount(){return this.dbManager.getDb().prepare('SELECT COUNT(*) count FROM candidate_profiles').get().count;}

  requireResume(candidateId,resumeId){const row=this.dbManager.getDb().prepare('SELECT * FROM candidate_resumes WHERE id=? AND candidate_id=?').get(resumeId,candidateId);if(!row)throw new Error(`Resume not found: ${resumeId}`);return row;}
  updateRow(table,keyColumn,keyValue,changes){const entries=Object.entries(changes||{});if(!entries.length)return;this.dbManager.getDb().prepare(`UPDATE ${table} SET ${entries.map(([key])=>`${key}=?`).join(',')}${table==='candidate_profiles'?'':',updated_at=?'} WHERE ${keyColumn}=?`).run(...entries.map(([,v])=>v??''),...(table==='candidate_profiles'?[]:[new Date().toISOString()]),keyValue);}
  normalizeField(field,value){if(['age','birth_year','degree_rank','sequence_no'].includes(field))return this.toInteger(value);if(['height_cm','weight_kg','work_years','expected_annual_salary_min','expected_annual_salary_max'].includes(field))return this.toNumber(value);return value??'';}
  toInteger(value){if(value===null||value===undefined||value==='')return null;const number=Number.parseInt(value,10);return Number.isFinite(number)?number:null;}
  toNumber(value){if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;}
}

module.exports = CandidateRepository;
