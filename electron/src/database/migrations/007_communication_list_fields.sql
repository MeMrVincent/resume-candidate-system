-- Align the single communication list with communication_list from the source JSON.
ALTER TABLE candidate_communications RENAME TO candidate_communications_legacy;

CREATE TABLE candidate_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    communicate_time TEXT NOT NULL DEFAULT '',
    communicate_content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE
);

INSERT INTO candidate_communications (
    id,candidate_id,communicate_time,communicate_content,created_at,updated_at
)
SELECT id,candidate_id,communication_date,summary,created_at,updated_at
FROM candidate_communications_legacy;

DROP TABLE candidate_communications_legacy;
CREATE INDEX idx_candidate_communications_candidate ON candidate_communications(candidate_id);
