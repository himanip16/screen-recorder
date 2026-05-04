const { app, BrowserWindow, ipcMain, screen, dialog, desktopCapturer, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let mainWindow, overlayWindow;

app.disableHardwareAcceleration();
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 52,
    frame: false,
    transparent: false,
    resizable: false,
    hasShadow: true,
    backgroundColor: '#0f172a', // Premium Midnight Slate
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false 
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
      callback({ video: sources[0] });
    });
  });
}

app.whenReady().then(() => {
  setTimeout(createWindow, 100);

  // --- REGISTER GLOBAL KEYBOARD SHORTCUTS ---

  // 1. Shortcut to PAUSE / RESUME (Ctrl + Alt + P or Cmd + Option + P)
  globalShortcut.register('CommandOrControl+Alt+P', () => {
    console.log("[Main Process] Hotkey pressed: Pause/Resume");
    if (mainWindow) {
      mainWindow.webContents.send('hotkey-pause');
    }
  });

  // 2. Shortcut to STOP (Ctrl + Alt + S or Cmd + Option + S)
  globalShortcut.register('CommandOrControl+Alt+S', () => {
    console.log("[Main Process] Hotkey pressed: Stop");
    if (mainWindow) {
      mainWindow.webContents.send('hotkey-stop');
    }
  });
});

// Unregister shortcuts when exiting the app so you don't block other software
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// --- WINDOW MANAGEMENT ---
ipcMain.handle('open-overlay', () => {
  const { width, height, x, y } = screen.getPrimaryDisplay().bounds;
  overlayWindow = new BrowserWindow({
    x, y, width, height,
    frame: false, transparent: true, alwaysOnTop: true,
    hasShadow: false, resizable: false, movable: false,
    backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  overlayWindow.loadFile('overlay.html');
});

ipcMain.on('selection-made', (event, rect) => {
  if (overlayWindow) overlayWindow.destroy();
  if (rect && mainWindow) {
    mainWindow.webContents.send('start-recording-area', { rect });
  }
});

// --- FILE SAVING ---
ipcMain.handle('save-screenshot-dialog', async (event, base64Data) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Screenshot',
    defaultPath: `screenshot-${Date.now()}.png`,
    filters: [{ name: 'Images', extensions: ['png'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, base64Data.replace(/^data:image\/png;base64,/, ""), 'base64');
    return true;
  }
  return false;
});

ipcMain.handle('save-video-dialog', async (event, buffer) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Video Recording',
    defaultPath: `recording-${Date.now()}.mp4`,
    filters: [{ name: 'Videos', extensions: ['mp4'] }]
  });

  if (!filePath) return false;

  const tempWebmPath = path.join(app.getPath('temp'), `temp-${Date.now()}.webm`);
  fs.writeFileSync(tempWebmPath, Buffer.from(buffer));

  return new Promise((resolve) => {
    ffmpeg(tempWebmPath)
      .output(filePath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoFilters('format=yuv420p') // <-- THE CRUCIAL QUICKTIME FIX!
      .on('end', () => {
        if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
        resolve(true);
      })
      .on('error', () => {
        if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
        resolve(false);
      })
      .run();
  });
});

// --- IPC WINDOW ACTIONS ---

// Minimize the window when recording starts
ipcMain.on('minimize-app', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Restore the window when recording ends
ipcMain.on('restore-app', () => {
  if (mainWindow) {
    mainWindow.restore();
    mainWindow.focus();
  }
});