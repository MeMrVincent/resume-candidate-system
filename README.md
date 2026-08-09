# 猎头招聘管理系统 (Recruitment System)

基于 Electron + Vue 3 + TypeScript + SQLite 的本地桌面端猎头 CRM / ATS 招聘管理系统。

## 🛠️ 技术栈

- **Desktop Framework**: Electron, Node.js
- **Frontend Framework**: Vue 3 (Composition API), Vite, Vue Router, Pinia
- **Language**: TypeScript
- **Database**: SQLite (via `better-sqlite3`), FTS5 全文搜索

## 📋 架构规划

- **架构模式**: 独立进程架构 (Main Process 持有 SQLite，Renderer 通过受控 IPC 调用 Service/Repository 访问数据)
- **开发规划参考**: 详见 [recruitment_system_development_plan.md](./recruitment_system_development_plan.md)

## 📁 目录结构

```text
code/
├── recruitment_system_development_plan.md  # 详细系统开发规划与数据库设计文档
├── .gitignore                              # Git 忽略配置
└── README.md                               # 项目说明
```
