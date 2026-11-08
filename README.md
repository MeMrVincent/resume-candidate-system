# Headhunting & Recruitment Candidate Management System

> **Language Navigation / 语言导航 / 言語ナビゲーション**  
> **English** | [简体中文](README.cn.md) | [日本語](README.ja.md)

---

> **Branch & Version Architecture Notice / 分支与版本演进说明 / ブランチおよびバージョン構成のご案内**  
> 
> The codebase, documentation, and releases of this project are managed across dedicated version branches.  
> 本项目的各版本完整业务代码、技术规格与发布包均通过独立版本分支进行管理。  
> 本プロジェクトの各バージョンの完全なソースコード、技術仕様書、およびリリース成果物は、独立したバージョンブランチにて管理されています。

---

## 📌 Version Overview & Branch Navigation

| Version | Branch | Status | Key Features | Technical Specifications |
| :--- | :--- | :--- | :--- | :--- |
| **V1.0** | [`V1`](https://github.com/MeMrVincent/resume-candidate-system/tree/V1) | Archived | 9,860 JSON resumes ingestion, cross-language resume merging, SQLite FTS5 search, 10-tab candidate drawer | [EN](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.md) \| [CN](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.cn.md) \| [JA](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.ja.md) |
| **V2.0** | [`V2`](https://github.com/MeMrVincent/resume-candidate-system/tree/V2) | **Latest Stable** | Client Company CRM, Job Openings, Decoupled ATS Pipeline (Interviews/Placements/Guarantees), 3 Real-time Analytical Views, Strict Mode Conflict Prevention, Route-based chunked i18n, Electron-builder standalone desktop packaging | [EN](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.md) \| [CN](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.cn.md) \| [JA](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.ja.md) |
| **V3.0** | `V3` *(Upcoming)* | In Planning | Deep AI semantic vector matching, automated recruitment workflow engine, calendar interview scheduling integration, multi-dimensional talent analytics | *Roadmap announced below* |

---

## 🚀 Branch Quick Links

- **V2 Branch (Latest Active Production)**:  
  👉 [https://github.com/MeMrVincent/resume-candidate-system/tree/V2](https://github.com/MeMrVincent/resume-candidate-system/tree/V2)
- **V1 Branch (Foundation Prototype Archive)**:  
  👉 [https://github.com/MeMrVincent/resume-candidate-system/tree/V1](https://github.com/MeMrVincent/resume-candidate-system/tree/V1)

---

## 🛠️ Clone & Branch Checkout Guide

```bash
# 1. Clone the repository
git clone https://github.com/MeMrVincent/resume-candidate-system.git
cd resume-candidate-system

# 2. Switch to V2 (Latest enterprise edition)
git checkout V2

# 3. Switch to V1 (Baseline prototype edition)
git checkout V1
```

---

## 🔮 Upcoming Milestone: Version 3.0 (V3) Roadmap

Following the complete delivery of Version 2.0 (Client CRM, Job Openings, full ATS lifecycle, strict conflict management, and desktop offline packaging), we are now embarking on **Version 3.0 (V3) development**:

1. **AI-Powered Semantic & Vector Matching (AI Matching Engine)**:
   - Introduce vector embeddings alongside FTS5 trigram full-text search for deep semantic candidate-to-position matching and automated recommendation scoring.
2. **Automated Recruitment Workflow & Scheduling (ATS Automation)**:
   - Automated candidate communication workflows, dynamic interview invitation generation, and calendar integration (Google Calendar, Outlook, iCal).
3. **Advanced Talent Analytics & Recruiter Performance (Insights & Analytics)**:
   - Full-funnel recruitment analytics, placement conversion rates, compensation benchmark trends, and recruiter productivity dashboards.
4. **Engine Optimization & Multi-Platform Enhancements**:
   - High-throughput indexing optimized for 100,000+ candidate profiles with sub-50ms query response times.

---

## 🤝 AI Engineering Credits & Acknowledgements

- **Google DeepMind Antigravity**: Full-stack architecture, DDD domain migration refactoring, dynamic route-based i18n engine, trilingual documentation, and automated Git delivery.
- **OpenAI Codex**: Foundation data transformation, cross-language resume merging, schema scaffolding, and test harness setup.
- **Anthropic Claude**: System testing, verification, and boundary condition auditing.
