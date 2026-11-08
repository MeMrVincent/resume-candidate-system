# 人材紹介・採用管理システム 開発計画およびデータベース設計仕様書

> **言語ナビゲーション / Language Navigation / 语言导航**  
> [English](recruitment_system_development_plan.md) | [简体中文](recruitment_system_development_plan.cn.md) | **日本語**

---

**ドキュメントバージョン**: 1.1  
**作成日**: 2026-08-10  
**対象読者**: Codex / Antigravity / 開発エンジニア  
**システム形態**: ローカル Electron デスクトップアプリケーション  
**現在のフェーズ**: 候補者データのパース、クレンジング、多言語統合、および `raw_text` 生成が完了。Electron + フロントエンド + SQLite の本格開発フェーズへ移行。

---

## 0. ドキュメントの位置付けと優先順位

本書は、「データ変換フェーズ」から「業務システム開発フェーズ」へ移行した後の開発における公式仕様書です。

開発時は以下の優先順位に従ってください：

1. 本書において **必須 / 厳禁 / 不可** と指定された規約。
2. 確定済みの最終候補者 JSON データ構造。
3. 元プロジェクト `CONTEXT.md` の 2026-08-02 以降のルールのうち、本書で上書きされていない事項。
4. 過去のパーススクリプト、旧 MySQL / PHP / Alibaba Cloud 構成は参考資料とし、現行アーキテクチャの基準とはしません。

### 0.1 確定済みの前提事項

- 過去の全履歴書ファイルの変換処理は完了しています。
- 同一候補者のデータ統合処理は完了しています。
- 多言語の履歴書は確定ルールに従って統合処理済みです。
- 候補者の最終 JSON には構造化データが格納されています。
- 各候補者ごとに候補者レベルの `raw_text` が事前生成されています。
- `raw_text` には全文検索に必要な全履歴書バリアントの検索テキストが含まれています。
- フェーズ1では Word / PDF / Excel / HTML の再パースは行いません。
- 正式版アプリは **Electron + SQLite** を採用します。
- フロントエンドは **Vue 3 + JavaScript** を採用します。
- テーブル接頭辞は業務ドメインごとに統一します：
  - `candidate_`: 候補者ドメイン
  - `position_`: 求人・ポジションドメイン
  - `company_`: 企業ドメイン
  - `system_`: システム基盤ドメイン

> 注記：英語表記は必ず正しく `position_` とし、`postion_` は使用しないでください。

### 0.2 2026-08-10 確定・実装済み事項

- 正式ランタイム：Electron 43.3.0、データベースドライバ：`better-sqlite3` 13.0.3（インメモリ `sql.js` は廃止）。
- DBファイル配置：開発時は `code/data/recruitment.db`、パッケージ化後は実行ファイル同階層の `data/recruitment.db`。
- インストーラには `resources/seed/recruitment.db` に読み取り専用シードを同梱。初回起動時に上記パスへコピーし、既存DBは上書きしません。
- インストール先は別ドライブの指定を許可。権限不足によるDB読み取り専用化を防ぐため、現在の Windows ユーザーに書き込み権限があるパスを必須とします。
- プログラム一式の別ドライブ移動を許容。アプリアップデート時に `data/` および `backups/` を上書きしてはなりません。
- 最終 JSON データソースは CLI 引数 `--source`（現在は `E:\resume-system\codex-complete-jsons\complete`）で指定し、業務サービス内にハードコードしません。
- 9,860 件の最終 JSON から初期DBを構築済み：`candidate_profiles`、`candidate_import_records`、`candidate_search_documents`、`candidate_search_fts` いずれも 9,860 レコード。
- インポーターの冪等性を検証済み：2回目の全件スキャンで追加 0 件、スキップ 9,860 件、失敗 0 件。
- 業務ドメイン名は `candidate / position / company` に固定し、`customer` は使用しません。
- Renderer はグローバル Store でクエリ結果を保持せず、ドメイン API モジュール経由で Electron サービスを呼び出します。
- Electron サービス呼び出し失敗時のモックデータへのフォールバックは禁止。エラーをそのまま表示し、診断情報を保持します。
- 候補者一覧はデフォルトで `dates.sys_updated_date` の降順。年齢は生年月日と現在日付から動的に計算し、履歴書上の静的年齢は使用しません。
- 候補者詳細ドロワーは表示制御とオーケストレーションのみを担当し、基本情報・職歴・学歴・スキル・語学・連絡履歴は独立した Vue コンポーネントと独立更新 API で実装します。
- 多言語候補者はデフォルトで中国語マスターを表示し、実際に存在する言語切り替えボタンのみを表示します。別言語版は `candidate_resume_variants.content_json` から独立して読み込み・更新し、他言語版を上書きしません。
- 連絡履歴は候補者の業務データであり、言語別履歴書に属さないため、全言語で共有されます。すべての履歴書内容は候補者全文検索インデックスに反映されます。

### 0.3 API およびサービス命名規約

すべてのメソッドは「業務エンティティ名＋アクション名」の形式とします：

```text
candidatesSearch
candidatesCount
candidateGet
candidateResumeGet
candidateUpdate
candidateCommunicationAdd
candidateCommunicationUpdate
candidateCommunicationDelete
candidateWorkExperiencesUpdate
candidateEducationsUpdate
candidateSkillsUpdate
candidateLanguagesUpdate
candidateExpectationsUpdate
```

レイヤー呼び出し関係：

```text
Vue 画面
  → candidateApi.candidatesSearch()
  → window.electronApi.candidate.candidatesSearch()
  → IPC candidate:candidatesSearch
  → CandidateSearchService.candidatesSearch()
  → CandidateSearchRepository
  → candidate_* テーブル群
```

---

# 1. システム目標

本システムは、最終的にローカル稼働するヘッドハンティング CRM + ATS（採用管理システム）+ 人材自動マッチングシステムです。

コア業務の順方向クローズドループ：

```text
クライアント企業
   ↓
求人ポジション作成
   ↓
候補者プールからの自動抽出とスコアリング
   ↓
システム推薦候補者の提示
   ↓
手動確認 / アンマッチ判定
   ↓
連絡・面談
   ↓
企業への推薦・書類提出
   ↓
面接
   ↓
内定（Offer）
   ↓
入社（Onboarding）
```

逆方向クローズドループ：

```text
候補者の新規登録 / 更新
   ↓
当該候補者の raw_text 再構築
   ↓
現在募集中の全求人ポジションに対する再マッチング
   ↓
求人・候補者マッチング関係の生成 / 更新
```

候補者詳細画面では以下が逆引き可能でなければなりません：

- 当該候補者が過去に関連付けられた求人ポジション一覧；
- 各求人ポジションの現在の選考進捗；
- 過去にマッチングされた日時；
- 手動でアンマッチと判定された履歴の有無；
- 現在連絡・アプローチ中かどうか；
- 企業へ推薦済みかどうか；
- 面接中かどうか；
- 内定（Offer）が出ているかどうか；
- 既に入社済みかどうか；
- すべての連絡・面談履歴。

---

# 2. 全体技術アーキテクチャ

## 2.1 推奨技術スタック

```text
Desktop
├── Electron
├── JavaScript (ES6+)
├── Vue 3
├── Vue Router
├── Webpack 5
│
Database
├── SQLite
├── FTS5
└── better-sqlite3
│
Background
└── Node Worker Threads
```

第1版での導入を非推奨とする技術：

- MySQL
- PostgreSQL
- Redis
- Elasticsearch
- 独立したバックエンドサーバープロセス
- Docker
- マイクロサービス
- クラウドデータベース

ローカルスタンドアロンのデスクトップアプリとして、以下を最優先とします：

- シンプルさ；
- 高速性；
- バックアップの容易さ；
- 迅速なリカバリ；
- データ整合性；
- デバッグの容易さ；
- ポータビリティ（移行の容易さ）。

---

## 2.2 Electron のレイヤリング規則

以下の呼び出しチェーンを強制します：

```text
Vue Renderer
    ↓
Preload API
    ↓
Electron IPC
    ↓
Service
    ↓
Repository
    ↓
SQLite
```

**厳禁事項：**

```text
Vue Renderer → SQLite への直接アクセス
```

**厳禁事項：**

```text
IPC ハンドラ内に生の SQL を散乱させること
```

**厳禁事項：**

```text
Renderer で nodeIntegration を有効化し、Node API を直接呼び出すこと
```

Electron メインプロセスのみが SQLite データベース接続を排他的に保持します。

Renderer プロセスは、安全に制御された IPC API を経由してのみ業務データを操作できます。

---

## 2.3 データベース構成

アプリ起動時の SQLite 接続直後に実行：

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

データベースファイルの配置（確定）：

```text
<アプリルートディレクトリ>/
├── <プログラム実行ファイル群>
├── data/
│   └── recruitment.db
└── backups/
```

開発環境のアプリルートは `code/`、パッケージ化後は実行ファイルが配置されたディレクトリとなります。本番インストール先ディレクトリは書き込み権限が必要であり、ユーザー指定のデータドライブへの配置を推奨します。データベースを `app.asar` 内やアップデートで上書きされるリソースディレクトリに配置してはなりません。

---

# 3. コアドメインモデル

本システムは3つの孤立した機能ではなく、以下のドメインモデルで構成されます：

```text
Company（企業）
   │
   │ 1:N
   ▼
Position（求人）
   │
   │ N:N
   ▼
PositionCandidateMatch（マッチング）
   │
   ▼
Candidate（候補者）
```

最も重要なエンティティは以下です：

```text
PositionCandidateMatch
```

これは単なる中間テーブルではなく、完全な独立業務エンティティです。

以下の責務を担います：

- マッチング理由・適合根拠の記録；
- 算出されたマッチングスコア；
- システムによる推薦フラグ；
- 人間（エージェント）による受諾の有無；
- 人間による「アンマッチ」判定の有無；
- 現在の選考ステージ；
- 選考ステージの変更履歴；
- スコア再計算の記録；
- 人手による操作ログ。

---

# 4. データ真実性の原則（Single Source of Truth）

## 4.1 構造化データベースが唯一の真実

候補者がシステムに登録された後：

```text
candidate_* 構造化テーブル群
```

が候補者の現行業務データにおける唯一の真実（Truth）となります。

`raw_text` は最新の候補者構造化データから派生・構築される全文検索用ドキュメントです。

---

## 4.2 初回インポート JSON は不変の監査証跡

初回インポート時の元 JSON は永続的に保持しなければなりません：

```text
candidate_import_records.original_json
```

このフィールドは以下の用途に限定されます：

- データの監査・証跡；
- 障害復旧・リカバリ；
- インポート異常の調査；
- 将来的なスキーママイグレーション；
- 過去の変換結果との比較照合。

**元 JSON は、その後の編集・更新における業務データの真実としては直接使用しません。**

---

# 5. raw_text のコア原則

本規約は、候補者検索サブシステムにおける最重要原則の一つです。

## 5.1 raw_text の定義

`raw_text` は次のように定義されます：

> **Candidate Full-text Search Document（候補者全文検索ドキュメント）**

これは単なる「元テキストの生ダンプ」ではありません。

以下のように構造化・整理されたものです：

```text
候補者レベルの総合全文検索ドキュメント
```

用途：

- 人材プールに対するキーワード検索；
- 求人に対する候補者の自動抽出・リコール；
- 候補者の経歴全文照合。

---

## 5.2 過去データの初回インポート時

既存の履歴書 JSON には既に高品質な `raw_text` が生成されています。

したがって、初回インポート時は：

```text
JSON.raw_text
    ↓
candidate_search_documents.raw_text
```

**そのまま直接流用します。**

初回データ投入時に、再生成、再解釈、再連結を行ってはなりません。

---

## 5.3 候補者情報の更新時における処理

今後、Electron アプリ上で：

- 基本情報の修正；
- 電話番号の追加；
- 電話番号の削除；
- 希望条件の変更；
- 職歴の追加；
- 職歴の編集；
- 職歴の削除；
- 学歴の変更；
- プロジェクトの追加；
- プロジェクトの削除；
- 語学スキルの追加；
- スキルの追加；
- 資格の追加；
- 研修履歴の追加；
- 連絡履歴の追加；
- 連絡履歴の編集；
- 連絡履歴の削除；

上記が発生した場合、必ず以下を実行します：

```text
構造化データの更新・永続化
    ↓
当該候補者の全最新スナップショットを再読み込み
    ↓
ゼロから raw_text を完全再構築
    ↓
旧 raw_text を上書き
    ↓
FTS5 検索インデックスを同期
```

### 強制ルール

**厳禁事項：**

```text
raw_text += 追加テキスト
```

**厳禁事項：**

```text
raw_text.replace(...)
```

**raw_text の部分更新・差分メンテナンスは一切禁止します。**

必ず実行すること：

```text
FULL REBUILD（完全再構築）
```

---

## 5.4 CandidateRawTextBuilder

独立した設計モジュール：

```text
CandidateRawTextBuilder
```

推奨インターフェース仕様：

```js
class CandidateRawTextBuilder {
  /**
   * @param {Object} snapshot - CandidateFullSnapshot オブジェクト
   * @returns {string} 構築された rawText ドキュメント
   */
  build(snapshot) {}
}
```

`CandidateRawTextBuilder` はデータベースクエリを行わない純粋な変換モジュールです。

元となる完全データは：

```js
candidateRepository.getFullSnapshot(candidateId)
```

から提供されます。

---

## 5.5 CandidateFullSnapshot データ構造仕様

推奨スナップショット構造：

```js
// CandidateFullSnapshot データ構造
{
  profile: {},           // CandidateProfile 候補者基本情報
  contacts: [],          // CandidateContact[] 連絡先一覧
  expectations: [],      // CandidateExpectation[] 希望就職条件
  workExperiences: [],  // CandidateWorkExperience[] 職歴一覧
  educations: [],        // CandidateEducation[] 学歴一覧
  projects: [],          // CandidateProject[] プロジェクト実績
  trainings: [],         // CandidateTraining[] 研修・トレーニング履歴
  languages: [],         // CandidateLanguage[] 語学スキル
  certificates: [],      // CandidateCertificate[] 資格・免許
  skills: [],            // CandidateSkill[] スキル一覧
  resumeVariants: [],    // CandidateResumeVariant[] その他言語別履歴書スナップショット
  communications: []     // CandidateCommunication[] 連絡・面談履歴
}
```

---

## 5.6 raw_text の再構築順序

以下の固定順序を厳格に順守します：

```text
1. 候補者基本情報
2. 連絡先情報
3. 希望就職条件
4. 現在の就業ステータス
5. 職歴詳細
6. 学歴詳細
7. プロジェクト実績
8. 研修・トレーニング履歴
9. 語学スキル
10. 資格・免許
11. 専門スキル
12. 外国語版・その他履歴書バリアント内容
13. 連絡・面談履歴
```

値が存在するフィールドのみを書き込みます。

以下は除外します：

- `null`
- `undefined`
- 空文字列
- 空配列
- 純粋なプレースホルダーオブジェクト

区切り文字標準：

```text
" | "
```

完全に同一の文字列断片に対する安定的な重複排除は許容されますが、異なる言語や異なる文脈のエンティティを誤って削除してはなりません。

---

## 5.7 raw_text と FTS5 の同期

```text
candidate_search_documents
        │
        └── raw_text
                │
                ▼
candidate_search_fts
```

`candidate_search_documents` に検索用本文を保存します。

`candidate_search_fts` は純粋に SQLite FTS5 検索インデックスとして動作します。

---

# 6. 全文検索の設計原則

## 6.1 全DB横断の多重 JOIN 検索の禁止

例えば以下のようなキーワード検索において：

```text
自動車 日本語 サプライチェーン
```

以下のように複数テーブルを JOIN して検索することは厳禁です：

```text
JOIN candidate_work_experiences
JOIN candidate_educations
JOIN candidate_projects
JOIN candidate_languages
JOIN candidate_certificates
...
```

全文キーワード検索の唯一のエントリポイント：

```text
candidate_search_documents.raw_text
```

---

## 6.2 構造化絞り込みには構造化テーブルを使用

例：

```text
キーワード：自動車 日本語
学歴：大卒以上
経験年数：8年以上
希望勤務地：上海
```

実行パイプライン：

```text
FTS raw_text 検索
     ↓
合致した candidate_id リスト
     ↓
構造化条件によるフィルタリング
     ↓
candidate_profiles / candidate_* テーブル群
```

---

## 6.3 FTS5 トークナイズ戦略

第1版の推奨方針：

```text
3文字以上の Unicode キーワード
    → FTS5 trigram トークナイザー

1〜2文字の漢字・単語
    → raw_text LIKE / instr によるフォールバック
```

短い文字列の課題に対して、初期段階から安易に Elasticsearch を導入してはなりません。

まず実データによるベンチマークを優先します。

---

# 7. データベース構成総覧

```text
system_schema_migrations
system_settings
system_jobs
system_audit_logs

company_profiles
company_contacts
company_notes

candidate_profiles
candidate_contacts
candidate_import_records
candidate_resume_variants
candidate_expectations
candidate_work_experiences
candidate_educations
candidate_projects
candidate_trainings
candidate_languages
candidate_certificates
candidate_skills
candidate_search_documents
candidate_search_fts

position_openings
position_requirements
position_skill_requirements
position_language_requirements
position_keywords
position_candidate_matches
position_candidate_stage_history
position_candidate_events

candidate_communications
```

---

# 8. Candidate テーブル設計仕様

## 8.1 candidate_profiles

候補者マスターテーブル。

格納対象：

- 現在のスナップショット；
- 一覧画面用の高頻度参照フィールド；
- 高頻度絞り込み条件。

パース前の生 JSON 全体をここに格納してはなりません。

```sql
CREATE TABLE candidate_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_uuid TEXT NOT NULL UNIQUE,

    full_name TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    age INTEGER,
    birth_date TEXT NOT NULL DEFAULT '',
    birth_year INTEGER,

    marital_status TEXT NOT NULL DEFAULT '',
    children_status TEXT NOT NULL DEFAULT '',
    political_status TEXT NOT NULL DEFAULT '',

    height_cm REAL,
    weight_kg REAL,

    household_registration TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    platform_from TEXT NOT NULL DEFAULT '',
    platform_resume_id TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    nationality TEXT NOT NULL DEFAULT '',

    primary_phone TEXT NOT NULL DEFAULT '',
    primary_email TEXT NOT NULL DEFAULT '',

    current_company TEXT NOT NULL DEFAULT '',
    current_position TEXT NOT NULL DEFAULT '',
    current_industry TEXT NOT NULL DEFAULT '',
    current_employment_status TEXT NOT NULL DEFAULT '',

    highest_school TEXT NOT NULL DEFAULT '',
    highest_major TEXT NOT NULL DEFAULT '',
    highest_degree_type TEXT NOT NULL DEFAULT '',
    highest_degree_rank INTEGER,

    work_years REAL,

    personal_summary TEXT NOT NULL DEFAULT '',

    candidate_status TEXT NOT NULL DEFAULT 'active'
        CHECK (candidate_status IN (
            'active',
            'archived',
            'do_not_contact'
        )),

    resume_updated_date TEXT NOT NULL DEFAULT '',
    resume_download_date TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_candidate_profiles_name
ON candidate_profiles(full_name);

CREATE INDEX idx_candidate_profiles_city
ON candidate_profiles(city);

CREATE INDEX idx_candidate_profiles_current_company
ON candidate_profiles(current_company);

CREATE INDEX idx_candidate_profiles_current_position
ON candidate_profiles(current_position);

CREATE INDEX idx_candidate_profiles_degree
ON candidate_profiles(highest_degree_rank);

CREATE INDEX idx_candidate_profiles_work_years
ON candidate_profiles(work_years);

CREATE INDEX idx_candidate_profiles_status
ON candidate_profiles(candidate_status);
```

---

## 8.2 candidate_contacts

候補者1名に対して複数の電話番号、メール、WeChat 等を管理可能とします。

```sql
CREATE TABLE candidate_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,

    contact_type TEXT NOT NULL
        CHECK (contact_type IN (
            'phone',
            'email',
            'wechat',
            'other'
        )),

    contact_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL DEFAULT '',

    is_primary INTEGER NOT NULL DEFAULT 0,

    source_resume_id INTEGER,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_contacts_candidate
ON candidate_contacts(candidate_id);

CREATE INDEX idx_candidate_contacts_type_value
ON candidate_contacts(contact_type, normalized_value);
```

---

## 8.3 candidate_import_records

インポート時の完全な JSON を保存します。

不変の監査証跡として扱います。

```sql
CREATE TABLE candidate_import_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,

    source_file_path TEXT NOT NULL DEFAULT '',
    source_file_name TEXT NOT NULL DEFAULT '',
    source_file_hash TEXT NOT NULL DEFAULT '',

    source_system TEXT NOT NULL DEFAULT '',
    source_resume_id TEXT NOT NULL DEFAULT '',

    original_json TEXT NOT NULL,

    imported_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_candidate_import_records_candidate
ON candidate_import_records(candidate_id);

CREATE INDEX idx_candidate_import_records_hash
ON candidate_import_records(source_file_hash);
```

### 強制ルール

`original_json` には元データをそのまま格納し、その後の業務編集で直接更新してはなりません。

---

## 8.4 candidate_resume_variants

候補者が多言語の履歴書を保有している場合：

```text
resumes[0] = zh（中国語マスター）
resumes[1...] = en / ja / de / ...（言語別バリアント）
```

第2言語以降の履歴書は本テーブルに格納されます。

```sql
CREATE TABLE candidate_resume_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    import_record_id INTEGER,

    language_code TEXT NOT NULL,
    sequence_no INTEGER NOT NULL DEFAULT 0,

    is_primary_language INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,

    variant_json TEXT NOT NULL DEFAULT '{}',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (import_record_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_resume_variants_candidate
ON candidate_resume_variants(candidate_id);

CREATE INDEX idx_candidate_resume_variants_language
ON candidate_resume_variants(language_code);
```

---

## 8.5 candidate_expectations

希望就業条件・求職意向。

```sql
CREATE TABLE candidate_expectations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    expected_city TEXT NOT NULL DEFAULT '',
    expected_position TEXT NOT NULL DEFAULT '',
    expected_salary TEXT NOT NULL DEFAULT '',

    expected_annual_salary_min REAL,
    expected_annual_salary_max REAL,

    expected_industry TEXT NOT NULL DEFAULT '',
    expected_employment_type TEXT NOT NULL DEFAULT '',
    expected_start_date TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_expectations_candidate
ON candidate_expectations(candidate_id);

CREATE INDEX idx_candidate_expectations_city
ON candidate_expectations(expected_city);

CREATE INDEX idx_candidate_expectations_position
ON candidate_expectations(expected_position);
```

> 規則：元データにおいて希望条件が完全に空の場合は、レコードを作成しません。

---

## 8.6 candidate_work_experiences

```sql
CREATE TABLE candidate_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    company_name TEXT NOT NULL DEFAULT '',
    company_employees TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '',

    position TEXT NOT NULL DEFAULT '',
    position_type TEXT NOT NULL DEFAULT '',
    position_salary TEXT NOT NULL DEFAULT '',
    position_dept TEXT NOT NULL DEFAULT '',
    position_report_to TEXT NOT NULL DEFAULT '',
    position_subordinate TEXT NOT NULL DEFAULT '',

    employment_type TEXT NOT NULL DEFAULT '',

    annual_salary_min REAL,
    annual_salary_max REAL,

    status TEXT NOT NULL DEFAULT '',
    position_start TEXT NOT NULL DEFAULT '',
    position_resigned TEXT NOT NULL DEFAULT '',

    resigned_reason TEXT NOT NULL DEFAULT '',
    position_responsibilities TEXT NOT NULL DEFAULT '',
    position_achievements TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_work_candidate
ON candidate_work_experiences(candidate_id);

CREATE INDEX idx_candidate_work_company
ON candidate_work_experiences(company_name);

CREATE INDEX idx_candidate_work_position
ON candidate_work_experiences(position);

CREATE INDEX idx_candidate_work_industry
ON candidate_work_experiences(company_industry);

CREATE INDEX idx_candidate_work_start
ON candidate_work_experiences(position_start);
```

---

## 8.7 candidate_educations

```sql
CREATE TABLE candidate_educations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    school_name TEXT NOT NULL DEFAULT '',
    school_major_name TEXT NOT NULL DEFAULT '',
    school_degree_type TEXT NOT NULL DEFAULT '',
    school_degree_rank INTEGER,
    school_education_type TEXT NOT NULL DEFAULT '',

    start_ym TEXT NOT NULL DEFAULT '',
    end_ym TEXT NOT NULL DEFAULT '',

    description TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_educations_candidate
ON candidate_educations(candidate_id);

CREATE INDEX idx_candidate_educations_school
ON candidate_educations(school_name);

CREATE INDEX idx_candidate_educations_major
ON candidate_educations(school_major_name);

CREATE INDEX idx_candidate_educations_degree
ON candidate_educations(school_degree_rank);
```

学位ランク（degree_rank）マッピング基準：

```text
7 = ポスドク（博士研究員）
6 = 博士
5 = 修士
4 = 学士（大卒）
3 = 短大・専門学校
2 = 高校・高専
1 = 中学校以下
```

---

## 8.8 candidate_projects

```sql
CREATE TABLE candidate_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    project_name TEXT NOT NULL DEFAULT '',
    company_or_client TEXT NOT NULL DEFAULT '',
    role_name TEXT NOT NULL DEFAULT '',

    start_ym TEXT NOT NULL DEFAULT '',
    end_ym TEXT NOT NULL DEFAULT '',

    description TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_projects_candidate
ON candidate_projects(candidate_id);

CREATE INDEX idx_candidate_projects_name
ON candidate_projects(project_name);
```

---

## 8.9 candidate_trainings

```sql
CREATE TABLE candidate_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    organization_name TEXT NOT NULL DEFAULT '',
    training_name TEXT NOT NULL DEFAULT '',

    start_ym TEXT NOT NULL DEFAULT '',
    end_ym TEXT NOT NULL DEFAULT '',

    certificate_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_trainings_candidate
ON candidate_trainings(candidate_id);
```

---

## 8.10 candidate_languages

```sql
CREATE TABLE candidate_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    language_name TEXT NOT NULL DEFAULT '',
    language_level TEXT NOT NULL DEFAULT '',
    language_certificate TEXT NOT NULL DEFAULT '',
    language_certificate_time TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_languages_candidate
ON candidate_languages(candidate_id);

CREATE INDEX idx_candidate_languages_name
ON candidate_languages(language_name);

CREATE INDEX idx_candidate_languages_level
ON candidate_languages(language_level);
```

---

## 8.11 candidate_certificates

```sql
CREATE TABLE candidate_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_type TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_certificates_candidate
ON candidate_certificates(candidate_id);

CREATE INDEX idx_candidate_certificates_name
ON candidate_certificates(certificate_name);
```

主要資格例：CET、JLPT、TOEIC、TOEFL、BEC など。

---

## 8.12 candidate_skills

```sql
CREATE TABLE candidate_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    source_resume_id INTEGER,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    skill_name TEXT NOT NULL DEFAULT '',
    skill_level TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (source_resume_id)
        REFERENCES candidate_import_records(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_skills_candidate
ON candidate_skills(candidate_id);

CREATE INDEX idx_candidate_skills_name
ON candidate_skills(skill_name);
```

---

# 9. 候補者全文検索テーブル群

## 9.1 candidate_search_documents

候補者ごとに集約・生成された全文検索用ドキュメント（raw_text）を保存します。

```sql
CREATE TABLE candidate_search_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL UNIQUE,

    raw_text TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_candidate_search_documents_candidate
ON candidate_search_documents(candidate_id);
```

---

## 9.2 candidate_search_fts

高精度テキスト検索用の SQLite FTS5 仮想テーブル。

```sql
CREATE VIRTUAL TABLE candidate_search_fts USING fts5 (
    raw_text,
    content='candidate_search_documents',
    content_rowid='id',
    tokenize='trigram'
);
```

同期トリガー（自動メンテナンス）：

```sql
CREATE TRIGGER candidate_search_documents_ai
AFTER INSERT ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.id, new.raw_text);
END;

CREATE TRIGGER candidate_search_documents_ad
AFTER DELETE ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text)
    VALUES('delete', old.id, old.raw_text);
END;

CREATE TRIGGER candidate_search_documents_au
AFTER UPDATE ON candidate_search_documents
BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text)
    VALUES('delete', old.id, old.raw_text);
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.id, new.raw_text);
END;
```

---

# 10. 候補者連絡・面談履歴

## 10.1 candidate_communications

エージェントと候補者とのアプローチ、面談、フォローアップ等の全履歴を保存します。

```sql
CREATE TABLE candidate_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidate_id INTEGER NOT NULL,
    position_id INTEGER,

    communication_type TEXT NOT NULL
        CHECK (communication_type IN (
            'phone',
            'wechat',
            'interview',
            'email',
            'offline',
            'other'
        )),

    direction TEXT NOT NULL DEFAULT 'outbound'
        CHECK (direction IN ('inbound', 'outbound')),

    communicate_time TEXT NOT NULL,
    communicate_content TEXT NOT NULL,

    next_followup_time TEXT,

    creator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_candidate_communications_candidate
ON candidate_communications(candidate_id);

CREATE INDEX idx_candidate_communications_position
ON candidate_communications(position_id);

CREATE INDEX idx_candidate_communications_time
ON candidate_communications(communicate_time);
```

### communication_type の推奨値

- `phone`: 電話連絡
- `wechat`: WeChat（チャット/通話）
- `interview`: 面談（対面/オンライン面談）
- `email`: メール送信
- `offline`: 対面訪問・面会
- `other`: その他チャネル

### direction（発信方向）の推奨値

- `outbound`: エージェントからの能動的アプローチ
- `inbound`: 候補者からの問い合わせ・返信

---

# 11. 求人ポジション管理モジュール

## 11.1 position_openings

求人ポジションのマスターテーブル。

```sql
CREATE TABLE position_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    position_name TEXT NOT NULL,
    job_code TEXT NOT NULL DEFAULT '',

    department TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    work_location TEXT NOT NULL DEFAULT '',

    employment_type TEXT NOT NULL DEFAULT 'full_time',

    headcount INTEGER NOT NULL DEFAULT 1,

    annual_salary_min REAL,
    annual_salary_max REAL,
    salary_months INTEGER DEFAULT 12,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'open',
            'paused',
            'filled',
            'cancelled'
        )),

    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    recruiter_name TEXT NOT NULL DEFAULT '',

    opened_at TEXT,
    closed_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_openings_company
ON position_openings(company_id);

CREATE INDEX idx_position_openings_status
ON position_openings(status);

CREATE INDEX idx_position_openings_city
ON position_openings(city);
```

---

## 11.2 position_requirements

候補者スクリーニングのための必須・希望要件。

```sql
CREATE TABLE position_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL UNIQUE,

    min_degree_rank INTEGER DEFAULT 0,
    min_work_years REAL DEFAULT 0,
    max_work_years REAL,

    target_cities TEXT NOT NULL DEFAULT '[]',
    target_industries TEXT NOT NULL DEFAULT '[]',

    job_description TEXT NOT NULL DEFAULT '',
    job_requirements TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_requirements_position
ON position_requirements(position_id);
```

---

## 11.3 position_skill_requirements

自動マッチングの重み付けに使用されるスキル要件。

```sql
CREATE TABLE position_skill_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    skill_name TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1,
    weight REAL NOT NULL DEFAULT 1.0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_skills_position
ON position_skill_requirements(position_id);

CREATE INDEX idx_position_skills_name
ON position_skill_requirements(skill_name);
```

---

## 11.4 position_language_requirements

求人が求める語学力要件。

```sql
CREATE TABLE position_language_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    language_name TEXT NOT NULL,
    min_level TEXT NOT NULL DEFAULT '',
    is_required INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_languages_position
ON position_language_requirements(position_id);
```

---

## 11.5 position_keywords

FTS 全文検索による候補者抽出で使用するキーワード。

```sql
CREATE TABLE position_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,

    keyword TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general'
        CHECK (category IN (
            'general',
            'skill',
            'title',
            'industry',
            'cert'
        )),
    weight REAL NOT NULL DEFAULT 1.0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_position_keywords_position
ON position_keywords(position_id);

CREATE INDEX idx_position_keywords_word
ON position_keywords(keyword);
```

---

# 12. PositionCandidate（求人と候補者のマッチング関係）

## 12.1 position_candidate_matches

求人と候補者間のマッチング、スコアリング、選考進捗を記録する中核エンティティ。

```sql
CREATE TABLE position_candidate_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    position_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,

    match_source TEXT NOT NULL DEFAULT 'system_auto'
        CHECK (match_source IN (
            'system_auto',
            'manual_search',
            'referral',
            'candidate_apply'
        )),

    score REAL NOT NULL DEFAULT 0,
    score_details_json TEXT NOT NULL DEFAULT '{}',
    match_reason_json TEXT NOT NULL DEFAULT '{}',

    decision TEXT NOT NULL DEFAULT 'pending'
        CHECK (decision IN (
            'pending',
            'system_recommended',
            'accepted',
            'dismissed'
        )),

    pipeline_stage TEXT NOT NULL DEFAULT 'sourced'
        CHECK (pipeline_stage IN (
            'sourced',
            'contacted',
            'submitted',
            'client_interview',
            'offer',
            'onboarded',
            'archived'
        )),

    is_dismissed INTEGER NOT NULL DEFAULT 0,
    dismiss_reason TEXT NOT NULL DEFAULT '',

    last_scored_at TEXT,
    last_action_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES position_openings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (candidate_id)
        REFERENCES candidate_profiles(id)
        ON DELETE CASCADE,

    UNIQUE (position_id, candidate_id)
);

CREATE INDEX idx_matches_position
ON position_candidate_matches(position_id);

CREATE INDEX idx_matches_candidate
ON position_candidate_matches(candidate_id);

CREATE INDEX idx_matches_score
ON position_candidate_matches(score);

CREATE INDEX idx_matches_decision
ON position_candidate_matches(decision);

CREATE INDEX idx_matches_stage
ON position_candidate_matches(pipeline_stage);
```

---

# 13. decision と pipeline_stage の完全分離

`decision`（マッチング適合判定）と `pipeline_stage`（選考プロセス進捗）は必ず分離して管理します。

## 13.1 decision（適合判定）

候補者が求人に対して適合しているかの審査状態を管理：

- `pending`: 新規抽出・審査待ち；
- `system_recommended`: システムによる高スコアマッチング（推薦提示）；
- `accepted`: エージェントが適合と承認（選考パイプラインへ正式投入）；
- `dismissed`: エージェントまたはルールにより「アンマッチ」として除外。

## 13.2 pipeline_stage（選考パイプライン進捗）

実務上の採用選考ファネルのステージを管理：

- `sourced`: 人材抽出完了；
- `contacted`: 候補者へ打診・連絡中；
- `submitted`: クライアント企業へ書類推薦・提出済み；
- `client_interview`: 企業面接調整中・面接実施中；
- `offer`: 内定提示・条件交渉中；
- `onboarded`: 入社完了；
- `archived`: 選考終了・アーカイブ。

## 13.3 自動マッチングによる人手判定の上書き禁止

ルール：
- エージェントが一度 `accepted` または `dismissed` を判定した場合、その後の自動再計算処理は `score` および `score_details_json` を更新できますが、`decision` や `pipeline_stage` を上書きしてはなりません。
- 人手による意思決定はアルゴリズムスコアに対して常に絶対的な優先権を持ちます。

---

# 14. 採用プロセス履歴および監査

## 14.1 position_candidate_stage_history

選考ステージの推移履歴を記録します。

```sql
CREATE TABLE position_candidate_stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    match_id INTEGER NOT NULL,

    from_stage TEXT NOT NULL DEFAULT '',
    to_stage TEXT NOT NULL,

    remark TEXT NOT NULL DEFAULT '',
    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,

    FOREIGN KEY (match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_stage_history_match
ON position_candidate_stage_history(match_id);
```

---

## 14.2 position_candidate_events

マッチングに関連する全業務マイルストーンおよびイベントを追跡します。

```sql
CREATE TABLE position_candidate_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    match_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'matched',
            'recommended',
            'accepted',
            'dismissed',
            'contacted',
            'submitted',
            'interview_scheduled',
            'interview_feedback',
            'offer_issued',
            'offer_accepted',
            'onboarded',
            'stage_changed',
            'rescore'
        )),

    payload_json TEXT NOT NULL DEFAULT '{}',
    remark TEXT NOT NULL DEFAULT '',
    operator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,

    FOREIGN KEY (match_id)
        REFERENCES position_candidate_matches(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_match_events_match
ON position_candidate_events(match_id);

CREATE INDEX idx_match_events_type
ON position_candidate_events(event_type);
```

---

# 15. 企業管理モジュール

## 15.1 company_profiles

クライアント企業マスターテーブル。

```sql
CREATE TABLE company_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL DEFAULT '',

    industry TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    scale TEXT NOT NULL DEFAULT '',
    nature TEXT NOT NULL DEFAULT '',

    website TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'blacklisted')),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_company_profiles_name
ON company_profiles(company_name);

CREATE INDEX idx_company_profiles_city
ON company_profiles(city);

CREATE INDEX idx_company_profiles_industry
ON company_profiles(industry);
```

---

## 15.2 company_contacts

企業側担当者（人事担当者、採用責任者、役員等）。

```sql
CREATE TABLE company_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    contact_name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',

    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',

    is_primary INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_company_contacts_company
ON company_contacts(company_id);
```

---

## 15.3 company_notes

企業に対する営業フォロー、契約特記、採用要件メモ等。

```sql
CREATE TABLE company_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    company_id INTEGER NOT NULL,

    note_type TEXT NOT NULL DEFAULT 'general'
        CHECK (note_type IN ('general', 'contract', 'interview', 'preference')),

    content TEXT NOT NULL,
    creator_name TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (company_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_company_notes_company
ON company_notes(company_id);
```

---

# 16. Company → Position 関連性

- 企業は複数の求人ポジションを保持します（`1:N`）。
- 企業の削除時、紐づく求人のカスケード削除は厳格な確認を必要とします。通常の業務運用ではアーカイブまたは論理削除（`status = 'inactive'`）を基本とします。
- 求人ポジションの削除時は、要件テーブル、キーワード、およびマッチング関係（`position_candidate_matches`）がカスケード削除されます。

---

# 17. システム基盤テーブル群

## 17.1 system_schema_migrations

データベースマイグレーションのバージョンおよび実行履歴を記録します。

```sql
CREATE TABLE system_schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
);
```

---

## 17.2 system_settings

システム共通設定パラメータ（キー・バリューストア）。

```sql
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    remark TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);
```

---

## 17.3 system_jobs

バックグラウンドワーカーの実行タスクキューおよび履歴ログ。

```sql
CREATE TABLE system_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    job_type TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);

CREATE INDEX idx_system_jobs_status
ON system_jobs(status);
```

---

## 17.4 system_audit_logs

重要操作およびセキュリティ監査ログ。

```sql
CREATE TABLE system_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    module TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL DEFAULT '',

    operator_name TEXT NOT NULL DEFAULT '',
    detail_json TEXT NOT NULL DEFAULT '{}',

    created_at TEXT NOT NULL
);

CREATE INDEX idx_system_audit_logs_module
ON system_audit_logs(module);
```

---

# 18. 初回候補者 JSON インポートパイプライン

## 18.1 パイプライン処理フロー

```text
指定ディレクトリから JSON ファイルを読み込み
         ↓
candidate_uuid の抽出とファイル sha256 ハッシュの計算
         ↓
candidate_profiles に candidate_uuid が存在するか照合
   ├── 存在する場合：ハッシュを比較。同一ならスキップ、変更あれば更新
   └── 存在しない場合：SQLite 単一トランザクションを開始
         ↓
candidate_profiles への挿入（基本マスター）
candidate_contacts への挿入
candidate_expectations への挿入
candidate_work_experiences への挿入
candidate_educations への挿入
candidate_projects への挿入
candidate_trainings への挿入
candidate_languages への挿入
candidate_certificates への挿入
candidate_skills への挿入
candidate_resume_variants への挿入（第2言語以降の履歴書）
candidate_import_records への挿入（監査用元 JSON）
candidate_search_documents への挿入（検索用 raw_text）
         ↓
SQLite トランザクションコミット（トリガーにより candidate_search_fts を自動更新）
```

---

## 18.2 インポーターの冪等性保証

- 検証機構：`candidate_uuid` のユニーク制約と `source_file_hash` を組み合わせて重複を判定。
- 同一ディレクトリに対して再実行した場合：
  - 重複レコードを作成することなく全件スキャン；
  - 変更のない候補者は DB 負荷ゼロで瞬時にスキップ；
  - 100% の冪等性（Idempotency）を保証します。

---

## 18.3 インポート統計と診断情報

インポート完了時に以下のテレメトリを出力します：

- `totalFiles`: ソースパス内で検出された総 JSON ファイル数；
- `created`: 新規登録された候補者数；
- `updated`: 更新された既存候補者数；
- `skipped`: 変更がなくスキップされた候補者数；
- `failed`: エラーとなった失敗件数（詳細スタックトレース付き）；
- `durationMs`: 総処理時間（ミリ秒）。

---

# 19. 候補者データ更新（Mutation）の中核実装

フロントエンドで候補者情報が編集された場合：

```text
専用の SQLite トランザクション内で Update API を実行
         ↓
candidate_* 構造化テーブル群へ変更をコミット
         ↓
candidateRepository.getFullSnapshot(candidateId) を取得
         ↓
CandidateRawTextBuilder.build(snapshot) を実行
         ↓
新規 raw_text の SHA-256 ハッシュを計算
   ├── 既存ハッシュと一致する場合：ドキュメント更新をスキップ
   └── 既存ハッシュと異なる場合：candidate_search_documents を更新
         ↓
トリガーにより candidate_search_fts を自動同期
         ↓
バックグラウンドマッチングイベントを発行（求人候補者再スコアリング）
```

---

## 19.1 RawText ハッシュ判定による負荷軽減

FTS5 への無駄な書き込みを防止するため：
- 生成された `raw_text` の SHA-256 ハッシュを計算；
- 既存の保存済みドキュメントのハッシュと同一である場合は、`candidate_search_documents` への書き込みをバイパス；
- 実質的なテキスト内容に変更があった場合のみ、FTS インデックスの更新をトリガーします。

---

# 20. 自動マッチングアーキテクチャ概要

中核となるマッチング機構はイベント駆動型アーキテクチャを採用します：

```text
イベント：求人ポジションの新規作成 / 要件更新
イベント：候補者の新規登録 / 経歴更新
         ↓
Worker スレッド：候補者抽出（FTS5 trigram + 構造化ハードフィルター）
         ↓
Worker スレッド：MatchEngine による多角スコアリング
         ↓
position_candidate_matches の永続化 / レコード更新
```

---

# 21. マッチングトリガー：新規求人作成時

求人ポジションが `status = 'open'` に変更された場合：

```text
1. position_keywords および position_requirements を取得
2. キーワードを用いて candidate_search_fts から候補者を高速抽出（リコール）
3. 構造化ハードフィルターを適用（学歴ランク、最低経験年数、希望勤務地など）
4. 抽出された候補者を MatchEngine で精密スコアリング
5. 上位スコア（例：70点以上）の候補者を以下として登録：
   - decision = 'system_recommended'（システム推薦）
   - pipeline_stage = 'sourced'（抽出完了）
```

---

# 22. マッチングトリガー：候補者作成・更新時

候補者の基本情報や経歴が新規登録・更新された場合：

```text
1. 構造化データの保存および raw_text の完全再構築を完了
2. 募集中（status = 'open'）の全求人ポジションを取得
3. 募集中の各求人に対して MatchEngine スコアを計算
4. スコアが推薦基準を満たしている場合：
   - マッチングレコードが存在しない場合：新規作成（decision = 'system_recommended'）
   - マッチングレコードが存在し、decision が 'pending' の場合：スコアを更新
   - エージェントが既に 'accepted' または 'dismissed' と判定済みの場合：スコア詳細のみ更新し、判定結果は維持
```

---

# 23. マッチングトリガー：求人要件の更新時

エージェントが求人要件や検索キーワードを更新した場合：

```text
1. 当該求人に既に紐づいている全マッチングレコードを取得
2. 既存候補者のスコアを再計算（手動判定済みのステータスは完全保持）
3. 更新されたキーワードで FTS 抽出を再実行し、新たな適合候補者を発掘
4. 推薦基準を満たす新規候補者を推薦リストへ追加
```

---

# 24. 求人ステータスのライフサイクル

求人ステータスの状態遷移：

```text
draft（下書き）
  ↓
open（募集中 - 自動マッチング対象）
  ├── paused（一時停止 - 自動マッチングを一時休止）
  ├── filled（充足完了 - 採用決定によるクローズ）
  └── cancelled（募集終了 / キャンセル）
```

ルール：
- 自動マッチングは `open` ステータスの求人に対してのみ稼働します。
- 求人が `filled` または `cancelled` に遷移した場合、未完了の `pending` または `system_recommended` 状態のマッチングは自動的に `pipeline_stage = 'archived'` へ移行します。

---

# 25. MatchEngine 第1版 スコアリングフレームワーク

0〜100点満点の加重総合スコアを算出：

```text
総合スコア =
    KeywordScore     * 0.25 +
    SkillScore       * 0.25 +
    ExperienceScore  * 0.20 +
    EducationScore   * 0.10 +
    LanguageScore    * 0.10 +
    LocationScore    * 0.10
```

評価項目の詳細：
- **KeywordScore (25%)**: 候補者の `raw_text` に対する FTS5 の BM25 適合度スコア。
- **SkillScore (25%)**: 必須スキルの充足率＋歓迎スキルの加点。
- **ExperienceScore (20%)**: 候補者の経験年数と求人要求経験年数との適合度。
- **EducationScore (10%)**: 候補者の最高学歴ランクが `min_degree_rank` を満たしているかの評価。
- **LanguageScore (10%)**: 求められる語学力・資格レベルの充足度。
- **LocationScore (10%)**: 候補者の現在居住地 / 希望勤務地と求人勤務地の一致度。

---

## 25.1 MatchEngine 出力データ構造仕様

```js
// MatchResult データ構造
{
  score: 85.5,             // 総合適合スコア（0 - 100）

  keywordScore: 90,        // キーワード適合度
  skillScore: 80,          // スキル適合度
  experienceScore: 85,     // 経験年数適合度
  educationScore: 90,      // 学歴適合度
  languageScore: 80,       // 語学力適合度
  industryScore: 85,       // 業界経験適合度
  locationScore: 100,      // 勤務地適合度

  reasons: [],             // MatchReason[] 適合・不適合理由の詳細テキスト一覧

  algorithmVersion: '1.0'  // マッチングアルゴリズムのバージョン
}
```

`match_reason_json` に格納される構造例：

```json
{
  "matched": [
    "Vue 3 および TypeScript の実務経験あり",
    "フロントエンド設計経験5年以上",
    "英語ビジネスレベル（CET-6 取得）"
  ],
  "partial": [
    "希望年収が想定レンジ上限に近接"
  ],
  "missing": [
    "Electron によるデスクトップ開発経験の記載なし"
  ]
}
```

---

# 26. 全文検索（FTS）は抽出専用であり、採用判定を直接行わない

アーキテクチャ上の極めて重要な原則：

```text
FTS5 (raw_text)
     ↓
高速候補者抽出プール（上位100〜300件の候補群）
     ↓
構造化 MatchEngine および業務フィルター
     ↓
適合スコア順の推薦リストおよびマッチング生成
```

FTS は迅速な候補者の粗削り抽出（Recall）を担いますが、構造化データの検証をスキップしてはなりません。最終的な推薦・適合判定は、必ず構造化テーブル群に基づく多角評価を経て決定されます。

---

# 27. 「アンマッチ（不適合）」に関する業務ルール

エージェントが候補者を「アンマッチ（不適合）」と判定した場合（`decision = 'dismissed'`）：

```text
エージェントが「アンマッチ」をクリック
         ↓
アンマッチ理由の入力 / 選択ダイアログを表示
         ↓
position_candidate_matches を更新：
  - decision = 'dismissed'
  - is_dismissed = 1
  - dismiss_reason = <理由テキスト>
  - last_action_at = <操作日時>
         ↓
position_candidate_events に判定イベントを記録
```

不変ルール：
- 一度 `dismissed`（アンマッチ）と判定された候補者は、その後のスコア再計算に関わらず、当該求人の「推薦候補者」リストに二度と自動復活しません。
- エージェントが手動でステータスを `accepted` または `pending` に明示的に戻した場合にのみ解除されます。

---

# 28. 候補者の選考パイプライン投入フロー

候補者がエージェントにより受諾された場合：

```text
decision = 'accepted'
pipeline_stage = 'contacted'
         ↓
求人の「選考カンバン（Kanban）」画面に候補者が表示
         ↓
エージェントが連絡ログを記録し、選考ステージを進捗：
  contacted（連絡中） → submitted（推薦提出） → client_interview（企業面接） → offer（内定） → onboarded（入社）
```

---

# 29. 連絡履歴と PositionCandidate の連携

候補者の連絡履歴（`candidate_communications`）を記録する際：
- エージェントは任意で特定の求人（`position_id`）を紐付けることができます。
- 紐付けられた場合、当該連絡内容は候補者詳細タイムラインと求人選考ドロワーの双方に表示されます。
- 求人に紐付く連絡履歴が追加された場合、自動的に `position_candidate_events`（`event_type = 'contacted'`）に履歴イベントが起票されます。

---

# 30. フロントエンド画面設計

## 30.1 メインナビゲーション構成

```text
サイドバーナビゲーション：
├── 候補者管理（候補者プール、全文検索、構造化絞り込み）
├── 求人管理（求人案件、選考カンバン、システム推薦審査）
├── 企業管理（クライアント企業、企業担当者、契約メモ）
└── システム設定（初期データ投入、DBステータス、バックアップ）
```

フロントエンド基本原則：
- Vue 3 + Vue Router による SPA（シングルページアプリケーション）構成。
- Element Plus コンポーネントライブラリによる統一感のある UI。
- Vue-i18n による多言語ローカライゼーション（英語デフォルト、簡体字中国語、日本語）。
- 検索フィルターとドロワー（Drawer）モーダルを活用したレスポンシブな操作性。

---

# 31. 候補者サブシステム画面

## 31.1 候補者一覧画面

主要機能：
- **統合キーワード検索**: 全言語バリアントを対象に `candidate_search_fts` を高速全文検索；
- **多次元構造化フィルター**: 勤務地、学歴ランク、経験年数、現職企業、現職ポジション；
- **安定したページネーション**: Limit + Offset による正確な件数取得；
- **動的年齢計算**: `birth_date` と現在日付から動的に算出（古い静的年齢テキストは不使用）；
- **柔軟なソート機能**: デフォルトは `sys_updated_date` の降順。

## 31.2 候補者詳細ドロワー

ライフサイクルと構成：
- 一覧の行クリックで右側からスライドイン（`CandidateDetailDrawer.vue`）；
- **多言語バリアント切り替え**: デフォルトで中国語マスターを表示し、`candidate_resume_variants` に実際に存在する言語タブ（`ZH`, `EN`, `JA`）のみを動的表示；
- **独立したサブタブ構成**:
  - 基本情報（Profile）
  - 希望就職条件（Expectations）
  - 職歴（Work Experiences）
  - 学歴（Education）
  - プロジェクト実績（Projects）
  - 研修・トレーニング履歴（Trainings）
  - スキル一覧（Skills）
  - 語学力（Languages）
  - 資格・免許（Certificates）
  - 連絡履歴・面談メモ（Communications）

## 31.3 候補者編集および更新フロー

- 各タブが独立した編集ステートと独立更新 API を保持；
- 構造化データの変更は単一トランザクションで確実にコミット；
- 更新完了後、システムは自動的に `raw_text` の完全再構築と FTS5 同期を発行。

---

# 32. 求人サブシステム画面

## 32.1 求人一覧画面

- 全クライアント企業の求人案件を俯瞰・検索；
- ステータス別絞り込み：`draft`、`open`、`paused`、`filled`、`cancelled`；
- 緊急度バッジ（`urgent`、`high`、`medium`、`low`）；
- 担当エージェントおよび充足進捗（採用予定人数に対する進捗）。

## 32.2 求人詳細画面

- 詳細な募集要件、対象業界、対象勤務地；
- 必須スキル・歓迎スキルおよび要求語学レベル；
- 紐づくクライアント企業概要および採用担当者連絡先；
- FTS 抽出精度を高めるキーワード設定。

## 32.3 求人候補者選考カンバン（Kanban）

選考ファネルを可視化する ATS パイプラインボード：

```text
[ 抽出済 ] → [ アプローチ中 ] → [ 推薦・書類提出 ] → [ 企業面接中 ] → [ 内定 ] → [ 入社済 ]
```

主要機能：
- ドラッグ＆ドロップまたはワンクリックによる選考ステージ進行；
- 適合スコアおよび推薦理由内訳（`match_reason_json`）の即時確認；
- カンバンカードから直接連絡メモを起票；
- `system_recommended`（システム推薦）候補者を審査・承認・アンマッチ判定する専用タブ。

---

# 33. 企業サブシステム画面

## 33.1 企業一覧画面

- クライアント企業マスターの一覧・検索（業界、地域、企業規模での絞り込み）；
- 各企業の現在進行中のアクティブ求人数をリアルタイム表示；
- 取引ステータスバッジ：`active`、`inactive`、`blacklisted`。

## 33.2 企業詳細画面

- 企業基本情報および事業概要；
- 企業側担当者一覧（人事、採用マネージャー、役員）；
- 募集中の求人および過去の求人履歴一覧；
- 企業特記メモ、面接傾向、契約条件メモ。

---

# 34. Electron プロジェクト構造仕様

標準化された本番アーキテクチャ構成：

```text
resume-candidate-system/
├── electron/
│   ├── main.js                      # アプリメインエントリーおよびウィンドウ管理
│   ├── preload.js                   # contextBridge による API 公開
│   ├── src/
│   │   ├── database/
│   │   │   ├── Database.js          # better-sqlite3 接続管理
│   │   │   ├── DatabasePath.js      # ランタイム DB パス動的解決
│   │   │   ├── MigrationRunner.js   # マイグレーション自動実行
│   │   │   └── migrations/          # バージョン管理された SQL スクリプト
│   │   ├── database/repositories/   # データアクセス層（純粋な SQL クエリ）
│   │   ├── services/                # 業務ロジックおよびトランザクション制御
│   │   ├── ipc/                     # 型定義された IPC 登録ハンドラ
│   │   ├── candidate/search/        # CandidateRawTextBuilder および FTS ビルダー
│   │   └── workers/                 # バックグラウンド処理用 Worker Threads
├── frontend/
│   ├── src/
│   │   ├── api/                     # IPC クライアント呼び出しラッパー
│   │   ├── pages/                   # アプリ画面コンポーネント（候補者、求人、企業）
│   │   ├── pages/candidate/tabs/    # 候補者タブ別コンポーネント
│   │   ├── router/                  # Vue Router ルーティング
│   │   ├── i18n/                    # 多言語辞書（en, zh-cn, ja）
│   │   └── electron/                # Ajax / IPC 通信アダプター
└── data/
    └── recruitment.db               # SQLite データベース実体（git 除外）
```

---

# 35. Repository レイヤリング規則

- **純粋なデータアクセス**: SQL クエリとプリペアドステートメントのみを記述；
- **業務ロジックの排除**: Repository 内で業務判断や意思決定を行わない；
- **プリペアドステートメントの再利用**: 頻度の高いクエリはステートメントをキャッシュ；
- **単一責任の原則**: 各 Repository は担当するドメインテーブル群のクエリのみを管理。

---

# 36. Service レイヤリング規則

- **業務ドメインワークフロー**: 業務規約、スコア計算、整合性制御を担当；
- **トランザクション境界**: Service が SQLite トランザクションの開始とコミットを統括；
- **複数 Repository の連携**: 複数 Repository を組み合わせた高次のユースケースを実行；
- **非同期ディスパッチ**: 重いバックグラウンドタスク（再スコアリングや raw_text 再構築）を発行。

---

# 37. IPC レイヤリング規則

- **型安全なハンドラ登録**: すべての IPC チャンネルは `ipcMain.handle` で登録；
- **入力値バリデーション**: レンダラーからの引数を厳格に検証・サニタイズ；
- **標準化されたレスポンス形式**:
  ```js
  {
    success: true,
    data: { ... },
    error: null
  }
  ```
  失敗時の形式：
  ```js
  {
    success: false,
    data: null,
    error: {
      message: 'Failed to execute query',
      code: 'ERR_QUERY_FAILED'
    }
  }
  ```
- **生 SQL 記述の厳禁**: IPC ハンドラファイル内に直接 SQL を記述してはなりません。

---

# 38. Preload API 設計規則

- 必ず `contextBridge.exposeInMainWorld` を使用；
- ドメインごとにグループ化された名前空間で公開：
  ```js
  window.electronApi = {
    candidate: candidateApi,
    position: positionApi,
    company: companyApi,
    system: systemApi
  };
  ```
- データベース接続インスタンス、`require`、または Node の `fs` / `child_process` を Renderer に直接露出させてはなりません。

---

# 39. バックグラウンド Worker アーキテクチャ

重い計算負荷を伴う処理は、独立した Node `worker_threads` で実行します：
- 履歴書 JSON の一括大量インポート；
- 全データベースの `raw_text` 一括再構築；
- 全求人案件に対する候補者の一括自動マッチングおよびスコアリング。

メインプロセスが UI の応答性を維持したまま、バックグラウンドスレッドで重負荷パイプラインを処理します。

---

# 40. ジョブの重複排除規則

- `system_jobs` にタスクをエンキューする前：
  - 同一の `job_type` かつ同一の `target_id` を持つタスクが現在 `pending` または `processing` でないかを照合；
  - 既に未完了の同一タスクが存在する場合、新しいタスクの重複投入をスキップまたは統合し、無駄な計算負荷を防止します。

---

# 41. データベーストランザクション境界

必須トランザクション規約：
- 複数テーブルにまたがる候補者更新（`profiles`、`contacts`、`expectations`、`experiences` 等）は、必ず単一の原子的 `db.transaction` 内で実行；
- 候補者 JSON の一括取り込みは、候補者単位で原子的にコミット；
- マッチング状態の更新とイベント履歴の記録は、単一トランザクション内で不可分に実行します。

---

# 42. 検索 API 仕様

中核となる検索シグネチャ：

```js
// 候補者一覧検索
async candidatesSearch({
  keyword = '',
  city = '',
  degreeRank = null,
  workYearsMin = null,
  workYearsMax = null,
  candidateStatus = 'active',
  sortBy = 'updated_at',
  sortOrder = 'desc',
  page = 1,
  pageSize = 20
})

// 条件に合致する候補者総件数取得
async candidatesCount({
  keyword = '',
  city = '',
  degreeRank = null,
  workYearsMin = null,
  workYearsMax = null,
  candidateStatus = 'active'
})
```

---

# 43. 検索実行パイプライン

高パフォーマンスなクエリ実行パス：

```text
1. キーワード判定：
   ├── キーワードが空の場合：
   │   構造化 WHERE 条件を用いて candidate_profiles を直接クエリ
   └── キーワードが存在する場合：
       MATCH または LIKE により candidate_search_fts をクエリ
       合致した candidate_id 配列を抽出
2. プリペアドステートメントによる動的 SQL の構築：
   JOIN candidate_profiles ON id IN (合致した candidate_id リスト)
   構造化条件（勤務地、学歴ランク、経験年数）を付加
3. ページネーションクエリの実行（LIMIT ? OFFSET ?）
4. 合計件数カウントクエリの実行
5. 各候補者レコードに動的年齢を付与：
   age = calculateAge(birth_date, now)
```

---

# 44. 候補者詳細 API 仕様

```js
// 候補者の完全なスナップショットを取得
async candidateGet(candidateId)

// 言語別履歴書バリアントを取得
async candidateResumeGet(candidateId, languageCode)

// 各サブエンティティの個別更新 API
async candidateUpdate(candidateId, profileData)
async candidateWorkExperiencesUpdate(candidateId, workExperiences)
async candidateEducationsUpdate(candidateId, educations)
async candidateSkillsUpdate(candidateId, skills)
async candidateLanguagesUpdate(candidateId, languages)
async candidateExpectationsUpdate(candidateId, expectations)
async candidateCommunicationAdd(candidateId, communicationRecord)
```

---

# 45. 求人詳細 API 仕様

```js
// 求人案件詳細および要件・統計情報の取得
async positionGet(positionId)

// 紐づく選考候補者一覧の取得
async positionCandidatesGet(positionId, {
  pipelineStage = null,
  decision = null,
  page = 1,
  pageSize = 50
})
```

---

# 46. 求人選考カンバン クエリ API

```js
// カンバンボード用のステージ別候補者一覧取得
async positionKanbanGet(positionId)
// 選考ステージごとにグルーピングされた候補者オブジェクトを返却：
// {
//   sourced: [...],
//   contacted: [...],
//   submitted: [...],
//   client_interview: [...],
//   offer: [...],
//   onboarded: [...]
// }
```

---

# 47. データ削除およびアーカイブ方針

## 候補者の削除方針
- **論理削除（アーカイブ）を推奨**: `candidate_status = 'archived'` に設定。デフォルトの検索結果からは除外されますが、過去のマッチング履歴や連絡履歴は保持されます。
- **物理削除（管理者限定）**: `candidate_profiles`、連絡先、職歴、学歴、`candidate_search_documents`、FTS インデックス、および関連する全 `position_candidate_matches` をカスケード削除。

## 求人ポジションの削除方針
- **論理削除を推奨**: `status = 'cancelled'` に設定。募集を終了し、以後の自動マッチングを停止。
- **物理削除**: 求人、要件テーブル、キーワード設定を削除し、紐づく全マッチングレコードをカスケード削除。

## 企業の削除方針
- **論理削除を推奨**: `status = 'inactive'` に設定。
- **物理削除**: 募集中の求人（`status = 'open'`）が存在する場合、物理削除を拒否。求人を先にアーカイブまたは削除することを必須とします。

---

# 48. セキュリティおよび操作監査ログ

重要な状態変更操作は、すべて `system_audit_logs` に記録します：
- 候補者、求人、またはクライアント企業の削除；
- システム推薦のマッチング判定に対する手動オーバーライド；
- システム共通設定やデータベースシードの変更；
- 一括インポートまたはデータ再インデックスの手動実行。

---

# 49. データベースバックアップおよびリカバリ

SQLite ネイティブオンラインバックアップ：
- `better-sqlite3` のバックアップ API による非ブロッキングホットバックアップ：
  ```js
  await db.backup(`backups/recruitment_${timestamp}.db`);
  ```
- **自動実行スケジュール**: アプリ起動時またはアイドル時のバックグラウンドタイマーで日次実行；
- **ローテーション保持方針**: 直近14世代のスナップショットを保持し、古いバックアップを自動パージ；
- **ロック競合ゼロ**: WAL モードにより、読み取り処理をブロックすることなく安全にバックアップ。

---

# 50. フェーズ別開発ロードマップ

## フェーズ 0：プロジェクト骨格構築
- Electron 43 + Vue 3 + Webpack 5 の初期リポジトリ構築；
- WAL モードを適用した SQLite 接続マネージャーの実装；
- MigrationRunner 基盤と初期スキーママイグレーション（`001_initial.sql`、`002_candidate_fts.sql`）。

## フェーズ 1：候補者サブシステム（現行フェーズ）
- **1A. Database**: 候補者スキーマ群、インデックス、FTS5 同期トリガーの完全配備；
- **1B. Importer**: 冪等性を検証済みの候補者 JSON インポートパイプライン；
- **1C. Candidate UI**: 動的年齢計算を備えた候補者一覧画面、独立タブ構成の多言語詳細ドロワー；
- **1D. RawText Rebuild**: 確定的な `raw_text` 再構築を伴うデータ更新パイプライン；
- **フェーズ 1 完了基準**: 9,860 件の候補者を1秒未満で高速全文検索可能、完全多言語対応。

## フェーズ 2：求人案件および自動マッチング
- **2A. Position CRUD**: 求人作成、要件定義、スキル・キーワードの重み付け設定；
- **2B. MatchEngine**: 多要素スコアリングエンジン（BM25、スキル、経験年数、学歴、地域）；
- **2C. ATS Pipeline**: ドラッグ＆ドロップ対応の選考進捗カンバンボード；
- **2D. 双方向自動マッチング**: 候補者更新・求人更新の双方からトリガーされる自動マッチング；
- **フェーズ 2 完了基準**: 新規求人作成時に瞬時に候補者を抽出・スコアリングし、適合理由を提示。

## フェーズ 3：クライアント企業管理
- **3A. 企業管理**: 企業マスター CRUD、企業担当者管理、契約・採用メモ；
- **3B. 求人紐付け**: 企業と求人の親子関係管理および採用枠管理；
- **フェーズ 3 完了基準**: クライアント企業の獲得から候補者の入社決定まで、採用一連のフローを完結。

---

# 51. 将来の拡張性（フェーズ 4 ロードマップ）

- Electron バックグラウンドワーカーによる履歴書ファイル（Word、PDF、Excel）の直接解析；
- ローカル LLM による候補者プロファイルの自動要約と強み抽出；
- ワンクリックでの企業宛て推薦メール自動作成および送信連携。

---

# 52. テスト仕様

## 52.1 Repository 単体テスト
- 全 Repository の CRUD 処理が正常に機能することを検証；
- プリペアドステートメントの再利用とパラメータサニタイズを検証。

## 52.2 RawTextBuilder 単体テスト
- スナップショット構成要素の確定的な並び順を検証；
- null / undefined の確実な除外と区切り文字（` | `）の出力を検証。

## 52.3 FTS5 全文検索テスト
- 中国語、英語、日本語トークンに対する trigram 検索精度を検証；
- 挿入、更新、削除トリガーによるインデックス同期を検証。

## 52.4 MatchEngine スコアリングテスト
- 境界条件（オーバースペック、歓迎スキル不足等）でのスコア計算精度を検証；
- `match_reason_json` の構造化出力内容を検証。

---

# 53. データ整合性に関する不変原則（Invariants）

### 候補者に関する不変原則
- 各候補者は `candidate_profiles` に一意の `candidate_uuid` を持つ1件のマスターレコードを保持；
- 年齢は生年月日から動的に算出され、静的な数値としては永続化しない；
- 第1言語（中国語）のマスター内容は構造化テーブル群に、第2言語以降は `candidate_resume_variants` に格納。

### 検索に関する不変原則
- `candidate_search_documents` は候補者1名につき厳格に1件のドキュメントを保持；
- `candidate_search_fts` の rowid は `candidate_search_documents.id` と完全に一致。

### マッチングに関する不変原則
- 候補者と求人の組み合わせは `position_candidate_matches` において最大1件のみ存在（`UNIQUE(position_id, candidate_id)`）；
- 人手による判定結果（`decision = 'accepted'` / `'dismissed'`）は、自動スコア計算によって決して上書きされない。

### 企業に関する不変原則
- `company_name` は一意制約を持つ；
- 企業担当者は必ず有効な `company_id` に紐づく。

### raw_text に関する不変原則
- 文字列の部分置換（`+=` や `replace`）は厳禁；
- 更新時は常に確定的な完全再構築（Full Rebuild）を実行。

---

# 54. 開発者・Codex 遵守規律

1. **文書化されたアーキテクチャの厳格な順守**: 許可されていない外部依存関係（例：Redis、MySQL、外部サーバーデーモン等）を独断で導入してはなりません。
2. **スキーマ逸脱の禁止**: すべてのテーブル定義、カラム名、制約、データ型は、本書に規定された DDL 仕様に厳格に準拠しなければなりません。
3. **モックフォールバックの厳禁**: IPC またはデータベース処理が失敗した場合、エラーを明示的に画面に表示し、完全な診断スタックトレースを保持すること。偽のモックデータへ暗黙にフォールバックしてはなりません。
4. **レイヤリングの純粋性の維持**: Renderer が直接 SQLite にアクセスしたり、直接 Node API を呼び出すことは厳禁です。すべてのデータ操作は型定義された IPC および Service を経由してください。
5. **raw_text の確定的生成**: `raw_text` を部分的な文字列置換でパッチしてはなりません。常に候補者スナップショットから完全再構築を行ってください。

---

# 55. 初期フェーズ推奨作成ファイル一覧

```text
electron/
├── src/database/Database.js
├── src/database/DatabasePath.js
├── src/database/MigrationRunner.js
├── src/database/migrations/001_initial.sql
├── src/database/migrations/002_candidate_fts.sql
├── src/database/repositories/CandidateRepository.js
├── src/database/repositories/CandidateSearchRepository.js
├── src/services/CandidateService.js
├── src/services/CandidateSearchService.js
├── src/candidate/search/CandidateRawTextBuilder.js
├── src/ipc/candidate.ipc.js
├── preload.js
frontend/
├── src/api/candidateApi.js
├── src/pages/candidate/CandidateList.vue
├── src/pages/candidate/CandidateDetailDrawer.vue
└── src/pages/candidate/tabs/
```

---

# 56. フェーズ 1 具体的一連の実装手順

```text
ステップ 1: データベース基盤の構築
├── WAL モードを適用した better-sqlite3 接続の構成
├── MigrationRunner の実装
└── 001_initial.sql および 002_candidate_fts.sql のマイグレーション実行

ステップ 2: 候補者インポーターとデータ検証
├── CandidateImportService の実装
├── 候補者 JSON の冪等インポートテストの実施
└── profiles、import_records、search_documents、FTS における 9,860 件の整合性検証

ステップ 3: 検索サブシステムおよび IPC 連携
├── CandidateSearchRepository および CandidateSearchService の実装
├── CandidateRawTextBuilder の実装
├── candidate.ipc.js および preload.js での IPC チャンネル公開
└── 1秒未満の高速キーワード検索および構造化絞り込みの検証

ステップ 4: フロントエンド候補者画面
├── 動的年齢計算とページネーションを備えた CandidateList.vue の実装
├── 多言語バリアント切り替えを備えた CandidateDetailDrawer.vue の実装
└── 基本情報、希望条件、職歴、学歴などの独立サブタブの実装

ステップ 5: データ更新と多言語ローカライゼーション（i18n）
├── 各タブに対する更新 API の実装
├── データ更新に伴う raw_text 再構築および FTS5 同期の実装
└── フロントエンド全画面およびナビゲーションに対する vue-i18n の適用
```

---

# 57. 初回実行前の事前チェックリスト

- [x] Node.js バージョンが適合していることを確認（Node 18+ / 20+）；
- [x] `better-sqlite3` が Electron ABI 向けにネイティブビルドされていることを確認；
- [x] データベースファイルパスが現在の Windows ユーザーに対して書き込み可能であることを確認；
- [x] `--source` 引数によるソース候補者 JSON ディレクトリのパスを確認；
- [x] MigrationRunner により初期スキーマが正常適用され `integrity_check = ok` であることを確認；
- [x] 自動単体テストがエラー 0 件で全通過することを確認。

---

# 58. 全体システムアーキテクチャフロー図

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Vue 3 フロントエンド（Renderer）                 │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   CandidateList.vue   │  │       CandidateDetailDrawer.vue        │ │
│  │ (全文検索・構造化絞込)│  │ (基本情報・職歴・学歴・スキル各タブ)   │ │
│  └───────────┬───────────┘  └───────────────────┬────────────────────┘ │
│              └─────────────────┬────────────────┘                      │
│                                ▼                                       │
│                       src/api/candidateApi.js                          │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼ (contextBridge)
┌────────────────────────────────────────────────────────────────────────┐
│                         Electron Preload API                           │
│                      window.electronApi.candidate                      │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼ (IPC invoke: 'candidate:channel')
┌────────────────────────────────────────────────────────────────────────┐
│                         Electron メインプロセス                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  src/ipc/candidate.ipc.js                        │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
│                                ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               CandidateService / CandidateSearchService          │  │
│  └──────────────┬───────────────────────────────────┬───────────────┘  │
│                 ▼                                   ▼                  │
│  ┌──────────────────────────────┐   ┌───────────────────────────────┐  │
│  │  CandidateRawTextBuilder.js  │   │   CandidateSearchRepository   │  │
│  └──────────────────────────────┘   └───────────────┬───────────────┘  │
│                                                     ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Database.js (better-sqlite3)                   │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          SQLite データベース                           │
│  ┌──────────────────────────────┐   ┌───────────────────────────────┐  │
│  │ candidate_* 構造化テーブル群 │   │ candidate_search_fts (FTS5)   │  │
│  └──────────────────────────────┘   └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

# 59. コア業務原則の総括

## 候補者ドメイン
- 構造化データベースが業務における唯一の真実（Truth）です；
- `raw_text` は全文検索のために最新データからオンデマンドで完全再構築されます；
- 年齢は生年月日から動的に算出され、静的な履歴書上の年齢は使用しません。

## 求人ドメイン
- 求人案件を起点として候補者プールから最適な人材を抽出；
- 募集要件はハードフィルター（学歴、経験年数、勤務地）と重み付けソフト要件（スキル、語学）で構成。

## 企業ドメイン
- クライアント企業は複数の求人ポジションを保持（`1:N`）；
- 募集中の求人が存在する企業の物理削除は厳禁です。

## PositionCandidateMatch ドメイン
- `decision`（適合判定）と `pipeline_stage`（選考進捗）は完全分離；
- エージェントによる人手判断は、自動スコアリングに対して常に絶対的な優先権を持ちます。

---

# 60. 恒久的に維持すべき最重要不変ルール

1. **唯一の真実（Single Source of Truth）**: 構造化 SQLite データベースのみが業務の真実であり、元 JSON は不変の監査証跡です。
2. **確定的な完全再構築**: 候補者データに変更があった場合は常にスナップショットから `raw_text` を完全再構築します。部分文字列置換は禁止です。
3. **ワークフローと判定の分離**: `decision` と `pipeline_stage` は独立して管理し、自動スコア計算が人手による承認・除外判定を上書きすることはありません。
4. **アーキテクチャの純粋性**: Renderer は型定義された IPC API を経由してのみデータにアクセスします。Renderer からの DB 直接接続は厳禁です。

---

# 61. 開発着手マイルストーン

着手優先順位：

```text
Electron + Vue + JavaScript の基本骨格の構築
        ↓
SQLite データベース接続および MigrationRunner の実装
        ↓
001_initial.sql および 002_candidate_fts.sql の実行
        ↓
候補者 JSON インポーターの実装と冪等性の検証
        ↓
フェーズ 1 候補者サブシステムの UI および検索 API の納品
```

---

# 62. 候補者一覧フィールド落地検収基準（2026-08-10）

- 9,860 件の元 JSON、11,637 件の履歴書に対する全件スキャン検証；
- 希望就職条件は一元的に `resumes[i].expected_list` に統一；
- 一覧表示フィールドは SQLite、Electron Repositories、およびフロントエンドコンポーネント間で完全整合；
- 連絡・面談履歴は候補者レベル（`candidate_communications`）に統一集約；
- 標準化された JSON からの初期 DB 完全再構築：9,860 候補者、11,637 履歴書、失敗 0 件、データ欠落 0 件、`integrity_check = ok`；
- 検証監査コマンド：
  ```bash
  cd electron && npm run audit:candidate-lists -- E:\resume-system\codex-complete-jsons\complete E:\resume-system\code\data\recruitment.db
  ```
- JSON 標準化コマンド：
  ```bash
  cd electron && npm run normalize:candidate-json-lists -- E:\resume-system\codex-complete-jsons\complete
  ```

---

**END OF DOCUMENT**
