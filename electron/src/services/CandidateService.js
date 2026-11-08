const CandidateRawTextBuilder = require('../candidate/search/CandidateRawTextBuilder');

class CandidateService {
  constructor(dbManager, candidateRepository) {
    this.dbManager = dbManager;
    this.candidateRepository = candidateRepository;
    this.rawTextBuilder = new CandidateRawTextBuilder();
  }

  candidateGet(id) { return this.requireCandidate(this.candidateRepository.candidateGet(this.requireId(id))); }
  candidateResumeGet(id, resumeId) { return this.requireCandidate(this.candidateRepository.candidateResumeGet(this.requireId(id), resumeId ? this.requireId(resumeId) : null)); }
  candidatesCount() { return this.candidateRepository.candidatesCount(); }

  candidateResumeBaseInfoUpdate(id,resumeId,changes){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeBaseInfoUpdate(this.requireId(id),this.requireId(resumeId),changes||{}));}
  candidateResumeExpectationsUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeExpectationsReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeWorkExperiencesUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeWorkExperiencesReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeEducationsUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeEducationsReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeProjectsUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeProjectsReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeTrainingsUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeTrainingsReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeCertificatesUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeCertificatesReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeSkillsUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeSkillsReplace(this.requireId(id),this.requireId(resumeId),items||[]));}
  candidateResumeLanguagesUpdate(id,resumeId,items){return this.resumeMutation(id,resumeId,()=>this.candidateRepository.candidateResumeLanguagesReplace(this.requireId(id),this.requireId(resumeId),items||[]));}

  candidateCommunicationAdd(id,item){const candidateId=this.requireId(id);return this.withRawTextRebuild(candidateId,null,()=>this.candidateRepository.candidateCommunicationAdd(candidateId,item||{}));}
  candidateCommunicationUpdate(id,communicationId,changes){const candidateId=this.requireId(id);return this.withRawTextRebuild(candidateId,null,()=>this.candidateRepository.candidateCommunicationUpdate(candidateId,this.requireId(communicationId),changes||{}));}
  candidateCommunicationDelete(id,communicationId){const candidateId=this.requireId(id);return this.withRawTextRebuild(candidateId,null,()=>this.candidateRepository.candidateCommunicationDelete(candidateId,this.requireId(communicationId)));}

  resumeMutation(id,resumeId,mutation){return this.withRawTextRebuild(this.requireId(id),this.requireId(resumeId),mutation);}
  withRawTextRebuild(candidateId,resumeId,mutation){
    return this.dbManager.getDb().transaction(()=>{
      const result=mutation();
      this.candidateRepository.candidateTouch(candidateId,resumeId);
      const snapshot=this.candidateRepository.candidateSearchSnapshotGet(candidateId);
      if(!snapshot)throw new Error(`Candidate not found: ${candidateId}`);
      this.candidateRepository.candidateRawTextReplace(candidateId,this.rawTextBuilder.build(snapshot));
      return result;
    })();
  }
  requireCandidate(value){if(!value)throw new Error('Candidate or resume not found');return value;}
  requireId(value){const id=Number.parseInt(value,10);if(!Number.isInteger(id)||id<=0)throw new Error(`Invalid id: ${value}`);return id;}
}

module.exports=CandidateService;
