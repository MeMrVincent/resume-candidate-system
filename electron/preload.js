/**
 * Electron Preload 安全桥接脚本。向渲染进程暴露受控的 window.electronApi 对象。
 *
 * EN: Electron Preload secure bridge. Exposes the controlled window.electronApi object to the renderer.
 *
 * JA: Electron Preload セキュアブリッジ。レンダラープロセスへ安全に制御された window.electronApi を公開。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApi', {
  candidate: {
    candidatesSearch: (params) => ipcRenderer.invoke('candidate:candidatesSearch', params),
    candidatesCount: () => ipcRenderer.invoke('candidate:candidatesCount'),
    candidateGet: (id) => ipcRenderer.invoke('candidate:candidateGet', id),
    candidateResumeGet: (id, resumeId) => ipcRenderer.invoke('candidate:candidateResumeGet', id, resumeId),
    candidateResumeBaseInfoUpdate: (id, resumeId, data) =>
      ipcRenderer.invoke('candidate:candidateResumeBaseInfoUpdate', id, resumeId, data),
    candidateCommunicationAdd: (id, data) =>
      ipcRenderer.invoke('candidate:candidateCommunicationAdd', id, data),
    candidateCommunicationUpdate: (id, communicationId, data) =>
      ipcRenderer.invoke('candidate:candidateCommunicationUpdate', id, communicationId, data),
    candidateCommunicationDelete: (id, communicationId) =>
      ipcRenderer.invoke('candidate:candidateCommunicationDelete', id, communicationId),
    candidateResumeWorkExperiencesUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeWorkExperiencesUpdate', id, resumeId, items),
    candidateResumeEducationsUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeEducationsUpdate', id, resumeId, items),
    candidateResumeProjectsUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeProjectsUpdate', id, resumeId, items),
    candidateResumeTrainingsUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeTrainingsUpdate', id, resumeId, items),
    candidateResumeCertificatesUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeCertificatesUpdate', id, resumeId, items),
    candidateResumeSkillsUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeSkillsUpdate', id, resumeId, items),
    candidateResumeLanguagesUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeLanguagesUpdate', id, resumeId, items),
    candidateResumeExpectationsUpdate: (id, resumeId, items) =>
      ipcRenderer.invoke('candidate:candidateResumeExpectationsUpdate', id, resumeId, items),
  },
  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getDatabasePath: () => ipcRenderer.invoke('system:getDatabasePath'),
  },
});
