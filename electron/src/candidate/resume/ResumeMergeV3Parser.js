'use strict';
/**
 * 把 resume-merge-v3.0 的 JSON 解析成“候选人对象”（纯函数，不碰数据库）。
 * Parses a resume-merge-v3.0 JSON into a "candidate object" (pure functions, no database access).
 * resume-merge-v3.0 の JSON を「候補者オブジェクト」に解析する（純粋関数、データベースには触れない）。
 *
 * 候选人对象结构（parsedCandidate）：
 * Candidate object structure (parsedCandidate):
 * 候補者オブジェクトの構造（parsedCandidate）：
 *   recordId, fullName, englishName, gender, birthDate, city, currentCompany, currentPosition, highestDegree, workYears,
 *   contacts:  [{ contactType, contactValue, normalizedValue, isPrimary, isShared }]
 *   resumes:   [{ languageCode, isPrimary, baseInfo:{...}, lists:{ work_experiences:[...], ... }, communications:[...] }]
 *   warnings:  [{ warningCode, message, detail }]
 */
const { RESUME_LIST_TABLE_SPECS, RESUME_BASE_INFO_COLUMN_TYPES } = require("./ResumeFieldSpecs");
const normalizers = require("./ValueNormalizers");

/**
 * 多语言版本之间，同一条经历的起始日期允许相差的最大月数（不同平台导出的简历日期常有出入）
 * Maximum month difference allowed between language versions for the start date of the same entry (resumes exported from different platforms often differ slightly)
 * 言語バージョン間で、同一経歴の開始日に許容する最大の月差（プラットフォームごとに日付が少しずれることが多い）
 */
const MAX_ALLOWED_MONTH_DIFFERENCE_BETWEEN_LANGUAGES = 24;

function convertCellValue(columnType, rawValue, parseContext) {
  if (columnType === "number") return normalizers.parseNumberOrNull(rawValue);
  if (columnType === "integer") return normalizers.parseIntegerOrNull(rawValue);
  if (columnType === "date") {
    const dateResult = normalizers.convertToIsoDate(rawValue);
    if (dateResult.isUnrecognized) {
      parseContext.warnings.push({
        warningCode: "bad_date",
        message: `无法识别的日期: ${rawValue}`,
        detail: parseContext.location
      });
    }
    return dateResult.isoDate;
  }
  return normalizers.toTrimmedText(rawValue);
}

function convertRowByColumnTypes(sourceRow, columnTypes, parseContext) {
  const convertedRow = {};
  for (const [columnName, columnType] of Object.entries(columnTypes)) {
    convertedRow[columnName] = convertCellValue(columnType, sourceRow ? sourceRow[columnName] : undefined, parseContext);
  }
  return convertedRow;
}

/**
 * merge_info 里的各类联系方式 -> 统一的 contacts 数组（同类型同号码去重）
 * Contacts of every kind in merge_info -> one unified contacts array (same type and same number are de-duplicated)
 * merge_info の各種連絡先 -> 統一された contacts 配列（同種別・同番号は重複排除）
 */
function buildContactsFromMergeInfo(mergeInfo) {
  const contacts = [];
  const seenContactKeys = new Set();

  const addContact = (contactType, rawValue, isPrimary, isShared) => {
    const contactValue = normalizers.toTrimmedText(rawValue);
    if (!contactValue) return;
    const normalizedValue =
      contactType === "email"
        ? normalizers.normalizeEmailAddress(contactValue)
        : contactType === "mobile"
          ? normalizers.normalizeMobilePhone(contactValue)
          : normalizers.normalizeLandlinePhone(contactValue);
    if (!normalizedValue) return;
    const contactKey = `${contactType}|${normalizedValue}`;
    if (seenContactKeys.has(contactKey)) return;
    seenContactKeys.add(contactKey);
    contacts.push({ contactType, contactValue, normalizedValue, isPrimary: isPrimary ? 1 : 0, isShared: isShared ? 1 : 0 });
  };

  addContact("mobile", mergeInfo.primary_phone, true, false);
  for (const phone of mergeInfo.other_phones || []) addContact("mobile", phone, false, false);
  for (const landline of mergeInfo.landlines || []) addContact("landline", landline, false, false);
  addContact("email", mergeInfo.primary_email, true, false);
  for (const email of mergeInfo.other_emails || []) addContact("email", email, false, false);
  for (const sharedItem of mergeInfo.shared_contacts_ignored || []) {
    const sharedValue = normalizers.toTrimmedText(
      typeof sharedItem === "object" && sharedItem ? sharedItem.value || sharedItem.contact || sharedItem.phone || sharedItem.email : sharedItem
    );
    if (sharedValue) addContact(sharedValue.includes("@") ? "email" : "mobile", sharedValue, false, true);
  }
  return contacts;
}

/**
 * 多语言对齐校验：外文版与主简历（中文）的各列表条数必须一致；
 * 工作/教育的起始日期相差超过阈值则视为错位。只产生警告，不阻止导入。
 * Multilingual alignment check: every list of a foreign-language version must have the same length as the main (Chinese) resume;
 * start dates of work/education differing by more than the threshold are treated as misaligned. Only warns, never blocks the import.
 * 多言語の整合性チェック：外国語版の各リストの件数はメイン（中国語）の履歴書と一致している必要がある。
 * 職歴／学歴の開始日の差がしきい値を超えるとずれと判断する。警告のみで、インポートは止めない。
 */
function collectLanguageAlignmentWarnings(resumes, parseWarnings) {
  const primaryResume = resumes[0];
  const startDateColumnByListKey = { work_experiences: "position_start", education_list: "school_start_ym" };

  const isMonthDifferenceTooLarge = (dateA, dateB) => {
    const monthIndexA = normalizers.toMonthIndex(dateA);
    const monthIndexB = normalizers.toMonthIndex(dateB);
    return (
      monthIndexA !== null && monthIndexB !== null && Math.abs(monthIndexA - monthIndexB) > MAX_ALLOWED_MONTH_DIFFERENCE_BETWEEN_LANGUAGES
    );
  };

  for (const otherLanguageResume of resumes.slice(1)) {
    for (const listSpec of RESUME_LIST_TABLE_SPECS) {
      const primaryRows = primaryResume.lists[listSpec.jsonListKey];
      const otherRows = otherLanguageResume.lists[listSpec.jsonListKey];
      const warningDetail = { list: listSpec.jsonListKey, languageCode: otherLanguageResume.languageCode };

      if (primaryRows.length !== otherRows.length) {
        parseWarnings.push({
          warningCode: "list_misaligned",
          message: `${listSpec.jsonListKey} 条数不一致: zh=${primaryRows.length} ${otherLanguageResume.languageCode}=${otherRows.length}`,
          detail: warningDetail
        });
        continue;
      }
      const startDateColumn = startDateColumnByListKey[listSpec.jsonListKey];
      const hasLargeDateDifference =
        startDateColumn &&
        primaryRows.some((primaryRow, rowIndex) => isMonthDifferenceTooLarge(primaryRow[startDateColumn], otherRows[rowIndex][startDateColumn]));
      if (hasLargeDateDifference) {
        parseWarnings.push({
          warningCode: "list_misaligned",
          message: `${listSpec.jsonListKey} 的 ${startDateColumn} 与主简历相差超过 ${MAX_ALLOWED_MONTH_DIFFERENCE_BETWEEN_LANGUAGES} 个月，可能错位`,
          detail: warningDetail
        });
      }
    }
  }
}

/**
 * @description 解析一份 v3 候选人 JSON
 * Parses one v3 candidate JSON
 * v3 の候補者 JSON を 1 件解析する
 * @param {object} resumeJson 文件内容 | File content | ファイルの内容
 * @param {string} sourceFileName 来源文件名（仅用于记录） | Source file name (for logging only) | 取り込み元ファイル名（記録用のみ）
 * @returns {object} parsedCandidate
 */
function parseResumeMergeV3(resumeJson, sourceFileName = "") {
  const parseWarnings = [];
  const mergeInfo = resumeJson.merge_info || {};
  const sourceResumes = (resumeJson.structured_data && resumeJson.structured_data.resumes) || [];
  if (!sourceResumes.length) throw new Error("structured_data.resumes 为空");

  const resumes = sourceResumes.map((sourceResume, resumeIndex) => {
    const parseContext = { warnings: parseWarnings, location: { resumeIndex, languageCode: sourceResume.resume_languge } };
    const lists = {};
    for (const listSpec of RESUME_LIST_TABLE_SPECS) {
      lists[listSpec.jsonListKey] = (sourceResume[listSpec.jsonListKey] || []).map(sourceRow => {
        const convertedRow = convertRowByColumnTypes(sourceRow, listSpec.columnTypes, parseContext);
        // 培训字段样本里没出现过，原样留底
        // Training fields never appear in the samples, so keep the original as is
        // 研修フィールドはサンプルに現れないため、元の内容をそのまま保存する
        if (listSpec.jsonListKey === "training_list") convertedRow.raw_json = JSON.stringify(sourceRow);
        return convertedRow;
      });
    }
    return {
      languageCode: normalizers.toTrimmedText(sourceResume.resume_languge) || "zh",
      // resumes[0] 恒为中文主简历
      // resumes[0] is always the main Chinese resume
      // resumes[0] は常に中国語のメイン履歴書
      isPrimary: resumeIndex === 0 ? 1 : 0,
      baseInfo: convertRowByColumnTypes(sourceResume.base_info || {}, RESUME_BASE_INFO_COLUMN_TYPES, parseContext),
      lists,
      communications: (sourceResume.communication_list || [])
        .map(item => ({
          communicate_time: normalizers.toTrimmedText(item.communicate_time),
          communicate_content: normalizers.toTrimmedText(item.communicate_content)
        }))
        .filter(item => item.communicate_content || item.communicate_time)
    };
  });

  collectLanguageAlignmentWarnings(resumes, parseWarnings);

  const primaryResume = resumes[0];
  const workExperiences = primaryResume.lists.work_experiences;
  const currentWork =
    workExperiences.find(work => !work.position_resigned) ||
    [...workExperiences].sort((workA, workB) => (workB.position_start || "").localeCompare(workA.position_start || ""))[0] ||
    {};
  const highestEducation =
    [...primaryResume.lists.education_list].sort((eduA, eduB) => (eduB.school_degree_rank || 0) - (eduA.school_degree_rank || 0))[0] || {};

  return {
    recordId: normalizers.toTrimmedText(resumeJson.record_id),
    sourceFileName,
    fullName: normalizers.toTrimmedText(mergeInfo.canonical_name) || primaryResume.baseInfo.full_name,
    englishName: normalizers.toTrimmedText(mergeInfo.english_name),
    gender: primaryResume.baseInfo.gender,
    birthDate: primaryResume.baseInfo.birth_date,
    city: primaryResume.baseInfo.city,
    currentCompany: currentWork.company_name || "",
    currentPosition: currentWork.position || "",
    highestDegree: highestEducation.school_degree_type || "",
    workYears: normalizers.calculateWorkYears(workExperiences),
    contacts: buildContactsFromMergeInfo(mergeInfo),
    resumes,
    warnings: parseWarnings
  };
}

module.exports = { parseResumeMergeV3 };
