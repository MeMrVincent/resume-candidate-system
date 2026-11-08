-- 002_company_position.sql  公司、对接人、职位、职位关键词 | Companies, contacts, positions, position keywords | 企業、担当者、求人、求人キーワード

CREATE TABLE company_profiles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_uuid  TEXT NOT NULL UNIQUE,
    company_name  TEXT NOT NULL UNIQUE,
    short_name    TEXT NOT NULL DEFAULT '',
    industry      TEXT NOT NULL DEFAULT '',
    company_size  TEXT NOT NULL DEFAULT '',
    country       TEXT NOT NULL DEFAULT '',
    province      TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    address       TEXT NOT NULL DEFAULT '',
    website       TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
    owner_user_id INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_profiles_status ON company_profiles(status);

CREATE TABLE company_contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    contact_name  TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    department    TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    wechat        TEXT NOT NULL DEFAULT '',
    is_primary    INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
    note          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_contacts_company ON company_contacts(company_id);
CREATE UNIQUE INDEX uq_company_contacts_one_primary
    ON company_contacts(company_id) WHERE is_primary = 1;

CREATE TABLE company_notes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    noted_at      TEXT NOT NULL,
    note_type     TEXT NOT NULL DEFAULT 'note',
    content       TEXT NOT NULL,
    created_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_notes_company ON company_notes(company_id);

CREATE TABLE position_openings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    position_uuid    TEXT NOT NULL UNIQUE,
    company_id       INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    contact_id       INTEGER NOT NULL REFERENCES company_contacts(id) ON DELETE RESTRICT,
    owner_user_id    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    title            TEXT NOT NULL,
    department       TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    work_location    TEXT NOT NULL DEFAULT '',
    employment_type  TEXT NOT NULL DEFAULT '全职',
    headcount        INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1),
    salary_min       REAL,
    salary_max       REAL,
    salary_currency  TEXT NOT NULL DEFAULT 'CNY',
    salary_months    REAL,
    experience_min   REAL,
    experience_max   REAL,
    degree_min_rank  INTEGER CHECK (degree_min_rank IS NULL OR degree_min_rank BETWEEN 1 AND 7),
    jd_text          TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    requirements_text TEXT NOT NULL DEFAULT '',
    guarantee_days   INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_days >= 0),
    priority         TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status           TEXT NOT NULL DEFAULT 'draft'  CHECK (status IN (
        'draft','open','paused','filled','closed','cancelled')),
    opened_at        TEXT,
    closed_at        TEXT,
    last_matched_at  TEXT,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_position_openings_company ON position_openings(company_id);
CREATE INDEX idx_position_openings_contact ON position_openings(contact_id);
CREATE INDEX idx_position_openings_status  ON position_openings(status);
CREATE INDEX idx_position_openings_title   ON position_openings(title);

-- 职位负责人（对接人）必须属于该职位所在的公司
-- The person in charge of a position (a company contact) must belong to the company of that position
-- 求人の担当者（先方窓口）は、その求人が属する企業の窓口でなければならない
CREATE TRIGGER trg_position_contact_belongs_ins
BEFORE INSERT ON position_openings
BEGIN
    SELECT RAISE(ABORT, 'position contact must belong to the position company')
    WHERE NOT EXISTS (
        SELECT 1 FROM company_contacts WHERE id = NEW.contact_id AND company_id = NEW.company_id);
END;

CREATE TRIGGER trg_position_contact_belongs_upd
BEFORE UPDATE OF company_id, contact_id ON position_openings
BEGIN
    SELECT RAISE(ABORT, 'position contact must belong to the position company')
    WHERE NOT EXISTS (
        SELECT 1 FROM company_contacts WHERE id = NEW.contact_id AND company_id = NEW.company_id);
END;

CREATE TABLE position_keywords (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id   INTEGER NOT NULL REFERENCES position_openings(id) ON DELETE CASCADE,
    keyword       TEXT NOT NULL,
    keyword_type  TEXT NOT NULL DEFAULT 'other' CHECK (keyword_type IN (
        'skill','language','industry','city','title','degree','other')),
    weight        REAL NOT NULL DEFAULT 1,
    is_required   INTEGER NOT NULL DEFAULT 0 CHECK (is_required IN (0,1)),
    source        TEXT NOT NULL DEFAULT 'rule' CHECK (source IN ('rule','manual')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    UNIQUE (position_id, keyword)
);
