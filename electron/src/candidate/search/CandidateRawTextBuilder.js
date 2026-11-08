class CandidateRawTextBuilder {
  build(snapshot) {
    const values = [];
    const seen = new Set();
    const add = (value) => {
      if (value === null || value === undefined || typeof value === 'boolean') return;
      const text = String(value).trim();
      if (text && !seen.has(text)) { seen.add(text); values.push(text); }
    };
    const walk = (value, key = '') => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) return value.forEach((item) => walk(item));
      if (typeof value === 'object') {
        for (const [childKey, child] of Object.entries(value)) {
          if (/^(id|candidate_id|resume_id|source_order|is_primary|created_at|updated_at|raw_text)$/.test(childKey)) continue;
          walk(child, childKey);
        }
        return;
      }
      if (!/_rank$/.test(key)) add(value);
    };
    walk(snapshot.profile || {});
    for (const resume of snapshot.resumes || []) {
      walk(resume.profile || {});
      walk(resume.expectations || []); walk(resume.workExperiences || []);
      walk(resume.educations || []); walk(resume.projects || []); walk(resume.trainings || []);
      walk(resume.languages || []); walk(resume.certificates || []); walk(resume.skills || []);
    }
    walk(snapshot.communications || []);
    return values.join(' | ');
  }
}

module.exports = CandidateRawTextBuilder;
