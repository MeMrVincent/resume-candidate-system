class CandidateSearchRepository {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  searchCandidates(params = {}) {
    const db = this.dbManager.getDb();
    const { keyword, city, degreeType, minWorkYears, maxWorkYears, page = 1, pageSize = 50 } = params;

    const whereConditions = ["candidate_status = 'active'"];
    const queryParams = [];

    if (keyword && keyword.trim() !== '') {
      const cleanKeyword = keyword.replace(/['"]/g, '').trim();
      whereConditions.push(
        `(full_name LIKE ? OR current_company LIKE ? OR current_position LIKE ? OR personal_summary LIKE ? OR id IN (SELECT candidate_id FROM candidate_search_documents WHERE raw_text LIKE ?))`
      );
      const kwPattern = `%${cleanKeyword}%`;
      queryParams.push(kwPattern, kwPattern, kwPattern, kwPattern, kwPattern);
    }

    if (city && city.trim() !== '') {
      whereConditions.push('city LIKE ?');
      queryParams.push(`%${city.trim()}%`);
    }

    if (degreeType && degreeType.trim() !== '') {
      whereConditions.push('highest_degree_type LIKE ?');
      queryParams.push(`%${degreeType.trim()}%`);
    }

    if (minWorkYears !== null && minWorkYears !== undefined && minWorkYears !== '') {
      whereConditions.push('work_years >= ?');
      queryParams.push(Number(minWorkYears));
    }

    if (maxWorkYears !== null && maxWorkYears !== undefined && maxWorkYears !== '') {
      whereConditions.push('work_years <= ?');
      queryParams.push(Number(maxWorkYears));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) as count FROM candidate_profiles ${whereClause};`;
    const listSql = `
      SELECT id, candidate_uuid, full_name, gender, age, city,
             current_company, current_position, highest_degree_type,
             work_years, primary_phone, primary_email, resume_updated_date, candidate_status
      FROM candidate_profiles
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;

    try {
      const countRes = db.exec(countSql, queryParams);
      const total = (countRes.length > 0 && countRes[0].values) ? countRes[0].values[0][0] : 0;

      const listParams = [...queryParams, pageSize, offset];
      const listRes = db.exec(listSql, listParams);

      const items = [];
      if (listRes.length > 0 && listRes[0].values) {
        const cols = listRes[0].columns;
        listRes[0].values.forEach((row) => {
          const item = {};
          cols.forEach((c, idx) => {
            item[c] = row[idx];
          });
          items.push(item);
        });
      }

      return { total, items };
    } catch (err) {
      console.error('Database Candidate Search Error:', err);
      return { total: 0, items: [] };
    }
  }
}

module.exports = CandidateSearchRepository;
