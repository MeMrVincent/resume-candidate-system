const path = require('path');
const fs = require('fs');

/**
 * 把可写的数据库放在应用旁边，这样整个 RecruitmentSystem 目录可以整体拷贝到别的磁盘。
 * Keep the writable database beside the application so the whole RecruitmentSystem directory can be copied to another disk.
 * 書き込み可能なデータベースをアプリの隣に置くことで、RecruitmentSystem ディレクトリごと別のディスクへコピーできるようにする。
 *
 * 开发时 / Development / 開発時:  <代码根目录>/data/recruitment.db
 * 打包后 / Packaged / パッケージ後: <exe 所在目录>/data/recruitment.db
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
 * 打包内置的种子库在 resources 下是只读的：首次启动时复制到 exe 旁边，之后只打开这份可写副本。
 * The packaged seed under resources is read-only: on first launch it is copied beside the executable, and only that writable copy is opened afterwards.
 * パッケージに同梱したシードは resources 配下で読み取り専用。初回起動時に exe の隣へコピーし、以後はその書き込み可能なコピーだけを開く。
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
