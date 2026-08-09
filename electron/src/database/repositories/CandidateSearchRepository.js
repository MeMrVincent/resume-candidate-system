class CandidateSearchRepository {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  searchFts(keyword, limit = 50) {
    const db = this.dbManager.getDb();
    if (!keyword || keyword.trim() === '') {
      return [];
    }

    const cleanKeyword = keyword.replace(/['"]/g, '').trim();
    const sql = `
      SELECT candidate_id, raw_text
      FROM candidate_search_documents
      WHERE raw_text LIKE ?
      LIMIT ?;
    `;

    try {
      const res = db.exec(sql, [`%${cleanKeyword}%`, limit]);
      if (res.length > 0 && res[0].values) {
        return res[0].values.map((row) => ({
          candidate_id: row[0],
          raw_text: row[1],
        }));
      }
      return [];
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }
}

module.exports = CandidateSearchRepository;
