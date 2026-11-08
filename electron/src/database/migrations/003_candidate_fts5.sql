-- Real FTS5 index. The trigram tokenizer supports substring-style recall for
-- Chinese/Japanese text of three or more characters. One/two-character CJK
-- searches use an explicit LIKE fallback in CandidateSearchRepository.
CREATE VIRTUAL TABLE IF NOT EXISTS candidate_search_fts USING fts5(
    raw_text,
    content='candidate_profiles',
    content_rowid='id',
    tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS candidate_profiles_fts_ai
AFTER INSERT ON candidate_profiles BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.id, new.raw_text);
END;

CREATE TRIGGER IF NOT EXISTS candidate_profiles_fts_ad
AFTER DELETE ON candidate_profiles BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text)
    VALUES ('delete', old.id, old.raw_text);
END;

CREATE TRIGGER IF NOT EXISTS candidate_profiles_fts_au
AFTER UPDATE OF raw_text ON candidate_profiles BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text)
    VALUES ('delete', old.id, old.raw_text);
    INSERT INTO candidate_search_fts(rowid, raw_text)
    VALUES (new.id, new.raw_text);
END;

INSERT INTO candidate_search_fts(candidate_search_fts) VALUES ('rebuild');
