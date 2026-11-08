# 猎头招聘管理系统 V2 - 前端项目

> **语言导航 / Language Navigation / 言語ナビゲーション**  
> [English](README.md) | **简体中文** | [日本語](README.JA.md)

基于 Vue 3 + Element Plus + Webpack 5 + JavaScript 构建的猎头招聘管理系统 V2 前端工程。

---

## 核心特性

- **现代单页面应用**: 基于 Vue 3 Composition API 与 Element Plus 组件库。
- **按需多语言国际化 (i18n)**: 支持英文（默认）、简体中文、日文，采用分块异步加载语言包，并与 Element Plus 语言动态响应同步。
- **模块化企业级 CRM 与 ATS 视图**:
  - 客户企业库管理、多联系人维护及企业详情档案。
  - 候选人批量 JSON 导入器，支持可视化文件/文件夹选择、进度跟踪及联系方式冲突提示。
- **高性能 Webpack 5 架构**: 具备代码分割（Code Splitting）、Babel 运行时转换与静态资源极致压缩。

---

## 目录结构

```text
frontend/
├── build/                 # Webpack 构建脚本 (common, dev, prod)
├── config/                # 环境配置
├── src/
│   ├── api/               # 领域 API 调用层
│   ├── http/              # IPC / AJAX 通信适配层
│   ├── i18n/              # vue-i18n 实例与按需语言包加载器
│   │   └── locales/       # 分块语言包 (en-us, zh-cn, ja-jp)
│   ├── pages/             # 业务视图 (Company 客户管理, Candidate 导入器)
│   ├── router/            # Vue Router 路由映射与 i18n 路由守卫
│   ├── App.vue            # 根组件 (包裹 el-config-provider)
│   └── main.js            # 前端入口
├── static/                # 静态资源 (字体, 样式, 图片)
└── package.json           # 前端依赖配置与构建指令
```

---

## 快速上手

```bash
# 进入前端工程目录
cd frontend

# 安装依赖
npm install

# 启动本地开发服务
npm run dev

# 构建生产版本
npm run build
```

---

## AI 研发贡献致谢

- **Google DeepMind Antigravity**: 架构设计、全量 i18n 国际化落地、三语技术文档编撰及打包配置补充。
- **OpenAI Codex**: 基础数据转换、跨语言合并及初始脚手架设计。
- **Anthropic Claude**: 系统测试与功能验证。
