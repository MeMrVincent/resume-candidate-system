# Headhunting & Recruitment Management System V2 (resume-candidate-system-v2)

> **Language Navigation / 语言导航 / 言語ナビゲーション**  
> **English** | [简体中文](README.cn.md) | [日本語](README.ja.md)

An enterprise-grade, offline-first local recruitment CRM & ATS (Applicant Tracking System) desktop platform for executive search and headhunting agencies, engineered with Electron, Vue 3, Element Plus, Webpack 5, and SQLite (`better-sqlite3`).

---

## What's New in Version 2.0.0

- **Client Company CRM Subsystem**: Full enterprise directory with company scale, industry classifications, multiple hiring manager contacts, and cascading lifecycle controls (safeguarding active openings with soft-deletion).
- **Position & Candidate Match Flow**: Decoupled matching decision engine (`pending`, `system_recommended`, `accepted`, `dismissed`) and recruitment pipeline stages (`sourced`, `contacted`, `submitted`, `client_interview`, `offer`, `onboarded`, `archived`).
- **Enhanced Candidate Import Engine**: High-performance batch JSON importer featuring interactive folder/file dialogs, content-hash deduplication, strict conflict detection, and multilingual alignment warning telemetry.
- **Advanced Full-Text Search (FTS5) & Trigram Tokenizer**: High-speed keyword discovery across Chinese, English, and Japanese CVs alongside rich structured SQL analytical views (`005_search_views.sql`).
- **Comprehensive Electron Builder Packaging**: Native packaging pipeline for Windows (`nsis` installer, `portable` binary, and `unpacked` standalone directory) with automatic read-only seed bootstrapping.
- **Robust Automated Test Suite**: 24/24 backend unit and integration test coverage verifying database migrations, transactional invariants, and IPC contracts.

---

## Core Technical Architecture

```text
Vue 3 Renderer Process (Frontend)
  ├── frontend/src/pages/company/ (Company CRM: list, detail, contact, edit)
  ├── frontend/src/pages/candidate/ (Candidate Import Subsystem)
  ├── frontend/src/pages/layout/ (Responsive Layout & Language Switcher)
  ├── frontend/src/i18n/ (vue-i18n with on-demand chunked locale loading)
  └── frontend/src/http/ajax.js (Controlled IPC Invoker)
          │
          ▼
Electron IPC Bridge (contextIsolation: true, nodeIntegration: false)
  └── electron/preload.js (Secure window.electronApi.<domain> namespace)
          │
          ▼
Electron Main Process (Backend)
  ├── electron/src/ipc/*.ipc.js (company.ipc, candidate.ipc, system.ipc)
  ├── electron/src/services/ (CompanyService, CandidateImportService, SystemService)
  ├── electron/src/database/ (SqliteDatabase, DatabasePath, MigrationRunner)
  └── electron/src/database/migrations/ (001_system to 005_search_views)
          │
          ▼
Embedded SQLite Database (better-sqlite3)
  ├── data/recruitment.db (Portable, WAL mode, foreign keys enabled)
  └── candidate_search_fts (FTS5 virtual table with trigram tokenizer)
```

---

## Packaging and Build Instructions

### Prerequisites
- Node.js 18+ or 20+
- Windows OS (x64)

### Development Mode

```bash
# Terminal 1: Start Frontend Dev Server
cd frontend
npm run dev

# Terminal 2: Start Electron Application
cd electron
npm run dev
```

### Production Build & Packaging

```bash
# 1. Build Frontend Static Assets (Webpack 5)
cd frontend
npm run build

# 2. Package Electron Application into Portable/Unpacked Directory
cd electron
npm run dist:dir

# 3. Create Windows Installer (NSIS Setup & Portable Exe)
npm run dist
```

Outputs are generated in `release/win-unpacked/` and `release/`.

### Automated Testing

```bash
# Run 24/24 Automated Test Suite
cd electron
npm test

# Run Native Electron Smoke Test
npm run test:electron
```

---

## AI Engineering Credits

- **Google DeepMind Antigravity**: System architecture, dependency modernizations, electron packaging infrastructure, full i18n implementation, trilingual documentation, and test verification.
- **OpenAI Codex**: Foundation data transformations, multilingual schema design, and candidate parser migrations.
- **Anthropic Claude**: System testing and verification.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
