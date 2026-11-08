const { Menu, app } = require('electron');

/**
 * 桌面客户端系统菜单配置（文件、编辑、视图、窗口、帮助）。
 *
 * EN: Desktop application menu template (File, Edit, View, Window, Help).
 *
 * JA: デスクトップアプリのシステムメニュー設定（ファイル、編集、表示、ウィンドウ、ヘルプ）。
 */
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Exit', role: 'quit', accelerator: 'Alt+F4' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Delete', role: 'delete' },
        { type: 'separator' },
        { label: 'Select All', role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', role: 'resetZoom' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', role: 'minimize' },
        { label: 'Close', role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Recruitment System',
          click: () => {
            app.setAboutPanelOptions({
              applicationName: 'Recruitment CRM / ATS',
              applicationVersion: app.getVersion(),
              copyright: 'Local Candidate CRM / ATS',
            });
            app.showAboutPanel();
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = createApplicationMenu;
