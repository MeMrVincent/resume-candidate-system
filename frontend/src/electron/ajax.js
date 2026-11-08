export class ElectronServiceError extends Error {
  constructor(service, method, cause) {
    super(cause?.message || `Electron service call failed: ${service}.${method}`);
    this.name = 'ElectronServiceError';
    this.service = service;
    this.method = method;
    this.cause = cause;
  }
}

/**
 * 渲染进程端的 IPC 调用桥接。Vue 页面调用领域 API 模块；API 模块调用本桥接；只有本文件感知 window.electronApi。
 *
 * EN: Renderer-side equivalent of http/ajax.js. Vue pages call API modules;
 * API modules call this bridge; only this file knows about window.electronApi.
 *
 * JA: レンダラープロセス側の IPC 呼び出しブリッジ。Vue ページは API モジュールを呼び出し、
 * API モジュールはこのブリッジを呼び出します。window.electronApi を直接参照するのは本ファイルのみです。
 */
export const invokeElectron = async (service, methodPath, ...args) => {
  const methodParts = methodPath.split('.');
  let target = window.electronApi?.[service];
  for (const part of methodParts) target = target?.[part];

  if (typeof target !== 'function') {
    throw new ElectronServiceError(
      service,
      methodPath,
      new Error('Electron preload service is unavailable')
    );
  }

  try {
    return await target(...args);
  } catch (error) {
    throw new ElectronServiceError(service, methodPath, error);
  }
};
