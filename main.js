const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const BuzzLEDController = require('./modules/buzz-led-controller');

let mainWindow;
let ledController;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    fullscreen: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Initialize LED controller
function initLEDController() {
  ledController = new BuzzLEDController();
  const success = ledController.init();

  if (success) {
    console.log('[Main] LED controller initialized');
  } else {
    console.log('[Main] LED controller not available (no Buzz controller found)');
  }

  return success;
}

// ==================== IPC Handlers ====================

// Fullscreen toggle
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// LED: Set single LED on/off
ipcMain.on('led-set', (event, { player, on }) => {
  if (ledController) {
    // player is 1-4, LED index is 0-3
    const index = player - 1;
    ledController.setLED(index, on);
  }
});

// LED: Set all LEDs
ipcMain.on('led-set-all', (event, on) => {
  if (ledController) {
    ledController.setAllLEDs(on);
  }
});

// LED: Flash a single LED
ipcMain.on('led-flash', (event, { player, times = 3, interval = 200 }) => {
  if (ledController) {
    const index = player - 1;
    ledController.flashLED(index, times, interval);
  }
});

// LED: Flash then stay on
ipcMain.on('led-flash-then-on', (event, { player, times = 3, interval = 200 }) => {
  if (ledController) {
    const index = player - 1;
    ledController.flashThenOn(index, times, interval);
  }
});

// LED: Victory sequence
ipcMain.on('led-victory', (event, { winner }) => {
  if (ledController) {
    const index = winner - 1;
    ledController.victorySequence(index);
  }
});

// LED: Turn off all
ipcMain.on('led-off-all', () => {
  if (ledController) {
    ledController.stopAllFlash();
    ledController.setAllLEDs(false);
  }
});

// ==================== App Lifecycle ====================

app.whenReady().then(() => {
  createWindow();

  // Initialize LED controller after window is ready
  setTimeout(() => {
    initLEDController();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (ledController) {
    ledController.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (ledController) {
    ledController.close();
  }
});
