class CandidateSearchRepository {
  constructor(dbManager){this.dbManager=dbManager;}
  candidatesSearch(params={}){
    const db=this.dbManager.getDb();const keyword=String(params.keyword||'').trim();const city=String(params.city||'').trim();const degreeType=String(params.degreeType||'').trim();const company=String(params.company||'').trim();const page=Math.max(1,Number.parseInt(params.page,10)||1);const pageSize=Math.min(200,Math.max(1,Number.parseInt(params.pageSize,10)||50));const where=['1=1'];const bindings=[];
    if(keyword){for(const term of this.keywordTerms(keyword)){if(this.shouldUseLikeFallback(term)){where.push('p.raw_text LIKE ?');bindings.push(`%${term}%`);}else{where.push('p.id IN(SELECT rowid FROM candidate_search_fts WHERE candidate_search_fts MATCH ?)');bindings.push(this.toFtsPhrase(term));}}}
    if(city){where.push(`(p.city LIKE ? OR EXISTS(SELECT 1 FROM candidate_resume_expectations e JOIN candidate_resumes re ON re.id=e.resume_id WHERE re.candidate_id=p.id AND e.expected_city LIKE ?))`);bindings.push(`%${city}%`,`%${city}%`);}
    if(degreeType){where.push(`EXISTS(SELECT 1 FROM candidate_resume_education_info ei2 JOIN candidate_resumes re2 ON re2.id=ei2.resume_id WHERE re2.candidate_id=p.id AND ei2.degree_type LIKE ?)`);bindings.push(`%${degreeType}%`);}
    if(company){where.push(`EXISTS(SELECT 1 FROM candidate_resume_work_experiences w JOIN candidate_resumes rw ON rw.id=w.resume_id WHERE rw.candidate_id=p.id AND w.company_name LIKE ?)`);bindings.push(`%${company}%`);}
    if(params.minWorkYears!==null&&params.minWorkYears!==undefined&&params.minWorkYears!==''){where.push('ci.work_years>=?');bindings.push(Number(params.minWorkYears));}
    if(params.maxWorkYears!==null&&params.maxWorkYears!==undefined&&params.maxWorkYears!==''){where.push('ci.work_years<=?');bindings.push(Number(params.maxWorkYears));}
    const joins=`LEFT JOIN candidate_resumes r ON r.id=(SELECT id FROM candidate_resumes WHERE candidate_id=p.id ORDER BY is_primary DESC,source_order ASC,id ASC LIMIT 1) LEFT JOIN candidate_resume_current_info ci ON ci.resume_id=r.id LEFT JOIN candidate_resume_education_info ei ON ei.resume_id=r.id`;
    const whereSql=`WHERE ${where.join(' AND ')}`;
    const total=db.prepare(`SELECT COUNT(*) count FROM candidate_profiles p ${joins} ${whereSql}`).get(...bindings).count;
    const items=db.prepare(`SELECT p.id,p.candidate_uuid,p.full_name,p.gender,p.birth_date,p.birth_year,p.phone AS primary_phone,p.email AS primary_email,p.resume_updated_date,p.sys_updated_date,ci.company_name AS current_company,ci.position_title AS current_position,ci.work_years,ei.degree_type AS highest_degree_type,r.id AS primary_resume_id,(SELECT COUNT(*) FROM candidate_resumes rc WHERE rc.candidate_id=p.id) AS resume_count FROM candidate_profiles p ${joins} ${whereSql} ORDER BY datetime(NULLIF(p.sys_updated_date,'')) DESC,p.id DESC LIMIT ? OFFSET ?`).all(...bindings,pageSize,(page-1)*pageSize);
    return{total,items,page,pageSize};
  }
  searchFts(keyword,limit=50){const terms=this.keywordTerms(keyword);if(!terms.length)return[];const safe=Math.min(200,Math.max(1,Number.parseInt(limit,10)||50));const where=[];const bindings=[];for(const term of terms){if(this.shouldUseLikeFallback(term)){where.push('p.raw_text LIKE ?');bindings.push(`%${term}%`);}else{where.push('p.id IN(SELECT rowid FROM candidate_search_fts WHERE candidate_search_fts MATCH ?)');bindings.push(this.toFtsPhrase(term));}}return this.dbManager.getDb().prepare(`SELECT p.id candidate_id FROM candidate_profiles p WHERE ${where.join(' AND ')} LIMIT ?`).all(...bindings,safe);}
  keywordTerms(keyword){return [...new Set(String(keyword||'').trim().split(/\s+/).filter(Boolean))];}
  shouldUseLikeFallback(keyword){return Array.from(keyword.replace(/\s+/g,'')).length<3;}
  toFtsPhrase(keyword){return `"${keyword.replace(/"/g,'""')}"`;}
}
module.exports=CandidateSearchRepository;
