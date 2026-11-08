'use strict';
const { AppError } = require("../common/AppError");

/**
 * @description 把 Service 的若干方法注册为 IPC 通道，通道名 = `${moduleName}:${方法名}`。
 * 前端 api 方法名、preload 方法名、IPC 通道后缀、Service 方法名四者必须相同（由 test/api-consistency.test.js 校验）。
 * @description Registers some Service methods as IPC channels; channel name = `${moduleName}:${methodName}`.
 * The frontend api method name, preload method name, IPC channel suffix and Service method name must be identical (checked by test/api-consistency.test.js).
 * @description Service のいくつかのメソッドを IPC チャンネルとして登録する。チャンネル名 = `${moduleName}:${メソッド名}`。
 * フロントエンドの api メソッド名・preload メソッド名・IPC チャンネル接尾辞・Service メソッド名の 4 つは同一でなければならない（test/api-consistency.test.js が検証する）。
 *
 * 返回值统一封装，渲染进程的 invokeElectron 会拆包：
 * 成功 { ok: true, data }；失败 { ok: false, errorCode, message }（业务异常 AppError 的 errorCode，其他异常为 INTERNAL_ERROR）
 * Return values are wrapped uniformly and unwrapped by invokeElectron in the renderer:
 *   success { ok: true, data }; failure { ok: false, errorCode, message } (errorCode of a business AppError, INTERNAL_ERROR for other errors)
 * 戻り値は統一的にラップされ、レンダラー側の invokeElectron が展開する：
 *   成功 { ok: true, data }；失敗 { ok: false, errorCode, message }（業務例外 AppError の errorCode。その他の例外は INTERNAL_ERROR）
 */
function registerServiceMethods(ipcMain, moduleName, service, methodNames) {
  for (const methodName of methodNames) {
    if (typeof service[methodName] !== "function") {
      throw new Error(`IPC 注册失败：${service.constructor.name} 没有方法 ${methodName}`);
    }
    ipcMain.handle(`${moduleName}:${methodName}`, async (_event, ...methodArguments) => {
      try {
        return { ok: true, data: await service[methodName](...methodArguments) };
      } catch (error) {
        if (error instanceof AppError) return { ok: false, errorCode: error.errorCode, message: error.message };
        console.error(`[IPC] ${moduleName}:${methodName} 执行失败`, error);
        return { ok: false, errorCode: "INTERNAL_ERROR", message: error.message };
      }
    });
  }
}

module.exports = { registerServiceMethods };
