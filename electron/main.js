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

app.whenReady().then(() => {
  // 1. 初始化数据库连接与 Migration
  const dbPath = path.resolve(__dirname, '../data/recruitment.db');
  dbManager = new DatabaseManager(dbPath);
  const migrationRunner = new MigrationRunner(dbManager);
  migrationRunner.runMigrations();

  searchRepository = new CandidateSearchRepository(dbManager);
  candidateRepository = new CandidateRepository(dbManager);

  // 2. 注册 IPC 接口 handler
  ipcMain.handle('system:getVersion', () => app.getVersion());
  ipcMain.handle('candidate:search', (event, { keyword, limit }) => {
    return searchRepository.searchFts(keyword, limit || 50);
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
