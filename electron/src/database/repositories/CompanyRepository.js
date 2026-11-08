'use strict';
const { buildUpdateAssignments } = require("../../common/SqlHelpers");
const { getCurrentIsoTimestamp } = require("../../common/DateTimeUtils");

const UPDATABLE_COMPANY_COLUMNS = [
  "company_name", "short_name", "industry", "company_size", "country", "province", "city", "address", "website", "description", "status"
];
const UPDATABLE_COMPANY_CONTACT_COLUMNS = [
  "contact_name", "title", "department", "phone", "email", "wechat", "is_primary", "status", "note"
];

/**
 * 公司、公司对接人、公司备注的数据访问。所有相关 SQL 都在这里；调用方负责事务。
 * Data access for companies, company contacts and company notes. All related SQL lives here; the caller handles transactions.
 * 企業・企業の担当者・企業メモのデータアクセス。関連する SQL はすべてここにある。トランザクションは呼び出し側が扱う。
 */
class CompanyRepository {
  constructor(database) {
    this.database = database;
  }

  // ---------- 公司 | Companies | 企業 ----------

  insertCompany(companyUuid, companyFields, operatorUserId) {
    const timestamp = getCurrentIsoTimestamp();
    const columnNames = UPDATABLE_COMPANY_COLUMNS.filter(columnName => companyFields[columnName] !== undefined);
    const insertResult = this.database
      .prepare(
        `INSERT INTO company_profiles (company_uuid, ${columnNames.join(",")}, owner_user_id, created_by, updated_by, created_at, updated_at)
         VALUES (?, ${columnNames.map(() => "?").join(",")}, ?, ?, ?, ?, ?)`
      )
      .run(companyUuid, ...columnNames.map(columnName => companyFields[columnName]), operatorUserId, operatorUserId, operatorUserId, timestamp, timestamp);
    return Number(insertResult.lastInsertRowid);
  }

  updateCompany(companyId, companyFields, operatorUserId) {
    const assignments = buildUpdateAssignments(companyFields, UPDATABLE_COMPANY_COLUMNS);
    if (!assignments.columnNames.length) return;
    this.database
      .prepare(`UPDATE company_profiles SET ${assignments.assignmentSql}, updated_by=?, updated_at=? WHERE id=?`)
      .run(...assignments.values, operatorUserId, getCurrentIsoTimestamp(), companyId);
  }

  /**
   * 公司详情（含职位数量统计，来自视图 v_company_position_counts），不存在返回 null
   * Company detail (with position counts from the view v_company_position_counts); returns null if it does not exist
   * 企業の詳細（ビュー v_company_position_counts による求人数を含む）。存在しなければ null
   */
  findCompanyById(companyId) {
    return (
      this.database
        .prepare(
          `SELECT company.*, counts.position_total, counts.position_open FROM company_profiles company
           JOIN v_company_position_counts counts ON counts.company_id = company.id WHERE company.id = ?`
        )
        .get(companyId) || null
    );
  }

  /**
   * 公司列表：按名称模糊搜索、按状态过滤、分页
   * Company list: fuzzy search by name, filter by status, paging
   * 企業一覧：名称のあいまい検索、ステータスによる絞り込み、ページング
   */
  searchCompanies({ keyword = "", status = "", limit = 50, skip = 0 } = {}) {
    const conditions = [];
    const conditionValues = [];
    if (keyword) {
      conditions.push("(company.company_name LIKE ? OR company.short_name LIKE ?)");
      conditionValues.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      conditions.push("company.status = ?");
      conditionValues.push(status);
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = this.database.prepare(`SELECT COUNT(*) AS total FROM company_profiles company ${whereSql}`).get(...conditionValues).total;
    const rows = this.database
      .prepare(
        `SELECT company.*, counts.position_total, counts.position_open FROM company_profiles company
         JOIN v_company_position_counts counts ON counts.company_id = company.id ${whereSql}
         ORDER BY company.updated_at DESC, company.id DESC LIMIT ? OFFSET ?`
      )
      .all(...conditionValues, limit, skip);
    return { rows, total };
  }

  countPositionsOfCompany(companyId) {
    return this.database.prepare("SELECT COUNT(*) AS total FROM position_openings WHERE company_id=?").get(companyId).total;
  }

  deleteCompany(companyId) {
    this.database.prepare("DELETE FROM company_profiles WHERE id=?").run(companyId);
  }

  // ---------- 公司对接人 | Company contacts | 企業の担当者 ----------

  insertCompanyContact(companyId, contactFields) {
    const timestamp = getCurrentIsoTimestamp();
    const columnNames = UPDATABLE_COMPANY_CONTACT_COLUMNS.filter(columnName => contactFields[columnName] !== undefined);
    const insertResult = this.database
      .prepare(
        `INSERT INTO company_contacts (company_id, ${columnNames.join(",")}, created_at, updated_at)
         VALUES (?, ${columnNames.map(() => "?").join(",")}, ?, ?)`
      )
      .run(companyId, ...columnNames.map(columnName => contactFields[columnName]), timestamp, timestamp);
    return Number(insertResult.lastInsertRowid);
  }

  updateCompanyContact(contactId, contactFields) {
    const assignments = buildUpdateAssignments(contactFields, UPDATABLE_COMPANY_CONTACT_COLUMNS);
    if (!assignments.columnNames.length) return;
    this.database
      .prepare(`UPDATE company_contacts SET ${assignments.assignmentSql}, updated_at=? WHERE id=?`)
      .run(...assignments.values, getCurrentIsoTimestamp(), contactId);
  }

  findCompanyContactById(contactId) {
    return this.database.prepare("SELECT * FROM company_contacts WHERE id=?").get(contactId) || null;
  }

  /**
   * 某公司的对接人列表（主对接人排最前），附带每人负责的职位数
   * Contacts of a company (the primary contact first), with the number of positions each one owns
   * 企業の担当者一覧（主担当を先頭）。各担当者が受け持つ求人数を付ける
   */
  listCompanyContacts(companyId) {
    return this.database
      .prepare(
        `SELECT contact.*, (SELECT COUNT(*) FROM position_openings position WHERE position.contact_id = contact.id) AS position_count
         FROM company_contacts contact WHERE contact.company_id = ? ORDER BY contact.is_primary DESC, contact.id`
      )
      .all(companyId);
  }

  clearPrimaryCompanyContact(companyId) {
    this.database.prepare("UPDATE company_contacts SET is_primary=0 WHERE company_id=?").run(companyId);
  }

  countCompanyContacts(companyId) {
    return this.database.prepare("SELECT COUNT(*) AS total FROM company_contacts WHERE company_id=?").get(companyId).total;
  }

  countPositionsOfCompanyContact(contactId) {
    return this.database.prepare("SELECT COUNT(*) AS total FROM position_openings WHERE contact_id=?").get(contactId).total;
  }

  deleteCompanyContact(contactId) {
    this.database.prepare("DELETE FROM company_contacts WHERE id=?").run(contactId);
  }

  // ---------- 公司备注 | Company notes | 企業メモ ----------

  insertCompanyNote(companyId, noteFields, operatorUserId) {
    const timestamp = getCurrentIsoTimestamp();
    const insertResult = this.database
      .prepare(
        `INSERT INTO company_notes (company_id, noted_at, note_type, content, created_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(companyId, noteFields.noted_at || timestamp, noteFields.note_type || "note", noteFields.content, operatorUserId, timestamp, timestamp);
    return Number(insertResult.lastInsertRowid);
  }

  listCompanyNotes(companyId) {
    return this.database.prepare("SELECT * FROM company_notes WHERE company_id=? ORDER BY noted_at DESC, id DESC").all(companyId);
  }

  deleteCompanyNote(noteId) {
    this.database.prepare("DELETE FROM company_notes WHERE id=?").run(noteId);
  }
}

module.exports = { CompanyRepository };
