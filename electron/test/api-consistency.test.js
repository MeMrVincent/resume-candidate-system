'use strict';
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { COMPANY_API_METHOD_NAMES } = require("../src/ipc/company.ipc");
const { CANDIDATE_API_METHOD_NAMES } = require("../src/ipc/candidate.ipc");
const { CandidateImportService } = require("../src/services/CandidateImportService");
const { CompanyService } = require("../src/services/CompanyService");

const frontendApiSource = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "src", "http", "Api.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(__dirname, "..", "preload.js"), "utf8");

/**
 * 从 frontend Api.js 提取某模块的接口名，同时校验“对象键名 == invokeElectron 第二个参数”
 * Extracts the interface names of a module from frontend Api.js and checks "object key == 2nd argument of invokeElectron"
 * フロントエンド Api.js からモジュールのインターフェース名を抽出し、「オブジェクトのキー == invokeElectron の第 2 引数」を検証する
 */
function extractFrontendApiMethodNames(moduleName) {
  const pattern = new RegExp(`(\\w+):\\s*\\([^)]*\\)\\s*=>\\s*invokeElectron\\("${moduleName}",\\s*"(\\w+)"|(\\w+):\\s*\\w+\\s*=>\\s*invokeElectron\\("${moduleName}",\\s*"(\\w+)"`, "g");
  const names = [];
  for (const match of frontendApiSource.matchAll(pattern)) {
    const objectKey = match[1] || match[3];
    const channelMethodName = match[2] || match[4];
    assert.equal(objectKey, channelMethodName, `Api.js 中 ${objectKey} 与 invokeElectron 的接口名 ${channelMethodName} 不一致`);
    names.push(channelMethodName);
  }
  return names;
}

/** 从 preload.js 提取 createModuleApi("模块", [ ... ]) 里的方法名 / Extracts the method names of createModuleApi("module", [ ... ]) from preload.js / preload.js の createModuleApi("モジュール", [ ... ]) からメソッド名を抽出する */
function extractPreloadMethodNames(moduleName) {
  const block = preloadSource.match(new RegExp(`${moduleName}: createModuleApi\\("${moduleName}", \\[([\\s\\S]*?)\\]\\)`));
  assert.ok(block, `preload.js 中找不到模块 ${moduleName}`);
  return [...block[1].matchAll(/"(\w+)"/g)].map(match => match[1]);
}

test("company module: frontend Api, preload, IPC list and Service use identical method names", () => {
  const frontendNames = extractFrontendApiMethodNames("company").sort();
  const preloadNames = extractPreloadMethodNames("company").sort();
  const ipcNames = [...COMPANY_API_METHOD_NAMES].sort();
  assert.deepEqual(frontendNames, ipcNames);
  assert.deepEqual(preloadNames, ipcNames);
  for (const methodName of ipcNames) assert.equal(typeof CompanyService.prototype[methodName], "function", `CompanyService 缺少方法 ${methodName}`);
});

test("system module: frontend Api and preload agree", () => {
  assert.deepEqual(extractFrontendApiMethodNames("system").sort(), extractPreloadMethodNames("system").sort());
});

test("candidate module: frontend Api, preload, IPC list and Service use identical method names", () => {
  const ipcNames = [...CANDIDATE_API_METHOD_NAMES].sort();
  assert.deepEqual(extractFrontendApiMethodNames("candidate").sort(), ipcNames);
  assert.deepEqual(extractPreloadMethodNames("candidate").sort(), ipcNames);
  for (const methodName of ipcNames) assert.equal(typeof CandidateImportService.prototype[methodName], "function", `CandidateImportService 缺少方法 ${methodName}`);
});
