const { app } = require('electron');

/**
 * 验证真实 Electron 运行时环境中 better-sqlite3 native 模块与 FTS5 引擎正常工作。
 * Verifies that the better-sqlite3 native module and FTS5 engine operate properly in real Electron runtime.
 * 実際の Electron ランタイム環境で better-sqlite3 ネイティブモジュールと FTS5 エンジンが正常に動作することを検証する。
 */
app.whenReady().then(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec("CREATE VIRTUAL TABLE smoke_fts USING fts5(text, tokenize='trigram')");
  const version = db.prepare('SELECT sqlite_version() AS version').get().version;
  db.close();
  console.log(`Electron better-sqlite3 smoke test passed (SQLite ${version})`);
  app.exit(0);
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
