const fs = require('fs');
const path = require('path');

class CandidateImportService {
  constructor(candidateRepository) {
    this.candidateRepository = candidateRepository;
  }

  parseCandidateJson(jsonObj, filePath) {
    this.validateCandidateJson(jsonObj, filePath);
    const structured = jsonObj.structured_data || {};
    const topBase = structured.base_info || {};
    const dates = jsonObj.dates || {};
    const recordId = `record_${path.basename(filePath, '.json')}`;
    const sourceResumes = structured.resumes;

    const resumes = sourceResumes.map((resume, index) => this.normalizeResume(
      resume || {}, index, recordId, jsonObj, structured
    ));
    if (resumes.length === 0 || resumes[0].resumeLanguage !== 'zh') {
      throw new Error(`Primary Chinese resume missing: ${filePath}`);
    }

    const profile = {
      candidate_uuid: topBase.candidate_uuid || recordId,
      full_name: topBase.full_name || '', gender: topBase.gender || '',
      age: topBase.age || null, birth_date: topBase.birth_date || '',
      birth_year: topBase.birth_year || null, marital_status: topBase.marital_status || '',
      children_status: topBase.children_status || '', political_status: topBase.political_status || '',
      height_cm: topBase.height_cm || null, weight_kg: topBase.weight_kg || null,
      household_registration: topBase.household_registration || '', address: topBase.address || '',
      postal_code: topBase.postal_code || '', platform_from: topBase.platform_from || '',
      platform_resume_id: topBase.platform_resume_id || '', phone: topBase.phone || '',
      email: topBase.email || '', city: topBase.city || '', nationality: topBase.nationality || '',
      pr: topBase.pr || '', resume_updated_date: dates.resume_updated_date || '',
      resume_download_date: dates.resume_download_date || '',
      sys_created_date: dates.sys_created_date || '', sys_updated_date: dates.sys_updated_date || '',
    };
    resumes[0].baseInfo = this.profileBaseInfo(profile);

    return {
      snapshot: { profile, resumes },
      rawText: jsonObj.raw_text || this.collectText(structured),
      importRecordMeta: {
        record_id: recordId,
        schema_version: jsonObj.schema_version || '1.0', source_path: filePath,
        original_path: jsonObj.source?.original_path || '', source_filename: path.basename(filePath),
        source_extension: '.json', source_metadata: jsonObj.source || {}, dates,
        extraction: jsonObj.extraction || {}, classification: jsonObj.classification || {},
        quality: jsonObj.quality || {}, original_json: JSON.stringify(jsonObj),
      },
    };
  }

  profileBaseInfo(profile) {
    const fields = [
      'full_name','gender','age','birth_date','birth_year','marital_status','children_status',
      'political_status','height_cm','weight_kg','household_registration','address','postal_code',
      'platform_from','platform_resume_id','phone','email','city','nationality','pr',
    ];
    return Object.fromEntries(fields.map((field) => [field, profile[field]]));
  }

  normalizeResume(resume, index, recordId, root, structured) {
    const language = String(resume.resume_languge || resume.resume_language || (index === 0 ? 'zh' : '')).toLowerCase();
    const base = resume.base_info || (index === 0 ? structured.base_info || {} : {});
    const expected = resume.expected_list || resume.expected_info || (index === 0 ? structured.expected_info || [] : []);
    const work = Array.isArray(resume.work_experiences) ? resume.work_experiences : [];
    const education = Array.isArray(resume.education_list) ? resume.education_list : [];
    const currentTop = index === 0 ? structured.current_info || {} : {};
    const educationTop = index === 0 ? structured.education_info || {} : {};
    const currentWork = work.find((item) => !item.position_resigned || /至今|present|現在/i.test(item.position_resigned)) || work[0] || {};
    const highestEducation = education.find((item) => item.is_highest) || education[0] || {};
    const dates = root.dates || {};

    return {
      resumeUuid: `${recordId}_resume_${index}`,
      resumeLanguage: language || 'unknown', sourceOrder: index, isPrimary: index === 0,
      sourcePath: root.source?.original_path || '', sourceFilename: path.basename(root.source?.original_path || ''),
      sourceExtension: path.extname(root.source?.original_path || ''), originalJson: JSON.stringify(resume),
      rawText: this.collectText(resume), resumeUpdatedDate: dates.resume_updated_date || '',
      resumeDownloadDate: dates.resume_download_date || '', sysCreatedDate: dates.sys_created_date || '',
      sysUpdatedDate: dates.sys_updated_date || '',
      baseInfo: {
        full_name: base.full_name || '', gender: base.gender || '', age: base.age || null,
        birth_date: base.birth_date || '', birth_year: base.birth_year || null,
        marital_status: base.marital_status || '', children_status: base.children_status || '',
        political_status: base.political_status || '', height_cm: base.height_cm || null,
        weight_kg: base.weight_kg || null, household_registration: base.household_registration || '',
        address: base.address || '', postal_code: base.postal_code || '',
        platform_from: base.platform_from || '', platform_resume_id: base.platform_resume_id || '',
        phone: base.phone || '', email: base.email || '', city: base.city || '',
        nationality: base.nationality || '', pr: base.pr || '',
      },
      currentInfo: {
        company_name: currentTop.company_name || currentWork.company_name || '',
        company_industry: currentTop.company_industry || currentWork.company_industry || '',
        position_title: currentTop.position || currentWork.position || '',
        employment_status: currentTop.status || currentWork.status || '',
        work_years: currentTop.work_years || base.work_years || null,
      },
      educationInfo: {
        school_name: educationTop.school_name || highestEducation.school_name || '',
        major_name: educationTop.school_major_name || highestEducation.school_major_name || '',
        degree_type: educationTop.school_degree_type || highestEducation.school_degree_type || '',
        degree_rank: educationTop.school_degree_rank || highestEducation.school_degree_rank || null,
      },
      expectations: (Array.isArray(expected) ? expected : [expected || {}]).map((item) => ({
        expected_city: item.expected_city || '', expected_position: item.expected_position || '',
        expected_industry: item.expected_industry || '',
        expected_salary: item.expected_salary || item.expected_salary_text || '',
        expected_annual_salary_min: item.expected_annual_salary_min || null,
        expected_annual_salary_max: item.expected_annual_salary_max || null,
        expected_employment_type: item.expected_employment_type || '', expected_start_date: item.expected_start_date || '',
      })),
      workExperiences: work.map((item) => ({
        company_name: item.company_name || '', company_employees: item.company_employees || item.company_scale || '',
        company_industry: item.company_industry || '', position: item.position || item.position_title || '',
        position_type: item.position_type || item.position_level || '', position_salary: item.position_salary || item.salary_text || '',
        position_dept: item.position_dept || item.department || '',
        position_report_to: item.position_report_to || item.report_to || '',
        position_subordinate: item.position_subordinate || item.subordinates_count || '',
        employment_type: item.employment_type || '', annual_salary_min: item.annual_salary_min || '',
        annual_salary_max: item.annual_salary_max || '', status: item.status || '',
        position_start: item.position_start || item.start_date || '',
        position_resigned: item.position_resigned || item.end_date || '', resigned_reason: item.resigned_reason || item.leave_reason || '',
        position_responsibilities: item.position_responsibilities || item.responsibilities || '',
        position_achievements: item.position_achievements || item.achievements || '',
      })),
      educations: education.map((item) => ({
        school_name: item.school_name || '', school_major_name: item.school_major_name || item.major_name || '',
        school_degree_type: item.school_degree_type || item.degree_type || '',
        school_degree_rank: item.school_degree_rank || item.degree_rank || '',
        school_education_type: item.school_education_type || item.education_type || '',
        school_start_ym: item.school_start_ym || item.start_date || '',
        school_end_ym: item.school_end_ym || item.end_date || '',
      })),
      projects: (resume.project_list || []).map((item, projectIndex) => ({
        sequence_no: item.sequence_no || projectIndex + 1, fingerprint: item.fingerprint || '',
        project_name: item.project_name || '', company_or_client: item.company_or_client || item.project_company || item.company_name || '',
        role_name: item.role_name || item.project_role || item.role || '',
        start_ym: item.start_ym || item.project_start || item.start_date || '',
        end_ym: item.end_ym || item.project_end || item.end_date || '', description: this.projectDescription(item),
        responsibilities: item.responsibilities || item.project_responsibilities || '', achievements: item.achievements || '', keywords: item.keywords || '',
      })),
      trainings: (resume.training_list || []).map((item, trainingIndex) => ({
        sequence_no: item.sequence_no || trainingIndex + 1,
        organization_name: item.organization_name || item.training_institution || '',
        training_name: item.training_name || item.training_course || '',
        start_ym: item.start_ym || item.training_start || item.start_date || '',
        end_ym: item.end_ym || item.training_end || item.end_date || '',
        certificate_name: item.certificate_name || item.certificate_obtained || '',
        description: item.description || item.training_description || '',
      })),
      languages: (resume.language_list || []).map((item) => ({
        language_name: item.language_name || item.language || '', language_level: this.languageLevel(item),
        language_certificate: item.language_certificate || item.certificate || item.certificate_name || '',
        language_certificate_time: item.language_certificate_time || item.certificate_time || '',
      })),
      certificates: (resume.certificate_list || []).map((item) => ({
        certificate_name: item.certificate_name || '', certificate_type: item.certificate_type || item.certificate_tpye || '',
        certificate_time: item.certificate_time || item.issued_time || '',
      })),
      skills: (resume.skills_list || []).map((item) => ({
        skill_name: item.skill_name || item.skills_name || '',
        skill_level: item.skill_level || item.skills_level || item.proficiency_level || item.skills_certificate || '',
      })),
      communications: (resume.communication_list || []).map((item) => ({
        communicate_time: item.communicate_time || item.communication_date || '',
        communicate_content: item.communicate_content || item.summary || '',
      })),
    };
  }

  languageLevel(item) {
    const values = [item.language_level, item.level, item.proficiency_level, item.score]
      .map((value) => String(value || '').trim()).filter(Boolean);
    return [...new Set(values)].join(' / ');
  }

  projectDescription(item) {
    const values = [
      item.description || item.project_description,
      item.project_env ? `项目环境：${item.project_env}` : '',
      item.project_industry ? `项目行业：${item.project_industry}` : '',
      item.project_team_size ? `项目规模：${item.project_team_size}` : '',
    ].map((value) => String(value || '').trim()).filter(Boolean);
    return [...new Set(values)].join('\n');
  }

  validateCandidateJson(jsonObj, filePath) {
    if (!jsonObj || typeof jsonObj !== 'object' || Array.isArray(jsonObj)) throw new Error(`Invalid JSON root: ${filePath}`);
    if (!jsonObj.structured_data || typeof jsonObj.structured_data !== 'object') throw new Error(`Missing structured_data: ${filePath}`);
    if (!Array.isArray(jsonObj.structured_data.resumes)) throw new Error(`Missing resumes array: ${filePath}`);
  }

  collectText(value) {
    const parts = [];
    const walk = (item) => {
      if (item === null || item === undefined) return;
      if (Array.isArray(item)) return item.forEach(walk);
      if (typeof item === 'object') return Object.values(item).forEach(walk);
      const text = String(item).trim(); if (text) parts.push(text);
    };
    walk(value);
    return [...new Set(parts)].join(' | ');
  }

  importBatchFromDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) throw new Error(`Directory not found: ${dirPath}`);
    const files = fs.readdirSync(dirPath).filter((name) => name.endsWith('.json')).sort();
    const db = this.candidateRepository.dbManager.getDb();
    const stats = { totalFiles: files.length, validatedCount: 0, successCount: 0, skippedCount: 0, failCount: 0, failures: [], importedDetails: { resumes: 0, workExperiences: 0, educations: 0, projects: 0, communications: 0, rawTextIndexed: 0 } };

    for (const fileName of files) {
      const filePath = path.join(dirPath, fileName);
      try {
        const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const parsed = this.parseCandidateJson(json, filePath); stats.validatedCount += 1;
        if (this.candidateRepository.candidateIdFindByRecordId(parsed.importRecordMeta.record_id)) { stats.skippedCount += 1; continue; }
        db.transaction(() => this.candidateRepository.candidateInsertFull(parsed.snapshot, parsed.importRecordMeta))();
        stats.successCount += 1; stats.importedDetails.resumes += parsed.snapshot.resumes.length;
        for (const resume of parsed.snapshot.resumes) {
          stats.importedDetails.workExperiences += resume.workExperiences.length;
          stats.importedDetails.educations += resume.educations.length;
          stats.importedDetails.projects += resume.projects.length;
          stats.importedDetails.communications += resume.communications.length;
        }
        stats.importedDetails.rawTextIndexed += 1;
      } catch (error) {
        stats.failCount += 1; stats.failures.push({ file: fileName, error: error.message });
      }
    }
    return stats;
  }
}

module.exports = CandidateImportService;
