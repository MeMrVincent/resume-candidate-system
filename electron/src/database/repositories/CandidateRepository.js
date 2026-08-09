class CandidateRepository {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  insertCandidateFull(snapshot, rawText, originalJsonStr, importRecordMeta) {
    const db = this.dbManager.getDb();
    const now = new Date().toISOString();

    const p = snapshot.profile;
    const profileParams = [
      p.candidate_uuid || `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      p.full_name || '',
      p.gender || '',
      p.age ? parseInt(p.age, 10) : null,
      p.birth_date || '',
      p.birth_year ? parseInt(p.birth_year, 10) : null,
      p.marital_status || '',
      p.children_status || '',
      p.political_status || '',
      p.height_cm ? parseFloat(p.height_cm) : null,
      p.weight_kg ? parseFloat(p.weight_kg) : null,
      p.household_registration || '',
      p.address || '',
      p.postal_code || '',
      p.city || '',
      p.nationality || '',
      p.primary_phone || '',
      p.primary_email || '',
      p.current_company || '',
      p.current_position || '',
      p.current_industry || '',
      p.current_employment_status || '',
      p.highest_school || '',
      p.highest_major || '',
      p.highest_degree_type || '',
      p.highest_degree_rank ? parseInt(p.highest_degree_rank, 10) : null,
      p.work_years ? parseFloat(p.work_years) : null,
      p.personal_summary || '',
      'active',
      p.resume_updated_date || '',
      p.resume_download_date || '',
      now,
      now,
    ];

    db.run(
      `INSERT INTO candidate_profiles (
        candidate_uuid, full_name, gender, age, birth_date, birth_year,
        marital_status, children_status, political_status, height_cm, weight_kg,
        household_registration, address, postal_code, city, nationality,
        primary_phone, primary_email, current_company, current_position,
        current_industry, current_employment_status, highest_school, highest_major,
        highest_degree_type, highest_degree_rank, work_years, personal_summary,
        candidate_status, resume_updated_date, resume_download_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      profileParams
    );

    const res = db.exec('SELECT last_insert_rowid();');
    const candidateId = res[0].values[0][0];

    if (Array.isArray(snapshot.contacts)) {
      snapshot.contacts.forEach((c) => {
        db.run(
          `INSERT INTO candidate_contacts (
            candidate_id, contact_type, contact_value, normalized_value, is_primary, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            candidateId,
            c.contact_type || 'other',
            c.contact_value || '',
            c.normalized_value || c.contact_value || '',
            c.is_primary ? 1 : 0,
            now,
            now,
          ]
        );
      });
    }

    if (importRecordMeta) {
      db.run(
        `INSERT INTO candidate_import_records (
          candidate_id, record_id, schema_version, source_path, original_path, source_filename,
          source_extension, source_metadata_json, dates_json, extraction_json, classification_json,
          quality_json, original_json, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          candidateId,
          importRecordMeta.record_id || `rec_${candidateId}_${Date.now()}`,
          importRecordMeta.schema_version || '1.0',
          importRecordMeta.source_path || '',
          importRecordMeta.original_path || '',
          importRecordMeta.source_filename || '',
          importRecordMeta.source_extension || '.json',
          JSON.stringify(importRecordMeta.source_metadata || {}),
          JSON.stringify(importRecordMeta.dates || {}),
          JSON.stringify(importRecordMeta.extraction || {}),
          JSON.stringify(importRecordMeta.classification || {}),
          JSON.stringify(importRecordMeta.quality || {}),
          originalJsonStr || '{}',
          now,
        ]
      );
    }

    if (Array.isArray(snapshot.expectations)) {
      snapshot.expectations.forEach((e) => {
        db.run(
          `INSERT INTO candidate_expectations (
            candidate_id, expected_city, expected_position, expected_industry, expected_salary_text,
            expected_annual_salary_min, expected_annual_salary_max, expected_employment_type,
            expected_start_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            candidateId,
            e.expected_city || '',
            e.expected_position || '',
            e.expected_industry || '',
            e.expected_salary_text || '',
            e.expected_annual_salary_min ? parseFloat(e.expected_annual_salary_min) : null,
            e.expected_annual_salary_max ? parseFloat(e.expected_annual_salary_max) : null,
            e.expected_employment_type || '',
            e.expected_start_date || '',
            now,
            now,
          ]
        );
      });
    }

    if (Array.isArray(snapshot.workExperiences)) {
      snapshot.workExperiences.forEach((w) => {
        db.run(
          `INSERT INTO candidate_work_experiences (
            candidate_id, company_name, company_industry, department, position_title, position_type,
            employment_type, location, start_date, end_date, is_current, salary_text, annual_salary_min,
            annual_salary_max, report_to, subordinates_count, responsibilities, achievements,
            resigned_reason, source_language, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            candidateId,
            w.company_name || '',
            w.company_industry || '',
            w.department || '',
            w.position_title || '',
            w.position_type || '',
            w.employment_type || '',
            w.location || '',
            w.start_date || '',
            w.end_date || '',
            w.is_current ? 1 : 0,
            w.salary_text || '',
            w.annual_salary_min ? parseFloat(w.annual_salary_min) : null,
            w.annual_salary_max ? parseFloat(w.annual_salary_max) : null,
            w.report_to || '',
            w.subordinates_count ? parseInt(w.subordinates_count, 10) : null,
            w.responsibilities || '',
            w.achievements || '',
            w.resigned_reason || '',
            w.source_language || 'zh',
            now,
            now,
          ]
        );
      });
    }

    if (Array.isArray(snapshot.educations)) {
      snapshot.educations.forEach((ed) => {
        db.run(
          `INSERT INTO candidate_educations (
            candidate_id, school_name, major_name, degree_type, degree_rank, education_type,
            start_date, end_date, is_highest, source_language, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            candidateId,
            ed.school_name || '',
            ed.major_name || '',
            ed.degree_type || '',
            ed.degree_rank ? parseInt(ed.degree_rank, 10) : null,
            ed.education_type || '',
            ed.start_date || '',
            ed.end_date || '',
            ed.is_highest ? 1 : 0,
            ed.source_language || 'zh',
            now,
            now,
          ]
        );
      });
    }

    if (Array.isArray(snapshot.certificates)) {
      snapshot.certificates.forEach((cert) => {
        db.run(
          `INSERT INTO candidate_certificates (
            candidate_id, certificate_name, certificate_type, issued_time, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?);`,
          [candidateId, cert.certificate_name || '', cert.certificate_type || '', cert.issued_time || '', now, now]
        );
      });
    }

    if (Array.isArray(snapshot.languages)) {
      snapshot.languages.forEach((l) => {
        db.run(
          `INSERT INTO candidate_languages (
            candidate_id, language_name, proficiency_level, certificate_name, certificate_time, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [candidateId, l.language_name || '', l.proficiency_level || '', l.certificate_name || '', l.certificate_time || '', now, now]
        );
      });
    }

    if (Array.isArray(snapshot.skills)) {
      snapshot.skills.forEach((s) => {
        db.run(
          `INSERT INTO candidate_skills (
            candidate_id, skill_name, proficiency_level, years_used, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?);`,
          [candidateId, s.skill_name || '', s.proficiency_level || '', s.years_used ? parseFloat(s.years_used) : null, now, now]
        );
      });
    }

    db.run(
      `INSERT OR REPLACE INTO candidate_search_documents (candidate_id, raw_text, updated_at) VALUES (?, ?, ?);`,
      [candidateId, rawText || '', now]
    );

    return candidateId;
  }

  getById(id) {
    const db = this.dbManager.getDb();
    const profileRes = db.exec('SELECT * FROM candidate_profiles WHERE id = ?;', [id]);
    if (profileRes.length === 0 || !profileRes[0].values || profileRes[0].values.length === 0) {
      return null;
    }
    const columns = profileRes[0].columns;
    const values = profileRes[0].values[0];
    const profile = {};
    columns.forEach((col, idx) => {
      profile[col] = values[idx];
    });

    const getSubTable = (tableName) => {
      const res = db.exec(`SELECT * FROM ${tableName} WHERE candidate_id = ?;`, [id]);
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const item = {};
        cols.forEach((c, i) => item[c] = row[i]);
        return item;
      });
    };

    return {
      profile,
      contacts: getSubTable('candidate_contacts'),
      expectations: getSubTable('candidate_expectations'),
      workExperiences: getSubTable('candidate_work_experiences'),
      educations: getSubTable('candidate_educations'),
      projects: getSubTable('candidate_projects'),
      trainings: getSubTable('candidate_trainings'),
      languages: getSubTable('candidate_languages'),
      certificates: getSubTable('candidate_certificates'),
      skills: getSubTable('candidate_skills'),
      communications: getSubTable('candidate_communications'),
    };
  }

  count() {
    const db = this.dbManager.getDb();
    const res = db.exec('SELECT COUNT(*) as count FROM candidate_profiles;');
    if (res.length > 0 && res[0].values) {
      return res[0].values[0][0];
    }
    return 0;
  }
}

module.exports = CandidateRepository;
