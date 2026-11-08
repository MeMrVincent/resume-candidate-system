# Candidate Recruitment System (resume-candidate-system)

**English** | [简体中文](README.cn.md) | [日本語](README.ja.md)

A high-performance, local offline desktop CRM / ATS (Applicant Tracking System) for recruitment agencies, built with Electron, Vue 3, Webpack 5, and SQLite (`better-sqlite3`).

---

## Key Features

- **100% Local & Offline**: All candidate and recruitment data persists locally in a SQLite database (with WAL mode, foreign key enforcement, busy timeout, and NORMAL synchronous settings). The entire application directory can be copied and migrated across drives without data loss.
- **Full Internationalization (i18n)**: Out-of-the-box trilingual UI localization (English default, Simplified Chinese, Japanese) with instant language switching and synchronized Element Plus locale across all modules.
- **Sub-Millisecond Full-Text Search**: Embedded SQLite FTS5 search engine with bigram/character fallback, supporting fast text discovery across multi-version and multilingual CV contents alongside structured precision filtering.
- **Modern Modular Component Design**: Built with Vue 3 and Element Plus. Candidate details drawer features decoupled tabs for profile, work experience, education, skills, languages, projects, training, and cross-language communication logs.
- **Multilingual Candidate CV Management**: Chinese primary version is displayed by default, while foreign language CVs (English, Japanese, German, etc.) are managed independently without overwriting each other. Follow-up communication records are shared across languages.
- **One-Click JSON Batch Importer**: Seamlessly integrates with the companion parsing system (`resume-parsing-system`), featuring schema validation, atomic transactions, idempotency checks, and automatic FTS5 index rebuilding.

---

## Architecture & Layering

```text
Vue 3 Renderer Process
  ├── frontend/src/pages/candidate/tabs/ (Independent Tab Components)
  ├── frontend/src/api/candidateApi.js (Domain API Layer)
  └── frontend/src/electron/ajax.js (Controlled Preload Invoker)
          │
          ▼
Electron IPC Channel (contextIsolation: true, nodeIntegration: false)
  └── electron/preload.js (Controlled window.electronApi.<domain> Bridge)
          │
          ▼
Electron Main Process
  ├── electron/src/ipc/*.ipc.js (IPC Routes & Parameter Validation)
  ├── electron/src/services/ (Business Logic: CandidateService, CandidateSearchService)
  ├── electron/src/database/repositories/ (Data Access: CandidateRepository, CandidateSearchRepository)
  ├── electron/src/database/MigrationRunner.js (Automated Incremental Migrations 001~007)
  └── better-sqlite3 (Native SQLite 3 Engine + FTS5)
```

Domain naming conventions:
- `candidate`: Candidate business domain (`candidate_*` tables).
- `position`: Job opening & requirements domain (`position_*` tables).
- `company`: Client company domain (`company_*` tables).

API methods strictly follow the "Entity before Action" convention (e.g., `candidatesSearch`, `candidateGet`, `candidateUpdate`).

---

## Directory Layout

```text
resume-candidate-system/
├── data/                                # Local database & templates
│   ├── recruitment.db.example           # Empty schema template (tracked by Git)
│   └── recruitment.db                   # Active database (auto-generated, git-ignored)
├── electron/                            # Electron main process
│   ├── main.js                          # Application entry point & window manager
│   ├── preload.js                       # Secure IPC preload bridge
│   ├── src/
│   │   ├── database/                    # SQLite connection, path resolution & migrations (001~007)
│   │   ├── ipc/                         # IPC channel registrations
│   │   ├── services/                    # Business services
│   │   ├── repositories/                # Data repositories
│   │   └── import_runner.js             # Batch candidate JSON import runner
│   └── test/                            # Automated test suite (Native Node.js test runner)
├── frontend/                            # Vue 3 renderer process
│   ├── build/                           # Webpack 5 configurations (dev / prod)
│   ├── src/                             # Frontend source (Vue 3, Element Plus, Vue Router, Vue I18n)
│   │   ├── api/                         # Domain API modules
│   │   ├── electron/                    # Electron IPC client wrapper
│   │   └── pages/candidate/             # Candidate list & detail drawer tabs
│   └── static/                          # Static assets, fonts, and styles
├── recruitment_system_development_plan.md # In-depth technical specifications & schema dictionary
├── LICENSE                              # MIT License
├── README.md                            # English documentation (default)
├── README.cn.md                         # Simplified Chinese documentation
└── README.ja.md                         # Japanese documentation
```

---

## Quick Start & Development

### 1. Prerequisites
- **Node.js**: >= 20.0.0 (Node.js 22/24 LTS recommended)
- **Windows OS**: Windows 10 / 11 recommended

### 2. Dependency Installation

```powershell
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Install Electron and better-sqlite3 dependencies
cd ..\electron
npm install
```

### 3. Development Workflow

```powershell
# Mode A: Dual-process development (Recommended)
# Terminal 1 - start frontend hot-reload dev server:
cd frontend
npm run dev

# Terminal 2 - start Electron desktop shell:
cd electron
npm run dev
```

> **Tip**: If the frontend dev server is not started, you can run `npm run build` in the `frontend` directory first; the Electron main process will automatically load `frontend/dist/index.html` in offline mode.

### 4. Automated Testing

```powershell
cd electron

# Run full test suite: migrations, FTS5 index, transaction atomicity & services
npm test

# Run native Electron runtime smoke tests
npm run test:electron
```

---

## Data Import (From Parsing System)

To import candidate JSON files produced by `resume-parsing-system` directly into SQLite and automatically construct FTS5 full-text search indexes:

```powershell
cd electron
npm run import:candidates -- --source=..\resume-parsing-system\output\merge-v3\latest\formal --db=..\data\recruitment.db --fresh
```

- `--fresh`: Validates candidate counts, verifies idempotency, constructs FTS5 indexes, and checks foreign key integrity in a temporary database first before atomically replacing the destination database.

---

## Production Packaging

```powershell
# 1. Build frontend distribution assets
cd frontend
npm run build

# 2. Package Electron desktop application
cd ..\electron
npm run dist:dir  # Unpacked directory for local smoke verification
npm run dist      # NSIS installer and standalone portable executable
```

---

## AI-Driven Development

All code, architectural design, database schemas, and engineering implementations in this project were created through AI collaboration:

- **Google Antigravity**: Architected the core system, wrote the foundational codebase, refactored Electron 43 and Vue 3 decoupling, tuned the `better-sqlite3` WAL/FTS5 database engine, developed comprehensive automated test suites, and managed code clean-up and Git repository standards.
- **OpenAI Codex**: Assisted in the V1 data model definitions, initial entity mappings, and prototype views.
- **Anthropic Claude**: Collaborated on the cross-language data alignment specifications and multilingual CV isolation designs.

---

## License

This project is licensed under the [MIT License](LICENSE).
