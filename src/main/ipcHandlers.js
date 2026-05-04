const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// 1. IMPORT openOverlay from your window manager
const { openOverlay, closeOverlay, getMainWindow } = require('./windowManager');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function setupIpcHandlers() {
  ipcMain.handle('open-overlay', () => {
    // 2. Simply CALL the imported function here
    openOverlay();
  });

  ipcMain.on('selection-made', (event, rect) => {
    closeOverlay();
    const win = getMainWindow();
    if (rect && win) {
      win.webContents.send('start-recording-area', { rect });
    }
  });

  ipcMain.handle('save-screenshot-dialog', async (event, base64Data) => {
    const win = getMainWindow();
    const { filePath } = await dialog.showSaveDialog(win, {
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
    const win = getMainWindow();
    const { filePath } = await dialog.showSaveDialog(win, {
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
        .videoFilters('format=yuv420p')
        .on('end', () => {
          if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
          resolve(true);
        })
        .on('error', (err) => {
          console.error(err);
          if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
          resolve(false);
        })
        .run();
    });
  });

  ipcMain.on('minimize-app', () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.on('restore-app', () => {
    const win = getMainWindow();
    if (win) {
      win.restore();
      win.focus();
    }
  });
}

module.exports = { setupIpcHandlers };