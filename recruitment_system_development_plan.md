# 猎头招聘管理系统开发规划与数据库设计

**文档版本**：1.0  
**日期**：2026-08-09  
**目标读者**：Codex / Antigravity / 开发人员
**系统形态**：本地 Electron 桌面应用  
**当前阶段**：候选人数据已完成解析、清洗、跨语言合并与 `raw_text` 构建，正式进入 Electron + 前端 + SQLite 开发阶段。

---

## 0. 文档定位与优先级

本文件是从“数据转换阶段”切换到“业务系统开发阶段”后的开发权威说明。

开发时遵循以下优先级：

1. 本文件中标记为 **必须 / 强制 / 不允许** 的约定。
2. 已完成的最终候选人 JSON 数据结构。
3. 原项目 `CONTEXT.md` 中 2026-08-02 及之后没有被本文件覆盖的规则。
4. 历史解析脚本、旧 MySQL / PHP / 阿里云方案仅作为历史资料，不作为当前应用架构依据。

### 0.1 当前已确认事实

- 所有历史简历文件已经完成转换。
- 同一候选人的数据已经完成合并。
- 多语言简历已经按最终规则完成处理。
- 候选人的最终 JSON 已经包含结构化数据。
- 每个候选人已经预先生成候选人级 `raw_text`。
- `raw_text` 已包含该候选人现有简历中的可搜索文本，用于全文搜索。
- 第一阶段不再重新解析 Word / PDF / Excel / HTML。
- 正式应用使用 **Electron + SQLite**。
- 前端使用 **Vue 3 + JavaScript**。
- 表名前缀按业务域统一：
  - `candidate_`：候选人域
  - `position_`：职位域
  - `customer_`：客户域
  - `system_`：系统基础设施域

> 注意：统一使用正确英文拼写 `position_`，不使用 `postion_`。

---

# 1. 系统目标

系统最终是一个本地运行的猎头 CRM + ATS + 人才库自动匹配系统。

核心业务闭环：

```text
客户公司
   ↓
创建职位
   ↓
职位自动从候选人库召回并评分
   ↓
系统推荐候选人
   ↓
人工确认 / 不匹配
   ↓
沟通
   ↓
推送客户
   ↓
面试
   ↓
Offer
   ↓
入职
```

反向闭环：

```text
新增 / 更新候选人
   ↓
重建该候选人 raw_text
   ↓
重新匹配所有正在招聘的职位
   ↓
产生 / 更新职位候选关系
```

候选人详情页必须能够反向看到：

- 该候选人关联过哪些职位；
- 每个职位当前走到什么进度；
- 历史上什么时候被匹配；
- 是否曾被人工判定不匹配；
- 是否正在沟通；
- 是否已经推送客户；
- 是否面试；
- 是否 Offer；
- 是否已入职；
- 所有沟通记录。

---

# 2. 总体技术架构

## 2.1 推荐技术栈

```text
Desktop
├── Electron
├── JavaScript (ES6+)
├── Vue 3
├── Vue Router
├── Pinia
├── Vite
│
Database
├── SQLite
├── FTS5
└── better-sqlite3
│
Background
└── Node Worker Threads
```

不建议第一版引入：

- MySQL
- PostgreSQL
- Redis
- Elasticsearch
- 独立后端服务
- Docker
- 微服务
- 云数据库

当前系统是本地单机桌面应用，优先保证：

- 简单；
- 快速；
- 可备份；
- 可恢复；
- 数据一致；
- 易调试；
- 易迁移。

---

## 2.2 Electron 分层

强制使用以下调用链：

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

**禁止：**

```text
Vue Renderer → 直接访问 SQLite
```

**禁止：**

```text
IPC 文件内部散落大量 SQL
```

**禁止：**

```text
Renderer 开启 nodeIntegration 后直接调用 Node API
```

Electron Main Process 持有数据库连接。

Renderer 只能通过受控 IPC API 操作业务数据。

---

## 2.3 数据库配置

应用启动连接 SQLite 后执行：

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

数据库文件建议：

```text
<userData>/
└── data/
    └── recruitment.db
```

不要把正式数据库放在源码目录。

---

# 3. 核心领域模型

系统核心不是三个孤立模块，而是：

```text
Customer
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

其中最重要的是：

```text
PositionCandidateMatch
```

它不是普通中间表，而是完整业务实体。

它负责记录：

- 为什么匹配；
- 匹配得分；
- 系统是否推荐；
- 是否被人工接受；
- 是否被人工判定“不匹配”；
- 当前招聘阶段；
- 历史阶段；
- 每次重新评分；
- 每次人工操作。

---

# 4. 数据真值原则

## 4.1 结构化数据库是真值

候选人进入系统后：

```text
candidate_* 结构化表
```

是候选人的当前业务数据真值。

`raw_text` 是根据当前候选人数据派生出来的全文搜索文档。

---

## 4.2 原始导入 JSON 是审计证据

首次导入时必须保留原 JSON：

```text
candidate_import_records.original_json
```

该字段用于：

- 数据审计；
- 恢复；
- 排查导入错误；
- 未来 Schema 迁移；
- 对照历史转换结果。

**原始 JSON 不直接作为后续编辑后的业务真值。**

---

# 5. raw_text 核心规则

这是整个 Candidate 搜索系统最重要的规则之一。

## 5.1 raw_text 定义

`raw_text` 定义为：

> **Candidate Full-text Search Document**

它不是普通“源文件原文”。

它是已经整理好的：

```text
候选人级全文搜索文档
```

用于：

- 人才库关键词搜索；
- 自动职位候选人召回；
- 候选人全文查询。

---

## 5.2 首次历史数据导入

历史 JSON 已经生成高质量 `raw_text`。

因此首次导入：

```text
JSON.raw_text
    ↓
candidate_search_documents.raw_text
```

**直接使用。**

首次入库阶段不要重新生成，不要重新解释，不要重新拼接。

---

## 5.3 后续任何 Candidate 修改

以后 Electron 内：

- 修改基本信息；
- 增加手机号；
- 删除手机号；
- 修改求职意向；
- 添加工作经历；
- 修改工作经历；
- 删除工作经历；
- 修改教育；
- 添加项目；
- 删除项目；
- 添加语言；
- 添加技能；
- 添加证书；
- 添加培训；
- 添加沟通记录；
- 修改沟通记录；
- 删除沟通记录；

全部执行：

```text
修改结构化数据
    ↓
重新读取这个 Candidate 的全部当前信息
    ↓
从 0 开始重新生成 raw_text
    ↓
覆盖旧 raw_text
    ↓
同步 FTS 索引
```

### 强制规则

**禁止：**

```text
raw_text += 新内容
```

**禁止：**

```text
raw_text.replace(...)
```

**禁止局部维护 raw_text。**

必须：

```text
FULL REBUILD
```

---

## 5.4 RawTextBuilder

独立模块：

```text
CandidateRawTextBuilder
```

建议接口与规范：

```js
class CandidateRawTextBuilder {
  /**
   * @param {Object} snapshot - CandidateFullSnapshot 对象
   * @returns {string} rawText 文档
   */
  build(snapshot) {}
}
```

`CandidateRawTextBuilder` 不负责数据库查询。

完整数据由：

```js
candidateRepository.getFullSnapshot(candidateId)
```

提供。

---

## 5.5 CandidateFullSnapshot

建议快照结构：

```js
// CandidateFullSnapshot 数据结构
{
  profile: {},           // CandidateProfile 候选人基础信息
  contacts: [],          // CandidateContact[] 联系方式列表
  expectations: [],      // CandidateExpectation[] 求职意向
  workExperiences: [],  // CandidateWorkExperience[] 工作经历
  educations: [],        // CandidateEducation[] 教育经历
  projects: [],          // CandidateProject[] 项目经历
  trainings: [],         // CandidateTraining[] 培训经历
  languages: [],         // CandidateLanguage[] 语言能力
  certificates: [],      // CandidateCertificate[] 证书
  skills: [],            // CandidateSkill[] 技能
  resumeVariants: [],    // CandidateResumeVariant[] 其他多语言简历快照
  communications: []     // CandidateCommunication[] 沟通记录
}
```

---

## 5.6 raw_text 重建顺序

固定使用：

```text
1. 当前候选人基础资料
2. 联系方式
3. 求职意向
4. 当前工作快照
5. 工作经历
6. 教育经历
7. 项目经历
8. 培训经历
9. 语言能力
10. 证书
11. 技能
12. 外文 / 其他简历语言版本
13. 沟通记录
```

只写有值字段。

过滤：

- `null`
- `undefined`
- 空字符串
- 空数组
- 纯占位对象

建议统一使用：

```text
" | "
```

连接。

可以对完全相同的字符串做稳定去重，但不得误删不同语言或不同上下文内容。

---

## 5.7 raw_text 与 FTS

```text
candidate_search_documents
        │
        └── raw_text
                │
                ▼
candidate_search_fts
```

`candidate_search_documents` 保存正文。

`candidate_search_fts` 只作为 SQLite FTS5 索引。

---

# 6. 全文搜索原则

## 6.1 不进行全库全文 JOIN

搜索：

```text
汽车 日语 供应链
```

不允许：

```text
JOIN candidate_work_experiences
JOIN candidate_educations
JOIN candidate_projects
JOIN candidate_languages
JOIN candidate_certificates
...
```

做全文搜索。

全文搜索唯一入口：

```text
candidate_search_documents.raw_text
```

---

## 6.2 结构化筛选仍然使用结构化表

例如：

```text
关键词：汽车 日语
学历：本科以上
工作年限：8年以上
城市：上海
```

执行逻辑：

```text
FTS raw_text
     ↓
candidate_id
     ↓
结构化条件过滤
     ↓
candidate_profiles / candidate_* tables
```

---

## 6.3 FTS5 策略

第一版建议：

```text
3个 Unicode 字符及以上关键词
    → FTS5 trigram

1~2个中文字符
    → raw_text LIKE / instr fallback
```

不要因为 2 字中文查询问题一开始就引入 Elasticsearch。

先对真实候选人数据 Benchmark。

---

# 7. 数据库总览

```text
system_schema_migrations
system_settings
system_jobs
system_audit_logs

customer_companies
customer_contacts
customer_notes

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

# 8. Candidate 表结构规划

## 8.1 candidate_profiles

候选人主表。

只保存：

- 当前快照；
- 高频列表字段；
- 高频筛选字段。

不要把全部 Resume JSON 塞这里。

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

一个候选人可以有多个电话 / 邮箱 / 微信等。

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

CREATE INDEX idx_candidate_contacts_normalized
ON candidate_contacts(normalized_value);
```

---

## 8.3 candidate_import_records

保存每次导入的完整 JSON。

属于不可变审计证据。

```sql
CREATE TABLE candidate_import_records (
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

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_candidate_import_records_candidate
ON candidate_import_records(candidate_id);
```

### 强制

`original_json`：

- 初次写入后不修改；
- 不参与正常 Candidate 编辑；
- 不作为后续 raw_text 重建数据源；
- 只用于历史证据和恢复。

---

## 8.4 candidate_resume_variants

保存多语言 Resume 版本。

历史数据规则：

```text
resumes[0] = zh
resumes[1...] = en / jp / de / ...
```

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

当前中文结构化数据以 `candidate_*` 正规化表为主。

非中文版本主要用于：

- Resume 详情；
- 多语言展示；
- raw_text 重建补充；
- 历史证据。

---

## 8.5 candidate_expectations

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

即使原始 JSON 中 `expected_info` 是完整空对象，数据库导入时可以选择：

- 建一行空 expectation；
- 或不建空行。

推荐数据库层：

```text
空对象 → 不创建行
```

业务 API 返回详情时再补前端默认对象。

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
    school_start_ym TEXT NOT NULL DEFAULT '',
    school_end_ym TEXT NOT NULL DEFAULT '',

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

学历等级：

```text
7 = 博士后
6 = 博士
5 = 硕士
4 = 本科
3 = 大专
2 = 高中 / 中专
1 = 初中及以下
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

不要把旧 JSON 中用于解析阶段的 fingerprint 暴露为业务字段。

需要去重时，数据库内部自行计算。

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

语言考试如：

```text
CET
JLPT
TOEIC
TOEFL
BEC
```

继续放 `candidate_languages`，不要同时重复写入 `candidate_certificates`。

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

# 9. Candidate 全文搜索表

## 9.1 candidate_search_documents

```sql
CREATE TABLE candidate_search_documents (
    candidate_id INTEGER PRIMARY KEY,

    raw_text TEXT NOT NULL,

    raw_text_hash TEXT NOT NULL DEFAULT '',
    raw_text_length INTEGER NOT NULL DEFAULT 0,

    search_document_version INTEGER NOT NULL DEFAULT 1,

    source_mode TEXT NOT NULL DEFAULT 'imported_json'
        CHECK (source_mode IN (
            'imported_json',
            'rebuilt_from_db'
        )),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE
);
```

---

## 9.2 candidate_search_fts

建议使用 FTS5 external-content table：

```sql
CREATE VIRTUAL TABLE candidate_search_fts
USING fts5(
    raw_text,
    content='candidate_search_documents',
    content_rowid='candidate_id',
    tokenize='trigram'
);
```

同步 Trigger：

```sql
CREATE TRIGGER candidate_search_documents_ai
AFTER INSERT ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.candidate_id, new.raw_text);
END;
```

```sql
CREATE TRIGGER candidate_search_documents_ad
AFTER DELETE ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(
        candidate_search_fts,
        rowid,
        raw_text
    )
    VALUES (
        'delete',
        old.candidate_id,
        old.raw_text
    );
END;
```

```sql
CREATE TRIGGER candidate_search_documents_au
AFTER UPDATE OF raw_text ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(
        candidate_search_fts,
        rowid,
        raw_text
    )
    VALUES (
        'delete',
        old.candidate_id,
        old.raw_text
    );

    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.candidate_id, new.raw_text);
END;
```

---

# 10. Candidate 沟通记录

## 10.1 candidate_communications

这是正式 CRM 沟通表。

历史 JSON 中的：

```text
communication_list
```

导入这里。

以后手工沟通记录也写这里。

```sql
CREATE TABLE candidate_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,

    position_candidate_match_id INTEGER,
    customer_id INTEGER,
    source_resume_id INTEGER,

    communication_time TEXT NOT NULL,

    communication_type TEXT NOT NULL DEFAULT 'note',
    direction TEXT NOT NULL DEFAULT 'unknown',

    communicate_content TEXT NOT NULL,

    source_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (source_type IN (
            'imported_resume',
            'manual',
            'system'
        )),

    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (position_candidate_match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE SET NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customer_companies(id)
        ON DELETE SET NULL,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_communications_candidate
ON candidate_communications(candidate_id);

CREATE INDEX idx_candidate_communications_match
ON candidate_communications(position_candidate_match_id);

CREATE INDEX idx_candidate_communications_time
ON candidate_communications(communication_time);
```

### communication_type 建议值

```text
note
phone
wechat
email
meeting
interview_feedback
client_feedback
other
```

### direction 建议值

```text
inbound
outbound
internal
unknown
```

---

# 11. Position 职位模块

## 11.1 position_openings

```sql
CREATE TABLE position_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_uuid TEXT NOT NULL UNIQUE,

    customer_id INTEGER,

    title TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '',

    city TEXT NOT NULL DEFAULT '',
    work_location TEXT NOT NULL DEFAULT '',

    employment_type TEXT NOT NULL DEFAULT '全职',

    headcount INTEGER NOT NULL DEFAULT 1,

    salary_min REAL,
    salary_max REAL,
    salary_currency TEXT NOT NULL DEFAULT 'CNY',
    salary_period TEXT NOT NULL DEFAULT 'annual',
    salary_months REAL,

    experience_min REAL,
    experience_max REAL,

    degree_min_rank INTEGER,

    description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    requirements_text TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'open',
            'paused',
            'filled',
            'closed',
            'cancelled'
        )),

    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN (
            'low',
            'normal',
            'high',
            'urgent'
        )),

    opened_at TEXT,
    closed_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customer_companies(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_position_openings_customer
ON position_openings(customer_id);

CREATE INDEX idx_position_openings_status
ON position_openings(status);

CREATE INDEX idx_position_openings_city
ON position_openings(city);

CREATE INDEX idx_position_openings_title
ON position_openings(title);
```

即使第一、二阶段 Customer 页面还没完成，也保留：

```text
customer_id NULL
```

第三阶段直接关联，不需要迁移核心职位结构。

---

## 11.2 position_requirements

通用结构化职位要求。

```sql
CREATE TABLE position_requirements (
    position_id INTEGER PRIMARY KEY,

    min_age INTEGER,
    max_age INTEGER,

    min_work_years REAL,
    max_work_years REAL,

    min_degree_rank INTEGER,

    target_city TEXT NOT NULL DEFAULT '',
    target_industry TEXT NOT NULL DEFAULT '',

    gender_requirement TEXT NOT NULL DEFAULT '',

    must_have_text TEXT NOT NULL DEFAULT '',
    nice_to_have_text TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);
```

技术上允许保存客户原始要求。

自动评分时哪些条件允许实际作为筛选规则，应由业务规则配置，不把所有客户描述无条件当硬过滤。

---

## 11.3 position_skill_requirements

```sql
CREATE TABLE position_skill_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    skill_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL DEFAULT '',

    required INTEGER NOT NULL DEFAULT 0,

    weight REAL NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_skill_position
ON position_skill_requirements(position_id);

CREATE INDEX idx_position_skill_name
ON position_skill_requirements(normalized_name);
```

---

## 11.4 position_language_requirements

```sql
CREATE TABLE position_language_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    language_name TEXT NOT NULL,
    language_level TEXT NOT NULL DEFAULT '',

    required INTEGER NOT NULL DEFAULT 0,

    weight REAL NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_language_position
ON position_language_requirements(position_id);
```

---

## 11.5 position_keywords

专门提供自动匹配召回关键词。

```sql
CREATE TABLE position_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    keyword TEXT NOT NULL,

    weight REAL NOT NULL DEFAULT 1,

    required INTEGER NOT NULL DEFAULT 0,

    source_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (source_type IN (
            'manual',
            'system'
        )),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_keywords_position
ON position_keywords(position_id);
```

---

# 12. PositionCandidate 核心关系

## 12.1 position_candidate_matches

这是整个招聘流程核心表。

```sql
CREATE TABLE position_candidate_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,

    match_source TEXT NOT NULL DEFAULT 'system'
        CHECK (match_source IN (
            'system',
            'manual',
            'import'
        )),

    match_score REAL NOT NULL DEFAULT 0,

    keyword_score REAL NOT NULL DEFAULT 0,
    skill_score REAL NOT NULL DEFAULT 0,
    experience_score REAL NOT NULL DEFAULT 0,
    education_score REAL NOT NULL DEFAULT 0,
    language_score REAL NOT NULL DEFAULT 0,
    industry_score REAL NOT NULL DEFAULT 0,
    location_score REAL NOT NULL DEFAULT 0,

    match_reason_json TEXT NOT NULL DEFAULT '{}',

    algorithm_version TEXT NOT NULL DEFAULT '',

    decision TEXT NOT NULL DEFAULT 'suggested'
        CHECK (decision IN (
            'suggested',
            'accepted',
            'dismissed'
        )),

    pipeline_stage TEXT NOT NULL DEFAULT 'matched'
        CHECK (pipeline_stage IN (
            'matched',
            'contacting',
            'interested',
            'submitted',
            'interviewing',
            'offer',
            'hired',
            'candidate_rejected',
            'client_rejected',
            'withdrawn'
        )),

    dismissed_reason TEXT NOT NULL DEFAULT '',
    manual_note TEXT NOT NULL DEFAULT '',

    first_matched_at TEXT NOT NULL,
    last_scored_at TEXT NOT NULL,
    stage_changed_at TEXT NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    UNIQUE(position_id, candidate_id)
);

CREATE INDEX idx_position_candidate_matches_position
ON position_candidate_matches(position_id);

CREATE INDEX idx_position_candidate_matches_candidate
ON position_candidate_matches(candidate_id);

CREATE INDEX idx_position_candidate_matches_decision
ON position_candidate_matches(decision);

CREATE INDEX idx_position_candidate_matches_stage
ON position_candidate_matches(pipeline_stage);

CREATE INDEX idx_position_candidate_matches_score
ON position_candidate_matches(match_score);
```

---

# 13. decision 与 pipeline_stage 必须分离

## 13.1 decision

表示人工对系统推荐的判断：

```text
suggested  系统推荐，尚未人工处理
accepted   人工确认可继续
dismissed  人工确认不匹配
```

用户点击“不匹配”：

```text
decision = dismissed
```

**不能 DELETE。**

以后算法重新运行：

```text
match_score 80 → 94
```

仍然：

```text
decision = dismissed
```

默认页面不再展示。

除非用户执行“恢复匹配”。

---

## 13.2 pipeline_stage

表示业务进展：

```text
matched
    ↓
contacting
    ↓
interested
    ↓
submitted
    ↓
interviewing
    ↓
offer
    ↓
hired
```

终止阶段：

```text
candidate_rejected
client_rejected
withdrawn
```

---

## 13.3 自动匹配不得覆盖人工状态

MatchEngine 重跑时可以修改：

```text
match_score
keyword_score
skill_score
experience_score
education_score
language_score
industry_score
location_score
match_reason_json
algorithm_version
last_scored_at
```

**不得自动修改：**

```text
decision
pipeline_stage
manual_note
dismissed_reason
```

尤其不得：

```text
dismissed → suggested
```

也不得：

```text
interviewing → matched
```

---

# 14. 招聘流程历史

## 14.1 position_candidate_stage_history

```sql
CREATE TABLE position_candidate_stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_candidate_match_id INTEGER NOT NULL,

    from_stage TEXT NOT NULL DEFAULT '',
    to_stage TEXT NOT NULL,

    reason TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',

    operator_name TEXT NOT NULL DEFAULT '',

    changed_at TEXT NOT NULL,

    FOREIGN KEY (position_candidate_match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_stage_history_match
ON position_candidate_stage_history(position_candidate_match_id);

CREATE INDEX idx_position_stage_history_time
ON position_candidate_stage_history(changed_at);
```

所有阶段变化必须写历史。

---

## 14.2 position_candidate_events

业务审计事件。

```sql
CREATE TABLE position_candidate_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_candidate_match_id INTEGER NOT NULL,

    event_type TEXT NOT NULL,
    event_data_json TEXT NOT NULL DEFAULT '{}',

    created_at TEXT NOT NULL,

    FOREIGN KEY (position_candidate_match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_candidate_events_match
ON position_candidate_events(position_candidate_match_id);
```

event_type 建议：

```text
auto_matched
manual_added
accepted
dismissed
restored
score_changed
stage_changed
communication_added
candidate_updated
position_updated
```

---

# 15. Customer 客户模块

## 15.1 customer_companies

```sql
CREATE TABLE customer_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_uuid TEXT NOT NULL UNIQUE,

    company_name TEXT NOT NULL,
    short_name TEXT NOT NULL DEFAULT '',

    industry TEXT NOT NULL DEFAULT '',
    company_size TEXT NOT NULL DEFAULT '',

    country TEXT NOT NULL DEFAULT '',
    province TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',

    website TEXT NOT NULL DEFAULT '',

    description TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN (
            'active',
            'inactive',
            'blacklisted'
        )),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_customer_companies_name
ON customer_companies(company_name);

CREATE INDEX idx_customer_companies_status
ON customer_companies(status);
```

---

## 15.2 customer_contacts

```sql
CREATE TABLE customer_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',

    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',

    is_primary INTEGER NOT NULL DEFAULT 0,

    note TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customer_companies(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_customer_contacts_customer
ON customer_contacts(customer_id);
```

---

## 15.3 customer_notes

```sql
CREATE TABLE customer_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    note_time TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'note',
    content TEXT NOT NULL,

    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customer_companies(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_customer_notes_customer
ON customer_notes(customer_id);
```

---

# 16. Customer → Position

核心关系：

```text
customer_companies.id
        ↓
position_openings.customer_id
```

因此客户详情页：

```text
ABC 科技有限公司

职位
├── 高级前端工程师   招聘中
├── Java Architect   招聘中
├── 产品经理          暂停
└── DevOps           已关闭
```

不需要额外客户职位中间表。

---

# 17. System 基础表

## 17.1 system_schema_migrations

```sql
CREATE TABLE system_schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);
```

---

## 17.2 system_settings

```sql
CREATE TABLE system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

建议设置项：

```text
match.algorithm_version
match.minimum_score
match.recall_limit
search.document_version
database.backup_enabled
```

---

## 17.3 system_jobs

用于后台任务。

```sql
CREATE TABLE system_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    job_type TEXT NOT NULL,

    entity_type TEXT NOT NULL DEFAULT '',
    entity_id INTEGER,

    payload_json TEXT NOT NULL DEFAULT '{}',

    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN (
            'queued',
            'running',
            'completed',
            'failed',
            'cancelled'
        )),

    progress_current INTEGER NOT NULL DEFAULT 0,
    progress_total INTEGER NOT NULL DEFAULT 0,

    error_message TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);

CREATE INDEX idx_system_jobs_status
ON system_jobs(status);

CREATE INDEX idx_system_jobs_type
ON system_jobs(job_type);
```

job_type：

```text
import_candidates
rebuild_candidate_raw_text
match_candidate
match_position
rebuild_all_fts
database_backup
```

---

## 17.4 system_audit_logs

```sql
CREATE TABLE system_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    entity_type TEXT NOT NULL,
    entity_id INTEGER,

    action TEXT NOT NULL,

    before_json TEXT,
    after_json TEXT,

    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL
);

CREATE INDEX idx_system_audit_entity
ON system_audit_logs(entity_type, entity_id);
```

---

# 18. 首次候选人 JSON 入库流程

历史候选人已经完成合并。

因此 Phase 1 Importer 不执行身份匹配。

## 18.1 流程

```text
扫描最终 JSON
    ↓
Schema 基本验证
    ↓
检查 record_id 是否已经导入
    ↓
BEGIN TRANSACTION
    ↓
candidate_profiles
    ↓
candidate_import_records
    ↓
candidate_resume_variants
    ↓
candidate_contacts
    ↓
candidate_expectations
    ↓
candidate_work_experiences
    ↓
candidate_educations
    ↓
candidate_projects
    ↓
candidate_trainings
    ↓
candidate_languages
    ↓
candidate_certificates
    ↓
candidate_skills
    ↓
candidate_communications
    ↓
candidate_search_documents ← 直接使用 JSON.raw_text
    ↓
COMMIT
```

FTS Trigger 自动建立索引。

---

## 18.2 Importer 幂等

使用：

```text
candidate_import_records.record_id UNIQUE
```

防止同一 JSON 重复导入。

再次扫描已经入库的 record_id：

```text
skip
```

不重复创建 Candidate。

---

## 18.3 导入统计

每次导入至少返回：

```text
scanned
validated
inserted
skipped
failed
communications
work_experiences
educations
projects
raw_text_indexed
```

失败记录必须保留错误信息，不允许静默跳过。

---

# 19. Candidate Mutation 核心实现

所有 Candidate 修改必须经过：

```text
CandidateService
```

禁止 Repository 被 Renderer 直接调用。

建议统一：

```js
mutateCandidate(candidateId, mutation)
```

伪代码：

```js
mutateCandidate(candidateId, mutation) {
  const result = this.db.transaction(() => {
    const value = mutation();

    const snapshot =
      this.candidateRepository.getFullSnapshot(candidateId);

    const rawText =
      this.rawTextBuilder.build(snapshot);

    this.searchRepository.upsertDocument(
      candidateId,
      rawText,
      'rebuilt_from_db'
    );

    return value;
  })();

  this.jobService.enqueueMatchCandidate(candidateId);

  return result;
}
```

---

## 19.1 RawText hash

建议：

```text
SHA-256(raw_text)
```

每次都必须重新 build。

build 后可以比较 hash：

```text
new_hash == old_hash
```

如果完全相同：

- 可以跳过 FTS UPDATE；
- 但仍视为已经执行全量重建检查。

---

# 20. 自动匹配总体设计

自动匹配只使用一个引擎：

```text
MatchEngine
```

不要分别写：

```text
PositionToCandidateMatcher
CandidateToPositionMatcher
```

两套算法。

两者只是调用方向不同。

---

# 21. 新增职位后的匹配

```text
保存职位
    ↓
status = open
    ↓
enqueue match_position
    ↓
Worker
    ↓
生成召回关键词
    ↓
candidate_search_fts 查询 raw_text
    ↓
召回候选人 Candidate IDs
    ↓
结构化筛选
    ↓
MatchEngine 精细评分
    ↓
UPSERT position_candidate_matches
```

---

# 22. 新增 / 更新候选人后的匹配

```text
Candidate 保存
    ↓
重建 raw_text
    ↓
FTS 更新
    ↓
enqueue match_candidate
    ↓
读取所有 status = open 的职位
    ↓
MatchEngine
    ↓
UPSERT position_candidate_matches
```

---

# 23. Position 更新后的匹配

以下字段变化必须触发重新匹配：

- title
- city
- work_location
- requirements
- skills
- languages
- experience
- education
- industry
- salary
- keywords

如果职位：

```text
status != open
```

默认不自动产生新系统推荐。

---

# 24. 职位状态

```text
draft      草稿
open       正在招聘
paused     暂停招聘
filled     已招满
closed     已关闭
cancelled  已取消
```

关闭职位：

- 不删除历史匹配；
- 不删除沟通；
- 不删除 pipeline；
- 不删除 stage history；
- 停止自动产生新推荐。

重新开启：

```text
status = open
```

后可重新运行匹配。

---

# 25. MatchEngine 第一版评分框架

第一版使用规则评分，不要直接从 AI 模型开始。

推荐总分：

```text
关键词 / 全文相关度  25
技能                 20
工作经验             15
行业 / 职能          10
语言                 10
学历                  5
地点                  5
职位层级              5
其他                  5
------------------------
总计                100
```

所有权重放配置。

不要硬编码到 UI。

---

## 25.1 MatchEngine 输出

```js
// MatchResult 数据结构
{
  score: 85.5,             // 综合匹配得分

  keywordScore: 90,        // 关键词得分
  skillScore: 80,          // 技能得分
  experienceScore: 85,     // 经验得分
  educationScore: 90,      // 学历得分
  languageScore: 80,       // 语言得分
  industryScore: 85,       // 行业得分
  locationScore: 100,      // 工作地点得分

  reasons: [],             // MatchReason[] 匹配原因明细

  algorithmVersion: '1.0'  // 算法版本号
}
```

`match_reason_json` 保存：

```json
{
  "matched": [
    "德语",
    "国际物流",
    "采购",
    "仓储管理"
  ],
  "partial": [
    "职位层级略低"
  ],
  "missing": [
    "SAP经验未发现"
  ]
}
```

---

# 26. FTS 只负责召回，不直接决定录用匹配

重要：

```text
raw_text FTS 命中
≠
最终匹配
```

例如沟通记录中：

```text
不考虑汽车行业
```

仍可能命中：

```text
汽车
```

因此：

```text
FTS
↓
召回
↓
结构化 MatchEngine
↓
最终评分
```

FTS 只是候选人召回入口。

---

# 27. “不匹配”规则

用户点击：

```text
不匹配
```

执行：

```text
decision = dismissed
```

并保存：

```text
dismissed_reason
```

页面默认：

```text
WHERE decision != 'dismissed'
```

以后职位或候选人数据更新重新评分：

```text
dismissed
```

仍然保持。

只有人工：

```text
恢复匹配
```

才：

```text
decision = suggested
```

或：

```text
accepted
```

---

# 28. 候选人加入职位流程

系统推荐：

```text
decision = suggested
pipeline_stage = matched
```

人工认可：

```text
decision = accepted
```

开始沟通：

```text
pipeline_stage = contacting
```

候选人有兴趣：

```text
pipeline_stage = interested
```

推送给客户：

```text
pipeline_stage = submitted
```

客户面试：

```text
pipeline_stage = interviewing
```

Offer：

```text
pipeline_stage = offer
```

入职：

```text
pipeline_stage = hired
```

每次变化：

```text
position_candidate_stage_history INSERT
```

---

# 29. 沟通记录与 PositionCandidate

针对某职位沟通时：

```text
candidate_communications.position_candidate_match_id
```

写对应 match ID。

于是 Candidate Detail 可以显示：

```text
2026-08-15
ABC 公司 / 欧洲物流经理
电话沟通
候选人有兴趣，期望年薪……
```

同时 Position Candidate Detail 也可以显示同一记录。

**不要复制成两份沟通数据。**

---

# 30. 前端页面规划

## 30.1 主导航

```text
Dashboard
候选人
职位
客户
后台任务
设置
```

Phase 1 只开放：

```text
候选人
后台任务
设置
```

---

# 31. Candidate 页面

## 31.1 Candidate List

展示：

```text
姓名
城市
当前公司
当前职位
最高学历
工作年限
手机号
更新时间
```

支持：

- 全文搜索；
- 城市筛选；
- 学历筛选；
- 工作年限；
- 当前公司；
- 当前职位；
- 语言；
- 候选人状态。

---

## 31.2 Candidate Detail

建议 Tabs：

```text
概览
工作经历
教育经历
项目经历
语言 / 技能
培训 / 证书
简历版本
沟通记录
关联职位
```

关联职位 Tab：

```text
公司
职位
职位状态
匹配分
decision
pipeline_stage
最后更新时间
```

---

## 31.3 Candidate Edit

任何保存操作：

```text
CandidateService mutation
↓
全量 rebuild raw_text
↓
FTS
↓
match_candidate job
```

前端不自己拼 raw_text。

---

# 32. Position 页面

## 32.1 Position List

展示：

```text
客户公司
职位
城市
人数
优先级
状态
系统推荐数
沟通中
已推送
面试
Offer
入职
```

---

## 32.2 Position Detail

Tabs：

```text
职位信息
要求
系统推荐
招聘流程
沟通记录
匹配设置
```

---

## 32.3 Position Candidate Kanban

```text
系统推荐
    ↓
沟通中
    ↓
有意向
    ↓
已推送
    ↓
面试
    ↓
Offer
    ↓
入职
```

卡片：

```text
姓名
城市
当前公司
当前职位
匹配分
核心匹配理由
```

操作：

```text
查看候选人
确认匹配
不匹配
开始沟通
推送客户
进入面试
Offer
入职
```

---

# 33. Customer 页面

## 33.1 Customer List

```text
公司名
行业
城市
联系人
招聘中职位数
历史职位数
状态
```

---

## 33.2 Customer Detail

Tabs：

```text
公司信息
联系人
职位
客户记录
```

职位：

```text
职位名称
状态
候选人数
推送人数
面试人数
Offer
入职
```

---

# 34. Electron 项目目录

建议：

```text
src/
│
├── main/
│   ├── index.js
│   │
│   ├── database/
│   │   ├── Database.js
│   │   ├── MigrationRunner.js
│   │   ├── migrations/
│   │   │   ├── 001_initial.sql
│   │   │   ├── 002_candidate_search_fts.sql
│   │   │   └── ...
│   │   │
│   │   └── repositories/
│   │       ├── CandidateRepository.js
│   │       ├── CandidateSearchRepository.js
│   │       ├── CandidateCommunicationRepository.js
│   │       ├── PositionRepository.js
│   │       ├── PositionCandidateRepository.js
│   │       ├── CustomerRepository.js
│   │       ├── JobRepository.js
│   │       └── SettingsRepository.js
│   │
│   ├── services/
│   │   ├── CandidateService.js
│   │   ├── CandidateImportService.js
│   │   ├── CandidateSearchService.js
│   │   ├── CandidateCommunicationService.js
│   │   ├── PositionService.js
│   │   ├── PositionCandidateService.js
│   │   ├── CustomerService.js
│   │   ├── MatchService.js
│   │   ├── JobService.js
│   │   └── BackupService.js
│   │
│   ├── candidate/
│   │   └── search/
│   │       ├── CandidateRawTextBuilder.js
│   │       └── CandidateRawTextNormalizer.js
│   │
│   ├── matching/
│   │   ├── MatchEngine.js
│   │   ├── MatchContext.js
│   │   ├── CandidateRecallService.js
│   │   ├── scorers/
│   │   │   ├── KeywordScorer.js
│   │   │   ├── SkillScorer.js
│   │   │   ├── ExperienceScorer.js
│   │   │   ├── EducationScorer.js
│   │   │   ├── LanguageScorer.js
│   │   │   ├── IndustryScorer.js
│   │   │   └── LocationScorer.js
│   │   └── rules/
│   │
│   ├── workers/
│   │   ├── worker.js
│   │   ├── MatchCandidateWorker.js
│   │   └── MatchPositionWorker.js
│   │
│   └── ipc/
│       ├── candidate.ipc.js
│       ├── candidateSearch.ipc.js
│       ├── communication.ipc.js
│       ├── position.ipc.js
│       ├── match.ipc.js
│       ├── customer.ipc.js
│       ├── job.ipc.js
│       └── system.ipc.js
│
├── preload/
│   ├── index.js
│   └── api/
│       ├── candidate.js
│       ├── position.js
│       ├── customer.js
│       └── system.js
│
├── renderer/
│   └── src/
│       ├── App.vue
│       ├── router/
│       ├── stores/
│       ├── components/
│       │
│       └── modules/
│           ├── dashboard/
│           ├── candidate/
│           │   ├── pages/
│           │   ├── components/
│           │   └── stores/
│           │
│           ├── position/
│           │   ├── pages/
│           │   ├── components/
│           │   └── stores/
│           │
│           ├── customer/
│           │   ├── pages/
│           │   ├── components/
│           │   └── stores/
│           │
│           └── system/
│
└── shared/
    ├── types/
    ├── dto/
    ├── enums/
    ├── constants/
    └── validation/
```

---

# 35. Repository 规则

Repository 只负责数据库读写。

示例：

```js
class CandidateRepository {
  getById(id) {}
  getFullSnapshot(id) {}
  insertProfile(input) {}
  updateProfile(id, input) {}
}
```

Repository：

**不负责：**

- raw_text 重建；
- 自动匹配；
- IPC；
- UI；
- 流程状态判断。

---

# 36. Service 规则

Service 负责业务。

例如：

```text
CandidateService
```

负责：

- 创建 Candidate；
- 修改 Candidate；
- 调用 Repository；
- 重建 raw_text；
- 写审计；
- 创建 Match Job。

---

# 37. IPC 规则

建议命名：

```text
candidate:list
candidate:get
candidate:create
candidate:update
candidate:delete
candidate:search

candidate:communication:list
candidate:communication:add
candidate:communication:update
candidate:communication:delete

position:list
position:get
position:create
position:update
position:set-status

position:candidates:list
position:candidates:dismiss
position:candidates:restore
position:candidates:set-stage

customer:list
customer:get
customer:create
customer:update

system:jobs:list
system:jobs:get
```

IPC Handler 不直接写 SQL。

---

# 38. Preload API

Renderer 使用：

```js
window.recruitment.candidate.search(...)
window.recruitment.candidate.get(...)
window.recruitment.candidate.update(...)

window.recruitment.position.create(...)
window.recruitment.position.listCandidates(...)

window.recruitment.customer.create(...)
```

不要暴露：

```js
ipcRenderer
fs
path
child_process
Database
```

给 Renderer。

---

# 39. 后台 Worker

职位匹配可能需要处理：

```text
数万 Candidate
```

因此禁止在 Main Event Loop 直接长时间循环计算。

使用：

```text
Worker Thread
```

流程：

```text
Main
↓
system_jobs
↓
Worker
↓
MatchEngine
↓
SQLite
↓
progress
↓
Renderer
```

---

# 40. Job 去重

例如 Candidate 在 3 秒内连续保存 5 次。

不要产生：

```text
5 个 match_candidate
```

建议：

```text
queued 状态下：
job_type + entity_id 唯一逻辑去重
```

只保留最后一次。

Position 同理。

---

# 41. 数据库事务边界

候选人修改：

```text
BEGIN
  update candidate_*
  rebuild raw_text
  update candidate_search_documents
  audit
COMMIT

enqueue match job
```

职位修改：

```text
BEGIN
  update position_openings
  update requirements
  update skills
  update languages
  update keywords
  audit
COMMIT

enqueue match_position
```

MatchEngine 不能参与 Candidate 编辑事务。

---

# 42. 搜索 API

建议 DTO：

```js
// CandidateSearchInput
{
  keyword: '',
  city: [],
  minDegreeRank: 0,
  minWorkYears: 0,
  maxWorkYears: 0,
  currentCompany: '',
  currentPosition: '',
  languages: [],
  candidateStatus: [],
  page: 1,
  pageSize: 20,
  sortBy: 'relevance', // 'relevance' | 'updatedAt' | 'name'
  sortDirection: 'desc'
}
```

结果：

```js
// CandidateSearchResult
{
  total: 0,
  page: 1,
  pageSize: 20,
  items: []
}
```

---

# 43. 搜索执行

有 keyword：

```text
keyword
↓
CandidateSearchService
↓
QueryParser
↓
FTS / LIKE fallback
↓
candidate IDs
↓
structured filters
↓
pagination
```

没有 keyword：

```text
candidate_profiles
↓
structured filters
↓
pagination
```

---

# 44. Candidate Detail API

一次返回：

```js
// CandidateDetail 数据结构
{
  profile: {},
  contacts: [],
  expectations: [],
  workExperiences: [],
  educations: [],
  projects: [],
  trainings: [],
  languages: [],
  certificates: [],
  skills: [],
  resumeVariants: [],
  communications: [],
  positionRelations: []
}
```

不要让前端为了一个 Candidate Detail 发 15 次 IPC。

---

# 45. Position Detail API

```js
// PositionDetail 数据结构
{
  position: {},
  requirements: {},
  skills: [],
  languages: [],
  keywords: []
}

  stageCounts: Record<PipelineStage, number>;
}
```

---

# 46. Position Candidate Query

支持：

```text
decision
pipeline_stage
minimum_score
keyword
page
pageSize
```

默认系统推荐页：

```text
decision != dismissed
```

---

# 47. 数据删除策略

第一版业务数据优先软状态，不轻易 DELETE。

## Candidate

建议：

```text
candidate_status = archived
```

而不是删 Candidate。

## Position

```text
status = closed / cancelled
```

而不是删除。

## Customer

```text
status = inactive
```

真正 DELETE 仅用于：

- 开发测试；
- 明确数据纠错；
- 用户确认永久删除。

---

# 48. 审计

以下操作建议写：

```text
system_audit_logs
```

- Candidate 修改；
- Candidate 删除 / archived；
- 沟通记录删除；
- Position 修改；
- Position 状态变化；
- Match dismiss / restore；
- Pipeline stage 变化；
- Customer 修改。

---

# 49. 备份

SQLite 本地应用必须从第一版就设计备份。

建议：

```text
每天首次启动
或
每次应用关闭前
```

创建安全备份。

目录：

```text
<userData>/
└── backups/
    ├── recruitment-2026-08-09.db
    ├── recruitment-2026-08-10.db
    └── ...
```

保留最近 N 份。

不要直接在 WAL 正在写入时使用普通文件复制作为唯一备份方案。

BackupService 应使用 SQLite 支持的安全备份方式。

---

# 50. 开发阶段规划

---

## Phase 0：项目骨架

目标：

```text
Electron 能启动
Vue 能显示
SQLite 能连接
Migration 能执行
IPC 能工作
```

任务：

- 初始化 Electron + Vue + JavaScript；
- 建立 Main / Preload / Renderer；
- 接入 better-sqlite3；
- 建立 MigrationRunner；
- 创建数据库目录；
- 建立基础 IPC；
- 开启 Electron 安全配置；
- 添加测试框架。

验收：

```text
应用启动自动创建 DB
001 migration 自动执行
Renderer 能通过 preload 调用 system:get-version
```

---

## Phase 1：候选人系统

### 1A. Database

完成：

```text
candidate_*
candidate_search_documents
candidate_search_fts
candidate_communications
system_jobs
```

### 1B. Importer

完成：

```text
最终 JSON → SQLite
```

要求：

- 幂等；
- 事务；
- 错误报告；
- 保留 original_json；
- 首次 raw_text 直接导入；
- FTS 可查询。

### 1C. Candidate UI

完成：

- Candidate List；
- Candidate Search；
- Candidate Detail；
- Resume Variant；
- Candidate Edit；
- Communication CRUD。

### 1D. RawText Rebuild

完成：

```text
修改 Candidate
↓
完整 snapshot
↓
raw_text full rebuild
↓
FTS update
```

### Phase 1 验收

必须做到：

1. 所有现有候选人可以入库；
2. 导入数量与 JSON 数量一致；
3. 重跑 Import 不重复；
4. 可以用 `raw_text` 搜候选人；
5. 中文 / 英文 / 日文 / 德文文本可以搜；
6. Candidate Detail 可以看到完整经历；
7. 可以增加一条沟通；
8. 新沟通保存后 raw_text 重新生成；
9. 删除一条工作经历后，相关文本从新 raw_text 中消失；
10. FTS 索引与 raw_text 一致。

---

## Phase 2：职位与匹配

### 2A. Position CRUD

完成：

- Position List；
- Position Create；
- Position Edit；
- Position Status；
- Position Requirements；
- Skills；
- Languages；
- Keywords。

### 2B. MatchEngine

完成：

- Position → Candidate；
- Candidate → Open Positions；
- Worker；
- Job progress；
- Match scores；
- Match reason。

### 2C. ATS Pipeline

完成：

- System Recommended；
- Accepted；
- Dismissed；
- Contacting；
- Interested；
- Submitted；
- Interviewing；
- Offer；
- Hired；
- Rejected。

### 2D. Candidate 反向 Position

Candidate Detail：

```text
关联职位
```

完整显示。

### Phase 2 验收

1. 新建 open Position 后自动出现 Candidate 推荐；
2. Candidate 新增后自动匹配 open Positions；
3. Candidate 修改后自动重新评分；
4. Position 修改后自动重新评分；
5. dismissed 候选人重跑算法后仍不出现；
6. interviewing / offer 等人工阶段不会被算法重置；
7. Candidate Detail 能看到所有关联 Position；
8. Position Detail 能看到完整 Candidate Pipeline；
9. Stage History 完整。

---

## Phase 3：客户管理

完成：

- Customer CRUD；
- Customer Contacts；
- Customer Notes；
- Customer Detail；
- Customer → Position；
- Customer Position Statistics。

### Phase 3 验收

1. 创建客户；
2. 客户下创建多个职位；
3. 客户详情显示全部职位；
4. 职位显示招聘状态；
5. 客户可以看到每个职位 Pipeline 统计；
6. Position → Candidate 全链路完整。

---

# 51. 后续 Phase 4 可扩展

不属于第一版强制范围：

- Dashboard KPI；
- 顾问工作台；
- 导出 Candidate Profile；
- 邮件模板；
- 客户推荐报告；
- 自动提醒；
- AI Job Description 解析；
- AI Match Explanation；
- Embedding / Vector Search；
- 多用户；
- 权限系统；
- 云同步；
- PostgreSQL 服务端版本。

数据库设计应允许以后扩展，但当前禁止提前把这些做复杂。

---

# 52. 测试要求

## 52.1 Repository Test

测试：

- insert；
- update；
- delete；
- transaction rollback；
- foreign key；
- indexes。

---

## 52.2 RawTextBuilder Test

至少覆盖：

```text
修改姓名
删除工作
增加语言
增加证书
增加沟通
修改沟通
删除项目
多语言 resume
空字段
重复字段
```

断言：

```text
raw_text === expected
```

---

## 52.3 FTS Test

测试：

- 英文；
- 中文；
- 德文；
- 日文；
- 3字关键词；
- 2字中文 fallback；
- 删除字段后不能继续命中旧词。

---

## 52.4 Match Test

测试：

```text
新 Position → 推荐
新 Candidate → 推荐
Candidate 更新 → score 更新
Position 更新 → score 更新
dismissed 不恢复
interviewing 不回退
closed position 不产生新推荐
reopen position 可重新匹配
```

---

# 53. 数据一致性不变量

以下条件任何时候必须成立。

### Candidate

```text
candidate_profiles.id
```

是所有候选人域数据关联主键。

### Search

每个 active Candidate：

```text
candidate_profiles.id
```

应存在：

```text
candidate_search_documents.candidate_id
```

### Match

同一个：

```text
position_id + candidate_id
```

最多只有一条：

```text
position_candidate_matches
```

### Customer

一个 Position：

```text
最多属于一个 customer
```

一个 Customer：

```text
可以拥有多个 Position
```

### raw_text

任何 Candidate mutation 后：

```text
raw_text
```

必须由当前完整 Candidate 数据重新生成。

---

# 54. Codex 开发纪律

Codex 开发时必须遵守：

1. 不重新解析历史 Word / PDF。
2. 不修改已经完成的历史 JSON。
3. 首次入库直接使用现有 `raw_text`。
4. 以后 Candidate 修改必须 full rebuild `raw_text`。
5. 不允许增量 append raw_text。
6. 不允许 Renderer 直接访问 SQLite。
7. SQL 集中在 Repository / Migration。
8. 业务逻辑集中在 Service。
9. MatchEngine 不直接操作 UI。
10. 所有后台大计算使用 Worker。
11. dismissed 不得因算法重跑自动恢复。
12. pipeline 不得因算法重跑自动回退。
13. Position 关闭不删除历史匹配。
14. Candidate / Position / Customer 业务删除优先使用状态。
15. 每次数据库结构修改必须新增 migration。
16. 不允许手工修改已发布 migration。
17. 所有关键状态变化保存历史。
18. 所有重要操作可审计。
19. 原始导入 JSON 永久保留用于追溯。
20. 不为未来多人云端场景过度设计第一版。

---

# 55. 第一批建议创建的文件

Codex 第一轮先创建：

```text
src/main/database/Database.js
src/main/database/MigrationRunner.js

src/main/database/migrations/001_initial.sql
src/main/database/migrations/002_candidate_fts.sql

src/main/database/repositories/CandidateRepository.js
src/main/database/repositories/CandidateSearchRepository.js

src/main/services/CandidateImportService.js
src/main/services/CandidateService.js
src/main/services/CandidateSearchService.js

src/main/candidate/search/CandidateRawTextBuilder.js

src/main/ipc/candidate.ipc.js
src/main/ipc/candidateSearch.ipc.js

src/preload/index.js

src/shared/types/candidate.js
src/shared/dto/candidate.js
```

第一轮不要直接写 Position UI。

---

# 56. Codex 第一阶段具体实施顺序

```text
Step 1
Electron / Vue / JS 项目骨架

Step 2
Database + Migration

Step 3
Candidate tables

Step 4
FTS

Step 5
Candidate JSON Importer

Step 6
核对候选人入库数量

Step 7
Candidate Search API

Step 8
Candidate List UI

Step 9
Candidate Detail API + UI

Step 10
Candidate Edit

Step 11
RawTextBuilder

Step 12
Candidate Communication

Step 13
Candidate 修改 → RawText 重建回归测试

Step 14
完成 Phase 1
```

Phase 1 完成后再进入 Position。

---

# 57. Codex 首次执行前的检查清单

开始写代码前确认：

- [ ] 当前最终 JSON 目录路径由用户提供或配置；
- [ ] 不把路径硬编码进业务代码；
- [ ] SQLite 文件路径使用 Electron `app.getPath('userData')`；
- [ ] `candidate_` / `position_` / `customer_` 前缀确定；
- [ ] `position` 拼写正确；
- [ ] MigrationRunner 已有；
- [ ] foreign_keys 已开启；
- [ ] WAL 已开启；
- [ ] better-sqlite3 Electron 原生模块构建链已验证；
- [ ] preload / context isolation 已启用；
- [ ] Renderer 无 Node 权限；
- [ ] 数据导入前先做数据库备份 / 新库运行；
- [ ] Importer 首次不重建历史 raw_text。

---

# 58. 最终架构图

```text
┌──────────────────────────────────────────────────────────┐
│                     Vue Renderer                         │
│ Candidate / Position / Customer / Dashboard             │
└───────────────────────────┬──────────────────────────────┘
                            │
                         Preload
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                    Electron Main                         │
│                                                          │
│  IPC                                                     │
│   ↓                                                      │
│  Services                                                │
│   ├── CandidateService                                   │
│   ├── PositionService                                    │
│   ├── CustomerService                                    │
│   ├── MatchService                                       │
│   └── JobService                                         │
│   ↓                                                      │
│  Repositories                                            │
│   ↓                                                      │
│  SQLite                                                  │
└───────────────────────────┬──────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   candidate_*          position_*          customer_*
        │                   │                   │
        │              position_candidate      │
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                    Candidate raw_text
                            │
                            ▼
                      SQLite FTS5
                            │
                            ▼
                       MatchEngine
```

---

# 59. 最终业务原则总结

这个系统有四个真正的核心对象。

## Candidate

回答：

> 这个人是谁？

保存：

- 基础信息；
- 经历；
- 教育；
- 项目；
- 技能；
- 语言；
- 证书；
- 简历版本；
- 沟通；
- raw_text。

---

## Position

回答：

> 这个职位需要什么人？

保存：

- JD；
- 地点；
- 薪资；
- 工作年限；
- 学历；
- 技能；
- 语言；
- 行业；
- 状态；
- 匹配关键词。

---

## Customer

回答：

> 谁在招聘？

保存：

- 客户公司；
- 联系人；
- 公司信息；
- 该客户拥有的所有职位。

---

## PositionCandidateMatch

回答：

> 这个候选人针对这个职位，现在发生了什么？

保存：

- 系统匹配；
- 分数；
- 原因；
- 人工是否认可；
- 是否不匹配；
- 当前 Pipeline；
- 历史 Pipeline；
- 事件；
- 沟通关联。

---

# 60. 最终必须长期保持的核心规则

```text
Candidate structured data = 当前业务真值

Candidate raw_text = 当前候选人的全文搜索派生文档

首次历史导入：
    使用现成 raw_text

以后 Candidate 任意更新：
    重新读取 Candidate 全部信息
    → FULL REBUILD raw_text
    → 更新 FTS

全文搜索：
    只搜索 raw_text

精确条件：
    搜索结构化字段

Position 创建 / 修改：
    自动匹配 Candidate

Candidate 创建 / 修改：
    自动匹配 Open Positions

人工“不匹配”：
    永久保留 dismissed 状态
    算法重跑不得恢复

招聘流程：
    独立于算法评分
    算法不得重置人工 Pipeline

Customer：
    一个客户拥有多个 Position

所有历史：
    不通过覆盖丢失
```

---

# 61. 开发开始点

Codex 接到本文件后，第一项实际开发任务是：

```text
建立 Electron + Vue + JavaScript 项目骨架
        ↓
实现 SQLite Database / MigrationRunner
        ↓
创建 001_initial.sql
        ↓
创建 002_candidate_fts.sql
        ↓
实现 Candidate JSON Importer
```

在 Candidate Phase 1 验收完成前：

**不要提前进入 Position UI 和 Customer UI。**

但是数据库第一版 Schema 可以一次包含 Candidate / Position / Customer / Match 骨架，以避免后续大规模重构。

---

**END OF DOCUMENT**
