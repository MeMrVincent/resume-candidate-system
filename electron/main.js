'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const isDev = require("electron-is-dev");
const { openSqliteDatabase } = require("./src/database/SqliteDatabase");
const { applyPendingMigrations } = require("./src/database/MigrationRunner");
const { getDatabasePath, ensurePackagedDatabase } = require("./src/database/DatabasePath");
const { CompanyService } = require("./src/services/CompanyService");
const { CandidateImportService } = require("./src/services/CandidateImportService");
const { SystemService } = require("./src/services/SystemService");
const { registerCompanyIpc } = require("./src/ipc/company.ipc");
const { registerCandidateIpc } = require("./src/ipc/candidate.ipc");
const { registerSystemIpc } = require("./src/ipc/system.ipc");
const createApplicationMenu = require("./src/menu/ApplicationMenu");

let mainWindow = null;
let database = null;

/**
 * 创建主窗口：开发环境加载 webpack-dev-server，打包后加载 frontend/dist/index.html。
 * Creates the main window: loads webpack-dev-server in development, frontend/dist/index.html when packaged.
 * メインウィンドウを作成する：開発時は webpack-dev-server、パッケージ後は frontend/dist/index.html を読み込む。
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "猎头招聘管理系统 V2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const frontendEntryFile = app.isPackaged
    ? path.join(process.resourcesPath, "frontend", "index.html")
    : path.join(__dirname, "../frontend/dist/index.html");
  mainWindow.loadURL(isDev ? "http://localhost:9000" : pathToFileURL(frontendEntryFile).href);

  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * 打开数据库、执行迁移、创建各 Service 并注册 IPC。
 * Opens the database, applies migrations, creates the Services and registers IPC.
 * データベースを開き、マイグレーションを実行し、各 Service を作成して IPC を登録する。
 */
function startBackend() {
  const databaseFilePath = getDatabasePath(app, __dirname);
  ensurePackagedDatabase(app, databaseFilePath);
  console.log(`Recruitment database: ${databaseFilePath}`);

  database = openSqliteDatabase(databaseFilePath);
  applyPendingMigrations(database);

  registerSystemIpc(ipcMain, new SystemService(app.getVersion(), databaseFilePath));
  registerCompanyIpc(ipcMain, new CompanyService(database));
  registerCandidateIpc(ipcMain, new CandidateImportService(database, dialogOptions => dialog.showOpenDialog(mainWindow, dialogOptions)));
}

app.whenReady().then(() => {
  createApplicationMenu();
  startBackend();

  if (process.argv.includes("--smoke-test")) {
    database.close();
    database = null;
    app.quit();
    return;
  }

  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (database) database.close();
  if (process.platform !== "darwin") app.quit();
});
