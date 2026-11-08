'use strict';
const { registerServiceMethods } = require("./registerServiceMethods");

/**
 * 候选人模块对外接口（目前只有导入）。新增接口时，需同步 preload.js 与 frontend/src/http/Api.js 的同名方法。
 * Public interface of the candidate module (import only for now). When adding an interface, add a method with the same name to preload.js and frontend/src/http/Api.js.
 * 候補者モジュールの公開インターフェース（現在はインポートのみ）。インターフェースを追加するときは、preload.js と frontend/src/http/Api.js に同名のメソッドを追加すること。
 */
const CANDIDATE_API_METHOD_NAMES = [
  "candidateImportPickFiles",
  "candidateImportPickDirectory",
  "candidateImportRun",
  "candidateImportBatchesList",
  "candidateImportIssuesList"
];

function registerCandidateIpc(ipcMain, candidateImportService) {
  registerServiceMethods(ipcMain, "candidate", candidateImportService, CANDIDATE_API_METHOD_NAMES);
}

module.exports = { registerCandidateIpc, CANDIDATE_API_METHOD_NAMES };
