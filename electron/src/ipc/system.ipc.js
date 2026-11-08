'use strict';
const { registerServiceMethods } = require("./registerServiceMethods");

/**
 * 系统模块对外接口。新增接口时，需同步 preload.js 与 frontend/src/http/Api.js 的同名方法。
 * Public interface of the system module. When adding an interface, add a method with the same name to preload.js and frontend/src/http/Api.js.
 * システムモジュールの公開インターフェース。インターフェースを追加するときは、preload.js と frontend/src/http/Api.js に同名のメソッドを追加すること。
 */
const SYSTEM_API_METHOD_NAMES = ["getVersion", "getDatabasePath"];

function registerSystemIpc(ipcMain, systemService) {
  registerServiceMethods(ipcMain, "system", systemService, SYSTEM_API_METHOD_NAMES);
}

module.exports = { registerSystemIpc, SYSTEM_API_METHOD_NAMES };
