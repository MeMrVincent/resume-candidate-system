# Headhunting & Recruitment Management System - Development Plan & Database Design

> **Language Navigation / 语言导航 / 言語ナビゲーション**  
> **English** | [简体中文](recruitment_system_development_plan.cn.md) | [日本語](recruitment_system_development_plan.ja.md)

---

**Document Version**: 1.1  
**Date**: 2026-08-10  
**Target Audience**: Codex / Antigravity / Developers  
**System Form Factor**: Local Electron Desktop Application  
**Current Phase**: Candidate data parsing, cleaning, cross-language merging, and `raw_text` construction are completed; officially transitioning to the Electron + Frontend + SQLite development phase.

---

## 0. Document Purpose and Priority

This document serves as the authoritative specification after transitioning from the "Data Conversion Phase" to the "Business System Development Phase".

Follow the following priorities during development:

1. Conventions marked as **MUST / MANDATORY / FORBIDDEN** in this document.
2. The finalized candidate JSON data structure.
3. Rules from the original project `CONTEXT.md` dated 2026-08-02 onwards that are not overridden by this document.
4. Legacy parsing scripts, legacy MySQL / PHP / Alibaba Cloud plans are purely historical references and shall not serve as architectural baselines.

### 0.1 Confirmed Facts

- All historical resume files have been parsed and converted.
- Multi-source data for the same candidate has been consolidated and merged.
- Multilingual resumes have been processed according to finalized business rules.
- Candidate final JSONs already contain structured data.
- Each candidate has pre-generated candidate-level `raw_text`.
- `raw_text` includes all searchable text across all existing resume variants for full-text search.
- Word / PDF / Excel / HTML parsing will not be re-executed in Phase 1.
- Production application runs on **Electron + SQLite**.
- Frontend stack uses **Vue 3 + JavaScript**.
- Table prefixes are standardized by business domain:
  - `candidate_`: Candidate Domain
  - `position_`: Position Domain
  - `company_`: Company Domain
  - `system_`: System Infrastructure Domain

> Note: Strictly use standard English spelling `position_`, never `postion_`.

### 0.2 Implementation Decisions (as of 2026-08-10)

- Production Runtime: Electron 43.3.0; Database Driver: `better-sqlite3` 13.0.3; in-memory `sql.js` is deprecated.
- Database File Location: Development path is `code/data/recruitment.db`; packaged production path is `data/recruitment.db` located in the same directory as the executable.
- Packaged installer includes a read-only template seed at `resources/seed/recruitment.db`. On first launch, it copies to the production location; an existing database is never overwritten.
- Installer allows custom target drive selection; target directory must grant write permissions to the current Windows user to avoid read-only database locks.
- The entire application directory is portable across disks; application updates must never overwrite `data/` or `backups/`.
- Final JSON data source directory is injected via the `--source` CLI flag (currently `E:\resume-system\codex-complete-jsons\complete`) and must never be hardcoded into business services.
- Successfully seeded 9,860 final candidate JSON records into the database: `candidate_profiles`, `candidate_import_records`, `candidate_search_documents`, and `candidate_search_fts` all contain exactly 9,860 rows.
- Importer idempotency verified: secondary full scan resulted in 0 created, 9,860 skipped, and 0 failed.
- Domain naming standardized to `candidate / position / company`; the term `customer` is deprecated.
- Renderer does not use a monolithic global store for caching query results; pages invoke Electron services via modular domain APIs.
- Mock fallback is strictly forbidden when Electron services fail; errors must be directly reported with full diagnostic telemetry.
- Candidate list defaults to descending sort by `dates.sys_updated_date`; candidate age is dynamically computed from birth date and current date, never using static resume age.
- Candidate detail drawer orchestrates component lifecycle; Profile, Work, Education, Skills, Languages, and Communications are isolated Vue components with independent update APIs.
- Multilingual candidates default to Chinese master view; language toggle buttons are rendered only for versions that actually exist. Non-primary variants are loaded and updated independently via `candidate_resume_variants.content_json` without overwriting other language versions.
- Communication logs represent candidate-level CRM events and are shared across all resume variants; all variants contribute collectively to the candidate's full-text search document.

### 0.3 API and Service Naming Conventions

All methods follow the `[BusinessEntity][Action]` pattern:

```text
candidatesSearch
candidatesCount
candidateGet
candidateResumeGet
candidateUpdate
candidateCommunicationAdd
candidateCommunicationUpdate
candidateCommunicationDelete
candidateWorkExperiencesUpdate
candidateEducationsUpdate
candidateSkillsUpdate
candidateLanguagesUpdate
candidateExpectationsUpdate
```

Architecture Layer Mapping:

```text
Vue Page
  → candidateApi.candidatesSearch()
  → window.electronApi.candidate.candidatesSearch()
  → IPC candidate:candidatesSearch
  → CandidateSearchService.candidatesSearch()
  → CandidateSearchRepository
  → candidate_* tables
```

---

# 1. System Goals

The system is ultimately a locally operated Headhunting CRM + ATS + Automated Talent Matching platform.

Core Business Forward Closed-Loop:

```text
Company
   ↓
Create Position Opening
   ↓
Position Automatically Recalls & Scores Candidates from Talent Pool
   ↓
System Recommends Ranked Candidates
   ↓
Manual Confirmation / Mark as Mismatch
   ↓
Communication & Outreach
   ↓
Present Candidate to Company
   ↓
Client Interview
   ↓
Offer
   ↓
Onboarding
```

Reverse Closed-Loop:

```text
Create / Update Candidate Profile
   ↓
Rebuild Candidate raw_text Document
   ↓
Re-evaluate Matching across all Active Positions
   ↓
Generate / Update Position-Candidate Match Records
```

The Candidate Detail View must reversely expose:

- Which positions this candidate has been associated with;
- The current stage progression for each associated position;
- Historical timestamp when matched;
- Whether ever manually rejected/marked mismatch;
- Whether actively engaged in communication;
- Whether presented to the client company;
- Whether interview scheduled/completed;
- Whether offer extended;
- Whether onboarded;
- All historical communication records.

---

# 2. Overall Technical Architecture

## 2.1 Recommended Technology Stack

```text
Desktop
├── Electron
├── JavaScript (ES6+)
├── Vue 3
├── Vue Router
├── Webpack 5
│
Database
├── SQLite
├── FTS5
└── better-sqlite3
│
Background
└── Node Worker Threads
```

Technologies explicitly discouraged for Version 1:

- MySQL
- PostgreSQL
- Redis
- Elasticsearch
- Standalone backend server processes
- Docker
- Microservices
- Cloud databases

As a local single-user desktop application, prioritization order:

- Simplicity;
- High performance;
- Backup readiness;
- Rapid recovery;
- Strict data consistency;
- Ease of debugging;
- Frictionless portability.

---

## 2.2 Electron Layering Rules

Mandatory invocation chain:

```text
Vue Renderer
    ↓
Preload API
    ↓
Electron IPC
    ↓
Service
    ↓
Repository
    ↓
SQLite
```

**FORBIDDEN:**

```text
Vue Renderer → Direct SQLite access
```

**FORBIDDEN:**

```text
Scattering raw SQL statements inside IPC handlers
```

**FORBIDDEN:**

```text
Enabling nodeIntegration in Renderer to directly invoke Node APIs
```

The Electron Main Process maintains sole ownership of SQLite database connections.

The Renderer process interacts with business data strictly through controlled, typed IPC APIs.

---

## 2.3 Database Configuration

Executed immediately upon SQLite initialization at startup:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

Database File Hierarchy (Confirmed):

```text
<Application Root>/
├── <Application Executables & Resources>
├── data/
│   └── recruitment.db
└── backups/
```

Development environment root is `code/`; packaged application root is the directory containing the executable binary. Production installation directory must be writable, with user-selectable storage drives recommended. The database must never be placed inside `app.asar` or inside resource folders susceptible to application update overwrites.

---

# 3. Core Domain Models

The core architecture consists not of three isolated silos, but an interconnected domain model:

```text
Company
   │
   │ 1:N
   ▼
Position
   │
   │ N:N
   ▼
PositionCandidateMatch
   │
   ▼
Candidate
```

The pivotal domain entity is:

```text
PositionCandidateMatch
```

It is not merely a relational join table, but a rich, first-class business aggregate.

It records:

- Match rationale and criteria breakdown;
- Computed match score;
- Whether recommended by system;
- Whether manually accepted;
- Whether manually dismissed as "mismatched";
- Current recruitment pipeline stage;
- Historical stage transitions;
- Recalculated scores across revisions;
- Audit trail for human decisions.

---

# 4. Data Truth Principles

## 4.1 Structured Database as Single Source of Truth

Once a candidate is ingested into the system:

```text
candidate_* structured tables
```

represent the single source of truth for ongoing business operations.

`raw_text` is a derived, indexed full-text document generated on-demand from the structured data.

---

## 4.2 Raw Import JSON as Immutable Audit Evidence

The original JSON must be permanently archived upon initial import:

```text
candidate_import_records.original_json
```

This field is dedicated to:

- Data audits;
- Disaster recovery;
- Troubleshooting import anomalies;
- Future schema migrations;
- Benchmarking against legacy parser outputs.

**The raw JSON is never directly used as the business truth following subsequent user edits.**

---

# 5. Core Rules for raw_text

This represents one of the most critical foundational principles of the Candidate Search Subsystem.

## 5.1 Definition of raw_text

`raw_text` is formally defined as:

> **Candidate Full-text Search Document**

It is not an unorganized dump of raw source text.

It is a curated, structured synthesis:

```text
Candidate-Level Comprehensive Full-Text Search Document
```

Designed specifically for:

- Talent pool keyword search;
- Automated candidate recall for job openings;
- Deep full-text query matching across candidate history.

---

## 5.2 Initial Historical Data Ingestion

Pre-existing candidate JSON records already contain validated high-quality `raw_text`.

Therefore, during initial ingestion:

```text
JSON.raw_text
    ↓
candidate_search_documents.raw_text
```

**Use directly as-is.**

Do not re-generate, re-parse, or re-concatenate during the initial data seeding phase.

---

## 5.3 Candidate Modifications and Mutations

Whenever candidate details are edited inside Electron:

- Modifying personal details;
- Adding phone numbers;
- Removing phone numbers;
- Updating job search expectations;
- Appending work experience;
- Modifying work experience;
- Deleting work experience;
- Modifying education;
- Appending project experience;
- Deleting project experience;
- Adding language skills;
- Adding professional skills;
- Adding certifications;
- Adding training history;
- Appending communication logs;
- Modifying communication logs;
- Deleting communication logs;

The mutation pipeline MUST execute:

```text
Persist Structured Modifications
    ↓
Re-fetch the complete candidate snapshot
    ↓
Rebuild raw_text completely from scratch (from 0)
    ↓
Overwrite the previous raw_text
    ↓
Synchronize FTS5 search index
```

### Mandatory Constraints

**STRICTLY FORBIDDEN:**

```text
raw_text += newContent
```

**STRICTLY FORBIDDEN:**

```text
raw_text.replace(...)
```

**Incremental or partial updates to raw_text are prohibited.**

Must execute:

```text
FULL REBUILD
```

---

## 5.4 CandidateRawTextBuilder

Isolated architectural module:

```text
CandidateRawTextBuilder
```

Recommended interface specification:

```js
class CandidateRawTextBuilder {
  /**
   * @param {Object} snapshot - CandidateFullSnapshot object
   * @returns {string} Fully compiled rawText document
   */
  build(snapshot) {}
}
```

`CandidateRawTextBuilder` is a pure transformation module with zero database dependencies.

The underlying complete snapshot is provided exclusively by:

```js
candidateRepository.getFullSnapshot(candidateId)
```

---

## 5.5 CandidateFullSnapshot Specification

Snapshot data structure:

```js
// CandidateFullSnapshot Data Structure
{
  profile: {},           // CandidateProfile - Basic candidate profile
  contacts: [],          // CandidateContact[] - Contact details list
  expectations: [],      // CandidateExpectation[] - Job preferences / expectations
  workExperiences: [],  // CandidateWorkExperience[] - Work history records
  educations: [],        // CandidateEducation[] - Educational background
  projects: [],          // CandidateProject[] - Project milestones
  trainings: [],         // CandidateTraining[] - Professional training records
  languages: [],         // CandidateLanguage[] - Language proficiencies
  certificates: [],      // CandidateCertificate[] - Certificates & credentials
  skills: [],            // CandidateSkill[] - Technical and professional skills
  resumeVariants: [],    // CandidateResumeVariant[] - Multilingual resume snapshots
  communications: []     // CandidateCommunication[] - Communication & follow-up logs
}
```

---

## 5.6 raw_text Assembly Sequence

Enforce the following deterministic ordering:

```text
1. Candidate Basic Profile
2. Contact Information
3. Career Expectations
4. Current Employment Snapshot
5. Work Experience History
6. Education History
7. Project Experience
8. Professional Training
9. Language Capabilities
10. Certifications
11. Technical Skills
12. Multilingual / Alternate Resume Variant Content
13. Communication & Follow-up History
```

Include only fields containing valid values.

Filter out:

- `null`
- `undefined`
- Empty strings
- Empty arrays
- Pure placeholder objects

Delimiter standard:

```text
" | "
```

Deterministic deduplication on identical string fragments is permitted, provided it does not prune distinct multilingual or contextual entities.

---

## 5.7 raw_text and FTS5 Synchronization

```text
candidate_search_documents
        │
        └── raw_text
                │
                ▼
candidate_search_fts
```

`candidate_search_documents` retains the raw searchable text document.

`candidate_search_fts` functions purely as the SQLite FTS5 index table.

---

# 6. Full-Text Search Principles

## 6.1 Prohibition of Full-Database Multi-Table JOINs

For query terms such as:

```text
Automotive Japanese SupplyChain
```

It is strictly prohibited to execute:

```text
JOIN candidate_work_experiences
JOIN candidate_educations
JOIN candidate_projects
JOIN candidate_languages
JOIN candidate_certificates
...
```

for full-text keyword querying.

The sole entry point for keyword queries:

```text
candidate_search_documents.raw_text
```

---

## 6.2 Structured Filters Rely on Structured Tables

Example:

```text
Keywords: Automotive Japanese
Education: Bachelor's or higher
Experience: 8+ years
City: Shanghai
```

Execution pipeline:

```text
FTS raw_text
     ↓
Matched candidate_id list
     ↓
Structured criteria filtration
     ↓
candidate_profiles / candidate_* tables
```

---

## 6.3 FTS5 Indexing Strategy

Phase 1 baseline:

```text
3+ Unicode characters:
    → FTS5 trigram tokenizer

1-2 Chinese characters:
    → raw_text LIKE / instr fallback query
```

Do not introduce Elasticsearch prematurely for short CJK queries.

Benchmark against authentic candidate workloads first.

---

# 7. Database Architecture Overview

```text
system_schema_migrations
system_settings
system_jobs
system_audit_logs

company_profiles
company_contacts
company_notes

candidate_profiles
candidate_contacts
candidate_import_records
candidate_resume_variants
candidate_expectations
candidate_work_experiences
candidate_educations
candidate_projects
candidate_trainings
candidate_languages
candidate_certificates
candidate_skills
candidate_search_documents
candidate_search_fts

position_openings
position_requirements
position_skill_requirements
position_language_requirements
position_keywords
position_candidate_matches
position_candidate_stage_history
position_candidate_events

candidate_communications
```

---

# 8. Candidate Table Schema Specifications

## 8.1 candidate_profiles

Candidate Master Profile Table.

Contains only:

- Current snapshot;
- High-frequency list view columns;
- High-frequency filter attributes.

Do not dump entire unparsed JSON payloads here.

```sql
CREATE TABLE candidate_profiles (
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
        CHECK (candidate_status IN (
            'active',
            'archived',
            'do_not_contact'
        )),

    resume_updated_date TEXT NOT NULL DEFAULT '',
    resume_download_date TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_candidate_profiles_name
ON candidate_profiles(full_name);

CREATE INDEX idx_candidate_profiles_city
ON candidate_profiles(city);

CREATE INDEX idx_candidate_profiles_current_company
ON candidate_profiles(current_company);

CREATE INDEX idx_candidate_profiles_current_position
ON candidate_profiles(current_position);

CREATE INDEX idx_candidate_profiles_degree
ON candidate_profiles(highest_degree_rank);

CREATE INDEX idx_candidate_profiles_work_years
ON candidate_profiles(work_years);

CREATE INDEX idx_candidate_profiles_status
ON candidate_profiles(candidate_status);
```

---

## 8.2 candidate_contacts

Supports multiple phone numbers, email addresses, WeChat handles, etc., per candidate.

```sql
CREATE TABLE candidate_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,

    contact_type TEXT NOT NULL
        CHECK (contact_type IN (
            'phone',
            'email',
            'wechat',
            'other'
        )),

    contact_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL DEFAULT '',

    is_primary INTEGER NOT NULL DEFAULT 0,

    source_resume_id INTEGER,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_contacts_candidate
ON candidate_contacts(candidate_id);

CREATE INDEX idx_candidate_contacts_type_value
ON candidate_contacts(contact_type, normalized_value);
```

---

## 8.3 candidate_import_records

Retains the raw JSON file for each imported resume.

Serves as immutable audit evidence.

```sql
CREATE TABLE candidate_import_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,

    source_file_path TEXT NOT NULL DEFAULT '',
    source_file_name TEXT NOT NULL DEFAULT '',
    source_file_hash TEXT NOT NULL DEFAULT '',

    source_system TEXT NOT NULL DEFAULT '',
    source_resume_id TEXT NOT NULL DEFAULT '',

    original_json TEXT NOT NULL,

    imported_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_candidate_import_records_candidate
ON candidate_import_records(candidate_id);

CREATE INDEX idx_candidate_import_records_hash
ON candidate_import_records(source_file_hash);
```

### Mandatory Constraint

`original_json` stores the raw payload. It is never directly mutated as active business data.

---

## 8.4 candidate_resume_variants

When a candidate possesses multilingual resume versions:

```text
resumes[0] = zh (Chinese Master)
resumes[1...] = en / ja / de / ... (Language Variants)
```

Secondary language variants are stored in this table.

```sql
CREATE TABLE candidate_resume_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    import_record_id INTEGER,

    language_code TEXT NOT NULL,
    sequence_no INTEGER NOT NULL DEFAULT 0,

    is_primary_language INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,

    variant_json TEXT NOT NULL DEFAULT '{}',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (import_record_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_resume_variants_candidate
ON candidate_resume_variants(candidate_id);

CREATE INDEX idx_candidate_resume_variants_language
ON candidate_resume_variants(language_code);
```

---

## 8.5 candidate_expectations

Career preferences and target positions.

```sql
CREATE TABLE candidate_expectations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    expected_city TEXT NOT NULL DEFAULT '',
    expected_position TEXT NOT NULL DEFAULT '',
    expected_salary TEXT NOT NULL DEFAULT '',

    expected_annual_salary_min REAL,
    expected_annual_salary_max REAL,

    expected_industry TEXT NOT NULL DEFAULT '',
    expected_employment_type TEXT NOT NULL DEFAULT '',
    expected_start_date TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_expectations_candidate
ON candidate_expectations(candidate_id);

CREATE INDEX idx_candidate_expectations_city
ON candidate_expectations(expected_city);

CREATE INDEX idx_candidate_expectations_position
ON candidate_expectations(expected_position);
```

> Rule: When target expectations are completely empty in the source resume, no record is created.

---

## 8.6 candidate_work_experiences

```sql
CREATE TABLE candidate_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    company_name TEXT NOT NULL DEFAULT '',
    company_employees TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '',

    position TEXT NOT NULL DEFAULT '',
    position_type TEXT NOT NULL DEFAULT '',
    position_salary TEXT NOT NULL DEFAULT '',
    position_dept TEXT NOT NULL DEFAULT '',
    position_report_to TEXT NOT NULL DEFAULT '',
    position_subordinate TEXT NOT NULL DEFAULT '',

    employment_type TEXT NOT NULL DEFAULT '',

    annual_salary_min REAL,
    annual_salary_max REAL,

    status TEXT NOT NULL DEFAULT '',
    position_start TEXT NOT NULL DEFAULT '',
    position_resigned TEXT NOT NULL DEFAULT '',

    resigned_reason TEXT NOT NULL DEFAULT '',
    position_responsibilities TEXT NOT NULL DEFAULT '',
    position_achievements TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_work_candidate
ON candidate_work_experiences(candidate_id);

CREATE INDEX idx_candidate_work_company
ON candidate_work_experiences(company_name);

CREATE INDEX idx_candidate_work_position
ON candidate_work_experiences(position);

CREATE INDEX idx_candidate_work_industry
ON candidate_work_experiences(company_industry);

CREATE INDEX idx_candidate_work_start
ON candidate_work_experiences(position_start);
```

---

## 8.7 candidate_educations

```sql
CREATE TABLE candidate_educations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    school_name TEXT NOT NULL DEFAULT '',
    school_major_name TEXT NOT NULL DEFAULT '',
    school_degree_type TEXT NOT NULL DEFAULT '',
    school_degree_rank INTEGER,
    school_education_type TEXT NOT NULL DEFAULT '',

    start_ym TEXT NOT NULL DEFAULT '',
    end_ym TEXT NOT NULL DEFAULT '',

    description TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_educations_candidate
ON candidate_educations(candidate_id);

CREATE INDEX idx_candidate_educations_school
ON candidate_educations(school_name);

CREATE INDEX idx_candidate_educations_major
ON candidate_educations(school_major_name);

CREATE INDEX idx_candidate_educations_degree
ON candidate_educations(school_degree_rank);
```

Degree Ranking Mapping:

```text
7 = Postdoctoral
6 = Doctoral (Ph.D.)
5 = Master's Degree
4 = Bachelor's Degree
3 = Associate Degree / Junior College
2 = High School / Technical Secondary School
1 = Middle School and Below
```

---

## 8.8 candidate_projects

```sql
CREATE TABLE candidate_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    project_name TEXT NOT NULL DEFAULT '',
    company_or_client TEXT NOT NULL DEFAULT '',
    role_name TEXT NOT NULL DEFAULT '',

    start_ym TEXT NOT NULL DEFAULT '',
    end_ym TEXT NOT NULL DEFAULT '',

    description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_projects_candidate
ON candidate_projects(candidate_id);

CREATE INDEX idx_candidate_projects_name
ON candidate_projects(project_name);
```

---

## 8.9 candidate_trainings

```sql
CREATE TABLE candidate_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    organization_name TEXT NOT NULL DEFAULT '',
    training_name TEXT NOT NULL DEFAULT '',

    start_ym TEXT NOT NULL DEFAULT '',
    end_ym TEXT NOT NULL DEFAULT '',

    certificate_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_trainings_candidate
ON candidate_trainings(candidate_id);
```

---

## 8.10 candidate_languages

```sql
CREATE TABLE candidate_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    language_name TEXT NOT NULL DEFAULT '',
    language_level TEXT NOT NULL DEFAULT '',
    language_certificate TEXT NOT NULL DEFAULT '',
    language_certificate_time TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_languages_candidate
ON candidate_languages(candidate_id);

CREATE INDEX idx_candidate_languages_name
ON candidate_languages(language_name);

CREATE INDEX idx_candidate_languages_level
ON candidate_languages(language_level);
```

---

## 8.11 candidate_certificates

```sql
CREATE TABLE candidate_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_type TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_certificates_candidate
ON candidate_certificates(candidate_id);

CREATE INDEX idx_candidate_certificates_name
ON candidate_certificates(certificate_name);
```

Recognized standard certifications: CET, JLPT, TOEIC, TOEFL, BEC, etc.

---

## 8.12 candidate_skills

```sql
CREATE TABLE candidate_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    skill_name TEXT NOT NULL DEFAULT '',
    skill_level TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_skills_candidate
ON candidate_skills(candidate_id);

CREATE INDEX idx_candidate_skills_name
ON candidate_skills(skill_name);
```

---

# 9. Candidate Full-Text Search Tables

## 9.1 candidate_search_documents

Stores the full searchable text document compiled for each candidate.

```sql
CREATE TABLE candidate_search_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL UNIQUE,

    raw_text TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_candidate_search_documents_candidate
ON candidate_search_documents(candidate_id);
```

---

## 9.2 candidate_search_fts

SQLite FTS5 virtual table for high-performance text indexing.

```sql
CREATE VIRTUAL TABLE candidate_search_fts USING fts5 (
    raw_text,
    content='candidate_search_documents',
    content_rowid='id',
    tokenize='trigram'
);
```

Synchronization Triggers (maintained automatically):

```sql
CREATE TRIGGER candidate_search_documents_ai
AFTER INSERT ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.id, new.raw_text);
END;

CREATE TRIGGER candidate_search_documents_ad
AFTER DELETE ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text)
    VALUES('delete', old.id, old.raw_text);
END;

CREATE TRIGGER candidate_search_documents_au
AFTER UPDATE ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text)
    VALUES('delete', old.id, old.raw_text);
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.id, new.raw_text);
END;
```

---

# 10. Candidate Communication Records

## 10.1 candidate_communications

Stores headhunter interactions, outreach, follow-ups, and notes for candidates.

```sql
CREATE TABLE candidate_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    position_id INTEGER,

    communication_type TEXT NOT NULL
        CHECK (communication_type IN (
            'phone',
            'wechat',
            'interview',
            'email',
            'offline',
            'other'
        )),

    direction TEXT NOT NULL DEFAULT 'outbound'
        CHECK (direction IN ('inbound', 'outbound')),

    communicate_time TEXT NOT NULL,
    communicate_content TEXT NOT NULL,

    next_followup_time TEXT,

    creator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_communications_candidate
ON candidate_communications(candidate_id);

CREATE INDEX idx_candidate_communications_position
ON candidate_communications(position_id);

CREATE INDEX idx_candidate_communications_time
ON candidate_communications(communicate_time);
```

### communication_type Standard Values

- `phone`: Phone call
- `wechat`: WeChat message / voice call
- `interview`: Face-to-face or video interview
- `email`: Email correspondence
- `offline`: On-site visit / coffee meeting
- `other`: Other channels

### direction Standard Values

- `outbound`: Headhunter contacted candidate
- `inbound`: Candidate proactively contacted headhunter

---

# 11. Position Opening Module

## 11.1 position_openings

Position / Job Opening master table.

```sql
CREATE TABLE position_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    position_name TEXT NOT NULL,
    job_code TEXT NOT NULL DEFAULT '',

    department TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    work_location TEXT NOT NULL DEFAULT '',

    employment_type TEXT NOT NULL DEFAULT 'full_time',

    headcount INTEGER NOT NULL DEFAULT 1,

    annual_salary_min REAL,
    annual_salary_max REAL,
    salary_months INTEGER DEFAULT 12,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'open',
            'paused',
            'filled',
            'cancelled'
        )),

    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    recruiter_name TEXT NOT NULL DEFAULT '',

    opened_at TEXT,
    closed_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_openings_company
ON position_openings(company_id);

CREATE INDEX idx_position_openings_status
ON position_openings(status);

CREATE INDEX idx_position_openings_city
ON position_openings(city);
```

---

## 11.2 position_requirements

Hard requirements and criteria for candidate screening.

```sql
CREATE TABLE position_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL UNIQUE,

    min_degree_rank INTEGER DEFAULT 0,
    min_work_years REAL DEFAULT 0,
    max_work_years REAL,

    target_cities TEXT NOT NULL DEFAULT '[]',
    target_industries TEXT NOT NULL DEFAULT '[]',

    job_description TEXT NOT NULL DEFAULT '',
    job_requirements TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_requirements_position
ON position_requirements(position_id);
```

---

## 11.3 position_skill_requirements

Skill criteria and weights for automated matching.

```sql
CREATE TABLE position_skill_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    skill_name TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 1.0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_skills_position
ON position_skill_requirements(position_id);

CREATE INDEX idx_position_skills_name
ON position_skill_requirements(skill_name);
```

---

## 11.4 position_language_requirements

Language proficiency requirements for the opening.

```sql
CREATE TABLE position_language_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    language_name TEXT NOT NULL,
    min_level TEXT NOT NULL DEFAULT '',
    is_required INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_languages_position
ON position_language_requirements(position_id);
```

---

## 11.5 position_keywords

Keywords utilized by FTS recall for talent retrieval.

```sql
CREATE TABLE position_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    keyword TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general'
        CHECK (category IN (
            'general',
            'skill',
            'title',
            'industry',
            'cert'
        )),
    weight REAL NOT NULL DEFAULT 1.0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_keywords_position
ON position_keywords(position_id);

CREATE INDEX idx_position_keywords_word
ON position_keywords(keyword);
```

---

# 12. PositionCandidate Core Match Relationship

## 12.1 position_candidate_matches

Core relationship entity recording matches between candidates and positions.

```sql
CREATE TABLE position_candidate_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,

    match_source TEXT NOT NULL DEFAULT 'system_auto'
        CHECK (match_source IN (
            'system_auto',
            'manual_search',
            'referral',
            'candidate_apply'
        )),

    score REAL NOT NULL DEFAULT 0,
    score_details_json TEXT NOT NULL DEFAULT '{}',
    match_reason_json TEXT NOT NULL DEFAULT '{}',

    decision TEXT NOT NULL DEFAULT 'pending'
        CHECK (decision IN (
            'pending',
            'system_recommended',
            'accepted',
            'dismissed'
        )),

    pipeline_stage TEXT NOT NULL DEFAULT 'sourced'
        CHECK (pipeline_stage IN (
            'sourced',
            'contacted',
            'submitted',
            'client_interview',
            'offer',
            'onboarded',
            'archived'
        )),

    is_dismissed INTEGER NOT NULL DEFAULT 0,
    dismiss_reason TEXT NOT NULL DEFAULT '',

    last_scored_at TEXT,
    last_action_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    UNIQUE (position_id, candidate_id)
);

CREATE INDEX idx_matches_position
ON position_candidate_matches(position_id);

CREATE INDEX idx_matches_candidate
ON position_candidate_matches(candidate_id);

CREATE INDEX idx_matches_score
ON position_candidate_matches(score);

CREATE INDEX idx_matches_decision
ON position_candidate_matches(decision);

CREATE INDEX idx_matches_stage
ON position_candidate_matches(pipeline_stage);
```

---

# 13. Separation of decision and pipeline_stage

`decision` (matching evaluation) and `pipeline_stage` (recruitment workflow) MUST remain strictly decoupled.

## 13.1 decision (Matching Decision)

Controls whether a candidate is recognized as viable for the position opening:

- `pending`: Newly ingested or awaiting review;
- `system_recommended`: Scored high by matching engine and awaiting human triage;
- `accepted`: Human headhunter confirmed candidate is suitable; enters recruitment pipeline;
- `dismissed`: Human headhunter or rules dismissed candidate as a mismatch.

## 13.2 pipeline_stage (Recruitment Workflow Stage)

Controls the operational status across the headhunting sales funnel:

- `sourced`: Candidate sourced / matched;
- `contacted`: Initial contact / pitch conducted;
- `submitted`: Resume formally submitted to hiring company;
- `client_interview`: Client interview scheduled or in progress;
- `offer`: Offer extended or negotiating terms;
- `onboarded`: Successfully hired and onboarded;
- `archived`: Process terminated / archived.

## 13.3 Automated Matching Must Never Overwrite Human Decisions

Rule:
- If a match has already been marked as `accepted` or `dismissed` by a human recruiter, subsequent automated re-scoring runs may update `score` and `score_details_json`, but MUST NEVER mutate `decision` or `pipeline_stage`.
- Human decisions always take absolute precedence over algorithm scores.

---

# 14. Recruitment Process History & Auditing

## 14.1 position_candidate_stage_history

Records every stage progression in the recruitment pipeline.

```sql
CREATE TABLE position_candidate_stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    match_id INTEGER NOT NULL,

    from_stage TEXT NOT NULL DEFAULT '',
    to_stage TEXT NOT NULL,

    remark TEXT NOT NULL DEFAULT '',
    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,

    FOREIGN KEY (match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_stage_history_match
ON position_candidate_stage_history(match_id);
```

---

## 14.2 position_candidate_events

Tracks all business milestones and interaction logs associated with a match.

```sql
CREATE TABLE position_candidate_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    match_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'matched',
            'recommended',
            'accepted',
            'dismissed',
            'contacted',
            'submitted',
            'interview_scheduled',
            'interview_feedback',
            'offer_issued',
            'offer_accepted',
            'onboarded',
            'stage_changed',
            'rescore'
        )),

    payload_json TEXT NOT NULL DEFAULT '{}',
    remark TEXT NOT NULL DEFAULT '',
    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,

    FOREIGN KEY (match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_match_events_match
ON position_candidate_events(match_id);

CREATE INDEX idx_match_events_type
ON position_candidate_events(event_type);
```

---

# 15. Company Module

## 15.1 company_profiles

Hiring company / Client profile table.

```sql
CREATE TABLE company_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL DEFAULT '',

    industry TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    scale TEXT NOT NULL DEFAULT '',
    nature TEXT NOT NULL DEFAULT '',

    website TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'blacklisted')),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_company_profiles_name
ON company_profiles(company_name);

CREATE INDEX idx_company_profiles_city
ON company_profiles(city);

CREATE INDEX idx_company_profiles_industry
ON company_profiles(industry);
```

---

## 15.2 company_contacts

Client company contact persons (HR, Hiring Managers, Directors).

```sql
CREATE TABLE company_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    contact_name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',

    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',

    is_primary INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_company_contacts_company
ON company_contacts(company_id);
```

---

## 15.3 company_notes

Follow-up logs, contract notes, and hiring preferences for the client company.

```sql
CREATE TABLE company_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    note_type TEXT NOT NULL DEFAULT 'general'
        CHECK (note_type IN ('general', 'contract', 'interview', 'preference')),

    content TEXT NOT NULL,
    creator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_company_notes_company
ON company_notes(company_id);
```

---

# 16. Company → Position Relationships

- A Company owns multiple Position Openings (`1:N`).
- When deleting a Company, cascading deletion of associated Openings requires strict confirmation; default business behavior is to archive or soft-delete (`status = 'inactive'`).
- Deleting an Opening cascades to delete requirement rules, keyword indexes, and matches (`position_candidate_matches`).

---

# 17. System Infrastructure Tables

## 17.1 system_schema_migrations

Tracks database migration revisions and execution history.

```sql
CREATE TABLE system_schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
);
```

---

## 17.2 system_settings

Application-wide configuration parameters (key-value store).

```sql
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    remark TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);
```

---

## 17.3 system_jobs

Background worker task queue and execution logs.

```sql
CREATE TABLE system_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    job_type TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);

CREATE INDEX idx_system_jobs_status
ON system_jobs(status);
```

---

## 17.4 system_audit_logs

High-privilege operation and security audit trails.

```sql
CREATE TABLE system_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    module TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL DEFAULT '',

    operator_name TEXT NOT NULL DEFAULT '',
    detail_json TEXT NOT NULL DEFAULT '{}',

    created_at TEXT NOT NULL
);

CREATE INDEX idx_system_audit_logs_module
ON system_audit_logs(module);
```

---

# 18. Initial Candidate JSON Ingestion Pipeline

## 18.1 Pipeline Workflow

```text
Read JSON file from source directory
         ↓
Extract candidate_uuid & compute file sha256
         ↓
Check if candidate_uuid exists in candidate_profiles
   ├── If exists: Verify hash; skip if identical, update if modified
   └── If not exists: Begin atomic SQLite transaction
         ↓
Insert into candidate_profiles (master record)
Insert into candidate_contacts
Insert into candidate_expectations
Insert into candidate_work_experiences
Insert into candidate_educations
Insert into candidate_projects
Insert into candidate_trainings
Insert into candidate_languages
Insert into candidate_certificates
Insert into candidate_skills
Insert into candidate_resume_variants (for secondary language versions)
Insert into candidate_import_records (original JSON audit payload)
Insert into candidate_search_documents (raw_text document)
         ↓
Commit SQLite transaction (triggers automatically update candidate_search_fts)
```

---

## 18.2 Importer Idempotency

- Verification mechanism: Combines `candidate_uuid` unique constraint and `source_file_hash`.
- Re-running the import command against the same directory:
  - Scans all files without duplicating records;
  - Skips unchanged candidates with zero DB overhead;
  - Guarantees 100% idempotent execution.

---

## 18.3 Ingestion Telemetry and Diagnostics

Upon completing an ingestion run, report:

- `totalFiles`: Total JSON files discovered in source path;
- `created`: Number of newly ingested candidates;
- `updated`: Number of updated existing candidates;
- `skipped`: Number of unchanged candidates skipped;
- `failed`: Number of failed imports (with error log trace);
- `durationMs`: Total execution time in milliseconds.

---

# 19. Candidate Mutation Core Implementation

When candidate data is edited in the frontend:

```text
Execute Update API inside dedicated SQLite transaction
         ↓
Commit changes to candidate_* tables
         ↓
Query candidateRepository.getFullSnapshot(candidateId)
         ↓
CandidateRawTextBuilder.build(snapshot)
         ↓
Compute SHA-256 hash of new raw_text
   ├── If hash matches existing: Skip document update
   └── If hash differs: Update candidate_search_documents
         ↓
Triggers automatically update candidate_search_fts
         ↓
Emit background matching event (Position-Candidate Re-scoring)
```

---

## 19.1 RawText Hash Checking

To prevent unnecessary FTS5 write overhead:
- Compute SHA-256 hash of the generated `raw_text`;
- If the hash is identical to the current stored document, bypass writing to `candidate_search_documents`;
- Only trigger FTS index updates when substantive text content has actually changed.

---

# 20. Automated Matching Architecture Overview

The core matching architecture is event-driven:

```text
Event: Position Created / Updated
Event: Candidate Created / Updated
         ↓
Worker Thread: Candidate Recall (FTS5 trigram + hard filters)
         ↓
Worker Thread: MatchEngine Scoring
         ↓
Persist / Update position_candidate_matches
```

---

# 21. Matching Trigger: New Position Creation

When a new job opening is transitioned to `status = 'open'`:

```text
1. Extract position_keywords & position_requirements
2. Query candidate_search_fts using keywords for candidate recall
3. Apply hard filtering (degree rank, minimum work years, target cities)
4. Score recalled candidates via MatchEngine
5. Top-ranked candidates (e.g. score >= 70) are saved as:
   - decision = 'system_recommended'
   - pipeline_stage = 'sourced'
```

---

# 22. Matching Trigger: Candidate Created / Updated

When a candidate's profile is created or substantively modified:

```text
1. Complete candidate mutation & raw_text rebuild
2. Query all active positions (status = 'open')
3. Evaluate MatchEngine score against each active opening
4. If score exceeds threshold:
   - If match record does not exist: Create new match (decision = 'system_recommended')
   - If match record exists and decision is 'pending': Update score
   - If match record was manually 'accepted' or 'dismissed': Update score details only; preserve decision
```

---

# 23. Matching Trigger: Position Requirements Modification

When a recruiter updates job requirements or keywords:

```text
1. Fetch all existing matches associated with this position
2. Recalculate scores for existing matches (preserves manual decisions)
3. Execute fresh FTS recall using updated keywords to discover new potential candidates
4. Insert newly discovered candidates meeting recommendation threshold
```

---

# 24. Position Status Lifecycle

Position status transitions:

```text
draft (Draft)
  ↓
open (Actively Recruiting - Triggers Matching)
  ├── paused (Temporarily Paused - Pauses Auto-Matching)
  ├── filled (Successfully Filled)
  └── cancelled (Cancelled / Terminated)
```

Rules:
- Auto-matching runs exclusively for positions in `open` status.
- When an opening transitions to `filled` or `cancelled`, all unclosed matches in `pending` or `system_recommended` status are automatically transitioned to `pipeline_stage = 'archived'`.

---

# 25. MatchEngine Version 1 Scoring Framework

Weighted composite score calculated on a 0-100 scale:

```text
Composite Score =
    KeywordScore     * 0.25 +
    SkillScore       * 0.25 +
    ExperienceScore  * 0.20 +
    EducationScore   * 0.10 +
    LanguageScore    * 0.10 +
    LocationScore    * 0.10
```

Criteria Breakdown:
- **KeywordScore (25%)**: BM25 relevance score from FTS5 recall against candidate `raw_text`.
- **SkillScore (25%)**: Percentage of required skills matched + bonus for optional skills.
- **ExperienceScore (20%)**: Alignment of candidate work years with required experience range.
- **EducationScore (10%)**: Verification that candidate degree meets or exceeds `min_degree_rank`.
- **LanguageScore (10%)**: Verification that required language certifications or proficiency levels are met.
- **LocationScore (10%)**: Matching between candidate current/expected city and opening target cities.

---

## 25.1 MatchEngine Output Specification

```js
// MatchResult Data Structure
{
  score: 85.5,             // Overall composite match score (0 - 100)

  keywordScore: 90,        // Keyword relevance score
  skillScore: 80,          // Skill alignment score
  experienceScore: 85,     // Years of experience score
  educationScore: 90,      // Degree alignment score
  languageScore: 80,       // Language requirement score
  industryScore: 85,       // Industry experience score
  locationScore: 100,      // Geographic alignment score

  reasons: [],             // MatchReason[] Array of detailed explanation strings

  algorithmVersion: '1.0'  // Version string of matching algorithm
}
```

Stored inside `match_reason_json`:

```json
{
  "matched": [
    "Proficient in Vue 3 and TypeScript",
    "Over 5 years frontend architecture experience",
    "Fluent spoken English (CET-6)"
  ],
  "partial": [
    "Desired salary slightly above target budget range"
  ],
  "missing": [
    "Electron desktop development experience not mentioned"
  ]
}
```

---

# 26. Full-Text Search is for Recall, Not Final Decisions

Crucial architectural distinction:

```text
FTS5 (raw_text)
     ↓
Fast Candidate Recall Pool (Top 100-300 Candidates)
     ↓
Structured MatchEngine & Business Filtering
     ↓
Ranked Recommendations & Candidate Matches
```

FTS provides rapid candidate retrieval, but must never bypass structured validation. Final recommendations must be validated through structured entity evaluation.

---

# 27. "Dismissed / Mismatch" Business Rules

When a recruiter marks a candidate as "Dismissed / Mismatch" (`decision = 'dismissed'`):

```text
Recruiter clicks "Dismiss"
         ↓
Prompt for dismissal reason (Optional or Selected from Dropdown)
         ↓
Update position_candidate_matches:
  - decision = 'dismissed'
  - is_dismissed = 1
  - dismiss_reason = <reason>
  - last_action_at = <timestamp>
         ↓
Record event in position_candidate_events
```

Immutability Rule:
- Once marked as `dismissed`, this candidate will never reappear in the "Recommended" tab for this position opening, regardless of future score recalculations.
- Recruiter may explicitly undo dismissal by manually changing status back to `accepted` or `pending`.

---

# 28. Candidate Progression into Recruitment Pipeline

When a candidate is accepted:

```text
decision = 'accepted'
pipeline_stage = 'contacted'
         ↓
Candidate appears on Position Candidate Kanban Board
         ↓
Recruiter logs communications & tracks interview stages:
  contacted → submitted → client_interview → offer → onboarded
```

---

# 29. Communication Logs and PositionCandidate Integration

When logging a candidate communication (`candidate_communications`):
- Recruiter may optionally bind the log to a specific `position_id`.
- If bound, the communication appears both on the Candidate Profile timeline and the Position Candidate detail drawer.
- Logging a communication automatically creates a `position_candidate_events` entry (`event_type = 'contacted'`) if associated with an active match.

---

# 30. Frontend Page Architecture

## 30.1 Main Navigation Structure

```text
Sidebar Navigation:
├── Candidates (Candidate Pool, Full-text Search, Filtering)
├── Positions (Job Openings, Pipeline Kanban, Recommendation Triage)
├── Companies (Client Companies, Client Contacts, Contracts)
└── Settings (Database Seed, System Status, Data Backups)
```

Frontend Principles:
- Single-page application built on Vue 3 + Vue Router.
- Element Plus component library for unified UI experience.
- Vue-i18n multilingual localization (English default, Simplified Chinese, Japanese).
- Persistent layout with responsive search filters and drawer modals.

---

# 31. Candidate Subsystem Pages

## 31.1 Candidate List Page

Key Capabilities:
- **Unified Keyword Search**: Queries `candidate_search_fts` across all resume versions;
- **Multi-dimensional Structured Filters**: City, Degree Rank, Work Years, Current Company, Current Position;
- **Deterministic Pagination**: Limit + Offset with exact count queries;
- **Dynamic Age Calculation**: Dynamically computed from `birth_date` and today's date (never relies on stale static resume age);
- **Sorting Options**: Defaults to descending sort by `sys_updated_date`.

## 31.2 Candidate Detail Drawer

Lifecycle & Structure:
- Triggered by clicking any candidate row;
- Uses a slide-out drawer layout (`CandidateDetailDrawer.vue`);
- **Multilingual Variant Switching**: Shows Chinese master by default; dynamically renders language tabs (`ZH`, `EN`, `JA`) only for versions actually present in `candidate_resume_variants`;
- **Modular Sub-tabs**:
  - Profile (Basic Information)
  - Career Expectations
  - Work Experiences
  - Educational Background
  - Project Experience
  - Professional Trainings
  - Technical & Professional Skills
  - Language Proficiencies
  - Certifications
  - Communication History & Outreach Log

## 31.3 Candidate Editing and Mutation Flow

- Each tab manages its own editing state and independent update API;
- Changes to structured data trigger an atomic transaction;
- Upon completion, the system automatically triggers `raw_text` full rebuild and FTS5 synchronization.

---

# 32. Position Subsystem Pages

## 32.1 Position List Page

- Comprehensive overview of job openings across all client companies;
- Status filters: `draft`, `open`, `paused`, `filled`, `cancelled`;
- Visual badges for priority (`urgent`, `high`, `medium`, `low`);
- Recruiter assignment and headcount tracking.

## 32.2 Position Detail View

- Detailed job requirements, target industries, target cities;
- Required vs preferred technical skills and language requirements;
- Associated client company information and hiring manager contacts;
- Keyword configuration for automated FTS recall tuning.

## 32.3 Position Candidate Kanban Board

A visual recruitment ATS pipeline board representing candidates across stages:

```text
[ Sourced ] → [ Contacted ] → [ Submitted ] → [ Client Interview ] → [ Offer ] → [ Onboarded ]
```

Capabilities:
- Drag-and-drop or one-click stage progression;
- Quick access to match score and rationale breakdown (`match_reason_json`);
- Quick-log communication popups directly from Kanban cards;
- Tab for reviewing and dismissing `system_recommended` candidates.

---

# 33. Company Subsystem Pages

## 33.1 Company List Page

- Client company directory with industry, city, and scale filters;
- Real-time count of active job openings per company;
- Status badges: `active`, `inactive`, `blacklisted`.

## 33.2 Company Detail View

- Company profile and overview;
- Contact directory (Hiring managers, HR directors);
- Tabbed list of historical and active job openings;
- Company-specific notes, interview feedback patterns, and contract agreements.

---

# 34. Electron Project Folder Hierarchy

Standardized production architecture:

```text
resume-candidate-system/
├── electron/
│   ├── main.js                      # Application main entry point & window lifecycle
│   ├── preload.js                   # contextBridge API exposure
│   ├── src/
│   │   ├── database/
│   │   │   ├── Database.js          # better-sqlite3 connection manager
│   │   │   ├── DatabasePath.js      # Cross-platform runtime database path resolver
│   │   │   ├── MigrationRunner.js   # Automated schema migrations
│   │   │   └── migrations/          # Versioned SQL migration scripts
│   │   ├── database/repositories/   # Data access layer (pure SQL queries)
│   │   ├── services/                # Business domain logic & transaction coordinators
│   │   ├── ipc/                     # Typed IPC channel registration handlers
│   │   ├── candidate/search/        # CandidateRawTextBuilder & FTS builders
│   │   └── workers/                 # Worker Threads for background processing
├── frontend/
│   ├── src/
│   │   ├── api/                     # IPC client invocation wrappers
│   │   ├── pages/                   # Application views (Candidate, Position, Company)
│   │   ├── pages/candidate/tabs/    # Isolated candidate sub-tabs
│   │   ├── router/                  # Vue Router navigation mapping
│   │   ├── i18n/                    # Multilingual dictionaries (en, zh-cn, ja)
│   │   └── electron/                # Ajax / IPC communication adapters
└── data/
    └── recruitment.db               # SQLite database file (ignored in git)
```

---

# 35. Repository Layering Rules

- **Pure Data Access**: Contains SQL queries and prepared statements exclusively;
- **Zero Business Logic**: Repositories do not make business workflow decisions;
- **Prepared Statement Caching**: Reuse prepared statements on high-frequency lookups;
- **Single Aggregate Scope**: Each repository manages queries for its designated domain table group.

---

# 36. Service Layering Rules

- **Business Domain Workflow**: Services coordinate business rules, calculations, and orchestrations;
- **Transaction Boundaries**: Services initiate and commit SQLite transactions;
- **Multi-Repository Coordination**: Services compose calls across multiple repositories;
- **Background Dispatch**: Services enqueue background jobs (such as re-scoring and raw_text rebuilds).

---

# 37. IPC Layering Rules

- **Typed Handler Registration**: All IPC channels register via `ipcMain.handle`;
- **Input Validation**: Cleanly sanitize and validate renderer payload arguments;
- **Standardized Response Envelope**:
  ```js
  {
    success: true,
    data: { ... },
    error: null
  }
  ```
  On failure:
  ```js
  {
    success: false,
    data: null,
    error: {
      message: 'Failed to execute query',
      code: 'ERR_QUERY_FAILED'
    }
  }
  ```
- **Zero Raw SQL in IPC Handlers**: Never execute raw SQL queries inside IPC files.

---

# 38. Preload API Rules

- Use `contextBridge.exposeInMainWorld` exclusively;
- Group APIs into modular, domain-driven namespaces:
  ```js
  window.electronApi = {
    candidate: candidateApi,
    position: positionApi,
    company: companyApi,
    system: systemApi
  };
  ```
- Never expose direct database instances, `require`, or raw Node `fs` / `child_process` modules to the Renderer.

---

# 39. Background Worker Architecture

Heavy, compute-intensive workloads run in isolated Node `worker_threads`:
- High-volume batch candidate imports;
- Full-database `raw_text` batch rebuilding;
- Multi-position automated matching and scoring passes.

The Main Process remains responsive to UI requests while background threads process analytical pipelines.

---

# 40. Job Deduplication Rules

- Before queuing a job in `system_jobs`:
  - Check if a job with identical `job_type` and `target_id` is currently `pending` or `processing`;
  - If a duplicate job is already queued, coalesce or skip the new job to prevent redundant computational load.

---

# 41. Database Transaction Boundaries

Mandatory Transaction Invariants:
- Candidate profile mutations spanning multiple tables (`profiles`, `contacts`, `expectations`, `experiences`) MUST be wrapped inside a single atomic `db.transaction`;
- Batch imports of candidate JSONs MUST commit candidates atomically;
- Match state updates coupled with event logging MUST execute within an atomic transaction.

---

# 42. Search API Specifications

Core Search Signatures:

```js
// Search Candidates
async candidatesSearch({
  keyword = '',
  city = '',
  degreeRank = null,
  workYearsMin = null,
  workYearsMax = null,
  candidateStatus = 'active',
  sortBy = 'updated_at',
  sortOrder = 'desc',
  page = 1,
  pageSize = 20
})

// Count Candidates Matching Criteria
async candidatesCount({
  keyword = '',
  city = '',
  degreeRank = null,
  workYearsMin = null,
  workYearsMax = null,
  candidateStatus = 'active'
})
```

---

# 43. Search Execution Pipeline

High-performance query path:

```text
1. Parse Keyword:
   ├── Empty keyword:
   │   Query candidate_profiles directly with structured WHERE clauses
   └── Non-empty keyword:
       Query candidate_search_fts with MATCH or LIKE
       Retrieve matched candidate_id array
2. Build Dynamic SQL with Prepared Statements:
   JOIN candidate_profiles ON id IN (matched_ids)
   Append structured conditions (city, degree_rank, work_years)
3. Execute Paginated Query (LIMIT ? OFFSET ?)
4. Execute Total Count Query
5. Enrich each candidate with dynamic calculated age:
   age = calculateAge(birth_date, now)
```

---

# 44. Candidate Detail API Specifications

```js
// Fetch Complete Candidate Snapshot
async candidateGet(candidateId)

// Fetch Multilingual Resume Variant
async candidateResumeGet(candidateId, languageCode)

// Update Sub-Entities Independently
async candidateUpdate(candidateId, profileData)
async candidateWorkExperiencesUpdate(candidateId, workExperiences)
async candidateEducationsUpdate(candidateId, educations)
async candidateSkillsUpdate(candidateId, skills)
async candidateLanguagesUpdate(candidateId, languages)
async candidateExpectationsUpdate(candidateId, expectations)
async candidateCommunicationAdd(candidateId, communicationRecord)
```

---

# 45. Position Detail API Specifications

```js
// Fetch Job Opening with Requirements & Statistics
async positionGet(positionId)

// Fetch Associated Candidate Pipeline
async positionCandidatesGet(positionId, {
  pipelineStage = null,
  decision = null,
  page = 1,
  pageSize = 50
})
```

---

# 46. Position Candidate Query API

```js
// Query Matches by Stage for Kanban Board
async positionKanbanGet(positionId)
// Returns candidates partitioned by pipeline stages:
// {
//   sourced: [...],
//   contacted: [...],
//   submitted: [...],
//   client_interview: [...],
//   offer: [...],
//   onboarded: [...]
// }
```

---

# 47. Data Deletion and Archival Policies

## Candidate Deletion
- **Soft Delete Preferred**: Set `candidate_status = 'archived'`. Candidate is omitted from default search lists but historical matches and communication records remain intact.
- **Hard Delete (Admin Only)**: Cascades to remove `candidate_profiles`, contacts, experiences, educations, `candidate_search_documents`, FTS indexes, and all `position_candidate_matches`.

## Position Deletion
- **Soft Delete Preferred**: Set `status = 'cancelled'`. Closes active recruitment and suppresses future automated candidate matches.
- **Hard Delete**: Removes opening, requirements, keyword rules, and cascades to delete all associated matches.

## Company Deletion
- **Soft Delete Preferred**: Set `status = 'inactive'`.
- **Hard Delete**: Refused if the company owns active job openings (`status = 'open'`). Requires positions to be archived or deleted prior to company deletion.

---

# 48. Security and Operation Auditing

All sensitive state mutations record an entry in `system_audit_logs`:
- Deleting candidates, positions, or client companies;
- Overriding system-recommended match decisions;
- Modifying system settings and database seeds;
- Manual trigger of bulk import or data re-indexing.

---

# 49. Database Backups and Recovery

SQLite Native Online Backup:
- Executes non-blocking hot backups via `better-sqlite3` backup API:
  ```js
  await db.backup(`backups/recruitment_${timestamp}.db`);
  ```
- **Automated Schedule**: Triggered daily on application startup or idle background timer;
- **Retention Policy**: Retains the most recent 14 snapshots, pruning older backups automatically;
- **Zero Lock Contention**: Runs concurrently with WAL mode without locking read operations.

---

# 50. Phased Development Roadmap

## Phase 0: Project Scaffolding
- Initial Electron 43 + Vue 3 + Webpack 5 repository scaffolding;
- SQLite connection manager with WAL configuration;
- MigrationRunner infrastructure and base schema migrations (`001_initial.sql`, `002_candidate_fts.sql`).

## Phase 1: Candidate Subsystem (Current Phase)
- **1A. Database**: Complete candidate schema deployment, indexes, and FTS5 triggers;
- **1B. Importer**: Verified idempotent candidate JSON ingestion pipeline;
- **1C. Candidate UI**: Candidate List with dynamic age, multilingual detail drawer with isolated tabs;
- **1D. RawText Rebuild**: Mutation pipeline with deterministic `raw_text` compilation;
- **Phase 1 Acceptance**: 9,860 candidates searchable with sub-second response, full i18n support.

## Phase 2: Position Openings & Automated Matching
- **2A. Position CRUD**: Position opening creation, requirement definition, skill/keyword weighting;
- **2B. MatchEngine**: Multi-factor scoring engine (BM25, skills, experience, education, location);
- **2C. ATS Pipeline**: Drag-and-drop Kanban board for candidate stage progression;
- **2D. Reverse Matching**: Two-way auto-matching triggered on candidate and position mutations;
- **Phase 2 Acceptance**: New position instantly recalls and scores top candidates with detailed match rationale.

## Phase 3: Client Company Management
- **3A. Company Management**: Client company CRUD, contact directories, contract notes;
- **3B. Relationship Binding**: Company-to-Position hierarchy with quota tracking;
- **Phase 3 Acceptance**: End-to-end recruitment lifecycle from client intake to candidate onboarding.

---

# 51. Future Extensibility (Phase 4 Roadmap)

- Direct resume file parsing (Word, PDF, Excel) within Electron using local background workers;
- Local LLM integration for automated candidate profile summarization;
- Email client integration for one-click candidate pitch submissions.

---

# 52. Testing Specifications

## 52.1 Repository Unit Tests
- Verify CRUD operations across all repositories;
- Verify prepared statement reuse and parameterized input sanitization.

## 52.2 RawTextBuilder Tests
- Verify deterministic ordering of snapshot elements;
- Verify robust filtering of null/undefined fields and delimiter formatting (` | `).

## 52.3 FTS5 Search Tests
- Verify trigram search accuracy across Chinese, English, and Japanese tokens;
- Verify synchronization triggers on document inserts, updates, and deletes.

## 52.4 MatchEngine Tests
- Verify score calculation fidelity across edge cases (e.g. over-qualified, missing optional skills);
- Verify structured breakdown in `match_reason_json`.

---

# 53. Core Data Consistency Invariants

### Candidate Invariants
- Each candidate has exactly one master record in `candidate_profiles` with a unique `candidate_uuid`;
- Dynamic age is calculated on the fly and never stored as a stale integer;
- Primary language resume content resides in structured tables; secondary variants reside in `candidate_resume_variants`.

### Search Invariants
- `candidate_search_documents` contains exactly one document per candidate;
- `candidate_search_fts` rowid strictly mirrors `candidate_search_documents.id`.

### Match Invariants
- A candidate and position pair has at most one record in `position_candidate_matches` (`UNIQUE(position_id, candidate_id)`);
- Human decisions (`decision = 'accepted'` / `'dismissed'`) are immutable against automated score updates.

### Company Invariants
- `company_name` is strictly unique;
- Client company contacts must link to a valid `company_id`.

### raw_text Invariants
- Incremental or partial string patching (`+=` or `replace`) is prohibited;
- Must always be recompiled via deterministic full rebuild.

---

# 54. Developer Disciplines for Codex / Engineers

1. **Strictly Abide by Documented Architecture**: Do not arbitrarily introduce unauthorized dependencies (e.g. Redis, MySQL, external server daemons).
2. **Zero Schema Deviation**: All database tables, column names, constraints, and data types must strictly correspond to the DDL specifications defined herein.
3. **Zero Mock Fallbacks**: When backend IPC or database queries fail, display errors explicitly with full diagnostic telemetry. Never silently fallback to fake mock data.
4. **Preserve Layering Purity**: Renderer MUST NOT execute database queries or call Node APIs directly. All mutations pass through typed IPC and Service boundaries.
5. **Deterministic raw_text Generation**: Never patch `raw_text` with partial string replacement. Always perform a complete rebuild from candidate snapshot.

---

# 55. Initial Recommended Scaffolding Files

```text
electron/
├── src/database/Database.js
├── src/database/DatabasePath.js
├── src/database/MigrationRunner.js
├── src/database/migrations/001_initial.sql
├── src/database/migrations/002_candidate_fts.sql
├── src/database/repositories/CandidateRepository.js
├── src/database/repositories/CandidateSearchRepository.js
├── src/services/CandidateService.js
├── src/services/CandidateSearchService.js
├── src/candidate/search/CandidateRawTextBuilder.js
├── src/ipc/candidate.ipc.js
├── preload.js
frontend/
├── src/api/candidateApi.js
├── src/pages/candidate/CandidateList.vue
├── src/pages/candidate/CandidateDetailDrawer.vue
└── src/pages/candidate/tabs/
```

---

# 56. Step-by-Step Implementation Sequence for Phase 1

```text
Step 1: Database Infrastructure
├── Configure better-sqlite3 connection with WAL mode
├── Implement MigrationRunner
└── Execute 001_initial.sql and 002_candidate_fts.sql

Step 2: Candidate Importer & Data Verification
├── Implement CandidateImportService
├── Test idempotent ingestion of candidate JSONs
└── Verify 9,860 rows across profiles, import_records, search_documents, and FTS

Step 3: Search Subsystem & IPC
├── Implement CandidateSearchRepository & CandidateSearchService
├── Implement CandidateRawTextBuilder
├── Expose IPC channels in candidate.ipc.js and preload.js
└── Validate keyword search and structured filtering with sub-second latency

Step 4: Frontend Candidate UI
├── Implement CandidateList.vue with dynamic age calculation & pagination
├── Implement CandidateDetailDrawer.vue with multilingual variant toggling
└── Implement isolated candidate sub-tabs (Profile, Expectations, Work, Education, etc.)

Step 5: Mutation & Multilingual Localization (i18n)
├── Implement update APIs for each sub-tab
├── Trigger raw_text rebuild and FTS5 update upon mutation
└── Integrate vue-i18n across all frontend pages and navigation elements
```

---

# 57. Pre-Flight Checklist Before First Execution

- [x] Node.js version verified compatible (Node 18+ / 20+);
- [x] `better-sqlite3` compiled and linked natively against Electron ABI;
- [x] Database file path verified to have full write permissions for current Windows user;
- [x] Source candidate JSON path verified via `--source` CLI parameter;
- [x] MigrationRunner executes base schemas cleanly with `integrity_check = ok`;
- [x] Automated unit tests pass with 0 errors.

---

# 58. Comprehensive System Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Vue 3 Frontend (Renderer)                       │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   CandidateList.vue   │  │       CandidateDetailDrawer.vue        │ │
│  │ (FTS Search & Filter) │  │  (Profile / Work / Education / Tabs)   │ │
│  └───────────┬───────────┘  └───────────────────┬────────────────────┘ │
│              └─────────────────┬────────────────┘                      │
│                                ▼                                       │
│                       src/api/candidateApi.js                          │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼ (contextBridge)
┌────────────────────────────────────────────────────────────────────────┐
│                         Electron Preload API                           │
│                      window.electronApi.candidate                      │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼ (IPC invoke: 'candidate:channel')
┌────────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  src/ipc/candidate.ipc.js                        │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
│                                ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               CandidateService / CandidateSearchService          │  │
│  └──────────────┬───────────────────────────────────┬───────────────┘  │
│                 ▼                                   ▼                  │
│  ┌──────────────────────────────┐   ┌───────────────────────────────┐  │
│  │  CandidateRawTextBuilder.js  │   │   CandidateSearchRepository   │  │
│  └──────────────────────────────┘   └───────────────┬───────────────┘  │
│                                                     ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Database.js (better-sqlite3)                   │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          SQLite Database                               │
│  ┌──────────────────────────────┐   ┌───────────────────────────────┐  │
│  │ candidate_* Structured Tables│   │ candidate_search_fts (FTS5)   │  │
│  └──────────────────────────────┘   └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

# 59. Summary of Core Business Principles

## Candidate Domain
- Structured database is the sole truth for candidate operations;
- `raw_text` is dynamically rebuilt on-demand for full-text search;
- Dynamic age calculation on the fly; static age from resume is deprecated.

## Position Domain
- Job openings drive candidate discovery;
- Requirements combine hard filters (degree, experience, city) with weighted soft factors (skills, languages).

## Company Domain
- Clients own multiple job openings (`1:N`);
- Deletion of clients with active job openings is strictly restricted.

## PositionCandidateMatch Domain
- `decision` (matching evaluation) and `pipeline_stage` (workflow progress) are strictly decoupled;
- Human recruiter decisions take permanent precedence over automated algorithm scores.

---

# 60. Core Long-Term Invariants to Maintain Permanently

1. **Single Source of Truth**: The structured SQLite database is the only business truth; original JSON files are immutable audit logs.
2. **Deterministic Full Rebuild**: All modifications to candidate data trigger a complete rebuild of `raw_text` from snapshot; partial text splicing is forbidden.
3. **Decoupled Workflow & Decision**: `decision` and `pipeline_stage` remain independent; auto-matching never alters human-reviewed candidate states.
4. **Architectural Purity**: Renderer accesses data exclusively through typed IPC APIs; direct database connections from Renderer are strictly forbidden.

---

# 61. Development Milestones Execution

Priority execution order:

```text
Scaffold Electron + Vue + JavaScript Base Application
        ↓
Implement SQLite Database Connection & MigrationRunner
        ↓
Execute 001_initial.sql & 002_candidate_fts.sql
        ↓
Implement Candidate JSON Importer & Verify Idempotency
        ↓
Deliver Phase 1 Candidate Subsystem UI & Search APIs
```

---

# 62. Candidate List Fields Acceptance Verification (2026-08-10)

- Full scan of 9,860 source candidate JSONs across 11,637 resumes;
- Target career expectations standardized to `resumes[i].expected_list`;
- List view fields mapped cleanly across SQLite, Electron Repositories, and Frontend components;
- Communication records bound to candidate level (`candidate_communications`);
- Database reconstructed cleanly from canonical JSONs: 9,860 candidates, 11,637 resumes, 0 failures, 0 data loss, `integrity_check = ok`;
- Verification command:
  ```bash
  cd electron && npm run audit:candidate-lists -- E:\resume-system\codex-complete-jsons\complete E:\resume-system\code\data\recruitment.db
  ```
- Normalization command:
  ```bash
  cd electron && npm run normalize:candidate-json-lists -- E:\resume-system\codex-complete-jsons\complete
  ```

---

**END OF DOCUMENT**
