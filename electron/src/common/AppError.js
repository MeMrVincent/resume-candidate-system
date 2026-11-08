'use strict';

/**
 * @description 业务异常。errorCode 供前端判断处理方式，message 直接展示给用户。
 * 常用 errorCode：VALIDATION 参数不合法；NOT_FOUND 数据不存在；DUPLICATE 重复；IN_USE 被其他数据引用；INVALID_TRANSITION 状态流转不合法
 * @description Business exception. errorCode lets the frontend decide how to handle it; message is shown to the user as is.
 * Common errorCodes: VALIDATION invalid input; NOT_FOUND data not found; DUPLICATE duplicate; IN_USE referenced by other data; INVALID_TRANSITION illegal status transition
 * @description 業務例外。errorCode はフロントエンドが処理方法を判断するために使い、message はそのままユーザーに表示する。
 * 主な errorCode：VALIDATION 入力不正；NOT_FOUND データなし；DUPLICATE 重複；IN_USE 他のデータから参照中；INVALID_TRANSITION 不正なステータス遷移
 */
class AppError extends Error {
  constructor(errorCode, message) {
    super(message);
    this.errorCode = errorCode;
  }
}

module.exports = { AppError };
