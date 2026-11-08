'use strict';
const { registerServiceMethods } = require("./registerServiceMethods");

/**
 * 公司模块对外接口。新增接口时，需同步 preload.js 与 frontend/src/api/companyApi.js 的同名方法。
 * Public interface of the company module. When adding an interface, add a method with the same name to preload.js and frontend/src/http/Api.js.
 * 企業モジュールの公開インターフェース。インターフェースを追加するときは、preload.js と frontend/src/http/Api.js に同名のメソッドを追加すること。
 */
const COMPANY_API_METHOD_NAMES = [
  "companiesSearch",
  "companyGet",
  "companyCreate",
  "companyUpdate",
  "companyDelete",
  "companyContactsList",
  "companyContactAdd",
  "companyContactUpdate",
  "companyContactDelete",
  "companyNoteAdd",
  "companyNoteDelete"
];

function registerCompanyIpc(ipcMain, companyService) {
  registerServiceMethods(ipcMain, "company", companyService, COMPANY_API_METHOD_NAMES);
}

module.exports = { registerCompanyIpc, COMPANY_API_METHOD_NAMES };
