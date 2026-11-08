const fs = require('fs');
const path = require('path');

const text = (value) => value === null || value === undefined ? '' : value;
const first = (...values) => values.find((value) => value !== null && value !== undefined && value !== '') ?? '';
const joined = (parts, separator = '\n') => [...new Set(parts.map((part) => String(part || '').trim()).filter(Boolean))].join(separator);

const normalizers = {
  expected_list: (item) => ({
    expected_city: text(item.expected_city), expected_position: text(item.expected_position),
    expected_salary: first(item.expected_salary, item.expected_salary_text),
    expected_annual_salary_min: text(item.expected_annual_salary_min),
    expected_annual_salary_max: text(item.expected_annual_salary_max),
    expected_industry: text(item.expected_industry),
    expected_employment_type: text(item.expected_employment_type),
    expected_start_date: text(item.expected_start_date),
  }),
  work_experiences: (item) => ({
    company_name: text(item.company_name), company_employees: first(item.company_employees, item.company_scale),
    company_industry: text(item.company_industry), position: first(item.position, item.position_title),
    position_type: first(item.position_type, item.position_level), position_salary: first(item.position_salary, item.salary_text),
    position_dept: first(item.position_dept, item.department), position_report_to: first(item.position_report_to, item.report_to),
    position_subordinate: first(item.position_subordinate, item.subordinates_count), employment_type: text(item.employment_type),
    annual_salary_min: text(item.annual_salary_min), annual_salary_max: text(item.annual_salary_max), status: text(item.status),
    position_start: first(item.position_start, item.start_date), position_resigned: first(item.position_resigned, item.end_date),
    resigned_reason: first(item.resigned_reason, item.leave_reason),
    position_responsibilities: joined([
      first(item.position_responsibilities, item.responsibilities),
      item.company_nature ? `公司性质：${item.company_nature}` : '',
      item.work_city ? `工作城市：${item.work_city}` : '',
      item.keywords ? `关键词：${item.keywords}` : '',
    ]),
    position_achievements: first(item.position_achievements, item.achievements),
  }),
  education_list: (item) => ({
    school_name: text(item.school_name), school_major_name: first(item.school_major_name, item.major_name),
    school_degree_type: first(item.school_degree_type, item.degree_type),
    school_degree_rank: first(item.school_degree_rank, item.degree_rank),
    school_education_type: first(item.school_education_type, item.education_type),
    school_start_ym: first(item.school_start_ym, item.start_date), school_end_ym: first(item.school_end_ym, item.end_date),
  }),
  project_list: (item, index) => ({
    sequence_no: first(item.sequence_no, index + 1), fingerprint: text(item.fingerprint), project_name: text(item.project_name),
    company_or_client: first(item.company_or_client, item.project_company, item.company_name),
    role_name: first(item.role_name, item.project_role, item.role),
    start_ym: first(item.start_ym, item.project_start, item.start_date), end_ym: first(item.end_ym, item.project_end, item.end_date),
    description: joined([
      first(item.description, item.project_description), item.project_env ? `项目环境：${item.project_env}` : '',
      item.project_industry ? `项目行业：${item.project_industry}` : '',
      item.project_team_size ? `项目规模：${item.project_team_size}` : '',
    ]),
    responsibilities: first(item.responsibilities, item.project_responsibilities),
    achievements: text(item.achievements), keywords: text(item.keywords),
  }),
  training_list: (item, index) => ({
    sequence_no: first(item.sequence_no, index + 1),
    organization_name: first(item.organization_name, item.training_institution),
    training_name: first(item.training_name, item.training_course),
    start_ym: first(item.start_ym, item.training_start, item.start_date),
    end_ym: first(item.end_ym, item.training_end, item.end_date),
    certificate_name: first(item.certificate_name, item.certificate_obtained),
    description: first(item.description, item.training_description),
  }),
  certificate_list: (item) => ({
    certificate_name: text(item.certificate_name), certificate_type: first(item.certificate_type, item.certificate_tpye),
    certificate_time: first(item.certificate_time, item.issued_time),
  }),
  language_list: (item) => ({
    language_name: first(item.language_name, item.language),
    language_level: joined([first(item.language_level, item.level, item.proficiency_level), item.score], ' / '),
    language_certificate: first(item.language_certificate, item.certificate, item.certificate_name),
    language_certificate_time: first(item.language_certificate_time, item.certificate_time),
  }),
  skills_list: (item) => ({
    skill_name: first(item.skill_name, item.skills_name),
    skill_level: first(item.skill_level, item.skills_level, item.proficiency_level, item.skills_certificate),
  }),
  communication_list: (item) => ({
    communicate_time: first(item.communicate_time, item.communication_date),
    communicate_content: first(item.communicate_content, item.summary),
  }),
};

function normalizeContainer(container) {
  if (!container || typeof container !== 'object') return;
  for (const [name, normalize] of Object.entries(normalizers)) {
    if (Array.isArray(container[name])) container[name] = container[name].map(normalize);
  }
}

const sourceDir = path.resolve(process.argv[2] || path.join(__dirname, '../../../codex-complete-jsons/complete'));
const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.json')).sort();
let changed = 0;
for (const file of files) {
  const filePath = path.join(sourceDir, file);
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const before = JSON.stringify(root);
  const structured = root.structured_data || {};
  normalizeContainer(structured);
  if (structured.expected_info && !Array.isArray(structured.expected_info)) {
    structured.expected_info = normalizers.expected_list(structured.expected_info);
  }
  for (const resume of structured.resumes || []) {
    if (!Array.isArray(resume.expected_list) && Array.isArray(resume.expected_info)) {
      resume.expected_list = resume.expected_info;
    }
    delete resume.expected_info;
    normalizeContainer(resume);
  }
  if (JSON.stringify(root) !== before) {
    fs.writeFileSync(filePath, `${JSON.stringify(root, null, 2)}\n`, 'utf8');
    changed += 1;
  }
}
// JSON 列表字段标准化完成 / EN: JSON list normalization completed / JA: JSON リスト正規化完了
console.log(`JSON list normalization completed: ${files.length} files, modified ${changed} files.`);
