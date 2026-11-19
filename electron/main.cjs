const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let manualCheck = false;

// Enforce single desktop instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:update-status', payload);
  }
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking', manual: manualCheck });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      state: 'available',
      version: info.version,
      manual: manualCheck,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    if (manualCheck) {
      sendUpdateStatus({
        state: 'not-available',
        version: info?.version || app.getVersion(),
        manual: true,
      });
    }
    manualCheck = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      state: 'downloading',
      percent: Math.round(progress.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      state: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    if (manualCheck) {
      sendUpdateStatus({
        state: 'error',
        manual: true,
        message: err?.message || 'Could not reach update server.',
      });
    }
    manualCheck = false;
  });
}

async function triggerUpdateCheck(isManual) {
  manualCheck = isManual;
  if (!app.isPackaged) {
    if (isManual) {
      sendUpdateStatus({
        state: 'not-available',
        version: app.getVersion(),
        manual: true,
        message: 'Running local preview — online updates apply to installed WireWise releases.',
      });
    }
    manualCheck = false;
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    if (isManual) {
      sendUpdateStatus({
        state: 'error',
        manual: true,
        message: err?.message || 'Could not check for updates.',
      });
    }
    manualCheck = false;
  }
}

function buildAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'quit', label: 'Exit WireWise' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom', label: 'Reset Window Zoom' },
        { role: 'zoomIn', label: 'Zoom Window In' },
        { role: 'zoomOut', label: 'Zoom Window Out' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates…',
          click: () => triggerUpdateCheck(true),
        },
        { type: 'separator' },
        {
          label: 'About WireWise',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About WireWise',
              message: `WireWise v${app.getVersion()}`,
              detail:
                'Interactive Electrical Installation & Motor Control Simulator (PEC 2017 / IEC 60364).\nDesktop Edition.',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build-icons', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'WireWise — Electrical Installation Simulator',
    backgroundColor: '#14181d',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  buildAppMenu();

  // In packaged builds, block developer tools & view-source shortcuts
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = (input.key || '').toLowerCase();
      const isDevToolsCombo =
        key === 'f12' ||
        ((input.control || input.meta) && input.shift && (key === 'i' || key === 'j' || key === 'c')) ||
        ((input.control || input.meta) && key === 'u');
      if (isDevToolsCombo) {
        event.preventDefault();
      }
    });
  }

  // Keep navigation sealed inside the local app bundle; open external http(s) links in the OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (app.isPackaged) {
      setTimeout(() => triggerUpdateCheck(false), 3000);
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl && !app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('desktop:get-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  isPackaged: app.isPackaged,
}));

ipcMain.handle('desktop:check-updates', () => {
  triggerUpdateCheck(true);
});

ipcMain.handle('desktop:download-update', async () => {
  if (!app.isPackaged) return;
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    sendUpdateStatus({
      state: 'error',
      manual: true,
      message: err?.message || 'Download failed. Please try again.',
    });
  }
});

ipcMain.handle('desktop:install-update', () => {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(() => {
  configureAutoUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
