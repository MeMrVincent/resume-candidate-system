'use strict';
const crypto = require("crypto");
const { RESUME_LIST_TABLE_SPECS, RESUME_BASE_INFO_COLUMN_TYPES } = require("../../candidate/resume/ResumeFieldSpecs");
const { buildCandidateRawText } = require("../../candidate/search/CandidateRawTextBuilder");
const { getCurrentIsoTimestamp } = require("../../common/DateTimeUtils");
const { generateUuid } = require("../../common/SqlHelpers");

const SYSTEM_USER_ID = 1;

/**
 * 候选人数据访问：所有候选人相关 SQL 都在这里。调用方负责开启事务。
 * Candidate data access: all candidate-related SQL lives here. The caller is responsible for opening the transaction.
 * 候補者のデータアクセス：候補者に関する SQL はすべてここにある。トランザクションの開始は呼び出し側の責任。
 */
class CandidateRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * @description 按导入记录 ID（merge-v3-xxx）查候选人，没有返回 null
   * Finds a candidate by import record ID (merge-v3-xxx); returns null if none
   * インポートレコード ID（merge-v3-xxx）で候補者を検索する。なければ null
   */
  findCandidateByRecordId(recordId) {
    if (!recordId) return null;
    return this.database.prepare("SELECT * FROM candidate_profiles WHERE record_id = ?").get(recordId) || null;
  }

  /**
   * @description 按联系方式查“拥有者”（共用联系方式不算拥有），没有返回 null
   * Finds the "owner" of a contact (a shared contact is not owned); returns null if none
   * 連絡先の「所有者」を検索する（共用の連絡先は所有とみなさない）。なければ null
   */
  findCandidateOwningContact(contactType, normalizedValue) {
    return (
      this.database
        .prepare(
          `SELECT profile.* FROM candidate_contacts contact
           JOIN candidate_profiles profile ON profile.id = contact.candidate_id
           WHERE contact.contact_type = ? AND contact.normalized_value = ? AND contact.is_shared = 0`
        )
        .get(contactType, normalizedValue) || null
    );
  }

  /**
   * @description 把解析好的候选人写入数据库：新建，或覆盖已存在的同一人（按 record_id，其次按主手机/主邮箱）。
   * 覆盖时只重建“导入来源”的联系方式、简历及其列表，手工新增的联系方式和沟通记录保留。
   * @description Writes a parsed candidate to the database: creates a new one, or overwrites the same person if already present (matched by record_id, then by primary mobile/email).
   * When overwriting, only import-sourced contacts, resumes and their lists are rebuilt; manually added contacts and communications are kept.
   * @description 解析済みの候補者をデータベースに書き込む：新規作成、または既存の同一人物を上書きする（record_id、次いで主携帯／主メールで判定）。
   * 上書き時はインポート由来の連絡先・履歴書・各リストだけを作り直し、手動追加した連絡先とコミュニケーション記録は残す。
   * @returns {{candidateId: number, isNewCandidate: boolean, warnings: Array}}
   */
  saveParsedCandidate(parsedCandidate, operatorUserId = SYSTEM_USER_ID) {
    const timestamp = getCurrentIsoTimestamp();
    const warnings = [];
    const existingCandidate = this.findExistingCandidate(parsedCandidate);

    const candidateId = existingCandidate
      ? this.overwriteCandidateProfile(existingCandidate.id, parsedCandidate, operatorUserId, timestamp)
      : this.insertCandidateProfile(parsedCandidate, operatorUserId, timestamp);

    this.insertCandidateContacts(candidateId, parsedCandidate.contacts, timestamp, warnings);
    this.insertResumesWithLists(candidateId, parsedCandidate.resumes, operatorUserId, timestamp);
    this.rebuildCandidateRawText(candidateId, parsedCandidate);
    return { candidateId, isNewCandidate: !existingCandidate, warnings };
  }

  /**
   * 优先按 record_id 找；找不到再看主手机/主邮箱是否已属于某人
   * Look up by record_id first; if not found, check whether the primary mobile/email already belongs to someone
   * まず record_id で検索し、見つからなければ主携帯／主メールがすでに誰かのものか確認する
   */
  findExistingCandidate(parsedCandidate) {
    const candidateByRecordId = this.findCandidateByRecordId(parsedCandidate.recordId);
    if (candidateByRecordId) return candidateByRecordId;
    for (const contact of parsedCandidate.contacts) {
      if (!contact.isPrimary || contact.isShared) continue;
      const owner = this.findCandidateOwningContact(contact.contactType, contact.normalizedValue);
      if (owner) return owner;
    }
    return null;
  }

  insertCandidateProfile(parsedCandidate, operatorUserId, timestamp) {
    const insertResult = this.database
      .prepare(
        `INSERT INTO candidate_profiles (candidate_uuid, record_id, full_name, english_name, gender, birth_date, city,
           current_company, current_position, highest_degree, work_years, source_type,
           owner_user_id, created_by, updated_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'import',?,?,?,?,?)`
      )
      .run(generateUuid(), ...this.toProfileColumnValues(parsedCandidate), SYSTEM_USER_ID, operatorUserId, operatorUserId, timestamp, timestamp);
    return Number(insertResult.lastInsertRowid);
  }

  /**
   * 覆盖已存在候选人的资料，并清掉导入来源的旧数据以便重建；返回候选人 ID
   * Overwrites an existing candidate's profile and clears the old import-sourced data so it can be rebuilt; returns the candidate ID
   * 既存候補者のプロフィールを上書きし、インポート由来の古いデータを消して再構築できるようにする。候補者 ID を返す
   */
  overwriteCandidateProfile(candidateId, parsedCandidate, operatorUserId, timestamp) {
    this.database
      .prepare(
        `UPDATE candidate_profiles SET record_id=?, full_name=?, english_name=?, gender=?, birth_date=?, city=?,
           current_company=?, current_position=?, highest_degree=?, work_years=?, primary_phone='', primary_email='',
           updated_by=?, updated_at=? WHERE id=?`
      )
      .run(...this.toProfileColumnValues(parsedCandidate), operatorUserId, timestamp, candidateId);
    this.database.prepare("DELETE FROM candidate_contacts WHERE candidate_id=? AND source='import'").run(candidateId);
    this.database.prepare("DELETE FROM candidate_resumes WHERE candidate_id=?").run(candidateId);
    this.database.prepare("DELETE FROM candidate_communications WHERE candidate_id=? AND source_type='imported_resume'").run(candidateId);
    return candidateId;
  }

  toProfileColumnValues(parsedCandidate) {
    return [
      parsedCandidate.recordId, parsedCandidate.fullName, parsedCandidate.englishName, parsedCandidate.gender,
      parsedCandidate.birthDate, parsedCandidate.city, parsedCandidate.currentCompany, parsedCandidate.currentPosition,
      parsedCandidate.highestDegree, parsedCandidate.workYears
    ];
  }

  /**
   * 写联系方式（规则 A）：手机/邮箱若已属于别的候选人，本档降级为“共用”（灰色、不能做主号）并记警告。
   * 座机多为公司总机，允许多人共有，不判冲突。同时回写候选人表上冗余的主手机、主邮箱。
   * Writes contacts (rule A): if a mobile/email already belongs to another candidate, it is downgraded to "shared" here (grey, cannot be primary) and a warning is recorded.
   * Landlines are often a company switchboard and may be shared by many, so they never conflict. Also writes back the redundant primary mobile/email on the candidate table.
   * 連絡先を書き込む（規則 A）：携帯／メールがすでに別の候補者のものなら、この候補者では「共用」に降格し（グレー表示、主番号にできない）、警告を記録する。
   * 固定電話は会社の代表番号であることが多く複数人で共有できるため、競合とは判定しない。候補者テーブルの冗長な主携帯・主メールも書き戻す。
   */
  insertCandidateContacts(candidateId, contacts, timestamp, warnings) {
    const insertContactStatement = this.database.prepare(
      `INSERT INTO candidate_contacts (candidate_id, contact_type, contact_value, normalized_value,
         is_primary, is_shared, source, created_at, updated_at) VALUES (?,?,?,?,?,?,'import',?,?)`
    );
    let primaryPhone = "";
    let primaryEmail = "";

    for (const contact of contacts) {
      let isShared = contact.isShared;
      let isPrimary = contact.isPrimary;

      if (!isShared && contact.contactType !== "landline") {
        const owner = this.database
          .prepare(
            `SELECT candidate_id FROM candidate_contacts
             WHERE contact_type=? AND normalized_value=? AND is_shared=0 AND candidate_id<>?`
          )
          .get(contact.contactType, contact.normalizedValue, candidateId);
        if (owner) {
          isShared = 1;
          isPrimary = 0;
          warnings.push({
            warningCode: "contact_conflict",
            message: `${contact.contactType} ${contact.contactValue} 已归属候选人 #${owner.candidate_id}，本档标记为共用`,
            detail: { contactType: contact.contactType, contactValue: contact.contactValue, ownerCandidateId: owner.candidate_id }
          });
        }
      }
      if (isPrimary) {
        const hasPrimaryOfSameType = this.database
          .prepare("SELECT 1 FROM candidate_contacts WHERE candidate_id=? AND contact_type=? AND is_primary=1")
          .get(candidateId, contact.contactType);
        if (hasPrimaryOfSameType) isPrimary = 0;
      }
      if (isShared) isPrimary = 0;

      insertContactStatement.run(candidateId, contact.contactType, contact.contactValue, contact.normalizedValue, isPrimary, isShared, timestamp, timestamp);
      if (isPrimary && contact.contactType === "mobile") primaryPhone = contact.normalizedValue;
      if (isPrimary && contact.contactType === "email") primaryEmail = contact.normalizedValue;
    }
    this.database.prepare("UPDATE candidate_profiles SET primary_phone=?, primary_email=? WHERE id=?").run(primaryPhone, primaryEmail, candidateId);
  }

  /**
   * 写简历版本、8 张列表子表、简历自带的沟通内容（标记为 imported_resume，不计入沟通次数）
   * Writes the resume versions, the 8 list tables and the communications bundled in the resume (marked imported_resume, not counted as communications)
   * 履歴書バージョン、8 つのリストテーブル、履歴書に含まれるコミュニケーション内容を書き込む（imported_resume として印を付け、コミュニケーション回数には数えない）
   */
  insertResumesWithLists(candidateId, resumes, operatorUserId, timestamp) {
    const baseInfoColumnNames = Object.keys(RESUME_BASE_INFO_COLUMN_TYPES);
    const insertResumeStatement = this.database.prepare(
      `INSERT INTO candidate_resumes (candidate_id, sequence_no, language_code, is_primary, ${baseInfoColumnNames.join(",")}, created_at, updated_at)
       VALUES (?,?,?,?,${baseInfoColumnNames.map(() => "?").join(",")},?,?)`
    );
    const insertCommunicationStatement = this.database.prepare(
      `INSERT INTO candidate_communications (candidate_id, resume_id, source_type, communicate_time, communicate_content,
         created_by, created_at, updated_at) VALUES (?,?,'imported_resume',?,?,?,?,?)`
    );

    resumes.forEach((resume, resumeSequenceNo) => {
      const insertResumeResult = insertResumeStatement.run(
        candidateId, resumeSequenceNo, resume.languageCode, resume.isPrimary,
        ...baseInfoColumnNames.map(columnName => resume.baseInfo[columnName]), timestamp, timestamp
      );
      const resumeId = Number(insertResumeResult.lastInsertRowid);

      for (const listSpec of RESUME_LIST_TABLE_SPECS) {
        const columnNames = Object.keys(listSpec.columnTypes);
        if (listSpec.jsonListKey === "training_list") columnNames.push("raw_json");
        const insertListRowStatement = this.database.prepare(
          `INSERT INTO ${listSpec.tableName} (resume_id, sequence_no, ${columnNames.join(",")})
           VALUES (?,?,${columnNames.map(() => "?").join(",")})`
        );
        resume.lists[listSpec.jsonListKey].forEach((listRow, rowSequenceNo) => {
          insertListRowStatement.run(resumeId, rowSequenceNo, ...columnNames.map(columnName => listRow[columnName]));
        });
      }
      for (const communication of resume.communications) {
        insertCommunicationStatement.run(
          candidateId, resumeId, communication.communicate_time, communication.communicate_content, operatorUserId, timestamp, timestamp
        );
      }
    });
  }

  /**
   * @description 全量重建候选人的检索全文 raw_text（任何候选人数据变更后都要调用，不做增量追加）
   * Fully rebuilds the candidate's full-text search raw_text (must be called after any candidate data change; never appended incrementally)
   * 候補者の検索用全文 raw_text を全量再構築する（候補者データの変更後は必ず呼ぶ。増分追記はしない）
   */
  rebuildCandidateRawText(candidateId, parsedCandidate) {
    const rawText = buildCandidateRawText(parsedCandidate);
    const textHash = crypto.createHash("sha256").update(rawText).digest("hex");
    this.database
      .prepare(
        `INSERT INTO candidate_search_documents (candidate_id, raw_text, text_hash, updated_at) VALUES (?,?,?,?)
         ON CONFLICT(candidate_id) DO UPDATE SET raw_text=excluded.raw_text, text_hash=excluded.text_hash, updated_at=excluded.updated_at`
      )
      .run(candidateId, rawText, textHash, getCurrentIsoTimestamp());
    return rawText;
  }
}

module.exports = { CandidateRepository };
