const fs = require('fs');
const path = require('path');
const CandidateRawTextBuilder = require('../candidate/search/CandidateRawTextBuilder');

class CandidateImportService {
  constructor(candidateRepository) {
    this.candidateRepository = candidateRepository;
    this.rawTextBuilder = new CandidateRawTextBuilder();
  }

  parseCandidateJson(jsonObj, filePath) {
    const sData = jsonObj.structured_data || {};
    const baseInfo = sData.base_info || {};
    const expInfo = sData.expected_info || {};
    const currInfo = sData.current_info || {};
    const eduInfo = sData.education_info || {};

    const profile = {
      candidate_uuid: baseInfo.candidate_uuid || `cand_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      full_name: baseInfo.full_name || '',
      gender: baseInfo.gender || '',
      age: baseInfo.age || null,
      birth_date: baseInfo.birth_date || '',
      birth_year: baseInfo.birth_year || null,
      marital_status: baseInfo.marital_status || '',
      children_status: baseInfo.children_status || '',
      political_status: baseInfo.political_status || '',
      height_cm: baseInfo.height_cm || null,
      weight_kg: baseInfo.weight_kg || null,
      household_registration: baseInfo.household_registration || '',
      address: baseInfo.address || '',
      postal_code: baseInfo.postal_code || '',
      city: baseInfo.city || '',
      nationality: baseInfo.nationality || '',
      primary_phone: baseInfo.phone || '',
      primary_email: baseInfo.email || '',
      current_company: currInfo.company_name || '',
      current_position: currInfo.position || '',
      current_industry: currInfo.company_industry || '',
      current_employment_status: currInfo.status || '',
      highest_school: eduInfo.school_name || '',
      highest_major: eduInfo.school_major_name || '',
      highest_degree_type: eduInfo.school_degree_type || '',
      highest_degree_rank: eduInfo.school_degree_rank || null,
      personal_summary: baseInfo.pr || '',
      resume_updated_date: jsonObj.dates ? (jsonObj.dates.resume_updated_date || '') : '',
      resume_download_date: jsonObj.dates ? (jsonObj.dates.resume_download_date || '') : '',
    };

    const contacts = [];
    if (baseInfo.phone) {
      contacts.push({ contact_type: 'phone', contact_value: baseInfo.phone, is_primary: 1 });
    }
    if (baseInfo.email) {
      contacts.push({ contact_type: 'email', contact_value: baseInfo.email, is_primary: contacts.length === 0 ? 1 : 0 });
    }

    const expectations = [];
    if (expInfo.expected_position || expInfo.expected_city || expInfo.expected_industry) {
      expectations.push({
        expected_city: expInfo.expected_city || '',
        expected_position: expInfo.expected_position || '',
        expected_industry: expInfo.expected_industry || '',
        expected_salary_text: expInfo.expected_salary || '',
        expected_annual_salary_min: expInfo.expected_annual_salary_min || null,
        expected_annual_salary_max: expInfo.expected_annual_salary_max || null,
        expected_employment_type: expInfo.expected_employment_type || '',
        expected_start_date: expInfo.expected_start_date || '',
      });
    }

    const workExperiences = [];
    const educations = [];
    const certificates = [];
    const languages = [];
    const skills = [];
    const trainings = [];
    const projects = [];

    const resumes = Array.isArray(sData.resumes) ? sData.resumes : [];
    resumes.forEach((r) => {
      const lang = r.resume_language || 'zh';

      if (Array.isArray(r.work_experiences)) {
        r.work_experiences.forEach((w) => {
          workExperiences.push({
            company_name: w.company_name || '',
            company_industry: w.company_industry || '',
            department: w.position_dept || '',
            position_title: w.position || '',
            position_type: w.position_type || '',
            employment_type: w.employment_type || '',
            location: w.location || '',
            start_date: w.position_start || '',
            end_date: w.position_resigned || '',
            is_current: w.status === '在职' ? 1 : 0,
            salary_text: w.position_salary || '',
            annual_salary_min: w.annual_salary_min || null,
            annual_salary_max: w.annual_salary_max || null,
            report_to: w.position_report_to || '',
            subordinates_count: w.position_subordinate || null,
            responsibilities: w.position_responsibilities || '',
            achievements: w.position_achievements || '',
            resigned_reason: w.resigned_reason || '',
            source_language: lang,
          });
        });
      }

      if (Array.isArray(r.education_list)) {
        r.education_list.forEach((ed) => {
          educations.push({
            school_name: ed.school_name || '',
            major_name: ed.school_major_name || '',
            degree_type: ed.school_degree_type || '',
            degree_rank: ed.school_degree_rank || null,
            education_type: ed.school_education_type || '',
            start_date: ed.school_start_ym || '',
            end_date: ed.school_end_ym || '',
            source_language: lang,
          });
        });
      }

      if (Array.isArray(r.certificate_list)) {
        r.certificate_list.forEach((cert) => {
          certificates.push({
            certificate_name: cert.certificate_name || '',
            certificate_type: cert.certificate_type || '',
            issued_time: cert.certificate_time || '',
          });
        });
      }

      if (Array.isArray(r.language_list)) {
        r.language_list.forEach((l) => {
          languages.push({
            language_name: l.language_name || '',
            proficiency_level: l.language_level || '',
            certificate_name: l.language_certificate || '',
            certificate_time: l.language_certificate_time || '',
          });
        });
      }

      if (Array.isArray(r.skills_list)) {
        r.skills_list.forEach((sk) => {
          skills.push({
            skill_name: sk.skill_name || sk || '',
            proficiency_level: sk.proficiency_level || '',
            years_used: sk.years_used || null,
          });
        });
      }
    });

    const snapshot = {
      profile,
      contacts,
      expectations,
      workExperiences,
      educations,
      projects,
      trainings,
      languages,
      certificates,
      skills,
    };

    let rawText = jsonObj.raw_text;
    if (!rawText || rawText.trim() === '') {
      rawText = this.rawTextBuilder.build(snapshot);
    }

    const importRecordMeta = {
      record_id: `rec_${path.basename(filePath, '.json')}`,
      schema_version: '1.0',
      source_path: filePath,
      original_path: jsonObj.source ? jsonObj.source.original_path || '' : '',
      source_filename: path.basename(filePath),
      source_extension: '.json',
      dates: jsonObj.dates || {},
    };

    return {
      snapshot,
      rawText,
      importRecordMeta,
    };
  }

  importBatchFromDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    const db = this.candidateRepository.dbManager.getDb();

    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const startTime = Date.now();

    db.run('BEGIN TRANSACTION;');
    try {
      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const jsonObj = JSON.parse(content);

          const { snapshot, rawText, importRecordMeta } = this.parseCandidateJson(jsonObj, filePath);

          this.candidateRepository.insertCandidateFull(snapshot, rawText, content, importRecordMeta);
          successCount++;
        } catch (err) {
          failCount++;
          errors.push({ file, error: err.message });
        }
      });
      db.run('COMMIT;');
    } catch (err) {
      db.run('ROLLBACK;');
      throw err;
    }

    this.candidateRepository.dbManager.save();

    const durationMs = Date.now() - startTime;

    return {
      totalFiles: files.length,
      successCount,
      failCount,
      durationMs,
      errors,
    };
  }
}

module.exports = CandidateImportService;
