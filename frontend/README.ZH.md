# 猎头招聘系统前端 (recruitment-system-frontend)

[English](README.md) | **简体中文** | [日本語](README.JA.md)

猎头招聘管理系统的渲染进程前端项目，基于 Vue 3 + Element Plus + Webpack 5 + JavaScript 构建。

---

## 核心特性

- **Vue 3 + Composition API**：模块化、高性能的前端界面架构。
- **全界面国际化支持 (i18n)**：原生支持英语（默认）、简体中文、日语三语无缝实时切换，与 Element Plus 语言包联动。
- **Element Plus 组件库**：专业高效的猎头 CRM 交互体验。
- **解耦的候选人详情抽屉**：抽屉内包含独立更新的基础信息、求职意向、工作经历、教育背景、项目经历、培训记录、专业技能、语言能力、证书记录与跨语言沟通跟进等 10+ 独立 Tabs。
- **安全的 Electron IPC 客户端**：通过领域 API (`candidateApi.js`) 与受控的 Preload 桥接 (`window.electronApi.candidate`) 与主进程通信，无冗余全局 Store 污染。
- **Webpack 5 深度优化**：多模块代码分包、持久化缓存与 Gzip 压缩支持。

---

## 目录结构

```text
frontend/
├── build/                           # Webpack 5 构建配置 (dev.js, prod.js)
├── src/
│   ├── api/                         # 业务领域 API 模块 (candidateApi.js)
│   ├── electron/                    # Electron IPC AJAX 封装
│   ├── i18n/                        # 多语言国际化配置与字典
│   ├── pages/
│   │   ├── candidate/               # 候选人管理业务页面
│   │   │   ├── CandidateList.vue    # 候选人检索与列表视图
│   │   │   ├── CandidateDetailDrawer.vue # 候选人滑出抽屉
│   │   │   └── tabs/                # 独立详情 Tabs 组件
│   │   ├── dashboard/               # 仪表盘页面
│   │   └── layout/                  # 主外壳布局与导航
│   ├── router/                      # Vue Router 路由配置
│   ├── index.html                   # HTML 入口模板
│   └── main.js                      # 前端应用入口
└── static/                          # 静态图片、样式与字体
```

---

## 常用命令

```powershell
# 安装依赖
npm install

# 启动本地开发服务 (http://localhost:9000)
npm run dev

# 编译生产资源到 dist/ 目录
npm run build

# 打包体积分析
npm run analyzer

# 代码美化与校验修复
npm run format:prettier
npm run lint-fix
```
