'use strict';

/**
 * 系统信息服务（版本号、数据库位置等）。
 * System information service (version, database location, etc.).
 * システム情報サービス（バージョン、データベースの場所など）。
 */
class SystemService {
  constructor(applicationVersion, databaseFilePath) {
    this.applicationVersion = applicationVersion;
    this.databaseFilePath = databaseFilePath;
  }

  getVersion() {
    return this.applicationVersion;
  }

  getDatabasePath() {
    return this.databaseFilePath;
  }
}

module.exports = { SystemService };
