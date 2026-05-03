const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const fs = require('fs');

let mainWindow;
let overlayWindow;

// Disable hardware acceleration to keep transparent windows working smoothly on macOS
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  setTimeout(createWindow, 100);
});

// OPEN SELECTION OVERLAY
ipcMain.handle('open-overlay', (event, purpose = 'video-record') => {
  const { width, height, x, y } = screen.getPrimaryDisplay().bounds;

  overlayWindow = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true);
  overlayWindow.loadFile('overlay.html');

  overlayWindow.purpose = purpose;
});

// RECEIVE COORDINATES FROM OVERLAY
ipcMain.on('selection-made', (event, rect) => {
  const purpose = overlayWindow.purpose;
  if (overlayWindow) overlayWindow.close();

  // Ask the main window to handle the capture based on purpose
  if (purpose === 'screenshot-snip') {
    mainWindow.webContents.send('process-screenshot-snip', { rect });
  } else {
    mainWindow.webContents.send('start-recording-area', { rect });
  }
});

// DIALOG: Save screenshot to computer
ipcMain.handle('save-screenshot-dialog', async (event, base64Data) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Screenshot',
    defaultPath: `screenshot-${Date.now()}.png`,
    filters: [{ name: 'Images', extensions: ['png'] }]
  });

  if (filePath) {
    const base64Image = base64Data.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(filePath, base64Image, 'base64');
    return true;
  }
  return false;
});

// DIALOG: Save video recording to computer
ipcMain.handle('save-video-dialog', async (event, buffer) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Video Recording',
    defaultPath: `recording-${Date.now()}.webm`,
    filters: [{ name: 'Videos', extensions: ['webm'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return true;
  }
  return false;
});