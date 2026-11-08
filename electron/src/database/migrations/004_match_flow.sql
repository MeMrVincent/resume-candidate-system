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
