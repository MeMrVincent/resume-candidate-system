# Recruitment System Frontend (recruitment-system-frontend)

**English** | [简体中文](README.ZH.md) | [日本語](README.JA.md)

Frontend renderer process for the Recruitment Management System, built with Vue 3, Element Plus, Webpack 5, and JavaScript.

---

## Features

- **Vue 3 + Composition API**: Modular and performant UI architecture.
- **Full Internationalization (i18n)**: Built-in trilingual UI localization (English default, Simplified Chinese, Japanese) with runtime switching via Vue I18n and Element Plus locale synchronization.
- **Element Plus UI Toolkit**: Clean recruitment CRM layout and components.
- **Decoupled Candidate Detail Drawer**: Multi-tab interface for Candidate Profiles, Expectations, Work Experiences, Education, Projects, Training, Skills, Languages, Certificates, and Communication Notes.
- **Secure Electron IPC Client**: Domain-specific API calls (`candidateApi.js`) interacting with the Electron main process via isolated Preload bridge (`window.electronApi.candidate`).
- **Webpack 5 Optimization**: Dynamic code splitting, modern asset loading, and production Gzip compression.

---

## Directory Layout

```text
frontend/
├── build/                           # Webpack 5 configuration (dev.js, prod.js)
├── src/
│   ├── api/                         # Domain API wrappers (candidateApi.js)
│   ├── electron/                    # Electron IPC AJAX bridge
│   ├── i18n/                        # Multi-language dictionary & vue-i18n setup
│   ├── pages/
│   │   ├── candidate/               # Candidate management views
│   │   │   ├── CandidateList.vue    # Search list with multi-condition filtering
│   │   │   ├── CandidateDetailDrawer.vue # Candidate detail slide-out drawer
│   │   │   └── tabs/                # Decoupled detail tabs
│   │   ├── dashboard/               # Dashboard view
│   │   └── layout/                  # Main shell and navigation layout
│   ├── router/                      # Vue Router configuration
│   ├── index.html                   # HTML template
│   └── main.js                      # Application initialization
└── static/                          # Static images, styles, and web fonts
```

---

## Scripts

```powershell
# Install dependencies
npm install

# Start local development server (http://localhost:9000)
npm run dev

# Build production bundle into dist/
npm run build

# Analyze bundle size
npm run analyzer

# Format & Lint
npm run format:prettier
npm run lint-fix
```
