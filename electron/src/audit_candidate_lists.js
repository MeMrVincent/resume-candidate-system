const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const LISTS = {
  expected_list: {
    canonical: ['expected_city','expected_position','expected_salary','expected_annual_salary_min','expected_annual_salary_max','expected_industry','expected_employment_type','expected_start_date'],
    table: 'candidate_resume_expectations', component: 'CandidateExpectationTab.vue',
  },
  work_experiences: {
    canonical: ['company_name','company_employees','company_industry','position','position_type','position_salary','position_dept','position_report_to','position_subordinate','employment_type','annual_salary_min','annual_salary_max','status','position_start','position_resigned','resigned_reason','position_responsibilities','position_achievements'],
    aliases: ['company_scale','company_nature','position_title','position_level','salary_text','department','report_to','subordinates_count','start_date','end_date','leave_reason','responsibilities','achievements','work_city','keywords'],
    table: 'candidate_resume_work_experiences', component: 'CandidateWorkTab.vue',
  },
  education_list: {
    canonical: ['school_name','school_major_name','school_degree_type','school_degree_rank','school_education_type','school_start_ym','school_end_ym'],
    table: 'candidate_resume_educations', component: 'CandidateEducationTab.vue',
  },
  project_list: {
    canonical: ['sequence_no','fingerprint','project_name','company_or_client','role_name','start_ym','end_ym','description','responsibilities','achievements','keywords'],
    aliases: ['company_name','project_company','project_role','role','project_start','project_end','start_date','end_date','project_description','project_responsibilities','project_env','project_industry','project_team_size'],
    table: 'candidate_resume_projects', component: 'CandidateProjectTab.vue',
  },
  training_list: {
    canonical: ['sequence_no','organization_name','training_name','start_ym','end_ym','certificate_name','description'],
    aliases: ['training_institution','training_course','training_start','training_end','start_date','end_date','certificate_obtained','training_description'],
    table: 'candidate_resume_trainings', component: 'CandidateTrainingTab.vue',
  },
  certificate_list: {
    canonical: ['certificate_name','certificate_type','certificate_time'],
    aliases: ['certificate_tpye','issued_time'],
    table: 'candidate_resume_certificates', component: 'CandidateCertificateTab.vue',
  },
  language_list: {
    canonical: ['language_name','language_level','language_certificate','language_certificate_time'],
    aliases: ['language','level','certificate','score','proficiency_level','certificate_name','certificate_time'],
    table: 'candidate_resume_languages', component: 'CandidateLanguageTab.vue',
  },
  skills_list: {
    canonical: ['skill_name','skill_level'],
    aliases: ['skills_name','skills_level','skills_certificate','proficiency_level'],
    table: 'candidate_resume_skills', component: 'CandidateSkillTab.vue',
  },
  communication_list: {
    canonical: ['communicate_time','communicate_content'],
    table: 'candidate_communications', component: 'CandidateCommunicationTab.vue', candidateLevel: true,
  },
};

function sameSet(left, right) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function sourceAudit(sourceDir) {
  const stats = Object.fromEntries(Object.keys(LISTS).map((name) => [name, {
    items: 0, keys: new Set(), topItems: 0, topKeys: new Set(),
  }]));
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.json'));
  let resumes = 0;
  let topExpectedObjects = 0;
  for (const file of files) {
    const root = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
    const structured = root.structured_data || {};
    if (structured.expected_info && !Array.isArray(structured.expected_info)) {
      topExpectedObjects += 1;
      Object.keys(structured.expected_info).forEach((key) => stats.expected_list.topKeys.add(key));
    }
    for (const [name, stat] of Object.entries(stats)) {
      const topItems = Array.isArray(structured[name]) ? structured[name] : [];
      stat.topItems += topItems.length;
      for (const item of topItems) Object.keys(item || {}).forEach((key) => stat.topKeys.add(key));
    }
    for (const resume of structured.resumes || []) {
      resumes += 1;
      for (const [name, stat] of Object.entries(stats)) {
        const items = Array.isArray(resume[name]) ? resume[name] : [];
        stat.items += items.length;
        for (const item of items) Object.keys(item || {}).forEach((key) => stat.keys.add(key));
      }
    }
  }
  // 打印源统计 / EN: Print source statistics / JA: ソース統計を出力
  console.log(`Source JSON: ${files.length} files / ${resumes} resumes / top expected_info objects: ${topExpectedObjects}`);
  let failures = 0;
  for (const [name, definition] of Object.entries(LISTS)) {
    const keys = [...stats[name].keys].sort();
    const topKeys = [...stats[name].topKeys].sort();
    const allowed = new Set([...definition.canonical, ...(definition.aliases || [])]);
    const unknown = [...new Set([...keys, ...topKeys])].filter((key) => !allowed.has(key));
    const resumeMismatch = stats[name].items > 0 && !sameSet(keys, definition.canonical);
    const topMismatch = (stats[name].topItems > 0 || (name === 'expected_list' && topExpectedObjects > 0))
      && !sameSet(topKeys, definition.canonical);
    if (unknown.length || resumeMismatch || topMismatch) failures += 1;
    console.log(`${name}: ${stats[name].items} items; actual fields: ${keys.join(', ') || '(none)'}`);
    if (stats[name].topItems) console.log(`  Top snapshot: ${stats[name].topItems} items; fields: ${topKeys.join(', ')}`);
    if (unknown.length) console.error(`  Unregistered fields: ${unknown.join(', ')}`);
    if ((resumeMismatch || topMismatch) && !unknown.length) console.error('  Fields still contain legacy aliases or missing canonical fields.');
  }
  return { failures, stats };
}

function databaseAudit(dbPath, sourceStats) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  let failures = 0;
  try {
    for (const [name, definition] of Object.entries(LISTS)) {
      const ignored = new Set(['id','resume_id','candidate_id','created_at','updated_at']);
      const columns = db.prepare(`PRAGMA table_info(${definition.table})`).all()
        .map((row) => row.name).filter((column) => !ignored.has(column));
      if (!sameSet(columns, definition.canonical)) {
        failures += 1;
        console.error(`${name} database mismatch: ${columns.join(', ')}`);
      }
      const rows = db.prepare(`SELECT COUNT(*) count FROM ${definition.table}`).get().count;
      console.log(`${name} row count: JSON ${sourceStats[name].items} / DB ${rows}`);
    }
  } finally {
    db.close();
  }
  console.log(`Database fields: ${failures ? `Found ${failures} mismatches` : 'All aligned'}`);
  return failures;
}

function frontendAudit(frontendDir) {
  let failures = 0;
  for (const [name, definition] of Object.entries(LISTS)) {
    const content = fs.readFileSync(path.join(frontendDir, definition.component), 'utf8');
    const candidates = [
      ...content.matchAll(/key\s*:\s*['"]([^'"]+)['"]/g),
      ...content.matchAll(/prop\s*=\s*['"]([^'"]+)['"]/g),
    ].map((match) => match[1]);
    const fields = [...new Set(candidates.filter((field) => definition.canonical.includes(field)))];
    if (!sameSet(fields, definition.canonical)) {
      failures += 1;
      console.error(`${name} frontend mismatch: ${fields.join(', ')}`);
    }
  }
  console.log(`Frontend fields: ${failures ? `Found ${failures} mismatches` : 'All aligned'}`);
  return failures;
}

const sourceDir = path.resolve(process.argv[2] || path.join(__dirname, '../../../codex-complete-jsons/complete'));
const dbPath = path.resolve(process.argv[3] || path.join(__dirname, '../../data/recruitment.db'));
const frontendDir = path.resolve(__dirname, '../../frontend/src/pages/candidate/tabs');
const source = sourceAudit(sourceDir);
const failures = source.failures + databaseAudit(dbPath, source.stats) + frontendAudit(frontendDir);
if (failures) process.exitCode = 1;
else console.log('Audit conclusion: JSON known fields, database schema fields, and frontend tab fields are completely aligned.');
