const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const isDev = require('electron-is-dev');
const DatabaseManager = require('./src/database/Database');
const MigrationRunner = require('./src/database/MigrationRunner');
const { getDatabasePath, ensurePackagedDatabase } = require('./src/database/DatabasePath');
const CandidateSearchRepository = require('./src/database/repositories/CandidateSearchRepository');
const CandidateRepository = require('./src/database/repositories/CandidateRepository');
const CandidateSearchService = require('./src/services/CandidateSearchService');
const CandidateService = require('./src/services/CandidateService');
const registerCandidateIpc = require('./src/ipc/candidate.ipc');
const createApplicationMenu = require('./src/menu/ApplicationMenu');

let mainWindow;
let dbManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Recruitment CRM / ATS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const frontendEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'index.html')
    : path.join(__dirname, '../frontend/dist/index.html');
  const startUrl = isDev ? 'http://localhost:9000' : pathToFileURL(frontendEntry).href;
  mainWindow.loadURL(startUrl);

  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  createApplicationMenu();

  const dbPath = getDatabasePath(app, __dirname);
  ensurePackagedDatabase(app, dbPath);
  console.log(`Recruitment database: ${dbPath}`);

  dbManager = new DatabaseManager(dbPath);
  await dbManager.init();
  await new MigrationRunner(dbManager).runMigrations();

  const candidateRepository = new CandidateRepository(dbManager);
  const searchRepository = new CandidateSearchRepository(dbManager);
  const candidateService = new CandidateService(dbManager, candidateRepository);
  const candidateSearchService = new CandidateSearchService(searchRepository);

  ipcMain.handle('system:getVersion', () => app.getVersion());
  ipcMain.handle('system:getDatabasePath', () => dbPath);
  registerCandidateIpc(ipcMain, candidateService, candidateSearchService);

  if (process.argv.includes('--smoke-test')) {
    dbManager.close();
    dbManager = null;
    app.quit();
    return;
  }

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (dbManager) dbManager.close();
  if (process.platform !== 'darwin') app.quit();
});
