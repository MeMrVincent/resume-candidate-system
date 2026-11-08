const path = require('path');
const fs = require('fs');

/**
 * 将可写数据库放置于已打包程序同级目录，便于将整个应用目录复制迁移到其他磁盘。
 * 开发环境目录：code/data/recruitment.db
 * 打包生产目录：<可执行文件所在目录>/data/recruitment.db
 *
 * EN: Keep the writable database beside the packaged application so that the
 * whole RecruitmentSystem directory can be copied to another disk.
 * Development layout: code/data/recruitment.db
 * Packaged layout: <directory containing the exe>/data/recruitment.db
 *
 * JA: アプリケーションディレクトリ全体を他のディスクへコピー・移行できるように、
 * 書き込み可能なデータベースをパッケージ化アプリと同階層に保持します。
 * 開発環境の配置：code/data/recruitment.db
 * パッケージ後の配置：<exe が存在するディレクトリ>/data/recruitment.db
 */
function getApplicationRoot(app, electronDirectory) {
  if (app && app.isPackaged) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      return path.resolve(process.env.PORTABLE_EXECUTABLE_DIR);
    }
    return path.dirname(process.execPath);
  }

  return path.resolve(electronDirectory, '..');
}

/**
 * 打包的种子数据库在 resources 下为只读。首次启动时会复制到可执行文件同级目录；后续启动仅打开该可读写副本。
 *
 * EN: The packaged seed is read-only under resources. On first launch it is copied
 * beside the executable; every later launch opens only that writable copy.
 *
 * JA: パッケージ内のシード DB は resources 配下で読み取り専用です。初回起動時に実行ファイルと同階層へ
 * コピーされ、以後の起動ではその書き込み可能なコピーのみを開きます。
 */
function ensurePackagedDatabase(app, databasePath, resourcesPath = process.resourcesPath) {
  if (!app?.isPackaged || fs.existsSync(databasePath)) return databasePath;

  const seedPath = path.join(resourcesPath, 'seed', 'recruitment.db');
  if (!fs.existsSync(seedPath)) return databasePath;

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.copyFileSync(seedPath, databasePath, fs.constants.COPYFILE_EXCL);
  return databasePath;
}

function getDatabasePath(app, electronDirectory) {
  if (process.env.RECRUITMENT_DB_PATH) {
    return path.resolve(process.env.RECRUITMENT_DB_PATH);
  }

  return path.join(getApplicationRoot(app, electronDirectory), 'data', 'recruitment.db');
}

module.exports = {
  getApplicationRoot,
  getDatabasePath,
  ensurePackagedDatabase,
};
