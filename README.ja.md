# 人材紹介・採用管理システム V2 (resume-candidate-system-v2)

> **言語ナビゲーション / Language Navigation / 语言导航**  
> [English](README.md) | [简体中文](README.cn.md) | **日本語**

エグゼクティブサーチ・人材紹介会社向けに設計された、ローカルオフラインファーストのエンタープライズ採用管理 CRM + ATS（採用管理システム）デスクトップアプリケーション。Electron、Vue 3、Element Plus、Webpack 5、および SQLite (`better-sqlite3`) で構築されています。

---

## バージョン 2.0.0 の新機能

- **企業クライアント管理（Company CRM）サブシステム**: 企業規模、所属業界分類、複数採用担当者管理、およびカスケード保護機能（募集中の求人が存在する企業の物理削除を防止し、論理削除・アーカイブへ誘導）。
- **求人・候補者マッチングフロー（ATS Match Flow）**: 適合判定（`pending`、`system_recommended`、`accepted`、`dismissed`）と採用プロセス進捗（`sourced`、`contacted`、`submitted`、`client_interview`、`offer`、`onboarded`、`archived`）を完全分離。人手判定をアルゴリズムが勝手に上書きすることを厳禁。
- **高機能候補者インポートエンジン**: ファイル/フォルダ選択ダイアログを備えた高速一括 JSON インポーター。ファイルハッシュによる重複排除、厳格な連絡先重複検出モード、多言語履歴書項目の乖離アラートレポートを完備。
- **高度な全文検索 (FTS5) と Trigram トークナイザー**: 中国語・英語・日本語の高速キーワード検索に対応し、`005_search_views.sql` による構造化集計ビューを提供。
- **Electron Builder による完全なネイティブパッケージング**: Windows 向け（`nsis` インストーラ、`portable` ポータブル実行ファイル、`unpacked` ディレクトリ）の自動ビルドチェーンを実装。読み取り専用シードからの初期ブートストラップを内蔵。
- **強固な自動テストスイート**: スキーママイグレーション、データ整合性不変則、IPC 契約を検証する 24/24 の自動テストを完備。

---

## コア技術アーキテクチャ

```text
Vue 3 レンダラープロセス（フロントエンド）
  ├── frontend/src/pages/company/ (クライアント企業 CRM: 一覧, 詳細, 担当者, 編集)
  ├── frontend/src/pages/candidate/ (候補者一括インポート画面)
  ├── frontend/src/pages/layout/ (レスポンシブレイアウトおよび言語切替ドロップダウン)
  ├── frontend/src/i18n/ (vue-i18n オンデマンド分割言語パックロード)
  └── frontend/src/http/ajax.js (安全な IPC 通信呼び出し層)
          │
          ▼
Electron IPC セキュア通信ブリッジ (contextIsolation: true, nodeIntegration: false)
  └── electron/preload.js (保護された window.electronApi.<domain> 名前空間)
          │
          ▼
Electron メインプロセス（バックエンドサービス）
  ├── electron/src/ipc/*.ipc.js (company.ipc, candidate.ipc, system.ipc)
  ├── electron/src/services/ (CompanyService, CandidateImportService, SystemService)
  ├── electron/src/database/ (SqliteDatabase, DatabasePath, MigrationRunner)
  └── electron/src/database/migrations/ (001_system 〜 005_search_views)
          │
          ▼
組み込み SQLite データベース (better-sqlite3)
  ├── data/recruitment.db (ポータブル配置, WAL モード, 外部キー制約有効)
  └── candidate_search_fts (FTS5 仮想テーブル + Trigram トークナイザー)
```

---

## ビルドおよびパッケージング手順

### 動作要件
- Node.js 18+ または 20+
- Windows OS (x64)

### 開発環境での起動

```bash
# ターミナル 1: フロントエンド開発サーバーの起動
cd frontend
npm run dev

# ターミナル 2: Electron アプリケーションの起動
cd electron
npm run dev
```

### 本番ビルドおよびパッケージング

```bash
# 1. フロントエンドの静的アセットビルド (Webpack 5)
cd frontend
npm run build

# 2. ポータブル展開ディレクトリの生成 (Unpacked Directory)
cd electron
npm run dist:dir

# 3. Windows インストーラの生成 (NSIS セットアップ & Portable Exe)
npm run dist
```

成果物は `release/win-unpacked/` および `release/` に出力されます。

### 自動テストの実行

```bash
# バックエンド全24テストケースの実行
cd electron
npm test

# Electron ネイティブランタイムのスモークテスト実行
npm run test:electron
```

---

## AI 開発貢献クレジット

- **Google DeepMind Antigravity**: 全体アーキテクチャ設計、依存関係の最新化、Electron パッケージング基盤構築、完全な i18n 多言語化、3言語技術ドキュメント策定、テスト検証。
- **OpenAI Codex**: データ変換基盤、多言語履歴書マージ、データスキーマの基礎設計。
- **Anthropic Claude**: システムテストスイートの構築および機能検証。

---

## ライセンス

MIT License。詳細は [LICENSE](LICENSE) を参照してください。
