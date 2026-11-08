const fs = require('fs');
const path = require('path');
const DatabaseManager = require('./database/Database');
const MigrationRunner = require('./database/MigrationRunner');
const CandidateRepository = require('./database/repositories/CandidateRepository');
const CandidateSearchRepository = require('./database/repositories/CandidateSearchRepository');
const CandidateImportService = require('./services/CandidateImportService');

function getArgument(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : '';
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function importIntoDatabase(sourceDirectory, databasePath) {
  const dbManager = new DatabaseManager(databasePath);
  await dbManager.init();
  await new MigrationRunner(dbManager).runMigrations();

  const candidateRepository = new CandidateRepository(dbManager);
  const searchRepository = new CandidateSearchRepository(dbManager);
  const importService = new CandidateImportService(candidateRepository);
  const result = importService.importBatchFromDirectory(sourceDirectory);
  const db = dbManager.getDb();
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM candidate_profiles) AS profiles,
      (SELECT COUNT(*) FROM candidate_import_records) AS imports,
      (SELECT COUNT(*) FROM candidate_resumes) AS resumes,
      (SELECT COUNT(*) FROM candidate_resume_base_info) AS resume_base_info,
      (SELECT COUNT(*) FROM candidate_profiles WHERE raw_text <> '') AS profiles_with_raw_text,
      (SELECT COUNT(*) FROM candidate_search_fts) AS fts_documents
  `).get();
  const foreignKeyErrors = db.pragma('foreign_key_check');
  const integrity = db.pragma('integrity_check', { simple: true });

  const secondRun = importService.importBatchFromDirectory(sourceDirectory);
  const sampleSearch = {
    chinese: searchRepository.searchFts('工程师', 5).length,
    japanese: searchRepository.searchFts('日本語', 5).length,
    english: searchRepository.searchFts('manager', 5).length,
    shortChinese: searchRepository.searchFts('日语', 5).length,
  };

  dbManager.close();
  return { result, counts, foreignKeyErrors, integrity, secondRun, sampleSearch };
}

async function main() {
  const sourceDirectory = path.resolve(getArgument('source'));
  const requestedDatabase = getArgument('db');
  const databasePath = path.resolve(requestedDatabase || path.join(__dirname, '../../data/recruitment.db'));
  const fresh = process.argv.includes('--fresh');

  if (!getArgument('source')) {
    throw new Error('Missing --source=<complete JSON directory>');
  }
  if (!fs.existsSync(sourceDirectory)) {
    throw new Error(`Source directory not found: ${sourceDirectory}`);
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const sourceCount = fs.readdirSync(sourceDirectory).filter((file) => file.endsWith('.json')).length;
  const workingPath = fresh ? `${databasePath}.rebuild-${timestamp()}.tmp` : databasePath;

  console.log(`Source: ${sourceDirectory}`);
  console.log(`JSON files: ${sourceCount}`);
  console.log(`Working database: ${workingPath}`);

  const report = await importIntoDatabase(sourceDirectory, workingPath);
  const consistent = report.result.failCount === 0
    && report.counts.profiles === sourceCount
    && report.counts.imports === sourceCount
    && report.counts.resumes >= sourceCount
    && report.counts.resume_base_info === report.counts.resumes
    && report.counts.profiles_with_raw_text === sourceCount
    && report.counts.fts_documents === sourceCount
    && report.foreignKeyErrors.length === 0
    && report.integrity === 'ok'
    && report.secondRun.successCount === 0
    && report.secondRun.skippedCount === sourceCount
    && report.secondRun.failCount === 0;

  console.log(JSON.stringify({ sourceCount, ...report, consistent }, null, 2));
  if (!consistent) {
    throw new Error(`Fresh database validation failed; original database was not changed. Temp: ${workingPath}`);
  }

  if (fresh) {
    const backupDirectory = path.join(path.dirname(databasePath), 'backups');
    fs.mkdirSync(backupDirectory, { recursive: true });
    if (fs.existsSync(databasePath)) {
      const backupPath = path.join(backupDirectory, `pre-rebuild-${timestamp()}.db`);
      fs.renameSync(databasePath, backupPath);
      console.log(`Old database moved to: ${backupPath}`);
    }
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${databasePath}${suffix}`;
      if (fs.existsSync(sidecar)) fs.rmSync(sidecar);
    }
    fs.renameSync(workingPath, databasePath);
    console.log(`Fresh database activated: ${databasePath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
