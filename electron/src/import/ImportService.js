'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseV3 } = require('./parseV3');
const { CandidateRepository } = require('../candidate/CandidateRepository');

const now = () => new Date().toISOString();

class ImportService {
  constructor(db) { this.db = db; this.repo = new CandidateRepository(db); }

  importDirectory(dir, { onProgress, limit } = {}) {
    let files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.json')).sort();
    if (limit) files = files.slice(0, limit);
    return this.importFiles(dir, files, { onProgress });
  }

  importFiles(dir, files, { onProgress } = {}) {
    const db = this.db;
    const batch = db.prepare(`INSERT INTO candidate_import_batches (batch_uuid, source_dir, total_files, started_at)
      VALUES (?,?,?,?)`).run(crypto.randomUUID(), dir, files.length, now());
    const batchId = Number(batch.lastInsertRowid);
    const stat = { created: 0, updated: 0, skipped: 0, failed: 0, warnings: 0 };
    const insRec = db.prepare(`INSERT INTO candidate_import_records (batch_id, candidate_id, file_name, record_id, content_hash, result, created_at)
      VALUES (?,?,?,?,?,?,?)`);
    const insErr = db.prepare(`INSERT INTO candidate_import_errors (batch_id, candidate_id, file_name, severity, error_code, message, detail_json, created_at)
      VALUES (?,?,?,?,?,?,?,?)`);

    files.forEach((f, i) => {
      let recordId = '';
      try {
        const buf = fs.readFileSync(path.join(dir, f));
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        const json = JSON.parse(buf.toString('utf8'));
        recordId = json.record_id || '';
        const prev = db.prepare(`SELECT candidate_id FROM candidate_import_records WHERE content_hash=? AND result IN ('created','updated','skipped')
          AND candidate_id IS NOT NULL LIMIT 1`).get(hash);
        if (prev) {
          insRec.run(batchId, prev.candidate_id, f, recordId, hash, 'skipped', now());
          stat.skipped++;
        } else {
          const model = parseV3(json, f);
          const run = db.transaction(() => {
            const res = this.repo.saveFromModel(model);
            const all = [...model.warnings, ...res.warnings];
            for (const w of all) insErr.run(batchId, res.candidateId, f, 'warning', w.code, w.message, JSON.stringify(w.detail || {}), now());
            insRec.run(batchId, res.candidateId, f, recordId, hash, res.created ? 'created' : 'updated', now());
            return { res, n: all.length };
          });
          const { res, n } = run();
          stat[res.created ? 'created' : 'updated']++;
          stat.warnings += n;
        }
      } catch (e) {
        stat.failed++;
        insErr.run(batchId, null, f, 'error', 'parse_error', String(e.message || e), '{}', now());
        insRec.run(batchId, null, f, recordId, '', 'failed', now());
      }
      if (onProgress && (i + 1) % 200 === 0) onProgress(i + 1, files.length);
    });

    db.prepare(`UPDATE candidate_import_batches SET status='completed', created_count=?, updated_count=?, skipped_count=?,
      failed_count=?, warning_count=?, finished_at=? WHERE id=?`)
      .run(stat.created, stat.updated, stat.skipped, stat.failed, stat.warnings, now(), batchId);
    return { batchId, ...stat };
  }
}
module.exports = { ImportService };
