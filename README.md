# 猎头招聘管理系统 (Recruitment System)

基于 **Electron + Vue 3 + Webpack 5 + JavaScript + SQLite** 的本地桌面端猎头 CRM / ATS 招聘管理系统。

## 📁 目录架构说明

```text
code/
├── electron/                                # Electron 桌面端主进程项目
│   ├── main.js                              # Electron 主进程入口 (SQLite / Window / IPC)
│   ├── preload.js                           # Preload 受控 API 桥接层
│   └── package.json                         # Electron 主进程依赖配置
│
├── frontend/                                # Vue 3 + Webpack 5 前端渲染层项目
│   ├── build/                               # Webpack 5 构建配置 (dev, prod, common, builder)
│   ├── config/                              # 环境与服务配置文件
│   ├── src/                                 # 前端应用源码 (Vue 3, Router, Pinia, Element Plus, i18n, Stores, Utils)
│   ├── static/                              # 静态资源
│   └── package.json                         # 前端项目依赖配置 (已升级至最新，无 Web3 包)
│
├── recruitment_system_development_plan.md   # 系统详细开发规划与数据库设计权威说明
├── .gitignore                               # Git 忽略规则
└── README.md                                # 项目说明文档
```

## 🛠️ 技术栈

- **Desktop Host**: Electron, Node.js, SQLite (`better-sqlite3`)
- **Frontend Stack**: Vue 3 (Composition API), Webpack 5, Vue Router, Pinia, Element Plus, Axios, i18n
- **Language**: JavaScript (ES6+)
