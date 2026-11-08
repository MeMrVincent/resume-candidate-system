-- 003_candidate.sql  候选人主档、联系方式、导入批次、简历及其列表子表 | Candidate profile, contacts, import batches, resumes and their list tables | 候補者マスタ、連絡先、インポートバッチ、履歴書とそのリストテーブル
-- 列表子表沿用 v3 JSON 字段名；日期统一 ISO（YYYY-MM-DD / YYYY-MM）；薪资 REAL。 | List tables reuse the v3 JSON field names; dates are ISO (YYYY-MM-DD / YYYY-MM); salaries are REAL. | リストテーブルは v3 JSON のフィールド名を踏襲し、日付は ISO（YYYY-MM-DD / YYYY-MM）、給与は REAL とする。

CREATE TABLE candidate_profiles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_uuid   TEXT NOT NULL UNIQUE,
    record_id        TEXT NOT NULL DEFAULT '',          -- merge-v3-<group_id>
    full_name        TEXT NOT NULL DEFAULT '',
    english_name     TEXT NOT NULL DEFAULT '',
    gender           TEXT NOT NULL DEFAULT '',
    birth_date       TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    primary_phone    TEXT NOT NULL DEFAULT '',          -- 冗余自 candidate_contacts（主号）
    primary_email    TEXT NOT NULL DEFAULT '',
    current_company  TEXT NOT NULL DEFAULT '',
    current_position TEXT NOT NULL DEFAULT '',
    highest_degree   TEXT NOT NULL DEFAULT '',
    work_years       REAL,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    source_type      TEXT NOT NULL DEFAULT 'import' CHECK (source_type IN ('import','manual','position')),
    source_position_id INTEGER REFERENCES position_openings(id) ON DELETE SET NULL,
    owner_user_id    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE UNIQUE INDEX uq_candidate_primary_phone ON candidate_profiles(primary_phone) WHERE primary_phone <> '';
CREATE UNIQUE INDEX uq_candidate_primary_email ON candidate_profiles(primary_email) WHERE primary_email <> '';
CREATE INDEX idx_candidate_profiles_name   ON candidate_profiles(full_name);
CREATE INDEX idx_candidate_profiles_status ON candidate_profiles(status);
CREATE INDEX idx_candidate_profiles_source_position ON candidate_profiles(source_position_id);
CREATE INDEX idx_candidate_profiles_record ON candidate_profiles(record_id);

CREATE TABLE candidate_contacts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    contact_type     TEXT NOT NULL CHECK (contact_type IN ('mobile','landline','email')),
    contact_value    TEXT NOT NULL,                      -- 原值
    normalized_value TEXT NOT NULL,                      -- 手机/座机仅数字(去86)；邮箱小写
    is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    is_shared        INTEGER NOT NULL DEFAULT 0 CHECK (is_shared IN (0,1)),
    source           TEXT NOT NULL DEFAULT 'import' CHECK (source IN ('import','manual')),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    CHECK (NOT (is_primary = 1 AND is_shared = 1)),
    UNIQUE (candidate_id, contact_type, normalized_value)
);
-- 手机/邮箱全局唯一（共用的允许多人重复出现；座机不限，常为公司总机）
-- Mobile numbers / emails are globally unique (shared ones may appear for several people; landlines are not restricted since they are often a company switchboard)
-- 携帯番号・メールは全体で一意（共用は複数人に重複可。固定電話は会社の代表番号が多いため制限しない）
CREATE UNIQUE INDEX uq_candidate_contacts_value
    ON candidate_contacts(contact_type, normalized_value) WHERE is_shared = 0 AND contact_type <> 'landline';
CREATE UNIQUE INDEX uq_candidate_contacts_primary
    ON candidate_contacts(candidate_id, contact_type) WHERE is_primary = 1;
CREATE INDEX idx_candidate_contacts_lookup ON candidate_contacts(contact_type, normalized_value);

CREATE TABLE candidate_import_batches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_uuid       TEXT NOT NULL UNIQUE,
    source_dir       TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
    total_files      INTEGER NOT NULL DEFAULT 0,
    created_count    INTEGER NOT NULL DEFAULT 0,
    updated_count    INTEGER NOT NULL DEFAULT 0,
    skipped_count    INTEGER NOT NULL DEFAULT 0,
    failed_count     INTEGER NOT NULL DEFAULT 0,
    rejected_count   INTEGER NOT NULL DEFAULT 0,   -- 严格模式下因警告被拒绝写库的文件数 | Files rejected in strict mode because of warnings | 厳格モードで警告のため書き込みを拒否したファイル数
    warning_count    INTEGER NOT NULL DEFAULT 0,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    started_at       TEXT NOT NULL,
    finished_at      TEXT
);

CREATE TABLE candidate_import_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id         INTEGER NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    candidate_id     INTEGER REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL,
    record_id        TEXT NOT NULL DEFAULT '',
    content_hash     TEXT NOT NULL DEFAULT '',
    result           TEXT NOT NULL CHECK (result IN ('created','updated','skipped','failed','rejected')),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_import_records_batch ON candidate_import_records(batch_id);
CREATE INDEX idx_import_records_hash  ON candidate_import_records(content_hash);
CREATE INDEX idx_import_records_candidate ON candidate_import_records(candidate_id);

CREATE TABLE candidate_import_errors (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id         INTEGER NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    candidate_id     INTEGER REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL DEFAULT '',
    severity         TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning','error')),
    error_code       TEXT NOT NULL DEFAULT '',          -- contact_conflict / list_misaligned / bad_date / parse_error ...
    message          TEXT NOT NULL DEFAULT '',
    detail_json      TEXT NOT NULL DEFAULT '{}',
    resolved         INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0,1)),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_import_errors_batch ON candidate_import_errors(batch_id);
CREATE INDEX idx_import_errors_code  ON candidate_import_errors(error_code, resolved);

-- 简历版本（resumes[]）；第 0 份恒为 zh 主简历
-- Resume versions (resumes[]); the 0th one is always the main zh resume
-- 履歴書バージョン（resumes[]）。0 番目は常に zh のメイン履歴書
CREATE TABLE candidate_resumes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    language_code    TEXT NOT NULL DEFAULT 'zh',        -- JSON: resume_languge
    is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    full_name        TEXT NOT NULL DEFAULT '',
    gender           TEXT NOT NULL DEFAULT '',
    age              INTEGER,
    birth_date       TEXT NOT NULL DEFAULT '',
    birth_year       INTEGER,
    city             TEXT NOT NULL DEFAULT '',
    address          TEXT NOT NULL DEFAULT '',
    nationality      TEXT NOT NULL DEFAULT '',
    marital_status   TEXT NOT NULL DEFAULT '',
    children_status  TEXT NOT NULL DEFAULT '',
    political_status TEXT NOT NULL DEFAULT '',
    household_registration TEXT NOT NULL DEFAULT '',
    postal_code      TEXT NOT NULL DEFAULT '',
    height_cm        REAL,
    weight_kg        REAL,
    pr               TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    email            TEXT NOT NULL DEFAULT '',
    platform_from    TEXT NOT NULL DEFAULT '',
    platform_resume_id TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (candidate_id, sequence_no),
    CHECK (is_primary = 0 OR language_code = 'zh')
);
CREATE UNIQUE INDEX uq_candidate_resumes_primary ON candidate_resumes(candidate_id) WHERE is_primary = 1;

CREATE TABLE candidate_expectations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    expected_position TEXT NOT NULL DEFAULT '',
    expected_industry TEXT NOT NULL DEFAULT '',
    expected_city    TEXT NOT NULL DEFAULT '',
    expected_employment_type TEXT NOT NULL DEFAULT '',
    expected_salary  TEXT NOT NULL DEFAULT '',
    expected_annual_salary_min REAL,
    expected_annual_salary_max REAL,
    expected_start_date TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_work_experiences (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    company_name     TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '',
    company_employees TEXT NOT NULL DEFAULT '',
    position         TEXT NOT NULL DEFAULT '',
    position_dept    TEXT NOT NULL DEFAULT '',
    position_type    TEXT NOT NULL DEFAULT '',
    position_start   TEXT NOT NULL DEFAULT '',          -- ISO YYYY-MM[-DD]
    position_resigned TEXT NOT NULL DEFAULT '',         -- '' 表示至今
    position_report_to TEXT NOT NULL DEFAULT '',
    position_subordinate TEXT NOT NULL DEFAULT '',
    position_salary  TEXT NOT NULL DEFAULT '',
    annual_salary_min REAL,
    annual_salary_max REAL,
    employment_type  TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT '',
    resigned_reason  TEXT NOT NULL DEFAULT '',
    position_responsibilities TEXT NOT NULL DEFAULT '',
    position_achievements TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_educations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    school_name      TEXT NOT NULL DEFAULT '',
    school_major_name TEXT NOT NULL DEFAULT '',
    school_degree_type TEXT NOT NULL DEFAULT '',
    school_degree_rank INTEGER,
    school_education_type TEXT NOT NULL DEFAULT '',
    school_start_ym  TEXT NOT NULL DEFAULT '',
    school_end_ym    TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_projects (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    project_name     TEXT NOT NULL DEFAULT '',
    company_or_client TEXT NOT NULL DEFAULT '',
    role_name        TEXT NOT NULL DEFAULT '',
    start_ym         TEXT NOT NULL DEFAULT '',
    end_ym           TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements     TEXT NOT NULL DEFAULT '',
    keywords         TEXT NOT NULL DEFAULT '',
    fingerprint      TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_trainings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    training_name    TEXT NOT NULL DEFAULT '',
    training_org     TEXT NOT NULL DEFAULT '',
    training_start   TEXT NOT NULL DEFAULT '',
    training_end     TEXT NOT NULL DEFAULT '',
    training_content TEXT NOT NULL DEFAULT '',
    raw_json         TEXT NOT NULL DEFAULT '{}',        -- 样本中尚无训练字段，原样保留
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_languages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    language_name    TEXT NOT NULL DEFAULT '',
    language_level   TEXT NOT NULL DEFAULT '',
    language_certificate TEXT NOT NULL DEFAULT '',
    language_certificate_time TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_certificates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_type TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_skills (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    skill_name       TEXT NOT NULL DEFAULT '',
    skill_level      TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE INDEX idx_work_company ON candidate_work_experiences(company_name);
CREATE INDEX idx_edu_school   ON candidate_educations(school_name);
CREATE INDEX idx_skill_name   ON candidate_skills(skill_name);
