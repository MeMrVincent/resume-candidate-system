# Headhunting & Recruitment Management System V2 - Development Plan & Complete Functional Specifications

> **Language Navigation / 语言导航 / 言語ナビゲーション**  
> **English** | [简体中文](recruitment_system_development_plan.cn.md) | [日本語](recruitment_system_development_plan.ja.md)

---

**Document Version**: 2.0.0  
**Updated Date**: 2026-11-08  
**Target Audience**: Codex / Antigravity / Full-Stack Engineering Team  
**System Form Factor**: Enterprise-Grade Local Offline Electron Desktop Application  
**Core Technology Baseline**: Electron 45.2.3 + better-sqlite3 13.0.3 + SQLite 3.53.4 (WAL mode) + Vue 3.5.45 + Element Plus 2.14.8 + vue-i18n 11.4.18  
**Current Milestone Status**:
- **Phase 1 (Candidate Core Talent Pool)**: 9,860 cleaned JSON profiles, cross-language resume merging, and SQLite FTS5 trigram search fully operational.
- **Phase 2 (Position Openings & ATS Pipeline Match Flow)**: Job openings, decision vs stage decoupling, multi-round interview logs, offer & guarantee period placements, and 3 real-time SQL analytical views fully implemented.
- **Phase 3 (Client Company CRM)**: Full-stack implementation of client company profiles, multi-contact directory, cascading soft-delete protection, and dedicated Vue 3 views.
- **Engineering & Quality Assurance**: All 24/24 backend automated unit/integration tests passing; native Electron Builder packaging pipeline (NSIS / Portable / Unpacked) fully operational.

---

## 0. Version Evolution: Key Differences (V1 vs V2)

Compared to Version 1.0, Version 2.0 represents a major architectural and business evolution:

### 0.1 Comprehensive Evolution Matrix

| Dimension | Version 1.0 Implementation | Version 2.0 Major Evolution |
| :--- | :--- | :--- |
| **Database Migrations** | 7 cumulative incremental patches (`001_initial` to `007_communication_list_fields`) | Refactored into **5 Domain-Driven Design (DDD) migration modules** (`001_system` to `005_search_views`) |
| **System Infrastructure** | Settings & basic audit log only | Added **`system_users` operator table** for consultant ownership attribution and audit tracking across companies, positions, and communication logs |
| **Client Company CRM (Phase 3)** | Draft architecture specification without working code | **Full-stack closed-loop delivery**: `company_profiles`, `company_contacts`, `company_notes`, primary contact auto-promotion/demotion, cascading soft-delete protection, and full Vue 3 CRM views |
| **Positions & ATS Pipeline** | Basic match table only | **Granular domain modeling**: Added `position_candidate_interviews` (multi-round interviews and feedback), `position_candidate_placements` (onboarding, offer salary, guarantee period days, fee settlement), and `position_candidate_history` (lifecycle audit trail) |
| **Decision vs Stage Decoupling**| Application-level convention | **Strict database-level CHECK constraint**: `CHECK (stage IS NULL OR decision = 'accepted')`, physically enforcing that only accepted candidates can advance in the recruitment funnel |
| **Analytics & Reporting** | On-the-fly SQL concatenation in views | **3 Built-in high-performance analytical views**: `v_candidate_stats`, `v_position_pipeline_counts`, `v_company_position_counts` |
| **Candidate Ingestion Engine** | Single-shot CLI import script | **Interactive Import Engine (Import V3)**: Desktop folder/file picker, `candidate_import_batches` telemetry, `candidate_import_errors` audit table, **strict mode conflict prevention**, and multilingual alignment diagnostics |
| **Frontend Internationalization**| Monolithic dictionary bundled at startup | **Route-based dynamic chunk loading** (`meta.i18nPacks` router guard): Only `core.json` is loaded at startup; module packs are fetched asynchronously upon route navigation; English default (`en-us`), 100% key-aligned with CN/JA |
| **Packaging & Distribution** | Incomplete build configuration | **Fully verified `electron-builder` pipeline**: Supports unpacked directory (`dist:dir`), portable executable, and NSIS installer with bundled read-only seed database mount and native smoke testing |
| **Automated Test Coverage** | 10 baseline unit tests | **Expanded to 24 comprehensive automated tests** (covering company CRM, import strict mode, conflict prevention, multilingual tolerance, etc.), maintaining 100% pass rate |

---

## 1. System Objectives & Business Closed-Loop Workflows

The system operates as an enterprise-grade, high-performance local offline desktop application combining Headhunting CRM, ATS, and Intelligent Talent Retrieval & Matching.

### 1.1 Forward Recruitment Closed-Loop Workflow

```text
Client Company (Company)
      ↓
Create Job Opening (Position Openings)
      ↓
FTS5 Full-Text Recall + Structured Filtering (Recall)
      ↓
Intelligent Matching & Scoring (MatchEngine Scoring)
      ↓
Consultant Evaluation (decision: accepted / dismissed)
      ↓
Candidate Communication & Follow-up (candidate_communications)
      ↓
Submit Candidate to Client (stage: submitted)
      ↓
Multi-Round Client Interview Management (position_candidate_interviews)
      ↓
Offer Acceptance & Placement Settlement (position_candidate_placements)
      ↓
Onboarding & Guarantee Verification (guarantee_passed)
```

### 1.2 Reverse Lifecycle Tracking & Data Penetration

From the Candidate Profile view, a recruiter can track:
- Historical recommendations: all companies and job openings linked to the candidate;
- Current funnel stage for each position (communicating, submitted, interview round, offer, hired);
- Feedback notes and ratings from every interview round;
- Guarantee period status and communication timeline.

---

## 2. Complete Functional Capabilities Matrix (V2 Full Feature Panorama)

Version 2.0 provides **10 functional modules** covering client management, job openings, talent pool governance, intelligent search, ATS pipeline, interactive ingestion, analytics, system governance, i18n, and offline delivery:

### Module 1: Client Company CRM (Phase 3 Full Stack)
1. **Company Profile Lifecycle Management**:
   - Create, edit, inspect, search, and manage statuses of client companies;
   - Core fields: Full company name (globally unique index), short name, industry sector, company size, country/province/city, physical address, official website, company description;
   - Company state machine: `active` (active partner), `inactive` (suspended partner), `blacklisted`;
   - Consultant attribution: Linked to consultant (`owner_user_id`), with creator and updater audit metadata.
2. **Multi-Contact Directory (`company_contacts`)**:
   - Multiple contacts per company (HR, department heads, hiring managers);
   - Attributes: Full name, title, department, mobile phone, email, WeChat, contact status (`active` / `left`), notes;
   - **Primary Contact Mechanism**: The first contact added is automatically set as the primary contact (`is_primary=1`); adding or updating another contact as primary automatically demotes the existing primary contact, ensuring exactly one primary contact per company;
   - Foreign-key protection: Contacts currently assigned to active job openings **cannot be deleted** (throws `IN_USE` business error), requiring reassignment or marking as left.
3. **Cascading Integrity & Intelligent Soft-Delete**:
   - If a company has **no associated job openings**, physical deletion is executed (`deleted`), cascading to its contacts and notes;
   - If a company has **existing job openings**, physical deletion is intercepted and automatically converted into **soft deletion** (`deactivated`), setting the status to `inactive` to preserve historical integrity.
4. **Company Follow-up Notes (`company_notes`)**:
   - Recruiter interaction notes, meeting minutes, and negotiation logs;
   - Fields: Timestamp (`noted_at`), note category (`note_type`), content body, recorded user, presented in reverse chronological order.
5. **Frontend CRM Workspace**:
   - Company List View (keyword search, status filter, pagination);
   - Company Detail Card View (company info, opening count statistics, contact table, follow-up stream);
   - Contact Management Dialog (`contact.popup.vue`) and Company Edit Dialog (`edit.popup.vue`).

---

### Module 2: Job Openings & Requirements Management (Position Management)
1. **Job Opening Modeling**:
   - Foreign keys to client company (`company_id`) and designated contact (`contact_id`);
   - Core parameters: Position title, department, headcount quota (`headcount >= 1`), job location, work site address, employment type (full-time, part-time, contractor);
   - Compensation: Salary range (`salary_min` to `salary_max`), currency (CNY/USD/JPY), salary month multiplier (e.g., 12, 14, 16 months);
   - Job requirements: Experience years range (`experience_min` to `experience_max`), minimum degree rank (1 to 7 integer scale), job description (JD), qualification text;
   - Recruitment settings: Guarantee period days (`guarantee_days`), priority level (`low`, `normal`, `high`, `urgent`);
   - Position state machine: `draft` -> `open` -> `paused` -> `filled` -> `closed` / `cancelled`.
2. **Contact-Company Belonging Triggers**:
   - SQLite triggers `trg_position_contact_belongs_ins` and `trg_position_contact_belongs_upd`;
   - Database-level constraint strictly enforcing that a position's contact strictly belongs to the position's company.
3. **Position Keywords & Skill Portrait (`position_keywords`)**:
   - Weighted keywords across skills, languages, industries, cities, job titles, and degrees;
   - Weight assignments and categorization (must-have vs nice-to-have).
4. **Position Pipeline Funnel Dashboard**:
   - Integrates with `v_position_pipeline_counts` view, surfacing real-time counts for suggested, accepted, dismissed, submitted, interviewing, offer, and hired candidates.

---

### Module 3: Candidate Talent Pool & Multilingual Governance
1. **Candidate Profile (`candidate_profiles`)**:
   - Unique identifier (`candidate_uuid`), ingestion group identifier (`record_id`);
   - Core demographic and career fields: Full name, English name, gender, birth date, city, current employer, current title, highest degree, total years of experience;
   - Contact shortcuts with unique indices: `primary_phone` and `primary_email`;
   - Candidate status: `active` (actively tracked) or `archived`.
2. **Multi-Channel Contact Governance (`candidate_contacts`)**:
   - Supports mobile phones, landlines, and email addresses;
   - Normalization: Mobile numbers strip country code `+86`, emails normalized to lowercase;
   - **Uniqueness & Shared Contact Handling**:
     - Primary mobile phone and primary email are globally unique across non-shared records;
     - Landline numbers are exempted from uniqueness constraints, allowing shared enterprise switchboard numbers without false collision warnings;
     - Non-primary contacts can be marked as shared (`is_shared=1`).
3. **8-Dimensional Structured Sub-Entities**:
   - `candidate_resumes`: Multilingual resume storage (`zh` is always index 0 primary; supports `en` and `ja` versions; stores height, weight, marital/child status, household registration, and PR statement);
   - `candidate_expectations`: Career expectations (desired title, industry, city, employment type, salary range min/max, available start date);
   - `candidate_work_experiences`: Work history (company name, industry, size, date ranges, department, reporting line, subordinates, responsibilities, achievements, resignation reason);
   - `candidate_educations`: Education history (school name, major, degree type and rank 1-7, full-time/part-time, date ranges);
   - `candidate_projects`: Project experience (project title, client/company, role, date ranges, responsibilities, achievements, keywords, fingerprint);
   - `candidate_trainings`: Professional training records (training institute, course title, dates, content);
   - `candidate_languages`: Language proficiencies (language name, proficiency level, certification, issue date);
   - `candidate_certificates`: Professional certifications (certificate name, authority, issue date);
   - `candidate_skills`: Technical skills (skill name, proficiency level).
4. **Multilingual Resume Harmonization & V3 Merge Engine**:
   - Merges Chinese, English, and Japanese resume versions into unified profile;
   - **Alignment & Tolerance Diagnostics**: Compares experience and education record counts between languages; tolerates small date deviations; flags large date drifts or missing sections in `import_warnings_report.txt`.
5. **Candidate Communications (`candidate_communications`)**:
   - Recruiter follow-ups, calls, interviews, notes;
   - Categorized by source type: `manual` (recruiter notes), `system` (automated logs), and `imported_resume` (historical imported records).

---

### Module 4: Intelligent Search & Recall Engine
1. **SQLite FTS5 Trigram Full-Text Search**:
   - FTS5 virtual table indexing using the `trigram` tokenizer;
   - High-performance fuzzy matching on arbitrary substrings (3+ characters) across Chinese, Japanese, and English.
2. **Dynamic Unstructured Document Synthesis (`CandidateRawTextBuilder`)**:
   - Aggregates unstructured text across candidate profile, experiences, projects, educations, skills, and PR statements;
   - Synchronized via database triggers (`trg_search_doc_ai`, `trg_search_doc_ad`, `trg_search_doc_au`) on insert, update, and delete, guaranteeing zero stale search data.
3. **Multi-Criteria Structured Filtering**:
   - Combined querying on experience years, degree ranks, salary bounds, locations, and language levels.
4. **Consultant Evaluation & Match Scoring**:
   - Algorithmic scoring and keyword overlap (`match_score`, `matched_keywords`);
   - Consultant decision: `suggested` -> `accepted` (advance) or `dismissed` (with documented reason).

---

### Module 5: ATS Recruitment Pipeline & Placement Lifecycle
1. **Decision vs Stage Strict Decoupling**:
   - Enforced by database-level constraints:
     - `CHECK (stage IS NULL OR decision = 'accepted')`: Only accepted candidates can have an active stage;
     - `CHECK (decision <> 'accepted' OR stage IS NOT NULL)`: Accepted candidates must have an assigned stage.
2. **Recruitment Pipeline Stages**:
   - Forward stages: `pending_contact` -> `contacting` -> `interested` -> `submitted` -> `interviewing` -> `interview_passed` -> `background_check` -> `offer` -> `hired` -> `guarantee_passed`;
   - Terminal stages: `candidate_declined`, `client_rejected`, `background_check_failed`, `offer_declined`, `left_during_guarantee`.
3. **Multi-Round Interview Tracking (`position_candidate_interviews`)**:
   - Interview round (`round_no`), type (HR screen, technical interview, director interview, on-site);
   - Schedule (`scheduled_at`), interviewer, result (`pending`, `passed`, `failed`, `cancelled`), detailed feedback notes.
4. **Offer Placement & Guarantee Settlement (`position_candidate_placements`)**:
   - Offer date (`offer_date`), offered salary (`offer_salary`), onboarding date (`onboard_date`);
   - Inherits guarantee period days (`guarantee_days`) snapshot from position;
   - Computes guarantee end date (`guarantee_end_date`);
   - Tracks guarantee fulfillment, refunds, or replacement status.
5. **Full Lifecycle Audit Trail (`position_candidate_history`)**:
   - Captures every transition of decision and stage;
   - Logs `from_value`, `to_value`, `reason`, operator user ID, and timestamp.

---

### Module 6: Interactive Batch Ingestion Workbench & Conflict Audit
1. **Native Desktop File / Folder Picker**:
   - Injected Electron dialog supports picking single/multiple JSON files or entire directories recursively.
2. **Import Batch Telemetry (`candidate_import_batches`)**:
   - Logs batch UUID, source directory, total file count, created count, updated count, skipped count, failed count, rejected count, warning count, start and finish times.
3. **Content Hash Deduplication & Idempotent Re-runs**:
   - SHA-256 content hashing (`content_hash`) skips identical files instantly; updates modified files in place without duplication.
4. **Strict Mode Conflict Prevention**:
   - When enabled, any primary phone or email collision with an existing candidate immediately halts write operations for that file, rolling back the transaction;
   - Prevents candidate database pollution, logging conflicts into error table for review.
5. **Categorized Error & Conflict Audit (`candidate_import_errors`)**:
   - Captures severity (`warning` / `error`), error code (`contact_conflict`, `list_misaligned`, `bad_date`, `parse_error`), file path, and diagnostic JSON details.
6. **Frontend Ingestion UI (`candidate/import.vue`)**:
   - Interactive selection list, reset controls, live progress tracking;
   - Batch summary cards and historical batches table;
   - Issues inspection modal (`issueDialog`) with error codes and remediation details.

---

### Module 7: Real-Time Analytics & Aggregation Views
1. **Candidate Productivity & Placement View (`v_candidate_stats`)**:
   - `recommend_count`: Reached `submitted` stage;
   - `success_count`: Reached `hired` stage;
   - `communication_count`: Valid recruiter communications (excluding automatic `imported_resume` entries).
2. **Position Pipeline Funnel View (`v_position_pipeline_counts`)**:
   - Real-time pipeline funnel per opening: `suggested_count`, `accepted_count`, `dismissed_count`, `submitted_now`, `interviewing_now`, `offer_now`, `hired_count`.
3. **Company Hiring Activity View (`v_company_position_counts`)**:
   - Company totals: `position_total` and currently active `position_open`.

---

### Module 8: System Administration & Governance
1. **System User Accounts (`system_users`)**:
   - Roles: `admin` and `consultant`, with active/disabled statuses;
   - Standalone edition includes static system user (`id=1, username='system'`).
2. **Operational Audit Trail (`system_audit_logs`)**:
   - Tracks create, update, delete actions on business entities with JSON diffs (`before_json`, `after_json`).
3. **Dynamic Configuration (`system_settings`)**:
   - Key-value runtime settings.
4. **Background Async Job Queue (`system_jobs`)**:
   - Orchestrates long-running batch operations, deduplication keys, and retry lifecycles.

---

### Module 9: Trilingual Internationalization (i18n)
1. **Trilingual Coverage**:
   - Default English (`en-us`), with full Simplified Chinese (`zh-cn`) and Japanese (`ja-jp`);
   - Instant language switching without application restart.
2. **Route-Based On-Demand Chunk Loading (`meta.i18nPacks`)**:
   - Startup loads minimal `core.json`;
   - Navigation guards asynchronously load `company.json` and `candidateImport.json` on demand.
3. **Element Plus Locale Synchronization**:
   - Element Plus framework UI components synchronize with system language selection.

---

### Module 10: Local Desktop Offline Distribution & Packaging
1. **100% Offline Execution**:
   - Fully independent of external network connectivity; local SQLite database guarantees privacy.
2. **Modern Runtime Baseline**:
   - Electron 45.2.3, Node 20+, and better-sqlite3 13.0.3 native C++ bindings.
3. **Native Packaging Pipeline (`electron-builder`)**:
   - Unpacked directory (`npm run dist:dir` -> `release/win-unpacked`);
   - Portable standalone binary;
   - Windows installer (NSIS).
4. **Seed Database Mounting & Auto-Migration**:
   - Clones read-only seed database into user data directory on fresh run and executes missing migrations.

---

## 3. Technical Stack & Layered Architecture

```text
Desktop Runtime: Electron 45.2.3 (Node 20+ runtime environment)
Database Engine: SQLite 3.53.4 (WAL mode, foreign keys enabled, busy_timeout=5000)
Database Driver: better-sqlite3 13.0.3 (Native C++ prebuilt bindings)
Frontend Framework: Vue 3 (Composition API) + Vue Router + Element Plus 2.14.8
Internationalization: vue-i18n 11.4.18 (On-demand route-based chunk loading, EN/ZH/JA)
Build Toolchain: Webpack 5.112.2 + Babel 8.1.0 + electron-builder 26.18.0
```

### 3.1 Layered Invocation Chain & Security Boundary

```text
Vue 3 Renderer Process
    ↓
Preload API (contextBridge.exposeInMainWorld)
    ↓
Typed Electron IPC (ipcMain.handle via registerServiceMethods)
    ↓
Domain Services (CompanyService, CandidateImportService, SystemService)
    ↓
Repositories (CompanyRepository, CandidateRepository)
    ↓
SQLite Database (SqliteDatabase.js / better-sqlite3)
```

**Security Rules:**
- The Vue renderer process must never import `better-sqlite3` directly;
- IPC router files must never write raw SQL statements;
- `nodeIntegration` must remain strictly disabled.

---

## 4. Full Database Architecture & DDL (5 Migration Modules)

V2 database comprises 5 domain-driven migration files, consisting of 29 tables and 3 analytical views:

### 4.1 Migration 001: System Infrastructure (`001_system.sql`)

```sql
-- 001_system.sql  系统基础表 | System base tables | システム基本テーブル

CREATE TABLE system_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid     TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin','consultant')),
    status        TEXT NOT NULL DEFAULT 'active'     CHECK (status IN ('active','disabled')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE system_settings (
    setting_key   TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL
);

CREATE TABLE system_jobs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type          TEXT NOT NULL CHECK (job_type IN (
        'import_candidates','rebuild_raw_text','match_position','match_candidate',
        'guarantee_check','database_backup')),
    entity_type       TEXT NOT NULL DEFAULT '',
    entity_id         INTEGER,
    dedupe_key        TEXT NOT NULL DEFAULT '',
    payload_json      TEXT NOT NULL DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued','running','completed','failed','cancelled')),
    progress_current  INTEGER NOT NULL DEFAULT 0,
    progress_total    INTEGER NOT NULL DEFAULT 0,
    error_message     TEXT NOT NULL DEFAULT '',
    created_by        INTEGER REFERENCES system_users(id),
    created_at        TEXT NOT NULL,
    started_at        TEXT,
    finished_at       TEXT
);
CREATE INDEX idx_system_jobs_status ON system_jobs(status);
CREATE INDEX idx_system_jobs_dedupe ON system_jobs(job_type, dedupe_key, status);

CREATE TABLE system_audit_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type       TEXT NOT NULL,
    entity_id         INTEGER,
    action            TEXT NOT NULL,
    before_json       TEXT,
    after_json        TEXT,
    operator_user_id  INTEGER REFERENCES system_users(id),
    created_at        TEXT NOT NULL
);
CREATE INDEX idx_system_audit_entity ON system_audit_logs(entity_type, entity_id);

-- 单机版固定的本地系统用户（所有 owner / created_by / updated_by 默认指向它）
-- Fixed local system user of the standalone edition (every owner / created_by / updated_by points to it by default)
-- スタンドアロン版の固定ローカルシステムユーザー（owner / created_by / updated_by は既定でこのユーザーを指す）
INSERT INTO system_users (id, user_uuid, username, display_name, role, status, created_at, updated_at)
VALUES (1, 'system-local-user', 'system', '系统', 'admin', 'active',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
```

---

### 4.2 Migration 002: Client Companies & Job Openings (`002_company_position.sql`)

```sql
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
```

---

### 4.3 Migration 003: Candidate Profile & Ingestion Audit (`003_candidate.sql`)

```sql
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
```

---

### 4.4 Migration 004: Candidate-Job Matching, Interviews & Placements (`004_match_flow.sql`)

```sql
-- 004_match_flow.sql  职位-候选人匹配、流转阶段、面试、入职、历史、沟通记录 | Position-candidate matches, pipeline stages, interviews, placements, history, communications | 求人と候補者のマッチング、選考ステージ、面接、入社、履歴、コミュニケーション記録

CREATE TABLE position_candidate_matches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id      INTEGER NOT NULL REFERENCES position_openings(id) ON DELETE CASCADE,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    decision         TEXT NOT NULL DEFAULT 'suggested' CHECK (decision IN ('suggested','accepted','dismissed')),
    stage            TEXT CHECK (stage IS NULL OR stage IN (
        'pending_contact','contacting','interested','submitted','interviewing',
        'interview_passed','background_check','offer','hired','guarantee_passed',
        'candidate_declined','client_rejected','background_check_failed',
        'offer_declined','left_during_guarantee')),
    origin           TEXT NOT NULL DEFAULT 'auto' CHECK (origin IN ('auto','import','manual')),
    match_score      REAL NOT NULL DEFAULT 0,
    matched_keywords TEXT NOT NULL DEFAULT '[]',        -- JSON 数组
    dismissed_reason TEXT NOT NULL DEFAULT '',
    manual_note      TEXT NOT NULL DEFAULT '',
    decided_at       TEXT,
    stage_changed_at TEXT,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (position_id, candidate_id),
    CHECK (stage IS NULL OR decision = 'accepted'),
    CHECK (decision <> 'accepted' OR stage IS NOT NULL)
);
CREATE INDEX idx_match_position  ON position_candidate_matches(position_id, decision);
CREATE INDEX idx_match_candidate ON position_candidate_matches(candidate_id);
CREATE INDEX idx_match_stage     ON position_candidate_matches(stage);

CREATE TABLE position_candidate_interviews (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    round_no         INTEGER NOT NULL DEFAULT 1,
    interview_type   TEXT NOT NULL DEFAULT '',
    scheduled_at     TEXT,
    interviewer      TEXT NOT NULL DEFAULT '',
    result           TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','passed','failed','cancelled')),
    feedback         TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (match_id, round_no)
);

CREATE TABLE position_candidate_placements (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL UNIQUE REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    offer_date       TEXT,
    offer_salary     REAL,
    onboard_date     TEXT,
    guarantee_days   INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_days >= 0),   -- 入职时从职位拷贝快照
    guarantee_end_date TEXT,
    note             TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_placement_guarantee_end ON position_candidate_placements(guarantee_end_date);

-- 决策与阶段变更历史（统计视图的基础）
-- History of decisions and stage changes (the basis of the statistics views)
-- 判定とステージ変更の履歴（統計ビューの基礎）
CREATE TABLE position_candidate_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    change_type      TEXT NOT NULL CHECK (change_type IN ('decision','stage')),
    from_value       TEXT,
    to_value         TEXT NOT NULL,
    reason           TEXT NOT NULL DEFAULT '',
    is_system        INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
    operator_user_id INTEGER REFERENCES system_users(id),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_history_match ON position_candidate_history(match_id, change_type);
CREATE INDEX idx_history_to    ON position_candidate_history(change_type, to_value);

CREATE TABLE candidate_communications (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    match_id         INTEGER REFERENCES position_candidate_matches(id) ON DELETE SET NULL,
    resume_id        INTEGER REFERENCES candidate_resumes(id) ON DELETE SET NULL,
    source_type      TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','system','imported_resume')),
    channel          TEXT NOT NULL DEFAULT '',
    communicate_time TEXT NOT NULL DEFAULT '',
    communicate_content TEXT NOT NULL DEFAULT '',
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_comm_candidate ON candidate_communications(candidate_id, source_type);
CREATE INDEX idx_comm_match ON candidate_communications(match_id);
```

---

### 4.5 Migration 005: Full-Text Search & Analytical Views (`005_search_views.sql`)

```sql
-- 005_search_views.sql  检索文档、FTS5 trigram、统计视图 | Search documents, FTS5 trigram, statistics views | 検索ドキュメント、FTS5 trigram、統計ビュー

CREATE TABLE candidate_search_documents (
    candidate_id INTEGER PRIMARY KEY REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    raw_text     TEXT NOT NULL DEFAULT '',
    text_hash    TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL
);

CREATE VIRTUAL TABLE candidate_search_fts USING fts5(
    raw_text,
    content='candidate_search_documents',
    content_rowid='candidate_id',
    tokenize='trigram'
);

CREATE TRIGGER trg_search_doc_ai AFTER INSERT ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text) VALUES (new.candidate_id, new.raw_text);
END;
CREATE TRIGGER trg_search_doc_ad AFTER DELETE ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text) VALUES ('delete', old.candidate_id, old.raw_text);
END;
CREATE TRIGGER trg_search_doc_au AFTER UPDATE ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text) VALUES ('delete', old.candidate_id, old.raw_text);
    INSERT INTO candidate_search_fts(rowid, raw_text) VALUES (new.candidate_id, new.raw_text);
END;

-- 候选人统计：推荐=到达 submitted；成功=到达 hired；沟通=非 imported_resume 的沟通条数
-- Candidate statistics: recommended = reached submitted; successful = reached hired; communications = count of communications that are not imported_resume
-- 候補者の統計：推薦＝submitted に到達、成功＝hired に到達、コミュニケーション＝imported_resume 以外の件数
CREATE VIEW v_candidate_stats AS
SELECT
    c.id AS candidate_id,
    (SELECT COUNT(DISTINCT h.match_id) FROM position_candidate_history h
        JOIN position_candidate_matches m ON m.id = h.match_id
        WHERE m.candidate_id = c.id AND h.change_type = 'stage' AND h.to_value = 'submitted') AS recommend_count,
    (SELECT COUNT(DISTINCT h.match_id) FROM position_candidate_history h
        JOIN position_candidate_matches m ON m.id = h.match_id
        WHERE m.candidate_id = c.id AND h.change_type = 'stage' AND h.to_value = 'hired') AS success_count,
    (SELECT COUNT(*) FROM candidate_communications cc
        WHERE cc.candidate_id = c.id AND cc.source_type <> 'imported_resume') AS communication_count
FROM candidate_profiles c;

CREATE VIEW v_position_pipeline_counts AS
SELECT
    p.id AS position_id,
    COUNT(CASE WHEN m.decision = 'suggested' THEN 1 END) AS suggested_count,
    COUNT(CASE WHEN m.decision = 'accepted'  THEN 1 END) AS accepted_count,
    COUNT(CASE WHEN m.decision = 'dismissed' THEN 1 END) AS dismissed_count,
    COUNT(CASE WHEN m.stage = 'submitted' THEN 1 END) AS submitted_now,
    COUNT(CASE WHEN m.stage = 'interviewing' THEN 1 END) AS interviewing_now,
    COUNT(CASE WHEN m.stage = 'offer' THEN 1 END) AS offer_now,
    COUNT(CASE WHEN m.stage IN ('hired','guarantee_passed') THEN 1 END) AS hired_count
FROM position_openings p
LEFT JOIN position_candidate_matches m ON m.position_id = p.id
GROUP BY p.id;

CREATE VIEW v_company_position_counts AS
SELECT
    co.id AS company_id,
    COUNT(p.id) AS position_total,
    COUNT(CASE WHEN p.status = 'open' THEN 1 END) AS position_open
FROM company_profiles co
LEFT JOIN position_openings p ON p.company_id = co.id
GROUP BY co.id;
```

---

## 5. Backend Services & IPC Interface Specification

Structured error codes via `AppError`:
- `VALIDATION` (400): Parameter validation failures (empty company name, missing contact name);
- `NOT_FOUND` (404): Resource not found;
- `DUPLICATE` (409): Unique constraint collisions;
- `IN_USE` (422): Entity currently referenced and cannot be deleted (e.g. contact in use by active opening);
- `INTERNAL_ERROR` (500): Internal server or environment errors.

### 5.1 Service & API Method Registry
1. **`CompanyService`**:
   - `companiesSearch(params)`: Multi-criteria filtering and pagination;
   - `companyGet(companyId)`: Details, contacts list, and notes;
   - `companyCreate(fields)` / `companyUpdate(companyId, fields)`;
   - `companyDelete(companyId)`: Automatically downgrades to soft-delete if positions exist;
   - `companyContactsList(companyId)` / `companyContactAdd(companyId, fields)` / `companyContactUpdate(contactId, fields)` / `companyContactDelete(contactId)`;
   - `companyNoteAdd(companyId, fields)` / `companyNoteDelete(noteId)`.
2. **`CandidateImportService`**:
   - `candidateImportPickFiles()` / `candidateImportPickDirectory()`: System picker;
   - `candidateImportRun(selectedPaths, options)`: Run bulk ingestion with strictMode support;
   - `candidateImportBatchesList()`: History of import batches;
   - `candidateImportIssuesList(importBatchId)`: Detailed warnings/errors.
3. **`SystemService`**:
   - `getVersion()`: Desktop application runtime version;
   - `getDatabasePath()`: Physical SQLite file path in use.

---

## 6. Frontend Dynamic Internationalization Architecture

1. **Navigation Guard Loading**:
   ```javascript
   router.beforeEach(async to => {
     await ensureModulePacksLoaded(to.meta.i18nPacks || []);
   });
   ```
2. **Language Pack Partitioning**:
   - `core.json`: Common menu, buttons, status badges (loaded on boot);
   - `company.json`: CRM and contacts dictionaries (loaded on `/company`);
   - `candidateImport.json`: Ingestion workspace dictionary (loaded on `/candidate/import`).
3. **Element Plus Synchronization**:
   - Dynamic locale binding updates Element Plus UI components in sync with system language.

---

## 7. Automated Test Suite Specification (24/24 Pass)

All 24 automated unit and integration tests passing:
1. `candidateImportBatchesList returns batches ordered by id desc`
2. `candidateImportIssuesList returns warnings of a batch`
3. `candidateImportRun rejects empty selection`
4. `candidateImportRun: a single file, then re-import is skipped by content hash`
5. `candidateImportRun: a folder imports all json files; invalid input is rejected`
6. `candidateImportPickFiles / PickDirectory use the injected dialog`
7. `strict mode: a file with a contact conflict is rejected and not written; a clean file is imported`
8. `companyCreate / companyGet / companiesSearch / companyUpdate`
9. `companyCreate rejects empty and duplicate names with business error codes`
10. `first contact becomes primary; a new primary replaces the old one`
11. `companyDelete: physical delete without positions, soft delete with positions; contact in use cannot be deleted`
12. `migrations create schema + system user`
13. `normalize`
14. `import samples, idempotent re-run`
15. `primary phone/email unique constraints`
16. `multilingual: zh primary + jp, lists aligned`
17. `misaligned multilingual lists produce a warning`
18. `FTS: >=3 chars via trigram, raw_text built from fields`
19. `shared/conflicting contact: first come wins, second becomes shared + warning`
20. `re-import changed content updates in place, no duplicates`
21. `imported_resume communications excluded from communication_count`
22. `company/position/match flow constraints + stats views`
23. `landline shared by many candidates: no conflict; one-sided empty date is not misaligned`
24. `small date drift between language versions is tolerated, large drift warns`

---

## 8. Packaging & Delivery Guide

```bash
# Frontend build
cd frontend && npm run build

# Unpacked directory packaging
cd electron && npm run dist:dir

# Standalone smoke test
.\release\win-unpacked\RecruitmentSystemV2.exe --smoke-test

# Installer & Portable generation
cd electron && npm run dist
```

---

> **Project Credits & Acknowledgements**  
> System architecture, refactoring, and implementations co-developed with **Google DeepMind Antigravity**, **OpenAI Codex**, and **Anthropic Claude**.

---
**END OF V2 SPECIFICATION**
