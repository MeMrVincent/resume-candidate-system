# 人材紹介・採用管理システム (resume-candidate-system)

[English](README.md) | [简体中文](README.cn.md) | **日本語**

Electron + Vue 3 + Webpack 5 + SQLite (`better-sqlite3`) で構築された、ローカル完全動作型の高パフォーマンス人材紹介 CRM / ATS（応募者追跡・候補者管理）デスクトップアプリケーション。

---

## 主な特徴

- **完全ローカル・オフライン動作**：すべてのデータはローカル SQLite データベース（WAL モード、外部キー制約、busy timeout、NORMAL synchronous 設定を有効化）に永続化されます。安全で外部通信に依存せず、ディレクトリごと別ドライブへコピー・移行が可能です。
- **完全な多言語対応 (i18n)**：英語（デフォルト）、簡体字中国語、日本語の3言語リアルタイム切り替えをネイティブサポート。画面テキストおよび Element Plus コンポーネントと完全同期。
- **サブミリ秒レベルの全文検索**：SQLite FTS5 全文検索エンジンと 2 文字フォールバック検索を内蔵し、多言語・複数版の履歴書テキストの高速検索と、構造化された高精度絞り込みを両立。
- **モダンなコンポーネント指向 UI**：Vue 3 と Element Plus で構築。候補者詳細ドロワーは、基本情報、職務経歴、学歴、スキル、言語能力、プロジェクト経歴、研修履歴、多言語共通のコミュニケーション履歴など、独立して更新可能なコンポーネントに分離されています。
- **多言語履歴書の独立管理**：候補者マスターは標準で中国語版を表示し、外国語版（英語・日本語・ドイツ語など）は互いを上書きすることなく独立して管理可能。コミュニケーション進捗は全言語で共有されます。
- **1 クリック JSON バッチインポート**：履歴書解析システム（`resume-parsing-system`）と完全連携。データの整合性検証、原子性トランザクション、FTS5 インデックス再構築を備えた一括インポートツールを提供。

---

## アーキテクチャと階層設計

```text
Vue 3 レンダラープロセス (Renderer Process)
  ├── frontend/src/pages/candidate/tabs/ (独立した各 Tab コンポーネント)
  ├── frontend/src/api/candidateApi.js (ドメイン API レイヤー)
  └── frontend/src/electron/ajax.js (制御された Preload 呼び出し)
          │
          ▼
Electron IPC 通信チャネル (contextIsolation: true, nodeIntegration: false)
  └── electron/preload.js (制御された window.electronApi.<domain> ブリッジ)
          │
          ▼
Electron メインプロセス (Main Process)
  ├── electron/src/ipc/*.ipc.js (IPC ルーティングとパラメータ検証)
  ├── electron/src/services/ (ビジネスロジック層: CandidateService, CandidateSearchService)
  ├── electron/src/database/repositories/ (データアクセス層: CandidateRepository, CandidateSearchRepository)
  ├── electron/src/database/MigrationRunner.js (自動増分マイグレーション 001~007)
  └── better-sqlite3 (ネイティブ SQLite 3 エンジン + FTS5)
```

ドメイン命名規則：
- `candidate`：候補者ビジネスドメイン（`candidate_*` テーブル）
- `position`：求人ポジションドメイン（`position_*` テーブル）
- `company`：企業・クライアントドメイン（`company_*` テーブル）

API メソッドの命名規則は「ビジネス対象が先、アクションが後」に統一（例：`candidatesSearch`, `candidateGet`, `candidateUpdate`）。

---

## ディレクトリ構成

```text
resume-candidate-system/
├── data/                                # ローカルデータベースとテンプレート
│   ├── recruitment.db.example           # 空の初期スキーマテンプレート（Git 管理）
│   └── recruitment.db                   # 実行用データベース（自動生成、Git 除外）
├── electron/                            # Electron メインプロセス
│   ├── main.js                          # アプリケーションエントリポイント
│   ├── preload.js                       # IPC 安全ブリッジと Preload API
│   ├── src/
│   │   ├── database/                    # SQLite 接続、パス解決、マイグレーション (001~007)
│   │   ├── ipc/                         # IPC メッセージチャネル登録
│   │   ├── services/                    # サービス層
│   │   ├── repositories/                # リポジトリ層
│   │   └── import_runner.js             # 候補者 JSON バッチインポート実行スクリプト
│   └── test/                            # 自動テストスイート (Node.js ネイティブテストランナー)
├── frontend/                            # Vue 3 レンダラープロセス
│   ├── build/                           # Webpack 5 ビルド設定 (dev / prod)
│   ├── src/                             # フロントエンドソース (Vue 3, Element Plus, Vue Router, Vue I18n)
│   │   ├── api/                         # ドメイン API モジュール
│   │   ├── electron/                    # Electron IPC クライアントラッパー
│   │   └── pages/candidate/             # 候補者リスト・詳細ドロワー Tabs
│   └── static/                          # 静的アセット、フォント、スタイル
├── recruitment_system_development_plan.md # 詳細設計仕様書・データ辞書ドキュメント
├── LICENSE                              # MIT ライセンス
├── README.md                            # 英語ドキュメント (デフォルト)
├── README.cn.md                         # 中国語ドキュメント
└── README.ja.md                         # 日本語ドキュメント
```

---

## クイックスタートと開発手順

### 1. 動作要件
- **Node.js**: >= 20.0.0 (Node.js 22/24 LTS 推奨)
- **Windows OS**: Windows 10 / 11 推奨

### 2. 依存関係のインストール

```powershell
# 1. フロントエンドの依存関係インストール
cd frontend
npm install

# 2. Electron および better-sqlite3 の依存関係インストール
cd ..\electron
npm install
```

### 3. 開発実行

```powershell
# 方法 A: 連動起動（開発時の推奨）
# ターミナル 1 でフロントエンド開発サーバーを起動:
cd frontend
npm run dev

# ターミナル 2 で Electron デスクトップアプリを起動:
cd electron
npm run dev
```

> **ヒント**：フロントエンド開発サーバーを起動していない場合でも、`frontend` ディレクトリで `npm run build` を先に実行しておけば、Electron メインプロセスが `frontend/dist/index.html` を読み込んでオフライン起動できます。

### 4. 自動テスト

```powershell
cd electron

# マイグレーション、FTS5 全文検索、トランザクションの原子性、サービス層のテストを実行
npm test

# Electron ネイティブランタイムと better-sqlite3 C++ ドライバのスモークテストを実行
npm run test:electron
```

---

## データインポート (解析システムからの連携)

履歴書解析システム（`resume-parsing-system`）で生成された統一 JSON ディレクトリから、ローカル SQLite データベースに直接インポートし、FTS5 全文検索インデックスを自動構築します：

```powershell
cd electron
npm run import:candidates -- --source=..\resume-parsing-system\output\merge-v3\latest\formal --db=..\data\recruitment.db --fresh
```

- `--fresh`：一時データベースで件数確認、冪等性検証、FTS5 インデックス構築、外部キー整合性チェックを実施し、すべて合格した後にアトミックに対象 DB と置き換えます。

---

## パッケージングと配布

```powershell
# 1. フロントエンドの本番アセットビルド
cd frontend
npm run build

# 2. Electron アプリケーションのパッケージング
cd ..\electron
npm run dist:dir  # 未圧縮ディレクトリの生成（動作検証用）
npm run dist      # NSIS インストーラおよびポータブル版の生成
```

---

## AI 共同開発について

本プロジェクトの全コード、ビジネスロジック、データベース設計、およびデスクトップエンジニアリングは、複数の AI の協調作業によって作成されました：

- **Google Antigravity**：システム全体のアーキテクチャ設計、第1版の基礎コード作成、Electron 43 と Vue 3 の疎結合リファクタリング、`better-sqlite3` WAL/FTS5 エンジンの詳細最適化、自動テストスイートの構築、最終コード整理、Git プロジェクトの管理を担当。
- **OpenAI Codex**：V1 段階でのデータモデル定義、基本エンティティのマッピング、プロトタイプ画面仕様の策定を支援。
- **Anthropic Claude**：多言語候補者データの項目対応付け仕様策定、および多言語履歴書の独立永続化メカニズムの設計を支援。

---

## ライセンス (License)

本プロジェクトは [MIT License](LICENSE) のもとで公開されています。
