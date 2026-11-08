/**
 * 注册候选人领域 IPC 消息处理通道（搜索、获取画像、更新各语言简历与沟通记录）。
 *
 * EN: Register Candidate domain IPC message channels (search, fetch profile, update CV variants and notes).
 *
 * JA: 候補者ドメインの IPC メッセージチャネルを登録（検索、プロファイル取得、各言語履歴書およびメモの更新）。
 */
function registerCandidateIpc(ipcMain, candidateService, candidateSearchService) {
  ipcMain.handle('candidate:candidatesSearch', (_event, params) =>
    candidateSearchService.candidatesSearch(params)
  );
  ipcMain.handle('candidate:candidatesCount', () => candidateService.candidatesCount());
  ipcMain.handle('candidate:candidateGet', (_event, id) => candidateService.candidateGet(id));
  ipcMain.handle('candidate:candidateResumeGet', (_event, id, resumeId) =>
    candidateService.candidateResumeGet(id, resumeId)
  );
  ipcMain.handle('candidate:candidateResumeBaseInfoUpdate', (_event, id, resumeId, data) =>
    candidateService.candidateResumeBaseInfoUpdate(id, resumeId, data)
  );
  ipcMain.handle('candidate:candidateCommunicationAdd', (_event, id, data) =>
    candidateService.candidateCommunicationAdd(id, data)
  );
  ipcMain.handle('candidate:candidateCommunicationUpdate', (_event, id, communicationId, data) =>
    candidateService.candidateCommunicationUpdate(id, communicationId, data)
  );
  ipcMain.handle('candidate:candidateCommunicationDelete', (_event, id, communicationId) =>
    candidateService.candidateCommunicationDelete(id, communicationId)
  );
  ipcMain.handle('candidate:candidateResumeWorkExperiencesUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeWorkExperiencesUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeEducationsUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeEducationsUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeProjectsUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeProjectsUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeTrainingsUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeTrainingsUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeCertificatesUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeCertificatesUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeSkillsUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeSkillsUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeLanguagesUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeLanguagesUpdate(id, resumeId, items)
  );
  ipcMain.handle('candidate:candidateResumeExpectationsUpdate', (_event, id, resumeId, items) =>
    candidateService.candidateResumeExpectationsUpdate(id, resumeId, items)
  );
}

module.exports = registerCandidateIpc;
