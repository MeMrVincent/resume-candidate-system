# Candidate Recruitment System V2 - Frontend

> **Language Navigation / 语言导航 / 言語ナビゲーション**  
> **English** | [简体中文](README.ZH.md) | [日本語](README.JA.md)

Frontend application for the Candidate Recruitment System V2, built with Vue 3, Element Plus, Vue Router, vue-i18n, and Webpack 5.

---

## Features

- **Modern Single Page Application**: Powered by Vue 3 Composition API and Element Plus.
- **On-Demand Multilingual Localization (i18n)**: Supports English (default), Simplified Chinese, and Japanese, with asynchronous chunked language pack loading and reactive Element Plus locale synchronization.
- **Modular Enterprise CRM & ATS Views**:
  - Company directory, multi-contact management, and client detail profiles.
  - Candidate batch JSON importer with interactive file/directory pickers, progress tracking, and conflict warnings.
- **High-Performance Webpack 5 Architecture**: Optimized bundling with code splitting, Babel runtime transforms, and asset optimization.

---

## Directory Structure

```text
frontend/
├── build/                 # Webpack build configurations (common, dev, prod)
├── config/                # Environment configurations
├── src/
│   ├── api/               # Domain API invocation wrappers
│   ├── http/              # IPC / AJAX communication adapters
│   ├── i18n/              # vue-i18n instance and on-demand locale loader
│   │   └── locales/       # Chunked translation packs (en-us, zh-cn, ja-jp)
│   ├── pages/             # Business views (Company CRM, Candidate Importer)
│   ├── router/            # Vue Router navigation mapping & i18n guards
│   ├── App.vue            # Root component with el-config-provider
│   └── main.js            # Frontend entry point
├── static/                # Static assets (fonts, stylesheets, images)
└── package.json           # Frontend dependencies & build scripts
```

---

## Getting Started

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## AI Engineering Credits

- **Google DeepMind Antigravity**: Architecture design, full i18n implementation, trilingual documentation, and Git release operations.
- **OpenAI Codex**: Foundation data transformation, cross-language resume merging, and schema scaffolding.
- **Anthropic Claude**: System testing and verification.
