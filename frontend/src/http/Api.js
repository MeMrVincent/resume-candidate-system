import { invokeElectron } from "./ajax";

/**
 * 全部后端接口。命名规则：实体在前、动作在后，如 companyCreate；
 * 方法名 = invokeElectron 的第二个参数 = preload 方法名 = IPC 通道后缀 = 后端 Service 方法名。
 * 新增接口时四处同步修改，test/api-consistency.test.js 会校验是否一致。
 * All backend interfaces. Naming rule: entity first, action last, e.g. companyCreate;
 * method name = 2nd argument of invokeElectron = preload method name = IPC channel suffix = backend Service method name.
 * When adding an interface, change all four places together; test/api-consistency.test.js checks they are consistent.
 * すべてのバックエンドインターフェース。命名規則：エンティティが先、動作が後（例：companyCreate）。
 * メソッド名 = invokeElectron の第 2 引数 = preload メソッド名 = IPC チャンネル接尾辞 = バックエンド Service のメソッド名。
 * インターフェースを追加するときは 4 か所を同時に変更する。test/api-consistency.test.js が一致を検証する。
 */
export const $API = {
  /** == Company ================================================================================================= **/
  companiesSearch: params => invokeElectron("company", "companiesSearch", params),
  companyGet: companyId => invokeElectron("company", "companyGet", companyId),
  companyCreate: companyFields => invokeElectron("company", "companyCreate", companyFields),
  companyUpdate: (companyId, companyFields) => invokeElectron("company", "companyUpdate", companyId, companyFields),
  companyDelete: companyId => invokeElectron("company", "companyDelete", companyId),
  companyContactsList: companyId => invokeElectron("company", "companyContactsList", companyId),
  companyContactAdd: (companyId, contactFields) => invokeElectron("company", "companyContactAdd", companyId, contactFields),
  companyContactUpdate: (contactId, contactFields) => invokeElectron("company", "companyContactUpdate", contactId, contactFields),
  companyContactDelete: contactId => invokeElectron("company", "companyContactDelete", contactId),
  companyNoteAdd: (companyId, noteFields) => invokeElectron("company", "companyNoteAdd", companyId, noteFields),
  companyNoteDelete: noteId => invokeElectron("company", "companyNoteDelete", noteId),

  /** == Candidate ============================================================================================== **/
  candidateImportPickFiles: () => invokeElectron("candidate", "candidateImportPickFiles"),
  candidateImportPickDirectory: () => invokeElectron("candidate", "candidateImportPickDirectory"),
  candidateImportRun: selectedPaths => invokeElectron("candidate", "candidateImportRun", selectedPaths),
  candidateImportBatchesList: () => invokeElectron("candidate", "candidateImportBatchesList"),
  candidateImportIssuesList: importBatchId => invokeElectron("candidate", "candidateImportIssuesList", importBatchId),

  /** == System =================================================================================================== **/
  getVersion: () => invokeElectron("system", "getVersion"),
  getDatabasePath: () => invokeElectron("system", "getDatabasePath")
};
