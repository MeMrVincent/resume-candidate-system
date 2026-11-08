'use strict';
const { AppError } = require("../common/AppError");
const { generateUuid, isUniqueConstraintError } = require("../common/SqlHelpers");
const { CompanyRepository } = require("../database/repositories/CompanyRepository");

// 单机版所有操作都归属系统用户；后期做权限时由登录用户替换
// All operations of the standalone edition belong to the system user; replaced by the logged-in user once permissions are added
// スタンドアロン版では全操作がシステムユーザーに帰属する。後で権限管理を入れるときにログインユーザーへ置き換える
const SYSTEM_USER_ID = 1;

/**
 * 公司管理业务。
 * 方法名 = 前端 companyApi 方法名 = IPC 通道名（company:方法名）= preload 方法名，全链路同名。
 * Company management business logic.
 * Method name = frontend $API method name = IPC channel name (company:methodName) = preload method name: one name along the whole chain.
 * 企業管理の業務ロジック。
 * メソッド名 = フロントエンドの $API メソッド名 = IPC チャンネル名（company:メソッド名）= preload メソッド名。全経路で同じ名前。
 */
class CompanyService {
  constructor(database) {
    this.database = database;
    this.companyRepository = new CompanyRepository(database);
  }

  /**
   * @description 公司列表。params: { keyword, status, page: { limit, skip } } @returns {{rows, total}}
   * Company list. params: { keyword, status, page: { limit, skip } } @returns {{rows, total}}
   * 企業一覧。params: { keyword, status, page: { limit, skip } } @returns {{rows, total}}
   */
  companiesSearch(params = {}) {
    const { page = {}, keyword, status } = params;
    return this.companyRepository.searchCompanies({ keyword, status, limit: page.limit || 50, skip: page.skip || 0 });
  }

  /**
   * @description 公司详情，含对接人列表与备注
   * Company detail, including the contact list and notes
   * 企業の詳細。担当者一覧とメモを含む
   */
  companyGet(companyId) {
    const company = this.requireCompany(companyId);
    return {
      ...company,
      contacts: this.companyRepository.listCompanyContacts(companyId),
      notes: this.companyRepository.listCompanyNotes(companyId)
    };
  }

  /**
   * @description 新建公司，返回新公司 ID
   * Creates a company and returns the new company ID
   * 企業を新規作成し、新しい企業 ID を返す
   */
  companyCreate(companyFields) {
    const companyName = String(companyFields.company_name || "").trim();
    if (!companyName) throw new AppError("VALIDATION", "公司名称不能为空");
    try {
      return this.companyRepository.insertCompany(generateUuid(), { ...companyFields, company_name: companyName }, SYSTEM_USER_ID);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AppError("DUPLICATE", `公司「${companyName}」已存在`);
      throw error;
    }
  }

  companyUpdate(companyId, companyFields) {
    this.requireCompany(companyId);
    if (companyFields.company_name !== undefined && !String(companyFields.company_name).trim()) {
      throw new AppError("VALIDATION", "公司名称不能为空");
    }
    try {
      this.companyRepository.updateCompany(companyId, companyFields, SYSTEM_USER_ID);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AppError("DUPLICATE", "公司名称已存在");
      throw error;
    }
  }

  /**
   * @description 删除公司：名下已有职位时只做软删除（状态置为 inactive，保留历史数据），没有职位才物理删除
   * Deletes a company: if it has positions it is only soft-deleted (status set to inactive, history kept); it is physically deleted only when it has no positions
   * 企業を削除する：求人がある場合は論理削除のみ（ステータスを inactive にして履歴を保持）。求人がない場合に限り物理削除する
   * @returns {{deleteMode: 'deactivated'|'deleted'}}
   */
  companyDelete(companyId) {
    this.requireCompany(companyId);
    if (this.companyRepository.countPositionsOfCompany(companyId) > 0) {
      this.companyRepository.updateCompany(companyId, { status: "inactive" }, SYSTEM_USER_ID);
      return { deleteMode: "deactivated" };
    }
    this.companyRepository.deleteCompany(companyId);
    return { deleteMode: "deleted" };
  }

  // ---------- 对接人 | Contacts | 担当者 ----------

  companyContactsList(companyId) {
    return this.companyRepository.listCompanyContacts(companyId);
  }

  /**
   * @description 新增对接人。公司的第一个对接人自动设为主对接人；设为主对接人时取消原主对接人。返回新对接人 ID
   * Adds a contact. The first contact of a company automatically becomes the primary contact; setting a new primary contact unsets the old one. Returns the new contact ID
   * 担当者を追加する。企業の最初の担当者は自動的に主担当になる。新しく主担当にすると以前の主担当は解除される。新しい担当者 ID を返す
   */
  companyContactAdd(companyId, contactFields) {
    this.requireCompany(companyId);
    if (!String(contactFields.contact_name || "").trim()) throw new AppError("VALIDATION", "对接人姓名不能为空");
    return this.database.transaction(() => {
      const isFirstContactOfCompany = this.companyRepository.countCompanyContacts(companyId) === 0;
      const shouldBePrimary = contactFields.is_primary || isFirstContactOfCompany ? 1 : 0;
      if (shouldBePrimary) this.companyRepository.clearPrimaryCompanyContact(companyId);
      return this.companyRepository.insertCompanyContact(companyId, { ...contactFields, is_primary: shouldBePrimary });
    })();
  }

  companyContactUpdate(contactId, contactFields) {
    const contact = this.companyRepository.findCompanyContactById(contactId);
    if (!contact) throw new AppError("NOT_FOUND", "对接人不存在");
    this.database.transaction(() => {
      if (contactFields.is_primary) this.companyRepository.clearPrimaryCompanyContact(contact.company_id);
      this.companyRepository.updateCompanyContact(contactId, contactFields);
    })();
  }

  /**
   * @description 删除对接人。正在负责职位的对接人不能删（IN_USE），应先更换职位负责人或标记为已离职
   * Deletes a contact. A contact who still owns positions cannot be deleted (IN_USE); change the position owner first or mark the contact as left
   * 担当者を削除する。求人を担当中の担当者は削除できない（IN_USE）。先に求人の担当者を変更するか、退職済みにすること
   */
  companyContactDelete(contactId) {
    const contact = this.companyRepository.findCompanyContactById(contactId);
    if (!contact) throw new AppError("NOT_FOUND", "对接人不存在");
    if (this.companyRepository.countPositionsOfCompanyContact(contactId) > 0) {
      throw new AppError("IN_USE", "该对接人正在负责职位，请先更换职位负责人，或将其标记为已离职");
    }
    this.companyRepository.deleteCompanyContact(contactId);
  }

  // ---------- 备注 | Notes | メモ ----------

  companyNoteAdd(companyId, noteFields) {
    this.requireCompany(companyId);
    if (!String(noteFields.content || "").trim()) throw new AppError("VALIDATION", "备注内容不能为空");
    return this.companyRepository.insertCompanyNote(companyId, noteFields, SYSTEM_USER_ID);
  }

  companyNoteDelete(noteId) {
    this.companyRepository.deleteCompanyNote(noteId);
  }

  requireCompany(companyId) {
    const company = this.companyRepository.findCompanyById(companyId);
    if (!company) throw new AppError("NOT_FOUND", "公司不存在");
    return company;
  }
}

module.exports = { CompanyService };
