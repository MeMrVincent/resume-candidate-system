'use strict';
const { RESUME_LIST_TABLE_SPECS, RESUME_BASE_INFO_COLUMN_TYPES } = require("../resume/ResumeFieldSpecs");

function appendNonEmptyText(lines, value) {
  if (value === null || value === undefined) return;
  const text = String(value).trim();
  if (text !== "") lines.push(text);
}

/**
 * @description 规则 B：由候选人的结构化数据拼出全文检索用的 raw_text。
 * 顺序：姓名/英文名/联系方式 → 每份简历（基本信息、各列表、沟通记录）。多语言简历逐份拼入。
 * 只拼业务字段，不含 id/uuid/时间戳；不做全局去重；用 \n 换行。
 * @description Rule B: assembles the raw_text used for full-text search from the candidate's structured data.
 * Order: name / English name / contacts -> each resume (base info, lists, communications). Multilingual resumes are appended one by one.
 * Only business fields are included, no id/uuid/timestamps; no global de-duplication; lines are joined with \n.
 * @description 規則 B：候補者の構造化データから全文検索用の raw_text を組み立てる。
 * 順序：氏名／英語名／連絡先 → 各履歴書（基本情報、各リスト、コミュニケーション記録）。多言語の履歴書は 1 件ずつ追加する。
 * 業務フィールドのみ（id/uuid/タイムスタンプは含めない）。全体での重複排除はしない。改行は \n。
 * @param {object} parsedCandidate 解析后的候选人（见 ResumeMergeV3Parser） | Parsed candidate (see ResumeMergeV3Parser) | 解析済みの候補者（ResumeMergeV3Parser を参照）
 * @returns {string}
 */
function buildCandidateRawText(parsedCandidate) {
  const lines = [];
  appendNonEmptyText(lines, parsedCandidate.fullName);
  appendNonEmptyText(lines, parsedCandidate.englishName);
  for (const contact of parsedCandidate.contacts || []) appendNonEmptyText(lines, contact.contactValue);

  for (const resume of parsedCandidate.resumes || []) {
    for (const columnName of Object.keys(RESUME_BASE_INFO_COLUMN_TYPES)) {
      appendNonEmptyText(lines, resume.baseInfo ? resume.baseInfo[columnName] : "");
    }
    for (const listSpec of RESUME_LIST_TABLE_SPECS) {
      for (const listRow of resume.lists[listSpec.jsonListKey] || []) {
        for (const columnName of Object.keys(listSpec.columnTypes)) appendNonEmptyText(lines, listRow[columnName]);
      }
    }
    for (const communication of resume.communications || []) {
      appendNonEmptyText(lines, communication.communicate_time);
      appendNonEmptyText(lines, communication.communicate_content);
    }
  }
  return lines.join("\n");
}

module.exports = { buildCandidateRawText };
