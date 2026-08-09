const path = require('path');
const DatabaseManager = require('./database/Database');
const MigrationRunner = require('./database/MigrationRunner');
const CandidateRepository = require('./database/repositories/CandidateRepository');
const CandidateSearchRepository = require('./database/repositories/CandidateSearchRepository');
const CandidateImportService = require('./services/CandidateImportService');

async function main() {
  const defaultDir = 'E:\\resume-system\\codex-complete-jsons\\complete';
  const defaultDb = path.resolve(__dirname, '../../data/recruitment.db');

  console.log('----------------------------------------------------');
  console.log('🚀 猎头招聘管理系统 - 简历 JSON 批量入库程序');
  console.log(`📁 数据源目录: ${defaultDir}`);
  console.log(`💾 数据库位置: ${defaultDb}`);
  console.log('----------------------------------------------------');

  // 1. 初始化数据库及表结构 Migration
  const dbManager = new DatabaseManager(defaultDb);
  await dbManager.init();

  const migrationRunner = new MigrationRunner(dbManager);

  console.log('📦 正在检查并执行数据库 Migration...');
  await migrationRunner.runMigrations();

  // 2. 构造 Repository 与 Service
  const candidateRepository = new CandidateRepository(dbManager);
  const searchRepository = new CandidateSearchRepository(dbManager);
  const importService = new CandidateImportService(candidateRepository);

  // 3. 执行批量解析与入库
  console.log('🔄 开始解析并批量导入候选人 JSON 数据...');
  const result = importService.importBatchFromDirectory(defaultDir);

  console.log('----------------------------------------------------');
  console.log(`✅ 入库完毕！`);
  console.log(`📊 读取 JSON 总数: ${result.totalFiles}`);
  console.log(`🎉 成功导入候选人: ${result.successCount}`);
  console.log(`❌ 失败文件数量: ${result.failCount}`);
  console.log(`⏱️ 批量入库用时: ${result.durationMs} ms (${(result.durationMs / 1000).toFixed(2)}s)`);
  console.log(`📚 数据库 Profiles 总记录数: ${candidateRepository.count()}`);

  if (result.errors.length > 0) {
    console.log('\n⚠️ 部分包含错误的文件:');
    result.errors.slice(0, 5).forEach((e) => console.log(`  - ${e.file}: ${e.error}`));
  }

  // 4. 测试全文检索
  console.log('----------------------------------------------------');
  console.log('🔍 验证全文检索...');
  const testKeywords = ['经理', '本科', '日语', '工程师'];
  testKeywords.forEach((kw) => {
    const hits = searchRepository.searchFts(kw, 5);
    console.log(`  - 关键词 "${kw}": 命中 ${hits.length} 条数据 (前 3 条 ID: ${hits.slice(0, 3).map((h) => h.candidate_id).join(', ')})`);
  });

  dbManager.close();
  console.log('----------------------------------------------------');
}

main().catch((err) => {
  console.error('Import Error:', err);
});
