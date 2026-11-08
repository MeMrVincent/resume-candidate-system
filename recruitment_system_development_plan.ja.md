# 人材紹介・採用管理システム V2 開発計画および全機能設計仕様書

> **言語ナビゲーション / Language Navigation / 语言导航**  
> [English](recruitment_system_development_plan.md) | [简体中文](recruitment_system_development_plan.cn.md) | **日本語**

---

**ドキュメントバージョン**: 2.0.0  
**更新日**: 2026-11-08  
**対象読者**: Codex / Antigravity / フルスタック開発エンジニアチーム  
**システム形態**: エンタープライズ向けローカルオフライン Electron デスクトップアプリケーション  
**コア技術基準**: Electron 45.2.3 + better-sqlite3 13.0.3 + SQLite 3.53.4 (WAL モード) + Vue 3.5.45 + Element Plus 2.14.8 + vue-i18n 11.4.18  
**現在のマイルストーン達成状況**:
- **Phase 1（候補者コア資産データベース）**：9,860件の整形済み履歴書JSONの取り込み、多言語履歴書マージ、SQLite FTS5 trigram 全文検索が本番稼働中。
- **Phase 2（求人案件および ATS パイプライン・マッチング流転）**：求人登録、適合判定と選考ステージの完全分離、複数回面接管理、内定・保証期間管理、3つのリアルタイム集計ビューを全量実装済み。
- **Phase 3（クライアント企業 CRM）**：企業マスター、複数担当者管理、求人紐付きカスケード論理削除保護、Vue 3 CRM 画面をフルスタックで実装完了。
- **エンジニアリングおよびテスト**：バックエンド全24件の自動テストを完全パス。Electron Builder によるローカルパッケージング（NSIS / Portable / Unpacked）の動作検証完了。

---

## 0. バージョン進化と V2 コア差異仕様 (V1 vs V2)

V1 バージョンと比較して、V2 バージョンは業務深度、データベース設計、インポート監査、パッケージングにおいて大きな進化を遂げています：

### 0.1 コア差異対比マトリクス

| 評価軸 | V1.0 バージョンの実装 | V2.0 バージョンの重大な進化 |
| :--- | :--- | :--- |
| **マイグレーション体系** | 7個の累積パッチ（`001_initial` 〜 `007_communication_list_fields`） | **ドメイン駆動設計（DDD）に基づく5つの独立モジュール**（`001_system` 〜 `005_search_views`）に再構築 |
| **システムインフラ基盤** | 設定と簡易監査ログのみ | **`system_users`（システム操作者）テーブルを追加**し、企業・求人・連絡履歴に対する明確な担当コンサルタント帰属と監査追跡を実現 |
| **企業顧客 CRM (Phase 3)** | アーキテクチャ計画のみで実コードなし | **フルスタック完全実装**：`company_profiles`、`company_contacts`、`company_notes`、主担当者自動交代機能、カスケード論理削除保護、Vue 3 CRM 画面 |
| **求人と選考パイプライン** | 基礎的なマッチングテーブルのみ | **高精度な業務モデリング**：`position_candidate_interviews`（複数回面接と評価）、`position_candidate_placements`（入社・オファー年収・保証期間日数・成約手数料決済）、`position_candidate_history`（ライフサイクル履歴追跡） |
| **判定と選考の完全分離** | アプリケーション側の暗黙ルール | **DB レベルの厳格な CHECK 制約**：`CHECK (stage IS NULL OR decision = 'accepted')` により、適合判定を通過した候補者のみを選考ステージに進めるよう物理制限 |
| **集計・分析モデル** | 画面側でアドホックに SQL を結合 | **3つの高性能リアルタイム集計ビューを内蔵**：`v_candidate_stats`、`v_position_pipeline_counts`、`v_company_position_counts` |
| **候補者インポートエンジン** | コマンドライン単発インポート | **対話型インポートエンジン (Import V3)**：GUI フォルダ/ファイル選択、`candidate_import_batches` 履歴、`candidate_import_errors` 詳細ログ、**厳格モード衝突防止**、多言語不整合診断 |
| **多言語対応 (i18n)** | 全体言語辞書の起動時一括読み込み | **ルート単位のオンデマンド非同期分割ロード**（`meta.i18nPacks` ルートガード）：起動時は `core.json` のみ、画面遷移時に必要パックを動的ロード、英語デフォルト（`en-us`）、日中英キー完全一致 |
| **パッケージング・配布** | 配布設定未整備 | **`electron-builder` 完全対応**：ポータブル版、NSIS インストーラ、展開済みディレクトリ（`dist:dir`）、読み取り専用シード DB のマウントとスモークテスト検証完了 |
| **自動テスト網** | 10件の基礎テスト | **24件の網羅的自動テストへ拡充**（企業管理、厳格モード、衝突判定、多言語許容差など）、100% 合格 |

---

## 1. システム業務目標とエンドツーエンド業務フロー

本システムは、コンサルタントのローカル環境で高速・安定動作するエンタープライズ向け「人材紹介 CRM + ATS + 人材スマート検索マッチングプラットフォーム」です。

### 1.1 順方向コア紹介業務サイクル

```text
クライアント企業 (Company)
      ↓
求人案件登録 (Position Openings)
      ↓
FTS5 全文検索リコール + 構造化条件フィルタリング (Recall)
      ↓
システム推薦・適合度スコアリング (MatchEngine Scoring)
      ↓
コンサルタント適合判定 (decision: accepted / dismissed)
      ↓
候補者への意向確認・連絡 (candidate_communications)
      ↓
企業への推薦提出 (stage: submitted)
      ↓
クライアント面接管理 (position_candidate_interviews)
      ↓
内定・入社および成約決済 (position_candidate_placements)
      ↓
入社後保証期間の達成確認 (guarantee_passed)
```

### 1.2 逆方向ライフサイクル追跡

候補者詳細画面から、以下の履歴を即座に逆引き追跡できます：
- これまでにどの企業・どの求人に推薦されたか；
- 各求人の選考ステージ進行状況（連絡中、推薦済み、面接回次、内定、入社済み）；
- 各面接の面接官フィードバックと評価コメント；
- 保証期間のステータスとコミュニケーションタイムライン。

---

## 2. V2 全機能アーキテクチャおよび機能一覧（全景）

V2 の全機能は **10大機能モジュール** で構成されています：

### モジュール 1：クライアント企業 CRM システム (Client Company CRM)
1. **企業マスターライフサイクル管理**：
   - 企業の新規作成、編集、閲覧、検索、ステータス変更；
   - 属性：企業正式名称（一意制約）、略称、業界、企業規模、国/都道府県/市区町村、所在地、Webサイト、企業概要；
   - 企業ステータス：`active`（取引中）、`inactive`（休止中）、`blacklisted`（ブラックリスト）；
   - 担当コンサルタント（`owner_user_id`）の紐付け、作成者・更新者監査ログ。
2. **複数担当者ディレクトリ (`company_contacts`)**：
   - 1社に対して複数の担当者（人事、部門責任者、採用担当）を登録可能；
   - 属性：氏名、役職、部署、電話番号、メールアドレス、WeChat、ステータス（`active` 在職 / `left` 退職）、備考；
   - **主担当者自動交代メカニズム**：最初に登録された担当者が自動的に主担当者（`is_primary=1`）に設定され、別の担当者を主担当者に指定した場合は元の主担当者が自動解除され、常に社内に1名の主担当者を保持；
   - 外部キー保護：求人案件の担当窓口になっている担当者は**削除不可**（`IN_USE` エラー）、先に求人の担当者を変更するか退職済みに設定する必要あり。
3. **カスケード整合性保護と論理削除**：
   - 企業に紐づく**求人が一切存在しない場合**は物理削除（`deleted`）を実行し、担当者・メモをカスケード削除；
   - 企業に紐づく**求人が存在する場合**は物理削除を遮断し、自動的に**論理削除**（`deactivated`）としてステータスを `inactive` に変更して履歴を完全保全。
4. **企業フォローアップメモ (`company_notes`)**：
   - 企業訪問記録、契約条件のメモ、商談議事録を時系列で管理。
5. **フロントエンド CRM ワークスペース**：
   - 企業一覧画面（曖昧検索、ステータス絞り込み、ページネーション）；
   - 企業詳細カード（基本情報、求人集計、担当者一覧、メモ投稿タイムライン）；
   - 担当者編集ポップアップ（`contact.popup.vue`）および企業編集ポップアップ（`edit.popup.vue`）。

---

### モジュール 2：求人案件および要件管理 (Position Management)
1. **求人案件のデータ構造**：
   - 企業（`company_id`）および担当窓口（`contact_id`）との連携；
   - 属性：求人名、募集部門、採用予定人数（`headcount >= 1`）、勤務都市、勤務地詳細、雇用形態（正社員/契約社員等）；
   - 給与条件：年収範囲（`salary_min` 〜 `salary_max`）、通貨（CNY/USD/JPY）、賞与支給月数；
   - 応募要件：必要経験年数（`experience_min` 〜 `experience_max`）、最低学歴ランク（1〜7）、職務内容（JD）、応募資格テキスト；
   - 採用設定：保証期間日数（`guarantee_days`）、募集緊急度（`priority`: `low`, `normal`, `high`, `urgent`）；
   - ステータス遷移：`draft`（下書き） -> `open`（募集中） -> `paused`（一時停止） -> `filled`（充足） -> `closed`（クローズ） / `cancelled`（中止）。
2. **企業担当者の所属整合性トリガー**：
   - SQLite トリガー `trg_position_contact_belongs_ins` および `trg_position_contact_belongs_upd`；
   - 求人の窓口担当者（`contact_id`）がその求人の所属企業（`company_id`）に実在することを DB レベルで物理検証。
3. **求人キーワードとスキル要件 (`position_keywords`)**：
   - スキル、言語、業界、都市、職種、学歴などの重み付けキーワード管理。
4. **案件パイプライン進捗ダッシュボード**：
   - `v_position_pipeline_counts` ビューと連動し、案件ごとの選考通過数、推薦中、面接中、内定、入社済みの人数をリアルタイム表示。

---

### モジュール 3：候補者マスタと多言語履歴書ガバナンス
1. **候補者基本台帳 (`candidate_profiles`)**：
   - 候補者 UUID、インポート元識別子 `record_id`；
   - 基本属性：氏名、英語名、性別、生年月日、居住都市、現職企業、現職ポジション、最終学歴、総経験年数；
   - 連絡先検索高速化：代表電話番号（`primary_phone`）と代表メールアドレス（`primary_email`）に一意制約インデックス；
   - ステータス：`active`（アクティブ候補者）または `archived`（アーカイブ）。
2. **多次元連絡先管理 (`candidate_contacts`)**：
   - 携帯電話、固定電話、メールアドレスの3種別；
   - 国番号 `+86` の除去やメールの小文字化による正規化；
   - **一意性および共有電話番号の判定**：
     - 代表携帯電話と代表メールアドレスは全体で一意制約；
     - 固定電話（代表番号等）は一意制約から除外され、複数候補者での共有を許容；
     - サブ連絡先は共有可能フラグ（`is_shared=1`）に対応。
3. **8つの構造化サブテーブル群**：
   - `candidate_resumes`：多言語履歴書バージョン（中国語版が必ず主履歴書となり、英語版・日本語版を紐付け。身長、体重、婚姻、PR文等）；
   - `candidate_expectations`：希望条件（希望職種、業界、勤務地、雇用形態、希望年収範囲、入社可能時期）；
   - `candidate_work_experiences`：職歴（社名、業界、規模、在籍期間、役職、部署、上司、部下数、職務内容、実績、退職理由）；
   - `candidate_educations`：学歴（学校名、専攻、学位タイプとランク 1〜7、在学期間）；
   - `candidate_projects`：プロジェクト経験（案件名、役割、期間、内容、成果、技術キーワード）；
   - `candidate_trainings`：研修・教育履歴；
   - `candidate_languages`：語学力（言語名、レベル、資格、取得年月）；
   - `candidate_certificates`：資格・免許（資格名、取得時期）；
   - `candidate_skills`：保有スキル（スキル名、習熟度）。
4. **多言語履歴書マージエンジン (V3 Merge Parser)**：
   - 日中英の履歴書を解析し構造化マージ；
   - **整合性診断**：言語間での職歴・学歴の件数を比較。軽微な日付のズレは許容し、大幅なズレや欠落は `import_warnings_report.txt` に警告ログを出力。
5. **コミュニケーション履歴 (`candidate_communications`)**：
   - 面談・架電メモを管理し、インポート時に自動生成された履歴と手動メモを識別。

---

### モジュール 4：スマート全文検索と高精度リコール
1. **SQLite FTS5 Trigram 全文検索**：
   - `trigram` トークナイザによる FTS5 仮想テーブル；
   - 日中英の任意の3文字以上の文字列に対してミリ秒単位の高速曖昧検索を実行。
2. **検索ドキュメントの自動合成 (`CandidateRawTextBuilder`)**：
   - 職歴・学歴・スキル・PR文の全テキストを自動連結；
   - DB トリガー（`trg_search_doc_ai/ad/au`）により、データ更新時に FTS5 仮想テーブルと完全同期。
3. **複合条件絞り込み**：
   - 経験年数、学歴ランク、年収帯、希望勤務地、語学レベルによる多軸検索。
4. **適合度判定ワークフロー**：
   - キーワード適合スコアリング；
   - コンサルタント判定：`suggested`（候補） -> `accepted`（合格・進める） / `dismissed`（見送り）。

---

### モジュール 5：ATS 採用パイプライン流転管理
1. **判定とステージの厳格な分離**：
   - DB 制約：
     - `CHECK (stage IS NULL OR decision = 'accepted')`：適合と判定された候補者のみが選考ステージを保持；
     - `CHECK (decision <> 'accepted' OR stage IS NOT NULL)`：適合候補者は必ずステージを保持。
2. **選考パイプラインステージ**：
   - 進行ステージ：`pending_contact` -> `contacting` -> `interested` -> `submitted`（推薦） -> `interviewing`（面接） -> `interview_passed` -> `background_check` -> `offer` -> `hired`（入社） -> `guarantee_passed`（保証達成）；
   - 終了ステージ：辞退、不採用、内定辞退、保証期間内退職等。
3. **複数回面接管理 (`position_candidate_interviews`)**：
   - 面接回次（`round_no`）、面接形式（一次、二次、役員等）、日時、面接官、合否結果、評価フィードバック。
4. **内定・入社および保証期間管理 (`position_candidate_placements`)**：
   - オファー年収、入社日、求人から引き継いだ保証期間日数（`guarantee_days`）、保証期日（`guarantee_end_date`）の自動算出。
5. **選考履歴監査追跡 (`position_candidate_history`)**：
   - ステージ変更や判定変更の全履歴をタイムスタンプ、操作者、変更理由とともに記録。

---

### モジュール 6：一括インポートワークベンチと競合監査
1. **デスクトップネイティブファイル/フォルダ選択**：
   - Electron ネイティブダイアログによる JSON ファイルおよびフォルダの再帰走査。
2. **バッチ実行履歴 (`candidate_import_batches`)**：
   - 処理ファイル数、新規作成数、更新数、スキップ数、厳格モード拒絶数、警告件数を記録。
3. **SHA-256 コンテンツハッシュによる同一ファイルスキップ**：
   - 変更のないファイルを即座にスキップし、修正ファイルは上書き更新。
4. **厳格モード（Strict Mode）競合防止機能**：
   - 代表電話番号やメールアドレスが既存候補者と重複している場合、書き込みを即座に中断・ロールバック。
5. **エラー・警告の詳細管理 (`candidate_import_errors`)**：
   - エラー種別（`contact_conflict`, `list_misaligned`, `bad_date` 等）とスタックトレースを記録。
6. **インポート画面 UI (`candidate/import.vue`)**：
   - 進捗バー、バッチ履歴一覧、警告・エラー確認ダイアログ。

---

### モジュール 7：リアルタイム集計ビューと意思決定支援
1. **候補者実績ビュー (`v_candidate_stats`)**：
   - `recommend_count`（企業推薦回数）、`success_count`（成約入社回数）、`communication_count`（有効連絡回数）。
2. **案件パイプライン集計ビュー (`v_position_pipeline_counts`)**：
   - 求人ごとの選考進捗人数集計（推薦中、面接中、内定、入社済み）。
3. **企業稼働状況ビュー (`v_company_position_counts`)**：
   - 企業ごとの総求人数および募集中求人数。

---

### モジュール 8：システム管理とセキュリティ
1. **ユーザー管理 (`system_users`)**：
   - 管理者（`admin`）およびコンサルタント（`consultant`）のアカウント状態管理。
2. **操作監査ログ (`system_audit_logs`)**：
   - データ変更前後の JSON スナップショット記録。
3. **システム設定 (`system_settings`)**：
   - ローカル環境キー・バリュー設定。
4. **非同期ジョブ管理 (`system_jobs`)**：
   - 長時間バックグラウンド処理の管理とリトライ。

---

### モジュール 9：多言語化（i18n）アーキテクチャ
1. **日・中・英の3言語対応**：
   - 英語デフォルト（`en-us`）、日本語（`ja-jp`）、簡体字中国語（`zh-cn`）に対応し、再起動なしで切替可能。
2. **ルート別オンデマンド動的分割読み込み (`meta.i18nPacks`)**：
   - 起動時は `core.json` のみ読み込み、画面遷移時に `company.json`、`candidateImport.json` を動的取得。
3. **Element Plus 多言語同期**：
   - システム言語切替時に UI コンポーネントの内蔵テキストも完全同期。

---

### モジュール 10：オフライン動作とデスクトップ配布
1. **完全ローカルオフライン動作**：
   - 外部通信不要、ローカル SQLite による機密人材データの保護。
2. **最新ランタイム基盤**：
   - Electron 45.2.3、Node 20+、better-sqlite3 13.0.3 ネイティブドライバ。
3. **`electron-builder` 配布形式**：
   - 展開済みディレクトリ（`npm run dist:dir`）、ポータブル単一バイナリ、NSIS インストーラ。
4. **自動マイグレーション**：
   - 初回起動時にシード DB をユーザー領域へコピーし、最新スキーマへ自動移行。

---

## 3. データベース全量 DDL 仕様 (5つのマイグレーションモジュール)

### 3.1 Migration 001: システム基盤 (`001_system.sql`)

```sql
-- 001_system.sql  系统基础表 | System base tables | システム基本テーブル

CREATE TABLE system_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid     TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin','consultant')),
    status        TEXT NOT NULL DEFAULT 'active'     CHECK (status IN ('active','disabled')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE system_settings (
    setting_key   TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL
);

CREATE TABLE system_jobs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type          TEXT NOT NULL CHECK (job_type IN (
        'import_candidates','rebuild_raw_text','match_position','match_candidate',
        'guarantee_check','database_backup')),
    entity_type       TEXT NOT NULL DEFAULT '',
    entity_id         INTEGER,
    dedupe_key        TEXT NOT NULL DEFAULT '',
    payload_json      TEXT NOT NULL DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued','running','completed','failed','cancelled')),
    progress_current  INTEGER NOT NULL DEFAULT 0,
    progress_total    INTEGER NOT NULL DEFAULT 0,
    error_message     TEXT NOT NULL DEFAULT '',
    created_by        INTEGER REFERENCES system_users(id),
    created_at        TEXT NOT NULL,
    started_at        TEXT,
    finished_at       TEXT
);
CREATE INDEX idx_system_jobs_status ON system_jobs(status);
CREATE INDEX idx_system_jobs_dedupe ON system_jobs(job_type, dedupe_key, status);

CREATE TABLE system_audit_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type       TEXT NOT NULL,
    entity_id         INTEGER,
    action            TEXT NOT NULL,
    before_json       TEXT,
    after_json        TEXT,
    operator_user_id  INTEGER REFERENCES system_users(id),
    created_at        TEXT NOT NULL
);
CREATE INDEX idx_system_audit_entity ON system_audit_logs(entity_type, entity_id);

-- 单机版固定的本地系统用户（所有 owner / created_by / updated_by 默认指向它）
-- Fixed local system user of the standalone edition (every owner / created_by / updated_by points to it by default)
-- スタンドアロン版の固定ローカルシステムユーザー（owner / created_by / updated_by は既定でこのユーザーを指す）
INSERT INTO system_users (id, user_uuid, username, display_name, role, status, created_at, updated_at)
VALUES (1, 'system-local-user', 'system', '系统', 'admin', 'active',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
```

---

### 3.2 Migration 002: 企業および求人案件 (`002_company_position.sql`)

```sql
-- 002_company_position.sql  公司、对接人、职位、职位关键词 | Companies, contacts, positions, position keywords | 企業、担当者、求人、求人キーワード

CREATE TABLE company_profiles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_uuid  TEXT NOT NULL UNIQUE,
    company_name  TEXT NOT NULL UNIQUE,
    short_name    TEXT NOT NULL DEFAULT '',
    industry      TEXT NOT NULL DEFAULT '',
    company_size  TEXT NOT NULL DEFAULT '',
    country       TEXT NOT NULL DEFAULT '',
    province      TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    address       TEXT NOT NULL DEFAULT '',
    website       TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
    owner_user_id INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_profiles_status ON company_profiles(status);

CREATE TABLE company_contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    contact_name  TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    department    TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    wechat        TEXT NOT NULL DEFAULT '',
    is_primary    INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
    note          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_contacts_company ON company_contacts(company_id);
CREATE UNIQUE INDEX uq_company_contacts_one_primary
    ON company_contacts(company_id) WHERE is_primary = 1;

CREATE TABLE company_notes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    noted_at      TEXT NOT NULL,
    note_type     TEXT NOT NULL DEFAULT 'note',
    content       TEXT NOT NULL,
    created_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_notes_company ON company_notes(company_id);

CREATE TABLE position_openings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    position_uuid    TEXT NOT NULL UNIQUE,
    company_id       INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    contact_id       INTEGER NOT NULL REFERENCES company_contacts(id) ON DELETE RESTRICT,
    owner_user_id    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    title            TEXT NOT NULL,
    department       TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    work_location    TEXT NOT NULL DEFAULT '',
    employment_type  TEXT NOT NULL DEFAULT '全职',
    headcount        INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1),
    salary_min       REAL,
    salary_max       REAL,
    salary_currency  TEXT NOT NULL DEFAULT 'CNY',
    salary_months    REAL,
    experience_min   REAL,
    experience_max   REAL,
    degree_min_rank  INTEGER CHECK (degree_min_rank IS NULL OR degree_min_rank BETWEEN 1 AND 7),
    jd_text          TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    requirements_text TEXT NOT NULL DEFAULT '',
    guarantee_days   INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_days >= 0),
    priority         TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status           TEXT NOT NULL DEFAULT 'draft'  CHECK (status IN (
        'draft','open','paused','filled','closed','cancelled')),
    opened_at        TEXT,
    closed_at        TEXT,
    last_matched_at  TEXT,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_position_openings_company ON position_openings(company_id);
CREATE INDEX idx_position_openings_contact ON position_openings(contact_id);
CREATE INDEX idx_position_openings_status  ON position_openings(status);
CREATE INDEX idx_position_openings_title   ON position_openings(title);

-- 职位负责人（对接人）必须属于该职位所在的公司
-- The person in charge of a position (a company contact) must belong to the company of that position
-- 求人の担当者（先方窓口）は、その求人が属する企業の窓口でなければならない
CREATE TRIGGER trg_position_contact_belongs_ins
BEFORE INSERT ON position_openings
BEGIN
    SELECT RAISE(ABORT, 'position contact must belong to the position company')
    WHERE NOT EXISTS (
        SELECT 1 FROM company_contacts WHERE id = NEW.contact_id AND company_id = NEW.company_id);
END;

CREATE TRIGGER trg_position_contact_belongs_upd
BEFORE UPDATE OF company_id, contact_id ON position_openings
BEGIN
    SELECT RAISE(ABORT, 'position contact must belong to the position company')
    WHERE NOT EXISTS (
        SELECT 1 FROM company_contacts WHERE id = NEW.contact_id AND company_id = NEW.company_id);
END;

CREATE TABLE position_keywords (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id   INTEGER NOT NULL REFERENCES position_openings(id) ON DELETE CASCADE,
    keyword       TEXT NOT NULL,
    keyword_type  TEXT NOT NULL DEFAULT 'other' CHECK (keyword_type IN (
        'skill','language','industry','city','title','degree','other')),
    weight        REAL NOT NULL DEFAULT 1,
    is_required   INTEGER NOT NULL DEFAULT 0 CHECK (is_required IN (0,1)),
    source        TEXT NOT NULL DEFAULT 'rule' CHECK (source IN ('rule','manual')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    UNIQUE (position_id, keyword)
);
```

---

### 3.3 Migration 003: 候補者マスターおよびインポート監査 (`003_candidate.sql`)

```sql
-- 003_candidate.sql  候选人主档、联系方式、导入批次、简历及其列表子表 | Candidate profile, contacts, import batches, resumes and their list tables | 候補者マスタ、連絡先、インポートバッチ、履歴書とそのリストテーブル
-- 列表子表沿用 v3 JSON 字段名；日期统一 ISO（YYYY-MM-DD / YYYY-MM）；薪资 REAL。 | List tables reuse the v3 JSON field names; dates are ISO (YYYY-MM-DD / YYYY-MM); salaries are REAL. | リストテーブルは v3 JSON のフィールド名を踏襲し、日付は ISO（YYYY-MM-DD / YYYY-MM）、給与は REAL とする。

CREATE TABLE candidate_profiles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_uuid   TEXT NOT NULL UNIQUE,
    record_id        TEXT NOT NULL DEFAULT '',          -- merge-v3-<group_id>
    full_name        TEXT NOT NULL DEFAULT '',
    english_name     TEXT NOT NULL DEFAULT '',
    gender           TEXT NOT NULL DEFAULT '',
    birth_date       TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    primary_phone    TEXT NOT NULL DEFAULT '',          -- 冗余自 candidate_contacts（主号）
    primary_email    TEXT NOT NULL DEFAULT '',
    current_company  TEXT NOT NULL DEFAULT '',
    current_position TEXT NOT NULL DEFAULT '',
    highest_degree   TEXT NOT NULL DEFAULT '',
    work_years       REAL,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    source_type      TEXT NOT NULL DEFAULT 'import' CHECK (source_type IN ('import','manual','position')),
    source_position_id INTEGER REFERENCES position_openings(id) ON DELETE SET NULL,
    owner_user_id    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE UNIQUE INDEX uq_candidate_primary_phone ON candidate_profiles(primary_phone) WHERE primary_phone <> '';
CREATE UNIQUE INDEX uq_candidate_primary_email ON candidate_profiles(primary_email) WHERE primary_email <> '';
CREATE INDEX idx_candidate_profiles_name   ON candidate_profiles(full_name);
CREATE INDEX idx_candidate_profiles_status ON candidate_profiles(status);
CREATE INDEX idx_candidate_profiles_source_position ON candidate_profiles(source_position_id);
CREATE INDEX idx_candidate_profiles_record ON candidate_profiles(record_id);

CREATE TABLE candidate_contacts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    contact_type     TEXT NOT NULL CHECK (contact_type IN ('mobile','landline','email')),
    contact_value    TEXT NOT NULL,                      -- 原值
    normalized_value TEXT NOT NULL,                      -- 手机/座机仅数字(去86)；邮箱小写
    is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    is_shared        INTEGER NOT NULL DEFAULT 0 CHECK (is_shared IN (0,1)),
    source           TEXT NOT NULL DEFAULT 'import' CHECK (source IN ('import','manual')),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    CHECK (NOT (is_primary = 1 AND is_shared = 1)),
    UNIQUE (candidate_id, contact_type, normalized_value)
);
-- 手机/邮箱全局唯一（共用的允许多人重复出现；座机不限，常为公司总机）
-- Mobile numbers / emails are globally unique (shared ones may appear for several people; landlines are not restricted since they are often a company switchboard)
-- 携帯番号・メールは全体で一意（共用は複数人に重複可。固定電話は会社の代表番号が多いため制限しない）
CREATE UNIQUE INDEX uq_candidate_contacts_value
    ON candidate_contacts(contact_type, normalized_value) WHERE is_shared = 0 AND contact_type <> 'landline';
CREATE UNIQUE INDEX uq_candidate_contacts_primary
    ON candidate_contacts(candidate_id, contact_type) WHERE is_primary = 1;
CREATE INDEX idx_candidate_contacts_lookup ON candidate_contacts(contact_type, normalized_value);

CREATE TABLE candidate_import_batches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_uuid       TEXT NOT NULL UNIQUE,
    source_dir       TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
    total_files      INTEGER NOT NULL DEFAULT 0,
    created_count    INTEGER NOT NULL DEFAULT 0,
    updated_count    INTEGER NOT NULL DEFAULT 0,
    skipped_count    INTEGER NOT NULL DEFAULT 0,
    failed_count     INTEGER NOT NULL DEFAULT 0,
    rejected_count   INTEGER NOT NULL DEFAULT 0,   -- 严格模式下因警告被拒绝写库的文件数 | Files rejected in strict mode because of warnings | 厳格モードで警告のため書き込みを拒否したファイル数
    warning_count    INTEGER NOT NULL DEFAULT 0,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    started_at       TEXT NOT NULL,
    finished_at      TEXT
);

CREATE TABLE candidate_import_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id         INTEGER NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    candidate_id     INTEGER REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL,
    record_id        TEXT NOT NULL DEFAULT '',
    content_hash     TEXT NOT NULL DEFAULT '',
    result           TEXT NOT NULL CHECK (result IN ('created','updated','skipped','failed','rejected')),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_import_records_batch ON candidate_import_records(batch_id);
CREATE INDEX idx_import_records_hash  ON candidate_import_records(content_hash);
CREATE INDEX idx_import_records_candidate ON candidate_import_records(candidate_id);

CREATE TABLE candidate_import_errors (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id         INTEGER NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    candidate_id     INTEGER REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL DEFAULT '',
    severity         TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning','error')),
    error_code       TEXT NOT NULL DEFAULT '',          -- contact_conflict / list_misaligned / bad_date / parse_error ...
    message          TEXT NOT NULL DEFAULT '',
    detail_json      TEXT NOT NULL DEFAULT '{}',
    resolved         INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0,1)),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_import_errors_batch ON candidate_import_errors(batch_id);
CREATE INDEX idx_import_errors_code  ON candidate_import_errors(error_code, resolved);

-- 简历版本（resumes[]）；第 0 份恒为 zh 主简历
-- Resume versions (resumes[]); the 0th one is always the main zh resume
-- 履歴書バージョン（resumes[]）。0 番目は常に zh のメイン履歴書
CREATE TABLE candidate_resumes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    language_code    TEXT NOT NULL DEFAULT 'zh',        -- JSON: resume_languge
    is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    full_name        TEXT NOT NULL DEFAULT '',
    gender           TEXT NOT NULL DEFAULT '',
    age              INTEGER,
    birth_date       TEXT NOT NULL DEFAULT '',
    birth_year       INTEGER,
    city             TEXT NOT NULL DEFAULT '',
    address          TEXT NOT NULL DEFAULT '',
    nationality      TEXT NOT NULL DEFAULT '',
    marital_status   TEXT NOT NULL DEFAULT '',
    children_status  TEXT NOT NULL DEFAULT '',
    political_status TEXT NOT NULL DEFAULT '',
    household_registration TEXT NOT NULL DEFAULT '',
    postal_code      TEXT NOT NULL DEFAULT '',
    height_cm        REAL,
    weight_kg        REAL,
    pr               TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    email            TEXT NOT NULL DEFAULT '',
    platform_from    TEXT NOT NULL DEFAULT '',
    platform_resume_id TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (candidate_id, sequence_no),
    CHECK (is_primary = 0 OR language_code = 'zh')
);
CREATE UNIQUE INDEX uq_candidate_resumes_primary ON candidate_resumes(candidate_id) WHERE is_primary = 1;

CREATE TABLE candidate_expectations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    expected_position TEXT NOT NULL DEFAULT '',
    expected_industry TEXT NOT NULL DEFAULT '',
    expected_city    TEXT NOT NULL DEFAULT '',
    expected_employment_type TEXT NOT NULL DEFAULT '',
    expected_salary  TEXT NOT NULL DEFAULT '',
    expected_annual_salary_min REAL,
    expected_annual_salary_max REAL,
    expected_start_date TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_work_experiences (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    company_name     TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '',
    company_employees TEXT NOT NULL DEFAULT '',
    position         TEXT NOT NULL DEFAULT '',
    position_dept    TEXT NOT NULL DEFAULT '',
    position_type    TEXT NOT NULL DEFAULT '',
    position_start   TEXT NOT NULL DEFAULT '',          -- ISO YYYY-MM[-DD]
    position_resigned TEXT NOT NULL DEFAULT '',         -- '' 表示至今
    position_report_to TEXT NOT NULL DEFAULT '',
    position_subordinate TEXT NOT NULL DEFAULT '',
    position_salary  TEXT NOT NULL DEFAULT '',
    annual_salary_min REAL,
    annual_salary_max REAL,
    employment_type  TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT '',
    resigned_reason  TEXT NOT NULL DEFAULT '',
    position_responsibilities TEXT NOT NULL DEFAULT '',
    position_achievements TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_educations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    school_name      TEXT NOT NULL DEFAULT '',
    school_major_name TEXT NOT NULL DEFAULT '',
    school_degree_type TEXT NOT NULL DEFAULT '',
    school_degree_rank INTEGER,
    school_education_type TEXT NOT NULL DEFAULT '',
    school_start_ym  TEXT NOT NULL DEFAULT '',
    school_end_ym    TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_projects (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    project_name     TEXT NOT NULL DEFAULT '',
    company_or_client TEXT NOT NULL DEFAULT '',
    role_name        TEXT NOT NULL DEFAULT '',
    start_ym         TEXT NOT NULL DEFAULT '',
    end_ym           TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements     TEXT NOT NULL DEFAULT '',
    keywords         TEXT NOT NULL DEFAULT '',
    fingerprint      TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_trainings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    training_name    TEXT NOT NULL DEFAULT '',
    training_org     TEXT NOT NULL DEFAULT '',
    training_start   TEXT NOT NULL DEFAULT '',
    training_end     TEXT NOT NULL DEFAULT '',
    training_content TEXT NOT NULL DEFAULT '',
    raw_json         TEXT NOT NULL DEFAULT '{}',        -- 样本中尚无训练字段，原样保留
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_languages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    language_name    TEXT NOT NULL DEFAULT '',
    language_level   TEXT NOT NULL DEFAULT '',
    language_certificate TEXT NOT NULL DEFAULT '',
    language_certificate_time TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_certificates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_type TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_skills (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    skill_name       TEXT NOT NULL DEFAULT '',
    skill_level      TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE INDEX idx_work_company ON candidate_work_experiences(company_name);
CREATE INDEX idx_edu_school   ON candidate_educations(school_name);
CREATE INDEX idx_skill_name   ON candidate_skills(skill_name);
```

---

### 3.4 Migration 004: マッチング、面接および入社流転 (`004_match_flow.sql`)

```sql
-- 004_match_flow.sql  职位-候选人匹配、流转阶段、面试、入职、历史、沟通记录 | Position-candidate matches, pipeline stages, interviews, placements, history, communications | 求人と候補者のマッチング、選考ステージ、面接、入社、履歴、コミュニケーション記録

CREATE TABLE position_candidate_matches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id      INTEGER NOT NULL REFERENCES position_openings(id) ON DELETE CASCADE,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    decision         TEXT NOT NULL DEFAULT 'suggested' CHECK (decision IN ('suggested','accepted','dismissed')),
    stage            TEXT CHECK (stage IS NULL OR stage IN (
        'pending_contact','contacting','interested','submitted','interviewing',
        'interview_passed','background_check','offer','hired','guarantee_passed',
        'candidate_declined','client_rejected','background_check_failed',
        'offer_declined','left_during_guarantee')),
    origin           TEXT NOT NULL DEFAULT 'auto' CHECK (origin IN ('auto','import','manual')),
    match_score      REAL NOT NULL DEFAULT 0,
    matched_keywords TEXT NOT NULL DEFAULT '[]',        -- JSON 数组
    dismissed_reason TEXT NOT NULL DEFAULT '',
    manual_note      TEXT NOT NULL DEFAULT '',
    decided_at       TEXT,
    stage_changed_at TEXT,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (position_id, candidate_id),
    CHECK (stage IS NULL OR decision = 'accepted'),
    CHECK (decision <> 'accepted' OR stage IS NOT NULL)
);
CREATE INDEX idx_match_position  ON position_candidate_matches(position_id, decision);
CREATE INDEX idx_match_candidate ON position_candidate_matches(candidate_id);
CREATE INDEX idx_match_stage     ON position_candidate_matches(stage);

CREATE TABLE position_candidate_interviews (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    round_no         INTEGER NOT NULL DEFAULT 1,
    interview_type   TEXT NOT NULL DEFAULT '',
    scheduled_at     TEXT,
    interviewer      TEXT NOT NULL DEFAULT '',
    result           TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','passed','failed','cancelled')),
    feedback         TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (match_id, round_no)
);

CREATE TABLE position_candidate_placements (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL UNIQUE REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    offer_date       TEXT,
    offer_salary     REAL,
    onboard_date     TEXT,
    guarantee_days   INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_days >= 0),   -- 入职时从职位拷贝快照
    guarantee_end_date TEXT,
    note             TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_placement_guarantee_end ON position_candidate_placements(guarantee_end_date);

-- 决策与阶段变更历史（统计视图的基础）
-- History of decisions and stage changes (the basis of the statistics views)
-- 判定とステージ変更の履歴（統計ビューの基礎）
CREATE TABLE position_candidate_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    change_type      TEXT NOT NULL CHECK (change_type IN ('decision','stage')),
    from_value       TEXT,
    to_value         TEXT NOT NULL,
    reason           TEXT NOT NULL DEFAULT '',
    is_system        INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
    operator_user_id INTEGER REFERENCES system_users(id),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_history_match ON position_candidate_history(match_id, change_type);
CREATE INDEX idx_history_to    ON position_candidate_history(change_type, to_value);

CREATE TABLE candidate_communications (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    match_id         INTEGER REFERENCES position_candidate_matches(id) ON DELETE SET NULL,
    resume_id        INTEGER REFERENCES candidate_resumes(id) ON DELETE SET NULL,
    source_type      TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','system','imported_resume')),
    channel          TEXT NOT NULL DEFAULT '',
    communicate_time TEXT NOT NULL DEFAULT '',
    communicate_content TEXT NOT NULL DEFAULT '',
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_comm_candidate ON candidate_communications(candidate_id, source_type);
CREATE INDEX idx_comm_match ON candidate_communications(match_id);
```

---

### 3.5 Migration 005: 全文検索および集計ビュー (`005_search_views.sql`)

```sql
-- 005_search_views.sql  检索文档、FTS5 trigram、统计视图 | Search documents, FTS5 trigram, statistics views | 検索ドキュメント、FTS5 trigram、統計ビュー

CREATE TABLE candidate_search_documents (
    candidate_id INTEGER PRIMARY KEY REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    raw_text     TEXT NOT NULL DEFAULT '',
    text_hash    TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL
);

CREATE VIRTUAL TABLE candidate_search_fts USING fts5(
    raw_text,
    content='candidate_search_documents',
    content_rowid='candidate_id',
    tokenize='trigram'
);

CREATE TRIGGER trg_search_doc_ai AFTER INSERT ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text) VALUES (new.candidate_id, new.raw_text);
END;
CREATE TRIGGER trg_search_doc_ad AFTER DELETE ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text) VALUES ('delete', old.candidate_id, old.raw_text);
END;
CREATE TRIGGER trg_search_doc_au AFTER UPDATE ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text) VALUES ('delete', old.candidate_id, old.raw_text);
    INSERT INTO candidate_search_fts(rowid, raw_text) VALUES (new.candidate_id, new.raw_text);
END;

-- 候选人统计：推荐=到达 submitted；成功=到达 hired；沟通=非 imported_resume 的沟通条数
-- Candidate statistics: recommended = reached submitted; successful = reached hired; communications = count of communications that are not imported_resume
-- 候補者の統計：推薦＝submitted に到達、成功＝hired に到達、コミュニケーション＝imported_resume 以外の件数
CREATE VIEW v_candidate_stats AS
SELECT
    c.id AS candidate_id,
    (SELECT COUNT(DISTINCT h.match_id) FROM position_candidate_history h
        JOIN position_candidate_matches m ON m.id = h.match_id
        WHERE m.candidate_id = c.id AND h.change_type = 'stage' AND h.to_value = 'submitted') AS recommend_count,
    (SELECT COUNT(DISTINCT h.match_id) FROM position_candidate_history h
        JOIN position_candidate_matches m ON m.id = h.match_id
        WHERE m.candidate_id = c.id AND h.change_type = 'stage' AND h.to_value = 'hired') AS success_count,
    (SELECT COUNT(*) FROM candidate_communications cc
        WHERE cc.candidate_id = c.id AND cc.source_type <> 'imported_resume') AS communication_count
FROM candidate_profiles c;

CREATE VIEW v_position_pipeline_counts AS
SELECT
    p.id AS position_id,
    COUNT(CASE WHEN m.decision = 'suggested' THEN 1 END) AS suggested_count,
    COUNT(CASE WHEN m.decision = 'accepted'  THEN 1 END) AS accepted_count,
    COUNT(CASE WHEN m.decision = 'dismissed' THEN 1 END) AS dismissed_count,
    COUNT(CASE WHEN m.stage = 'submitted' THEN 1 END) AS submitted_now,
    COUNT(CASE WHEN m.stage = 'interviewing' THEN 1 END) AS interviewing_now,
    COUNT(CASE WHEN m.stage = 'offer' THEN 1 END) AS offer_now,
    COUNT(CASE WHEN m.stage IN ('hired','guarantee_passed') THEN 1 END) AS hired_count
FROM position_openings p
LEFT JOIN position_candidate_matches m ON m.position_id = p.id
GROUP BY p.id;

CREATE VIEW v_company_position_counts AS
SELECT
    co.id AS company_id,
    COUNT(p.id) AS position_total,
    COUNT(CASE WHEN p.status = 'open' THEN 1 END) AS position_open
FROM company_profiles co
LEFT JOIN position_openings p ON p.company_id = co.id
GROUP BY co.id;
```

---

## 4. 自動テストスイート仕様 (24/24 Pass)

全24件の自動単体・統合テストをすべてパス：
1. `candidateImportBatchesList returns batches ordered by id desc`
2. `candidateImportIssuesList returns warnings of a batch`
3. `candidateImportRun rejects empty selection`
4. `candidateImportRun: a single file, then re-import is skipped by content hash`
5. `candidateImportRun: a folder imports all json files; invalid input is rejected`
6. `candidateImportPickFiles / PickDirectory use the injected dialog`
7. `strict mode: a file with a contact conflict is rejected and not written; a clean file is imported`
8. `companyCreate / companyGet / companiesSearch / companyUpdate`
9. `companyCreate rejects empty and duplicate names with business error codes`
10. `first contact becomes primary; a new primary replaces the old one`
11. `companyDelete: physical delete without positions, soft delete with positions; contact in use cannot be deleted`
12. `migrations create schema + system user`
13. `normalize`
14. `import samples, idempotent re-run`
15. `primary phone/email unique constraints`
16. `multilingual: zh primary + jp, lists aligned`
17. `misaligned multilingual lists produce a warning`
18. `FTS: >=3 chars via trigram, raw_text built from fields`
19. `shared/conflicting contact: first come wins, second becomes shared + warning`
20. `re-import changed content updates in place, no duplicates`
21. `imported_resume communications excluded from communication_count`
22. `company/position/match flow constraints + stats views`
23. `landline shared by many candidates: no conflict; one-sided empty date is not misaligned`
24. `small date drift between language versions is tolerated, large drift warns`

---

> **プロジェクトクレジット・謝辞**  
> 本システムのアーキテクチャ設計およびリファクタリングは、**Google DeepMind Antigravity**、**OpenAI Codex**、**Anthropic Claude** の共同開発により実現しました。

---
**V2 全機能設計仕様書 終了**
