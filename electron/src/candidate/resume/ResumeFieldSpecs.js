'use strict';
/**
 * 简历字段规格：描述 v3 JSON 里每个“列表”和“基本信息”如何对应到数据库表和列。
 * 列类型：text 文本 / number 小数 / integer 整数 / date 日期（统一转 ISO）
 * 列的书写顺序同时就是 raw_text 的拼接顺序（规则 B：显式字段、固定顺序）。
 * Resume field specs: how each "list" and the "base info" in the v3 JSON map to database tables and columns.
 * Column types: text / number (decimal) / integer / date (always converted to ISO).
 * The order of the columns is also the order in which raw_text is assembled (rule B: explicit fields, fixed order).
 * 履歴書フィールド仕様：v3 JSON の各「リスト」と「基本情報」がどのテーブル・列に対応するかを定義する。
 * 列タイプ：text テキスト / number 小数 / integer 整数 / date 日付（ISO に統一変換）。
 * 列の記述順は raw_text の連結順でもある（規則 B：明示的なフィールド・固定順）。
 */

/**
 * 简历下的列表：JSON 列表键 -> 子表 -> 列
 * Lists under a resume: JSON list key -> child table -> columns
 * 履歴書配下のリスト：JSON リストキー -> 子テーブル -> 列
 */
const RESUME_LIST_TABLE_SPECS = [
  {
    jsonListKey: "expected_list",
    tableName: "candidate_expectations",
    columnTypes: {
      expected_position: "text", expected_industry: "text", expected_city: "text", expected_employment_type: "text",
      expected_salary: "text", expected_annual_salary_min: "number", expected_annual_salary_max: "number",
      // 样本里是“即时/一个月内”这类自由文本，不是日期
      // In the samples this is free text such as "immediately / within a month", not a date
      // サンプルでは「即時／1 か月以内」のような自由記述で、日付ではない
      expected_start_date: "text"
    }
  },
  {
    jsonListKey: "work_experiences",
    tableName: "candidate_work_experiences",
    columnTypes: {
      company_name: "text", company_industry: "text", company_employees: "text", position: "text", position_dept: "text",
      position_type: "text", position_start: "date", position_resigned: "date", position_report_to: "text",
      position_subordinate: "text", position_salary: "text", annual_salary_min: "number", annual_salary_max: "number",
      employment_type: "text", status: "text", resigned_reason: "text", position_responsibilities: "text",
      position_achievements: "text"
    }
  },
  {
    jsonListKey: "education_list",
    tableName: "candidate_educations",
    columnTypes: {
      school_name: "text", school_major_name: "text", school_degree_type: "text", school_degree_rank: "integer",
      school_education_type: "text", school_start_ym: "date", school_end_ym: "date"
    }
  },
  {
    jsonListKey: "project_list",
    tableName: "candidate_projects",
    columnTypes: {
      project_name: "text", company_or_client: "text", role_name: "text", start_ym: "date", end_ym: "date",
      description: "text", responsibilities: "text", achievements: "text", keywords: "text"
    }
  },
  {
    jsonListKey: "certificate_list",
    tableName: "candidate_certificates",
    columnTypes: { certificate_name: "text", certificate_type: "text", certificate_time: "date" }
  },
  {
    jsonListKey: "language_list",
    tableName: "candidate_languages",
    columnTypes: { language_name: "text", language_level: "text", language_certificate: "text", language_certificate_time: "date" }
  },
  {
    jsonListKey: "skills_list",
    tableName: "candidate_skills",
    columnTypes: { skill_name: "text", skill_level: "text" }
  },
  {
    jsonListKey: "training_list",
    tableName: "candidate_trainings",
    columnTypes: { training_name: "text", training_org: "text", training_start: "date", training_end: "date", training_content: "text" }
  }
];

/**
 * candidate_resumes 表里来自 base_info 的列
 * Columns of candidate_resumes that come from base_info
 * candidate_resumes テーブルのうち base_info 由来の列
 */
const RESUME_BASE_INFO_COLUMN_TYPES = {
  full_name: "text", gender: "text", age: "integer", birth_date: "date", birth_year: "integer", marital_status: "text",
  political_status: "text", city: "text", address: "text", platform_from: "text", platform_resume_id: "text",
  phone: "text", email: "text", household_registration: "text", nationality: "text", children_status: "text",
  postal_code: "text", height_cm: "number", weight_kg: "number", pr: "text"
};

module.exports = { RESUME_LIST_TABLE_SPECS, RESUME_BASE_INFO_COLUMN_TYPES };
