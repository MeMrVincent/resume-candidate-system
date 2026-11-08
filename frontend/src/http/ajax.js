import { ElMessage } from "element-plus";
import i18n from "@/i18n";

/**
 * 渲染进程调用 Electron 主进程的唯一出口（相当于 F 盘项目里 http/ajax.js 的 axios）。
 * 页面只调用 $API（http/Api.js）；$API 调用本方法；只有这里知道 window.electronApi。
 * The only exit through which the renderer calls the Electron main process (the counterpart of axios in http/ajax.js of the F-drive project).
 * Pages only call $API (http/Api.js); $API calls this method; only this file knows window.electronApi.
 * レンダラーが Electron のメインプロセスを呼び出す唯一の出口（F ドライブのプロジェクトの http/ajax.js における axios に相当）。
 * ページは $API（http/Api.js）だけを呼び、$API がこのメソッドを呼ぶ。window.electronApi を知っているのはこのファイルだけ。
 *
 * 主进程返回 { ok: true, data } 或 { ok: false, errorCode, message }，这里统一转成页面习惯的写法：
 * 成功 -> { code: 0, data }
 * 失败 -> 弹出错误提示，并返回 { code: -1, errorCode, message }
 * The main process returns { ok: true, data } or { ok: false, errorCode, message }; here it is converted to the form pages are used to:
 * success -> { code: 0, data }
 * failure -> shows an error message and returns { code: -1, errorCode, message }
 * メインプロセスは { ok: true, data } または { ok: false, errorCode, message } を返す。ここでページが使い慣れた形に統一変換する：
 * 成功 -> { code: 0, data }
 * 失敗 -> エラーメッセージを表示し、{ code: -1, errorCode, message } を返す
 *
 * @param {string} moduleName 模块名，对应 preload 里的 electronApi.<moduleName> 和 IPC 通道前缀，如 "company" | Module name, matching electronApi.<moduleName> in preload and the IPC channel prefix, e.g. "company" | モジュール名。preload の electronApi.<moduleName> と IPC チャンネル接頭辞に対応（例："company"）
 * @param {string} methodName 接口名，前后端全链路同名，如 "companiesSearch" | Interface name, identical along the whole frontend-backend chain, e.g. "companiesSearch" | インターフェース名。フロントとバックの全経路で同名（例："companiesSearch"）
 * @param {...any} methodArguments 传给后端 Service 方法的参数 | Arguments passed to the backend Service method | バックエンド Service メソッドに渡す引数
 */
export const invokeElectron = async (moduleName, methodName, ...methodArguments) => {
  const targetMethod = window.electronApi?.[moduleName]?.[methodName];
  if (typeof targetMethod !== "function") {
    showErrorMessage("PRELOAD_UNAVAILABLE", `${moduleName}.${methodName}`);
    return { code: -1, errorCode: "PRELOAD_UNAVAILABLE", message: `${moduleName}.${methodName}` };
  }
  try {
    const ipcResult = await targetMethod(...methodArguments);
    if (ipcResult.ok) return { code: 0, data: ipcResult.data };
    showErrorMessage(ipcResult.errorCode, ipcResult.message);
    return { code: -1, errorCode: ipcResult.errorCode, message: ipcResult.message };
  } catch (error) {
    showErrorMessage("INTERNAL_ERROR", error.message);
    return { code: -1, errorCode: "INTERNAL_ERROR", message: error.message };
  }
};

/**
 * 优先显示当前语言的错误码译文（errorCode.XXX），没有译文时显示后端给的原文
 * Shows the translation of the error code in the current language (errorCode.XXX) first; falls back to the original text from the backend when there is none
 * 現在の言語のエラーコード訳（errorCode.XXX）を優先して表示し、訳がなければバックエンドの原文を表示する
 */
function showErrorMessage(errorCode, fallbackMessage) {
  const translationKey = `errorCode.${errorCode}`;
  const { t, te } = i18n.global;
  ElMessage.error(te(translationKey) ? t(translationKey) : fallbackMessage || errorCode);
}
