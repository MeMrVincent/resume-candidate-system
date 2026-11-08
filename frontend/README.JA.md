# 人材紹介・採用管理システム フロントエンド (recruitment-system-frontend)

[English](README.md) | [简体中文](README.ZH.md) | **日本語**

Vue 3 + Element Plus + Webpack 5 + JavaScript で構築された、人材紹介・採用管理システムのレンダラープロセスフロントエンド。

---

## 主な特徴

- **Vue 3 + Composition API**：モジュール化された高性能 UI アーキテクチャ。
- **完全な多言語対応 (i18n)**：英語（デフォルト）、簡体字中国語、日本語の3言語リアルタイム切り替えをネイティブサポート。Element Plus のロケールとも同期。
- **Element Plus UI ツールキット**：洗練された効率的な人材紹介 CRM の操作性を実現。
- **疎結合な候補者詳細ドロワー**：基本情報、希望条件、職務経歴、学歴、プロジェクト経歴、研修履歴、スキル、語学力、資格、コミュニケーション履歴などの各 Tab を独立したコンポーネントとして分割。
- **安全な Electron IPC クライアント**：ドメイン固有 API (`candidateApi.js`) と安全な Preload ブリッジ (`window.electronApi.candidate`) を介してメインプロセスと通信。
- **Webpack 5 最適化**：動的コード分割、アセット最適化、および本番環境向け Gzip 圧縮をサポート。

---

## ディレクトリ構成

```text
frontend/
├── build/                           # Webpack 5 ビルド設定 (dev.js, prod.js)
├── src/
│   ├── api/                         # ドメイン API モジュール (candidateApi.js)
│   ├── electron/                    # Electron IPC AJAX ブリッジ
│   ├── i18n/                        # 多言語設定と辞書ファイル
│   ├── pages/
│   │   ├── candidate/               # 候補者管理ビュー
│   │   │   ├── CandidateList.vue    # 候補者検索・一覧画面
│   │   │   ├── CandidateDetailDrawer.vue # 候補者詳細ドロワー
│   │   │   └── tabs/                # 独立した詳細 Tab コンポーネント群
│   │   ├── dashboard/               # ダッシュボード画面
│   │   └── layout/                  # メインレイアウトとナビゲーション
│   ├── router/                      # Vue Router ルーティング設定
│   ├── index.html                   # HTML テンプレート
│   └── main.js                      # アプリケーション初期化
└── static/                          # 静的画像、スタイル、Web フォント
```

---

## 常用コマンド

```powershell
# 依存関係のインストール
npm install

# ローカル開発サーバー起動 (http://localhost:9000)
npm run dev

# 本番ビルド (dist/ へ出力)
npm run build

# バンドルサイズ分析
npm run analyzer

# フォーマットと静的チェック
npm run format:prettier
npm run lint-fix
```
