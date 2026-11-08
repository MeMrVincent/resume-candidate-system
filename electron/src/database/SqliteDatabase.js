'use strict';

/**
 * @description 打开 SQLite 数据库。优先使用 better-sqlite3；沙箱等环境装不上时，回退到 Node 内置的 node:sqlite，
 * 并补齐 pragma / transaction 两个方法，使上层代码无需区分。
 * @description Opens the SQLite database. better-sqlite3 is preferred; where it cannot be installed (e.g. a sandbox) it falls back to Node's built-in node:sqlite
 * and adds the pragma / transaction methods so upper layers need not care which one is used.
 * @description SQLite データベースを開く。better-sqlite3 を優先し、サンドボックスなどで導入できない場合は Node 組み込みの node:sqlite にフォールバックする。
 * さらに pragma / transaction メソッドを補い、上位のコードがどちらかを意識しなくて済むようにする。
 * @param {string} databaseFilePath 数据库文件路径，":memory:" 表示内存库（测试用） | Database file path; ":memory:" means an in-memory database (for tests) | データベースファイルのパス。":memory:" はインメモリ DB（テスト用）
 */
function openSqliteDatabase(databaseFilePath) {
  let database;
  try {
    const BetterSqlite3 = require("better-sqlite3");
    database = new BetterSqlite3(databaseFilePath);
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    const { DatabaseSync } = require("node:sqlite");
    const nativeDatabase = new DatabaseSync(databaseFilePath);
    database = {
      exec: sql => nativeDatabase.exec(sql),
      prepare: sql => nativeDatabase.prepare(sql),
      close: () => nativeDatabase.close(),
      pragma: pragmaText => nativeDatabase.prepare(`PRAGMA ${pragmaText}`).all(),
      transaction(callback) {
        return (...callbackArguments) => {
          nativeDatabase.exec("BEGIN");
          try {
            const result = callback(...callbackArguments);
            nativeDatabase.exec("COMMIT");
            return result;
          } catch (callbackError) {
            nativeDatabase.exec("ROLLBACK");
            throw callbackError;
          }
        };
      }
    };
  }
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return database;
}

module.exports = { openSqliteDatabase };
