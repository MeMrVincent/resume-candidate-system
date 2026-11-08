const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DatabaseManager = require('../src/database/Database');
const MigrationRunner = require('../src/database/MigrationRunner');
const CandidateRepository = require('../src/database/repositories/CandidateRepository');
const CandidateSearchRepository = require('../src/database/repositories/CandidateSearchRepository');
const CandidateImportService = require('../src/services/CandidateImportService');
const CandidateService = require('../src/services/CandidateService');

async function createContext(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'recruitment-test-'));
  const dbManager = new DatabaseManager(path.join(directory, 'test.db'));
  await dbManager.init();
  await new MigrationRunner(dbManager).runMigrations();
  t.after(() => {
    dbManager.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const candidateRepository = new CandidateRepository(dbManager);
  return {
    directory,
    dbManager,
    candidateRepository,
    searchRepository: new CandidateSearchRepository(dbManager),
    importService: new CandidateImportService(candidateRepository),
    candidateService: new CandidateService(dbManager, candidateRepository),
  };
}

function fixture() {
  return {
    schema_version: 'codex-resume-json-1.0',
    source: { original_path: 'fixture.docx' },
    dates: {
      resume_updated_date: '2026-01-01 00:00:00',
      resume_download_date: '2026-01-01 00:00:00',
    },
    structured_data: {
      base_info: {
        full_name: '测试候选人', phone: '13800000000', city: '上海市', pr: '精密制造经验',
        platform_from: '测试平台', platform_resume_id: 'resume-001',
      },
      expected_info: [{ expected_position: '工程师', expected_city: '上海市' }],
      current_info: { company_name: '测试公司', position: '机械工程师' },
      education_info: { school_name: '测试大学', school_degree_type: '本科', school_degree_rank: '4' },
      resumes: [{
        resume_languge: 'zh',
        work_experiences: [{ company_name: '测试公司', position: '机械工程师', position_responsibilities: '产品设计' }],
        education_list: [{ school_name: '测试大学', school_degree_type: '本科', school_degree_rank: '4' }],
        certificate_list: [], language_list: [{ language_name: '日语', language_level: 'N1' }],
        skills_list: [{ skill_name: 'CAD', skill_level: '熟练' }], training_list: [], project_list: [],
        communication_list: [], expected_list: [{ expected_position: '工程师' }],
      }, {
        resume_languge: 'jp',
        base_info: { full_name: 'テスト候補者' },
        work_experiences: [{ position: '機械エンジニア', position_responsibilities: 'IT manager' }],
      }],
    },
    raw_text: '测试候选人 | 机械工程师 | 日语 | テスト候補者 | manager',
    quality: { full_name: '测试候选人' },
  };
}

test('migrations create a real FTS5 index with required pragmas', async (t) => {
  const { dbManager } = await createContext(t);
  const db = dbManager.getDb();
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(db.pragma('journal_mode', { simple: true }), 'wal');
  assert.match(
    db.prepare("SELECT sql FROM sqlite_master WHERE name = 'candidate_search_fts'").get().sql,
    /VIRTUAL TABLE/i
  );
});

test('resume list schemas use the authoritative JSON field names', async (t) => {
  const { dbManager } = await createContext(t);
  const db = dbManager.getDb();
  const businessColumns = (table) => db.prepare(`PRAGMA table_info(${table})`).all()
    .map((row) => row.name).filter((name) => !['id', 'resume_id', 'created_at', 'updated_at'].includes(name));
  assert.deepEqual(businessColumns('candidate_resume_expectations'), ['expected_city','expected_position','expected_industry','expected_salary','expected_annual_salary_min','expected_annual_salary_max','expected_employment_type','expected_start_date']);
  assert.deepEqual(businessColumns('candidate_resume_work_experiences'), ['company_name','company_employees','company_industry','position','position_type','position_salary','position_dept','position_report_to','position_subordinate','employment_type','annual_salary_min','annual_salary_max','status','position_start','position_resigned','resigned_reason','position_responsibilities','position_achievements']);
  assert.deepEqual(businessColumns('candidate_resume_educations'), ['school_name','school_major_name','school_degree_type','school_degree_rank','school_education_type','school_start_ym','school_end_ym']);
  assert.deepEqual(businessColumns('candidate_resume_projects'), ['sequence_no','fingerprint','project_name','company_or_client','role_name','start_ym','end_ym','description','responsibilities','achievements','keywords']);
  assert.deepEqual(businessColumns('candidate_resume_trainings'), ['sequence_no','organization_name','training_name','start_ym','end_ym','certificate_name','description']);
  assert.deepEqual(businessColumns('candidate_resume_certificates'), ['certificate_name','certificate_type','certificate_time']);
  assert.deepEqual(businessColumns('candidate_resume_languages'), ['language_name','language_level','language_certificate','language_certificate_time']);
  assert.deepEqual(businessColumns('candidate_resume_skills'), ['skill_name','skill_level']);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM sqlite_master WHERE type='table' AND name='candidate_resume_communications'").get().count, 0);
  assert.deepEqual(businessColumns('candidate_communications'), ['candidate_id','communicate_time','communicate_content']);
});

test('source JSON aliases normalize into the canonical list fields', async (t) => {
  const { directory, importService } = await createContext(t);
  const source = fixture();
  const resume = source.structured_data.resumes[0];
  resume.work_experiences = [{
    company_name: '别名公司', company_scale: '100-499人', position_title: '顾问',
    position_level: '高级', start_date: '2020-01', end_date: '2022-01',
    leave_reason: '发展', responsibilities: '咨询', achievements: '交付成功',
  }];
  resume.training_list = [{
    training_institution: '培训机构', training_name: '课程', training_start: '2021-01',
    training_end: '2021-02', training_description: '培训内容',
  }];
  resume.project_list = [{
    project_name: '项目', project_company: '客户', project_role: '负责人',
    project_start: '2022-01', project_end: '2022-12', project_description: '项目说明',
    project_responsibilities: '项目职责', project_env: 'Java', project_industry: '金融', project_team_size: '8人',
  }];
  resume.certificate_list = [{ certificate_name: '证书', certificate_tpye: '职业资格', certificate_time: '2020-01' }];
  resume.language_list = [{ language: '日语', level: '商务', score: 'N1', certificate: 'JLPT' }];
  resume.skills_list = [{ skills_name: 'Java', skills_level: '熟练' }];

  const parsed = importService.parseCandidateJson(source, path.join(directory, 'aliases.json'));
  const normalized = parsed.snapshot.resumes[0];
  assert.deepEqual(normalized.workExperiences[0], {
    company_name: '别名公司', company_employees: '100-499人', company_industry: '', position: '顾问',
    position_type: '高级', position_salary: '', position_dept: '', position_report_to: '',
    position_subordinate: '', employment_type: '', annual_salary_min: '', annual_salary_max: '', status: '',
    position_start: '2020-01', position_resigned: '2022-01', resigned_reason: '发展',
    position_responsibilities: '咨询', position_achievements: '交付成功',
  });
  assert.equal(normalized.trainings[0].organization_name, '培训机构');
  assert.equal(normalized.trainings[0].description, '培训内容');
  assert.equal(normalized.projects[0].company_or_client, '客户');
  assert.match(normalized.projects[0].description, /项目环境：Java/);
  assert.equal(normalized.projects[0].responsibilities, '项目职责');
  assert.equal(normalized.certificates[0].certificate_type, '职业资格');
  assert.deepEqual(normalized.languages[0], {
    language_name: '日语', language_level: '商务 / N1', language_certificate: 'JLPT', language_certificate_time: '',
  });
  assert.deepEqual(normalized.skills[0], { skill_name: 'Java', skill_level: '熟练' });
});

test('import is atomic, complete and idempotent', async (t) => {
  const { directory, dbManager, importService } = await createContext(t);
  const source = path.join(directory, 'json');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'candidate.json'), JSON.stringify(fixture()));

  const first = importService.importBatchFromDirectory(source);
  const second = importService.importBatchFromDirectory(source);
  assert.deepEqual([first.successCount, first.failCount], [1, 0]);
  assert.deepEqual([second.successCount, second.skippedCount, second.failCount], [0, 1, 0]);

  const counts = dbManager.getDb().prepare(`
    SELECT
      (SELECT COUNT(*) FROM candidate_profiles) profiles,
      (SELECT COUNT(*) FROM candidate_resumes) resumes,
      (SELECT COUNT(*) FROM candidate_resume_base_info) resume_base_info,
      (SELECT COUNT(*) FROM candidate_import_records) imports,
      (SELECT COUNT(*) FROM candidate_profiles WHERE raw_text <> '') profiles_with_raw_text,
      (SELECT COUNT(*) FROM candidate_search_fts) fts
  `).get();
  assert.deepEqual(counts, { profiles: 1, resumes: 2, resume_base_info: 2, imports: 1, profiles_with_raw_text: 1, fts: 1 });
  const profile = dbManager.getDb().prepare('SELECT platform_from, platform_resume_id FROM candidate_profiles').get();
  assert.deepEqual(profile, { platform_from: '测试平台', platform_resume_id: 'resume-001' });
  const primaryBase = dbManager.getDb().prepare(`SELECT b.full_name,b.phone FROM candidate_resume_base_info b
    JOIN candidate_resumes r ON r.id=b.resume_id WHERE r.is_primary=1`).get();
  assert.deepEqual(primaryBase, { full_name: '测试候选人', phone: '13800000000' });
});

test('multilingual FTS and two-character fallback return candidates', async (t) => {
  const { directory, importService, searchRepository } = await createContext(t);
  const file = path.join(directory, 'candidate.json');
  fs.writeFileSync(file, JSON.stringify(fixture()));
  const parsed = importService.parseCandidateJson(fixture(), file);
  importService.candidateRepository.dbManager.getDb().transaction(() => {
    importService.candidateRepository.candidateInsertFull(
      parsed.snapshot, parsed.importRecordMeta
    );
  })();

  assert.equal(searchRepository.searchFts('工程师').length, 1);
  assert.equal(searchRepository.searchFts('テスト').length, 1);
  assert.equal(searchRepository.searchFts('manager').length, 1);
  assert.equal(searchRepository.searchFts('日语').length, 1);
  assert.equal(searchRepository.searchFts('日语 IT').length, 1);
  assert.equal(searchRepository.candidatesSearch({ keyword: '日语 IT' }).total, 1);
});

test('candidate mutations fully rebuild raw_text and FTS', async (t) => {
  const { directory, importService, candidateRepository, candidateService, searchRepository } = await createContext(t);
  const file = path.join(directory, 'candidate.json');
  const parsed = importService.parseCandidateJson(fixture(), file);
  const id = importService.candidateRepository.dbManager.getDb().transaction(() =>
    candidateRepository.candidateInsertFull(
      parsed.snapshot, parsed.importRecordMeta
    )
  )();

  const primaryResumeId = candidateService.candidateGet(id).resumeId;
  candidateService.candidateResumeBaseInfoUpdate(id, primaryResumeId, { full_name: '全新姓名' });
  assert.equal(searchRepository.candidatesSearch({ keyword: '全新姓名' }).total, 1);

  const communicationId = candidateService.candidateCommunicationAdd(id, {
    communicate_content: '愿意考虑新能源机会',
  });
  assert.equal(searchRepository.searchFts('新能源').length, 1);

  candidateService.candidateCommunicationDelete(id, communicationId);
  assert.equal(searchRepository.searchFts('新能源').length, 0);

  candidateService.candidateResumeWorkExperiencesUpdate(id, primaryResumeId, [{
    company_name: '新工作公司', position: '架构负责人', position_responsibilities: '平台重构',
  }]);
  candidateService.candidateResumeEducationsUpdate(id, primaryResumeId, [{
    school_name: '新教育大学', school_major_name: '计算机科学', school_degree_type: '硕士',
  }]);
  candidateService.candidateResumeSkillsUpdate(id, primaryResumeId, [{ skill_name: 'Rust开发', skill_level: '熟练' }]);
  candidateService.candidateResumeLanguagesUpdate(id, primaryResumeId, [{
    language_name: '德语', language_level: '流利', language_certificate: 'TestDaF',
  }]);
  candidateService.candidateResumeExpectationsUpdate(id, primaryResumeId, [{
    expected_city: '东京', expected_position: '技术总监', expected_salary: '面议',
  }]);
  candidateService.candidateResumeProjectsUpdate(id, primaryResumeId, [{
    sequence_no: 1, project_name: '新项目', description: '可物理删除的项目',
  }]);

  const updated = candidateService.candidateGet(id);
  assert.equal(updated.workExperiences[0].company_name, '新工作公司');
  assert.equal(updated.educations[0].school_name, '新教育大学');
  assert.equal(updated.skills[0].skill_name, 'Rust开发');
  assert.equal(updated.languages[0].language_name, '德语');
  assert.equal(updated.expectations[0].expected_position, '技术总监');
  assert.equal(updated.projects[0].project_name, '新项目');
  assert.equal(searchRepository.searchFts('平台重构').length, 1);
  assert.equal(searchRepository.searchFts('TestDaF').length, 1);
  assert.equal(searchRepository.searchFts('可物理删除').length, 1);
  candidateService.candidateResumeProjectsUpdate(id, primaryResumeId, []);
  assert.equal(candidateService.candidateGet(id).projects.length, 0);
  assert.equal(searchRepository.searchFts('可物理删除').length, 0);

  const japaneseResumeId = updated.resumeOptions.find((item) => item.resume_language === 'jp').id;
  const japaneseBefore = candidateService.candidateResumeGet(id, japaneseResumeId);
  assert.equal(japaneseBefore.profile.full_name, 'テスト候補者');
  candidateService.candidateResumeBaseInfoUpdate(id, japaneseResumeId, { full_name: '日本語候補者' });
  candidateService.candidateResumeSkillsUpdate(id, japaneseResumeId, [{ skill_name: '日本語設計', skill_level: '上級' }]);
  const japaneseAfter = candidateService.candidateResumeGet(id, japaneseResumeId);
  assert.equal(japaneseAfter.profile.full_name, '日本語候補者');
  assert.equal(japaneseAfter.skills[0].skill_name, '日本語設計');
  assert.equal(candidateService.candidateGet(id).profile.full_name, '全新姓名');
  assert.equal(candidateService.candidateGet(id).skills[0].skill_name, 'Rust开发');
  assert.equal(searchRepository.searchFts('日本語設計').length, 1);
});

test('candidate list defaults to system updated date descending', async (t) => {
  const { directory, importService, candidateRepository, searchRepository } = await createContext(t);
  const older = fixture();
  older.structured_data.base_info.full_name = '较早候选人';
  older.dates.sys_updated_date = '2026-01-01T10:00:00+09:00';
  const newer = structuredClone(fixture());
  newer.structured_data.base_info.full_name = '较新候选人';
  newer.dates.sys_updated_date = '2026-08-07T14:10:01+09:00';

  for (const [name, data] of [['older.json', older], ['newer.json', newer]]) {
    const parsed = importService.parseCandidateJson(data, path.join(directory, name));
    candidateRepository.dbManager.getDb().transaction(() => candidateRepository.candidateInsertFull(
      parsed.snapshot, parsed.importRecordMeta
    ))();
  }

  const result = searchRepository.candidatesSearch({ pageSize: 10 });
  assert.equal(result.items[0].full_name, '较新候选人');
  assert.equal(result.items[0].sys_updated_date, '2026-08-07T14:10:01+09:00');
});

test('all candidate mutations refresh the candidate system updated date', async (t) => {
  const { directory, importService, candidateRepository, candidateService, dbManager } = await createContext(t);
  const parsed = importService.parseCandidateJson(fixture(), path.join(directory, 'touch.json'));
  const candidateId = dbManager.getDb().transaction(() => candidateRepository.candidateInsertFull(
    parsed.snapshot, parsed.importRecordMeta
  ))();
  const resumeId = candidateService.candidateGet(candidateId).resumeId;
  const oldTime = '2000-01-01T00:00:00.000Z';

  dbManager.getDb().prepare('UPDATE candidate_profiles SET sys_updated_date=? WHERE id=?').run(oldTime, candidateId);
  dbManager.getDb().prepare('UPDATE candidate_resumes SET sys_updated_date=? WHERE id=?').run(oldTime, resumeId);
  candidateService.candidateResumeBaseInfoUpdate(candidateId, resumeId, { city: '东京' });
  assert.notEqual(dbManager.getDb().prepare('SELECT sys_updated_date FROM candidate_profiles WHERE id=?').get(candidateId).sys_updated_date, oldTime);
  assert.notEqual(dbManager.getDb().prepare('SELECT sys_updated_date FROM candidate_resumes WHERE id=?').get(resumeId).sys_updated_date, oldTime);

  dbManager.getDb().prepare('UPDATE candidate_profiles SET sys_updated_date=? WHERE id=?').run(oldTime, candidateId);
  candidateService.candidateCommunicationAdd(candidateId, { communicate_content: '更新时间测试' });
  assert.notEqual(dbManager.getDb().prepare('SELECT sys_updated_date FROM candidate_profiles WHERE id=?').get(candidateId).sys_updated_date, oldTime);
});
