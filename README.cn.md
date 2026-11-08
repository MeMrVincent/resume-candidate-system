# 猎头招聘管理系统 V2 (resume-candidate-system-v2)

> **语言导航 / Language Navigation / 言語ナビゲーション**  
> [English](README.md) | **简体中文** | [日本語](README.ja.md)

专为猎头机构与中高端人才招聘团队打造的企业级本地离线招聘 CRM + ATS（申请人跟踪系统）桌面端软件，基于 Electron、Vue 3、Element Plus、Webpack 5 与 SQLite (`better-sqlite3`) 构建。

---

## V2.0.0 新特性

- **企业客户管理（Company CRM）子系统**: 完整的客户企业目录管理，包含企业规模、所属行业、多联系人维护及联动级联保护机制（若企业名下存在活跃招聘职位，自动阻止硬删除并转为软归档）。
- **职位与候选人匹配流转（ATS Match Flow）**: 判定状态（`pending`、`system_recommended`、`accepted`、`dismissed`）与招聘流程状态（`sourced`、`contacted`、`submitted`、`client_interview`、`offer`、`onboarded`、`archived`）严格解耦，人工作出决策后自动匹配算法绝不擅自覆盖。
- **高阶候选人导入引擎**: 支持可视化文件及目录选择的高性能批量 JSON 导入器，具备文件 Hash 去重、严格冲突检测模式及跨语言简历对齐异常告警报告。
- **高级全文检索 (FTS5) 与多语言 Trigram 分词**: 支持中英日三语极速关键字模糊搜索，搭配 `005_search_views.sql` 结构化聚合分析视图。
- **完善的 Electron 客户端打包工程**: 完整的 Windows 原生打包工具链（支持 `nsis` 安装程序、`portable` 免安装便携版及 `unpacked` 绿色目录），自动挂载只读数据库种子并首次自举。
- **完备的自动化测试体系**: 覆盖数据库多版本迁移、数据一致性不变量与 IPC 协议的 24/24 全量自动化测试用例。

---

## 核心技术架构

```text
Vue 3 渲染进程（前端）
  ├── frontend/src/pages/company/ (客户企业 CRM: 列表、详情、联系人、编辑)
  ├── frontend/src/pages/candidate/ (候选人批量导入管理)
  ├── frontend/src/pages/layout/ (自适应布局与语言切换下拉框)
  ├── frontend/src/i18n/ (vue-i18n 按需分块语言包加载)
  └── frontend/src/http/ajax.js (受控 IPC 通信调用器)
          │
          ▼
Electron IPC 安全通信桥 (contextIsolation: true, nodeIntegration: false)
  └── electron/preload.js (受限 window.electronApi.<domain> 命名空间)
          │
          ▼
Electron 主进程（后端服务）
  ├── electron/src/ipc/*.ipc.js (company.ipc, candidate.ipc, system.ipc)
  ├── electron/src/services/ (CompanyService, CandidateImportService, SystemService)
  ├── electron/src/database/ (SqliteDatabase, DatabasePath, MigrationRunner)
  └── electron/src/database/migrations/ (001_system 至 005_search_views)
          │
          ▼
嵌入式 SQLite 本地数据库 (better-sqlite3)
  ├── data/recruitment.db (便携式存储、WAL 模式、强制外键约束)
  └── candidate_search_fts (FTS5 虚拟表 + Trigram 模糊检索)
```

---

## 打包构建与运行指南

### 环境准备
- Node.js 18+ 或 20+
- Windows 操作系统 (x64)

### 开发模式运行

```bash
# 窗口 1: 启动前端开发调试服务器
cd frontend
npm run dev

# 窗口 2: 启动 Electron 桌面应用
cd electron
npm run dev
```

### 生产构建与打包发布

```bash
# 1. 编译前端生产静态资源 (Webpack 5)
cd frontend
npm run build

# 2. 打包生成免安装绿色目录 (Unpacked Directory)
cd electron
npm run dist:dir

# 3. 构建 Windows 安装包 (NSIS 安装包与便携版 Exe)
npm run dist
```

打包生成的文件位于 `release/win-unpacked/` 与 `release/` 目录。

### 自动化测试

```bash
# 运行后端 24 项全量测试套件
cd electron
npm test

# 运行 Electron Native Smoke 运行时冒烟测试
npm run test:electron
```

---

## AI 研发贡献致谢

- **Google DeepMind Antigravity**: 总体架构设计、依赖升级优化、Electron 打包基础设施补全、全流程 i18n 国际化、三语文档编撰及测试验证。
- **OpenAI Codex**: 基础数据清洗与转换、多语言数据模型构建及解析器底层逻辑。
- **Anthropic Claude**: 系统测试套件建设与功能验收。

---

## 开源协议

MIT License。详见 [LICENSE](LICENSE) 文件。
