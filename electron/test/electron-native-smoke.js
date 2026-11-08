const { app } = require('electron');

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
