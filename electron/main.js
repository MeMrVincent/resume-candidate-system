const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const DatabaseManager = require('./src/database/Database');
const MigrationRunner = require('./src/database/MigrationRunner');
const CandidateSearchRepository = require('./src/database/repositories/CandidateSearchRepository');
const CandidateRepository = require('./src/database/repositories/CandidateRepository');

let mainWindow;
let dbManager;
let searchRepository;
let candidateRepository;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: '猎头招聘管理系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:9000'
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. 初始化 SQLite 数据库连接与 Migration
  const dbPath = path.resolve(__dirname, '../data/recruitment.db');
  dbManager = new DatabaseManager(dbPath);
  await dbManager.init();

  const migrationRunner = new MigrationRunner(dbManager);
  await migrationRunner.runMigrations();

  searchRepository = new CandidateSearchRepository(dbManager);
  candidateRepository = new CandidateRepository(dbManager);

  // 2. 注册 IPC Handler (直接连入真实的 SQLite 数据库 9,860 候选人记录)
  ipcMain.handle('system:getVersion', () => app.getVersion());

  ipcMain.handle('candidate:search', (event, params) => {
    return searchRepository.searchCandidates(params || {});
  });

  ipcMain.handle('candidate:get', (event, id) => {
    return candidateRepository.getById(id);
  });

  ipcMain.handle('candidate:count', () => {
    return candidateRepository.count();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbManager) dbManager.close();
    app.quit();
  }
});
