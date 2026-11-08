-- Align resume child-list columns with the authoritative JSON field names.

ALTER TABLE candidate_resume_work_experiences RENAME TO candidate_resume_work_experiences_legacy;
CREATE TABLE candidate_resume_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    company_name TEXT NOT NULL DEFAULT '', company_employees TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '', position TEXT NOT NULL DEFAULT '',
    position_type TEXT NOT NULL DEFAULT '', position_salary TEXT NOT NULL DEFAULT '',
    position_dept TEXT NOT NULL DEFAULT '', position_report_to TEXT NOT NULL DEFAULT '',
    position_subordinate TEXT NOT NULL DEFAULT '', employment_type TEXT NOT NULL DEFAULT '',
    annual_salary_min TEXT NOT NULL DEFAULT '', annual_salary_max TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '', position_start TEXT NOT NULL DEFAULT '',
    position_resigned TEXT NOT NULL DEFAULT '', resigned_reason TEXT NOT NULL DEFAULT '',
    position_responsibilities TEXT NOT NULL DEFAULT '', position_achievements TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_work_experiences (
    id,resume_id,company_name,company_employees,company_industry,position,position_type,position_salary,
    position_dept,position_report_to,position_subordinate,employment_type,annual_salary_min,annual_salary_max,
    status,position_start,position_resigned,resigned_reason,position_responsibilities,position_achievements,created_at,updated_at
) SELECT id,resume_id,company_name,'',company_industry,position_title,position_type,salary_text,
    department,report_to,COALESCE(CAST(subordinates_count AS TEXT),''),employment_type,
    COALESCE(CAST(annual_salary_min AS TEXT),''),COALESCE(CAST(annual_salary_max AS TEXT),''),
    CASE WHEN is_current=1 THEN '在职' ELSE '' END,start_date,end_date,resigned_reason,responsibilities,achievements,created_at,updated_at
FROM candidate_resume_work_experiences_legacy;
DROP TABLE candidate_resume_work_experiences_legacy;
CREATE INDEX idx_candidate_resume_work_resume ON candidate_resume_work_experiences(resume_id);
CREATE INDEX idx_candidate_resume_work_company ON candidate_resume_work_experiences(company_name);

ALTER TABLE candidate_resume_educations RENAME TO candidate_resume_educations_legacy;
CREATE TABLE candidate_resume_educations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    school_name TEXT NOT NULL DEFAULT '', school_major_name TEXT NOT NULL DEFAULT '',
    school_degree_type TEXT NOT NULL DEFAULT '', school_degree_rank TEXT NOT NULL DEFAULT '',
    school_education_type TEXT NOT NULL DEFAULT '', school_start_ym TEXT NOT NULL DEFAULT '',
    school_end_ym TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_educations (
    id,resume_id,school_name,school_major_name,school_degree_type,school_degree_rank,
    school_education_type,school_start_ym,school_end_ym,created_at,updated_at
) SELECT id,resume_id,school_name,major_name,degree_type,COALESCE(CAST(degree_rank AS TEXT),''),
    education_type,start_date,end_date,created_at,updated_at FROM candidate_resume_educations_legacy;
DROP TABLE candidate_resume_educations_legacy;
CREATE INDEX idx_candidate_resume_education_resume ON candidate_resume_educations(resume_id);

ALTER TABLE candidate_resume_projects RENAME TO candidate_resume_projects_legacy;
CREATE TABLE candidate_resume_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL, sequence_no INTEGER NOT NULL DEFAULT 0,
    fingerprint TEXT NOT NULL DEFAULT '', project_name TEXT NOT NULL DEFAULT '',
    company_or_client TEXT NOT NULL DEFAULT '', role_name TEXT NOT NULL DEFAULT '',
    start_ym TEXT NOT NULL DEFAULT '', end_ym TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '', achievements TEXT NOT NULL DEFAULT '', keywords TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_projects (
    id,resume_id,sequence_no,fingerprint,project_name,company_or_client,role_name,start_ym,end_ym,
    description,responsibilities,achievements,keywords,created_at,updated_at
) SELECT id,resume_id,ROW_NUMBER() OVER(PARTITION BY resume_id ORDER BY id),'',project_name,company_name,role,
    start_date,end_date,description,responsibilities,achievements,'',created_at,updated_at
FROM candidate_resume_projects_legacy;
DROP TABLE candidate_resume_projects_legacy;
CREATE INDEX idx_candidate_resume_projects_resume ON candidate_resume_projects(resume_id);

ALTER TABLE candidate_resume_trainings RENAME TO candidate_resume_trainings_legacy;
CREATE TABLE candidate_resume_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL, sequence_no INTEGER NOT NULL DEFAULT 0,
    organization_name TEXT NOT NULL DEFAULT '', training_name TEXT NOT NULL DEFAULT '',
    start_ym TEXT NOT NULL DEFAULT '', end_ym TEXT NOT NULL DEFAULT '', certificate_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_trainings (
    id,resume_id,sequence_no,organization_name,training_name,start_ym,end_ym,certificate_name,description,created_at,updated_at
) SELECT id,resume_id,ROW_NUMBER() OVER(PARTITION BY resume_id ORDER BY id),training_institution,training_course,
    start_date,end_date,certificate_obtained,description,created_at,updated_at FROM candidate_resume_trainings_legacy;
DROP TABLE candidate_resume_trainings_legacy;
CREATE INDEX idx_candidate_resume_trainings_resume ON candidate_resume_trainings(resume_id);

ALTER TABLE candidate_resume_languages RENAME TO candidate_resume_languages_legacy;
CREATE TABLE candidate_resume_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    language_name TEXT NOT NULL DEFAULT '', language_level TEXT NOT NULL DEFAULT '',
    language_certificate TEXT NOT NULL DEFAULT '', language_certificate_time TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_languages (
    id,resume_id,language_name,language_level,language_certificate,language_certificate_time,created_at,updated_at
) SELECT id,resume_id,language_name,proficiency_level,certificate_name,certificate_time,created_at,updated_at
FROM candidate_resume_languages_legacy;
DROP TABLE candidate_resume_languages_legacy;
CREATE INDEX idx_candidate_resume_languages_resume ON candidate_resume_languages(resume_id);

ALTER TABLE candidate_resume_certificates RENAME TO candidate_resume_certificates_legacy;
CREATE TABLE candidate_resume_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    certificate_name TEXT NOT NULL DEFAULT '', certificate_type TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_certificates (
    id,resume_id,certificate_name,certificate_type,certificate_time,created_at,updated_at
) SELECT id,resume_id,certificate_name,certificate_type,issued_time,created_at,updated_at
FROM candidate_resume_certificates_legacy;
DROP TABLE candidate_resume_certificates_legacy;
CREATE INDEX idx_candidate_resume_certificates_resume ON candidate_resume_certificates(resume_id);

ALTER TABLE candidate_resume_skills RENAME TO candidate_resume_skills_legacy;
CREATE TABLE candidate_resume_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL DEFAULT '', skill_level TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_skills (id,resume_id,skill_name,skill_level,created_at,updated_at)
SELECT id,resume_id,skill_name,proficiency_level,created_at,updated_at FROM candidate_resume_skills_legacy;
DROP TABLE candidate_resume_skills_legacy;
CREATE INDEX idx_candidate_resume_skills_resume ON candidate_resume_skills(resume_id);

ALTER TABLE candidate_resume_communications RENAME TO candidate_resume_communications_legacy;
CREATE TABLE candidate_resume_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    communicate_time TEXT NOT NULL DEFAULT '', communicate_content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
INSERT INTO candidate_resume_communications (id,resume_id,communicate_time,communicate_content,created_at,updated_at)
SELECT id,resume_id,communication_date,summary,created_at,updated_at FROM candidate_resume_communications_legacy;
DROP TABLE candidate_resume_communications_legacy;
CREATE INDEX idx_candidate_resume_communications_resume ON candidate_resume_communications(resume_id);
