'use strict';
const { contextBridge, ipcRenderer } = require("electron");

/**
 * 为一个模块生成 preload 方法：method(...args) -> ipcRenderer.invoke('模块:method', ...args)
 * 沙箱下 preload 不能 require 本地文件，所以方法名清单在此处内联。
 * 清单必须与 src/ipc/*.ipc.js、frontend/src/api/*Api.js 完全一致（test/api-consistency.test.js 会校验）。
 * Builds the preload methods of one module: method(...args) -> ipcRenderer.invoke('module:method', ...args)
 * A sandboxed preload cannot require local files, so the method name list is inlined here.
 * The list must match src/ipc/*.ipc.js and frontend/src/http/Api.js exactly (checked by test/api-consistency.test.js).
 * 1 つのモジュールの preload メソッドを生成する：method(...args) -> ipcRenderer.invoke('モジュール:method', ...args)
 * サンドボックス下の preload はローカルファイルを require できないため、メソッド名の一覧をここにインラインで置く。
 * 一覧は src/ipc/*.ipc.js および frontend/src/http/Api.js と完全に一致させること（test/api-consistency.test.js が検証する）。
 */
function createModuleApi(moduleName, methodNames) {
  const moduleApi = {};
  for (const methodName of methodNames) {
    moduleApi[methodName] = (...methodArguments) => ipcRenderer.invoke(`${moduleName}:${methodName}`, ...methodArguments);
  }
  return moduleApi;
}

contextBridge.exposeInMainWorld("electronApi", {
  company: createModuleApi("company", [
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
  ]),
  candidate: createModuleApi("candidate", [
    "candidateImportPickFiles",
    "candidateImportPickDirectory",
    "candidateImportRun",
    "candidateImportBatchesList",
    "candidateImportIssuesList"
  ]),
  system: createModuleApi("system", ["getVersion", "getDatabasePath"])
});
