class CandidateRawTextBuilder {
  build(snapshot) {
    const parts = [];

    if (snapshot.profile) {
      const p = snapshot.profile;
      [
        p.full_name,
        p.gender,
        p.age,
        p.birth_date,
        p.birth_year,
        p.marital_status,
        p.household_registration,
        p.address,
        p.city,
        p.nationality,
        p.current_company,
        p.current_position,
        p.highest_school,
        p.highest_major,
        p.personal_summary,
      ].forEach((val) => {
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          parts.push(String(val).trim());
        }
      });
    }

    if (Array.isArray(snapshot.contacts)) {
      snapshot.contacts.forEach((c) => {
        if (c.contact_value) parts.push(c.contact_value.trim());
      });
    }

    if (Array.isArray(snapshot.expectations)) {
      snapshot.expectations.forEach((e) => {
        [e.expected_position, e.expected_city, e.expected_industry].forEach((val) => {
          if (val) parts.push(val.trim());
        });
      });
    }

    if (Array.isArray(snapshot.workExperiences)) {
      snapshot.workExperiences.forEach((w) => {
        [w.company_name, w.position_title, w.company_industry, w.responsibilities, w.achievements, w.resigned_reason].forEach((val) => {
          if (val) parts.push(val.trim());
        });
      });
    }

    if (Array.isArray(snapshot.educations)) {
      snapshot.educations.forEach((ed) => {
        [ed.school_name, ed.major_name, ed.degree_type, ed.education_type].forEach((val) => {
          if (val) parts.push(val.trim());
        });
      });
    }

    if (Array.isArray(snapshot.projects)) {
      snapshot.projects.forEach((pj) => {
        [pj.project_name, pj.role, pj.description, pj.responsibilities, pj.achievements].forEach((val) => {
          if (val) parts.push(val.trim());
        });
      });
    }

    if (Array.isArray(snapshot.trainings)) {
      snapshot.trainings.forEach((t) => {
        [t.training_institution, t.training_course, t.certificate_obtained, t.description].forEach((val) => {
          if (val) parts.push(val.trim());
        });
      });
    }

    if (Array.isArray(snapshot.languages)) {
      snapshot.languages.forEach((l) => {
        [l.language_name, l.proficiency_level, l.certificate_name].forEach((val) => {
          if (val) parts.push(val.trim());
        });
      });
    }

    if (Array.isArray(snapshot.certificates)) {
      snapshot.certificates.forEach((cert) => {
        if (cert.certificate_name) parts.push(cert.certificate_name.trim());
      });
    }

    if (Array.isArray(snapshot.skills)) {
      snapshot.skills.forEach((s) => {
        if (s.skill_name) parts.push(s.skill_name.trim());
      });
    }

    if (Array.isArray(snapshot.communications)) {
      snapshot.communications.forEach((comm) => {
        if (comm.summary) parts.push(comm.summary.trim());
      });
    }

    // 稳定去重并用 " | " 拼接
    const uniqueParts = Array.from(new Set(parts));
    return uniqueParts.join(' | ');
  }
}

module.exports = CandidateRawTextBuilder;
