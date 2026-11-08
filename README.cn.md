# 猎头招聘管理系统 (resume-candidate-system)

[English](README.md) | **简体中文** | [日本語](README.ja.md)

本地高性能 Electron + Vue 3 + Webpack 5 + SQLite (`better-sqlite3`) 猎头 CRM / ATS（候选人与招聘管理）桌面应用。

---

## 核心特性

- **纯本地离线运行**：数据完全持久化于本地 SQLite 数据库（启用 WAL 模式、外键约束、busy timeout 与 NORMAL synchronous），安全可控，整目录可拷贝迁移。
- **全界面国际化支持 (i18n)**：全系统开箱即用支持英语（默认）、简体中文、日语三语实时切换，界面文本、表单标签与 Element Plus 组件语言全链路同步。
- **百万级/万级毫秒全文检索**：内置 SQLite FTS5 全文搜索与双字符降级机制，支持多语言、多版本简历内容的快速定位与结构化精确多维过滤。
- **现代化组件化交互**：基于 Vue 3 + Element Plus 构建，候选人详情抽屉涵盖基础信息、工作经历、教育背景、技能专长、语言能力、项目经历、培训记录与跨语言沟通跟进等独立更新组件。
- **多语言简历独立管理**：候选人主档默认展示中文版本，外文简历（英/日/德等）独立维护，跨语言跟进记录共享，不互相覆盖。
- **一键 JSON 批处理导入**：与简历解析系统（`resume-parsing-system`）完全打通，提供带完整性校验、原子事务与 FTS 重建的批量导入工具。

---

## 技术架构与分层

```text
Vue 3 渲染进程 (Renderer Process)
  ├── frontend/src/pages/candidate/tabs/ (独立 Tab 组件)
  ├── frontend/src/api/candidateApi.js (领域 API 模块)
  └── frontend/src/electron/ajax.js (受控 Preload 调用)
          │
          ▼
Electron IPC 通信管道 (contextIsolation: true, nodeIntegration: false)
  └── electron/preload.js (受控 window.electronApi.<domain> 桥接)
          │
          ▼
Electron 主进程 (Main Process)
  ├── electron/src/ipc/*.ipc.js (IPC 路由与入参校验)
  ├── electron/src/services/ (业务逻辑层: CandidateService, CandidateSearchService)
  ├── electron/src/database/repositories/ (数据访问层: CandidateRepository, CandidateSearchRepository)
  ├── electron/src/database/MigrationRunner.js (自动化增量数据库迁移 001~007)
  └── better-sqlite3 (本地 SQLite 3 引擎 + FTS5)
```

业务域名称规范：
- `candidate`：候选人业务域，对应 `candidate_*` 表。
- `position`：职位需求域，对应 `position_*` 表。
- `company`：客户与用人单位域，对应 `company_*` 表。

API 方法命名统一遵循“业务对象在前、动作在后”，例如 `candidatesSearch`、`candidateGet`、`candidateUpdate`。

---

## 目录结构

```text
resume-candidate-system/
├── data/                                # 本地数据库与模板
│   ├── recruitment.db.example           # 空白数据库初始化模板（Git 追踪）
│   └── recruitment.db                   # 本地运行数据库（自动生成，Git 忽略）
├── electron/                            # Electron 主进程
│   ├── main.js                          # 应用程序入口与主窗口管理
│   ├── preload.js                       # IPC 安全桥接与 Preload API
│   ├── src/
│   │   ├── database/                    # SQLite 连接管理、路径解析与迁移 (001~007)
│   │   ├── ipc/                         # IPC 消息通道注册
│   │   ├── services/                    # 业务服务层
│   │   ├── repositories/                # 数据仓储层
│   │   └── import_runner.js             # 简历 JSON 批量入库运行器
│   └── test/                            # 自动化测试套件 (Node.js 原生测试引擎)
├── frontend/                            # Vue 3 渲染进程
│   ├── build/                           # Webpack 5 构建配置 (dev / prod)
│   ├── src/                             # 前端源码 (Vue 3, Element Plus, Vue Router, Vue I18n)
│   │   ├── api/                         # 领域接口模块
│   │   ├── electron/                    # Electron IPC 封装
│   │   └── pages/candidate/             # 候选人列表与详情抽屉 Tabs
│   └── static/                          # 静态资源与样式字体
├── recruitment_system_development_plan.md # 详细设计规范与数据字典文档
├── LICENSE                              # MIT 许可证
├── README.md                            # 英文说明文档 (默认)
├── README.cn.md                         # 中文说明文档
└── README.ja.md                         # 日文说明文档
```

---

## 快速上手与运行

### 1. 环境要求
- **Node.js**: >= 20.0.0 (推荐 Node.js 22/24 LTS)
- **Windows OS**: 推荐 Windows 10 / 11

### 2. 依赖安装

```powershell
# 1. 安装前端依赖
cd frontend
npm install

# 2. 安装 Electron 与 better-sqlite3 依赖
cd ..\electron
npm install
```

### 3. 开发运行

```powershell
# 方式 A: 联合启动（推荐开发时使用）
# 终端 1 启动前端开发热重载服务:
cd frontend
npm run dev

# 终端 2 启动 Electron 桌面应用:
cd electron
npm run dev
```

> **提示**：如果前端尚未启动开发服务器，也可以先在 `frontend` 目录下执行 `npm run build`，Electron 主进程会自动加载 `frontend/dist/index.html` 离线运行。

### 4. 自动化测试

```powershell
cd electron

# 运行全套数据库迁移、FTS5 全文索引、事务原子性与服务层单元测试
npm test

# 运行 Electron 原生运行时与 better-sqlite3 C++ 驱动冒烟测试
npm run test:electron
```

---

## 数据导入 (从解析系统)

从简历解析系统（`resume-parsing-system`）生成的统一标准 JSON 目录，直接导入到本地 SQLite 数据库并自动构建 FTS5 全文索引：

```powershell
cd electron
npm run import:candidates -- --source=..\resume-parsing-system\output\merge-v3\latest\formal --db=..\data\recruitment.db --fresh
```

- `--fresh`：先在临时库完成数量核对、幂等验证、FTS5 索引构建与外键完整性校验，全部通过后原子替换目标库，保障生产数据安全。

---

## 打包发布

```powershell
# 1. 构建前端生产资源
cd frontend
npm run build

# 2. 构建 Electron 桌面安装包与免安装便携版
cd ..\electron
npm run dist:dir  # 生成未打包的免安装目录（便于本地验证）
npm run dist      # 生成完整 NSIS 安装程序与 Portable 便携版
```

---

## AI 协同开发说明

本项目全链路代码、业务逻辑、数据库设计与桌面端工程化均由 AI 协同完成：

- **Google Antigravity**：负责整体系统架构设计、第一版基础代码编写、Electron 43 与 Vue 3 解耦重构、better-sqlite3 WAL/FTS5 引擎深度调优、自动化测试套件编写以及最终版本代码整理与 Git 项目规范管理。
- **OpenAI Codex**：协助完成 V1 阶段数据模型定义、基础实体字段映射与原型页面规范。
- **Anthropic Claude**：协助设计跨语言候选人数据对齐规范与多语言简历隔离持久化机制。

---

## 许可证 (License)

本项目采用 [MIT License](LICENSE) 开源。
