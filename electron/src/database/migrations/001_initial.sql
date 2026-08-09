-- 001_initial.sql

-- 基础设施与系统配置表
CREATE TABLE IF NOT EXISTS system_schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload_json TEXT NOT NULL DEFAULT '{}',
    error_message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 客户公司域
CREATE TABLE IF NOT EXISTS customer_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE,
    industry TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    scale TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    contact_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    contact_name TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customer_companies(id) ON DELETE CASCADE
);

-- 候选人域
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
    city TEXT NOT NULL DEFAULT '',
    nationality TEXT NOT NULL DEFAULT '',
    primary_phone TEXT NOT NULL DEFAULT '',
    primary_email TEXT NOT NULL DEFAULT '',
    current_company TEXT NOT NULL DEFAULT '',
    current_position TEXT NOT NULL DEFAULT '',
    current_industry TEXT NOT NULL DEFAULT '',
    current_employment_status TEXT NOT NULL DEFAULT '',
    highest_school TEXT NOT NULL DEFAULT '',
    highest_major TEXT NOT NULL DEFAULT '',
    highest_degree_type TEXT NOT NULL DEFAULT '',
    highest_degree_rank INTEGER,
    work_years REAL,
    personal_summary TEXT NOT NULL DEFAULT '',
    candidate_status TEXT NOT NULL DEFAULT 'active'
        CHECK (candidate_status IN ('active', 'archived', 'do_not_contact')),
    resume_updated_date TEXT NOT NULL DEFAULT '',
    resume_download_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_name ON candidate_profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_city ON candidate_profiles(city);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_current_company ON candidate_profiles(current_company);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_current_position ON candidate_profiles(current_position);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_degree ON candidate_profiles(highest_degree_rank);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_work_years ON candidate_profiles(work_years);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_status ON candidate_profiles(candidate_status);

CREATE TABLE IF NOT EXISTS candidate_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'email', 'wechat', 'other')),
    contact_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL DEFAULT '',
    is_primary INTEGER NOT NULL DEFAULT 0,
    source_resume_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_contacts_candidate ON candidate_contacts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_contacts_normalized ON candidate_contacts(normalized_value);

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

CREATE INDEX IF NOT EXISTS idx_candidate_import_records_candidate ON candidate_import_records(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_expectations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    expected_city TEXT NOT NULL DEFAULT '',
    expected_position TEXT NOT NULL DEFAULT '',
    expected_industry TEXT NOT NULL DEFAULT '',
    expected_salary_text TEXT NOT NULL DEFAULT '',
    expected_annual_salary_min REAL,
    expected_annual_salary_max REAL,
    expected_employment_type TEXT NOT NULL DEFAULT '',
    expected_start_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    company_name TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    position_title TEXT NOT NULL DEFAULT '',
    position_type TEXT NOT NULL DEFAULT '',
    employment_type TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '',
    end_date TEXT NOT NULL DEFAULT '',
    is_current INTEGER NOT NULL DEFAULT 0,
    salary_text TEXT NOT NULL DEFAULT '',
    annual_salary_min REAL,
    annual_salary_max REAL,
    report_to TEXT NOT NULL DEFAULT '',
    subordinates_count INTEGER,
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements TEXT NOT NULL DEFAULT '',
    resigned_reason TEXT NOT NULL DEFAULT '',
    source_language TEXT NOT NULL DEFAULT 'zh',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_work_experiences_candidate ON candidate_work_experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_work_experiences_company ON candidate_work_experiences(company_name);

CREATE TABLE IF NOT EXISTS candidate_educations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    school_name TEXT NOT NULL DEFAULT '',
    major_name TEXT NOT NULL DEFAULT '',
    degree_type TEXT NOT NULL DEFAULT '',
    degree_rank INTEGER,
    education_type TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '',
    end_date TEXT NOT NULL DEFAULT '',
    is_highest INTEGER NOT NULL DEFAULT 0,
    source_language TEXT NOT NULL DEFAULT 'zh',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_educations_candidate ON candidate_educations(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    project_name TEXT NOT NULL DEFAULT '',
    company_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '',
    end_date TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    training_institution TEXT NOT NULL DEFAULT '',
    training_course TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '',
    end_date TEXT NOT NULL DEFAULT '',
    certificate_obtained TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    language_name TEXT NOT NULL DEFAULT '',
    proficiency_level TEXT NOT NULL DEFAULT '',
    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_type TEXT NOT NULL DEFAULT '',
    issued_time TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL DEFAULT '',
    proficiency_level TEXT NOT NULL DEFAULT '',
    years_used REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_resume_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    resume_language TEXT NOT NULL DEFAULT 'zh',
    content_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_search_documents (
    candidate_id INTEGER PRIMARY KEY,
    raw_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    position_id INTEGER,
    communication_date TEXT NOT NULL,
    communication_type TEXT NOT NULL DEFAULT 'phone',
    summary TEXT NOT NULL DEFAULT '',
    next_follow_up_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

-- 职位域
CREATE TABLE IF NOT EXISTS position_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    position_title TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '',
    headcount INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'paused', 'closed', 'filled')),
    work_location TEXT NOT NULL DEFAULT '',
    salary_min REAL,
    salary_max REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customer_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS position_requirements (
    position_id INTEGER PRIMARY KEY,
    min_work_years REAL,
    min_degree_rank INTEGER,
    required_major TEXT NOT NULL DEFAULT '',
    job_description TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS position_skill_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 1.0,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS position_language_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id INTEGER NOT NULL,
    language_name TEXT NOT NULL,
    min_level TEXT NOT NULL DEFAULT '',
    is_required INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS position_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE
);

-- 匹配与推荐中间表
CREATE TABLE IF NOT EXISTS position_candidate_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    score REAL NOT NULL DEFAULT 0.0,
    match_reason_json TEXT NOT NULL DEFAULT '{}',
    stage TEXT NOT NULL DEFAULT 'recommended',
    is_system_recommended INTEGER NOT NULL DEFAULT 1,
    is_manually_accepted INTEGER NOT NULL DEFAULT 0,
    is_manually_rejected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (position_id, candidate_id),
    FOREIGN KEY (position_id) REFERENCES position_openings(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS position_candidate_stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    from_stage TEXT NOT NULL,
    to_stage TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'system',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (match_id) REFERENCES position_candidate_matches(id) ON DELETE CASCADE
);
