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
