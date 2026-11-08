import { invokeElectron } from '@/electron/ajax';

export const candidateApi = {
  candidatesSearch: (params) => invokeElectron('candidate', 'candidatesSearch', params || {}),
  candidatesCount: () => invokeElectron('candidate', 'candidatesCount'),
  candidateGet: (id) => invokeElectron('candidate', 'candidateGet', id),
  candidateResumeGet: (id, resumeId) => invokeElectron('candidate', 'candidateResumeGet', id, resumeId),
  candidateResumeBaseInfoUpdate: (id, resumeId, data) =>
    invokeElectron('candidate', 'candidateResumeBaseInfoUpdate', id, resumeId, data),
  candidateCommunicationAdd: (id, data) =>
    invokeElectron('candidate', 'candidateCommunicationAdd', id, data),
  candidateCommunicationUpdate: (id, communicationId, data) =>
    invokeElectron('candidate', 'candidateCommunicationUpdate', id, communicationId, data),
  candidateCommunicationDelete: (id, communicationId) =>
    invokeElectron('candidate', 'candidateCommunicationDelete', id, communicationId),
  candidateResumeWorkExperiencesUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeWorkExperiencesUpdate', id, resumeId, items),
  candidateResumeEducationsUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeEducationsUpdate', id, resumeId, items),
  candidateResumeProjectsUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeProjectsUpdate', id, resumeId, items),
  candidateResumeTrainingsUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeTrainingsUpdate', id, resumeId, items),
  candidateResumeCertificatesUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeCertificatesUpdate', id, resumeId, items),
  candidateResumeSkillsUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeSkillsUpdate', id, resumeId, items),
  candidateResumeLanguagesUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeLanguagesUpdate', id, resumeId, items),
  candidateResumeExpectationsUpdate: (id, resumeId, items) =>
    invokeElectron('candidate', 'candidateResumeExpectationsUpdate', id, resumeId, items),
};
