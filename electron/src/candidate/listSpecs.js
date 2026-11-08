'use strict';
// 简历下 8 张列表子表：JSON 列表键 -> 表、列类型（t 文本 / n 数字 / i 整数 / d 日期）
// raw 顺序 = raw_text 中的字段顺序（规则 B：显式字段，不含 id/时间戳）
const LIST_SPECS = [
  { key: 'expected_list', table: 'candidate_expectations', cols: {
      expected_position: 't', expected_industry: 't', expected_city: 't', expected_employment_type: 't',
      expected_salary: 't', expected_annual_salary_min: 'n', expected_annual_salary_max: 'n', expected_start_date: 't' } },
  { key: 'work_experiences', table: 'candidate_work_experiences', cols: {
      company_name: 't', company_industry: 't', company_employees: 't', position: 't', position_dept: 't',
      position_type: 't', position_start: 'd', position_resigned: 'd', position_report_to: 't',
      position_subordinate: 't', position_salary: 't', annual_salary_min: 'n', annual_salary_max: 'n',
      employment_type: 't', status: 't', resigned_reason: 't', position_responsibilities: 't',
      position_achievements: 't' } },
  { key: 'education_list', table: 'candidate_educations', cols: {
      school_name: 't', school_major_name: 't', school_degree_type: 't', school_degree_rank: 'i',
      school_education_type: 't', school_start_ym: 'd', school_end_ym: 'd' } },
  { key: 'project_list', table: 'candidate_projects', cols: {
      project_name: 't', company_or_client: 't', role_name: 't', start_ym: 'd', end_ym: 'd',
      description: 't', responsibilities: 't', achievements: 't', keywords: 't' } },
  { key: 'certificate_list', table: 'candidate_certificates', cols: {
      certificate_name: 't', certificate_type: 't', certificate_time: 'd' } },
  { key: 'language_list', table: 'candidate_languages', cols: {
      language_name: 't', language_level: 't', language_certificate: 't', language_certificate_time: 'd' } },
  { key: 'skills_list', table: 'candidate_skills', cols: { skill_name: 't', skill_level: 't' } },
  { key: 'training_list', table: 'candidate_trainings', cols: {
      training_name: 't', training_org: 't', training_start: 'd', training_end: 'd', training_content: 't' } },
];

// candidate_resumes 的 base_info 列（顺序即 raw_text 顺序）
const BASE_COLS = {
  full_name: 't', gender: 't', age: 'i', birth_date: 'd', birth_year: 'i', marital_status: 't',
  political_status: 't', city: 't', address: 't', platform_from: 't', platform_resume_id: 't',
  phone: 't', email: 't', household_registration: 't', nationality: 't', children_status: 't',
  postal_code: 't', height_cm: 'n', weight_kg: 'n', pr: 't',
};
module.exports = { LIST_SPECS, BASE_COLS };
