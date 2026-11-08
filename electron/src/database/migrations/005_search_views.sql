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
