-- System
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    job_status TEXT NOT NULL DEFAULT 'pending',
    payload_json TEXT NOT NULL DEFAULT '{}',
    result_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Company
CREATE TABLE IF NOT EXISTS company_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE,
    company_industry TEXT NOT NULL DEFAULT '',
    company_size TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    position_title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

-- Candidate canonical master: one row per person, used by list/dedup/business.
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_uuid TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    age INTEGER,
    birth_date TEXT NOT NULL DEFAULT '',
    birth_year INTEGER,
    marital_status TEXT NOT NULL DEFAULT '',
    children_status TEXT NOT NULL DEFAULT '',
    political_status TEXT NOT NULL DEFAULT '',
    height_cm REAL,
    weight_kg REAL,
    household_registration TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    platform_from TEXT NOT NULL DEFAULT '',
    platform_resume_id TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    nationality TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    pr TEXT NOT NULL DEFAULT '',
    raw_text TEXT NOT NULL DEFAULT '',
    resume_updated_date TEXT NOT NULL DEFAULT '',
    resume_download_date TEXT NOT NULL DEFAULT '',
    sys_created_date TEXT NOT NULL DEFAULT '',
    sys_updated_date TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_candidate_profiles_name ON candidate_profiles(full_name);
CREATE INDEX idx_candidate_profiles_phone ON candidate_profiles(phone);
CREATE INDEX idx_candidate_profiles_email ON candidate_profiles(email);
CREATE INDEX idx_candidate_profiles_sys_updated ON candidate_profiles(sys_updated_date DESC);

CREATE TABLE IF NOT EXISTS candidate_import_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    record_id TEXT NOT NULL UNIQUE,
    schema_version TEXT NOT NULL DEFAULT '',
    source_path TEXT NOT NULL DEFAULT '',
    original_path TEXT NOT NULL DEFAULT '',
    source_filename TEXT NOT NULL DEFAULT '',
    source_extension TEXT NOT NULL DEFAULT '',
    source_metadata_json TEXT NOT NULL DEFAULT '{}',
    dates_json TEXT NOT NULL DEFAULT '{}',
    extraction_json TEXT NOT NULL DEFAULT '{}',
    classification_json TEXT NOT NULL DEFAULT '{}',
    quality_json TEXT NOT NULL DEFAULT '{}',
    original_json TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);
CREATE INDEX idx_candidate_import_records_candidate ON candidate_import_records(candidate_id);

-- One row per actual resume. Language is an attribute, not the identity.
CREATE TABLE IF NOT EXISTS candidate_resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    resume_uuid TEXT NOT NULL UNIQUE,
    resume_language TEXT NOT NULL DEFAULT 'zh',
    source_order INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0,
    source_path TEXT NOT NULL DEFAULT '',
    source_filename TEXT NOT NULL DEFAULT '',
    source_extension TEXT NOT NULL DEFAULT '',
    raw_text TEXT NOT NULL DEFAULT '',
    original_json TEXT NOT NULL DEFAULT '{}',
    resume_updated_date TEXT NOT NULL DEFAULT '',
    resume_download_date TEXT NOT NULL DEFAULT '',
    sys_created_date TEXT NOT NULL DEFAULT '',
    sys_updated_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    UNIQUE(candidate_id, source_order)
);
CREATE INDEX idx_candidate_resumes_candidate ON candidate_resumes(candidate_id);
CREATE INDEX idx_candidate_resumes_language ON candidate_resumes(resume_language);
CREATE INDEX idx_candidate_resumes_primary ON candidate_resumes(candidate_id, is_primary);
CREATE UNIQUE INDEX idx_candidate_resumes_one_primary
ON candidate_resumes(candidate_id) WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS candidate_resume_base_info (
    resume_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL DEFAULT '', gender TEXT NOT NULL DEFAULT '', age INTEGER,
    birth_date TEXT NOT NULL DEFAULT '', birth_year INTEGER,
    marital_status TEXT NOT NULL DEFAULT '', children_status TEXT NOT NULL DEFAULT '',
    political_status TEXT NOT NULL DEFAULT '', height_cm REAL, weight_kg REAL,
    household_registration TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '', platform_from TEXT NOT NULL DEFAULT '',
    platform_resume_id TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', nationality TEXT NOT NULL DEFAULT '',
    pr TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_current_info (
    resume_id INTEGER PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT '', company_industry TEXT NOT NULL DEFAULT '',
    position_title TEXT NOT NULL DEFAULT '', employment_status TEXT NOT NULL DEFAULT '',
    work_years REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_education_info (
    resume_id INTEGER PRIMARY KEY,
    school_name TEXT NOT NULL DEFAULT '', major_name TEXT NOT NULL DEFAULT '',
    degree_type TEXT NOT NULL DEFAULT '', degree_rank INTEGER,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_expectations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    expected_city TEXT NOT NULL DEFAULT '', expected_position TEXT NOT NULL DEFAULT '',
    expected_industry TEXT NOT NULL DEFAULT '', expected_salary_text TEXT NOT NULL DEFAULT '',
    expected_annual_salary_min REAL, expected_annual_salary_max REAL,
    expected_employment_type TEXT NOT NULL DEFAULT '', expected_start_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    company_name TEXT NOT NULL DEFAULT '', company_industry TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '', position_title TEXT NOT NULL DEFAULT '',
    position_type TEXT NOT NULL DEFAULT '', employment_type TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '',
    is_current INTEGER NOT NULL DEFAULT 0, salary_text TEXT NOT NULL DEFAULT '',
    annual_salary_min REAL, annual_salary_max REAL, report_to TEXT NOT NULL DEFAULT '',
    subordinates_count INTEGER, responsibilities TEXT NOT NULL DEFAULT '', achievements TEXT NOT NULL DEFAULT '',
    resigned_reason TEXT NOT NULL DEFAULT '', source_language TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
CREATE INDEX idx_candidate_resume_work_resume ON candidate_resume_work_experiences(resume_id);
CREATE INDEX idx_candidate_resume_work_company ON candidate_resume_work_experiences(company_name);

CREATE TABLE IF NOT EXISTS candidate_resume_educations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    school_name TEXT NOT NULL DEFAULT '', major_name TEXT NOT NULL DEFAULT '',
    degree_type TEXT NOT NULL DEFAULT '', degree_rank INTEGER, education_type TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', is_highest INTEGER NOT NULL DEFAULT 0,
    source_language TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);
CREATE INDEX idx_candidate_resume_education_resume ON candidate_resume_educations(resume_id);

CREATE TABLE IF NOT EXISTS candidate_resume_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    project_name TEXT NOT NULL DEFAULT '', company_name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '', achievements TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    training_institution TEXT NOT NULL DEFAULT '', training_course TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '',
    certificate_obtained TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    language_name TEXT NOT NULL DEFAULT '', proficiency_level TEXT NOT NULL DEFAULT '',
    certificate_name TEXT NOT NULL DEFAULT '', certificate_time TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    certificate_name TEXT NOT NULL DEFAULT '', certificate_type TEXT NOT NULL DEFAULT '',
    issued_time TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL DEFAULT '', proficiency_level TEXT NOT NULL DEFAULT '', years_used REAL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

-- Notes imported from a physical resume; kept separate from CRM communications.
CREATE TABLE IF NOT EXISTS candidate_resume_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, resume_id INTEGER NOT NULL,
    communication_date TEXT NOT NULL DEFAULT '', communication_type TEXT NOT NULL DEFAULT 'imported_resume_note',
    summary TEXT NOT NULL DEFAULT '', next_follow_up_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES candidate_resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_id INTEGER NOT NULL, position_id INTEGER,
    communication_date TEXT NOT NULL, communication_type TEXT NOT NULL DEFAULT 'phone',
    summary TEXT NOT NULL DEFAULT '', next_follow_up_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

-- Position
CREATE TABLE IF NOT EXISTS position_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
    position_title TEXT NOT NULL, department TEXT NOT NULL DEFAULT '', headcount INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'open', work_location TEXT NOT NULL DEFAULT '',
    salary_min REAL, salary_max REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES company_profiles(id)
);
CREATE TABLE IF NOT EXISTS position_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, position_id INTEGER NOT NULL,
    requirement_type TEXT NOT NULL DEFAULT '', requirement_value TEXT NOT NULL DEFAULT '',
    is_required INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS position_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT, position_id INTEGER NOT NULL, keyword TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS position_skill_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, position_id INTEGER NOT NULL, skill_name TEXT NOT NULL,
    proficiency_level TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS position_language_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, position_id INTEGER NOT NULL, language_name TEXT NOT NULL,
    proficiency_level TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS position_candidate_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT, position_id INTEGER NOT NULL, candidate_id INTEGER NOT NULL,
    match_score REAL NOT NULL DEFAULT 0, stage TEXT NOT NULL DEFAULT 'recommended',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    UNIQUE(position_id, candidate_id)
);
CREATE TABLE IF NOT EXISTS position_candidate_stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER NOT NULL, from_stage TEXT NOT NULL DEFAULT '',
    to_stage TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
    FOREIGN KEY (match_id) REFERENCES position_candidate_matches(id) ON DELETE CASCADE
);
