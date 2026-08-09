-- 002_candidate_fts.sql

-- 搜索增强辅助索引结构
CREATE INDEX IF NOT EXISTS idx_candidate_search_docs_id ON candidate_search_documents(candidate_id);
