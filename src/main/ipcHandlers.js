const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Set the path directly from the environment variable we set in main.js
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

// Import window manager helpers
const { openOverlay, closeOverlay, getMainWindow } = require('./windowManager');


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

ipcMain.handle('save-video-dialog', async (event, buffer, cropSettings) => {
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
      let ffmpegCommand = ffmpeg(tempWebmPath)
        .output(filePath)
        .videoCodec('libx264')
        .audioCodec('aac');

      // Create video filters array
      let filters = [];

      // Add direct high-performance cropping if valid crop coordinates exist
      if (cropSettings && cropSettings.width > 0 && cropSettings.height > 0) {
        filters.push(`crop=${cropSettings.width}:${cropSettings.height}:${cropSettings.x}:${cropSettings.y}`);
      }

      // Add the "Even Dimensions" rule safety
      filters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2', 'format=yuv420p');

      // Apply the filters to FFmpeg
      ffmpegCommand.videoFilters(filters)
        .on('end', () => {
          if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
          resolve(true);
        })
        .on('error', (err) => {
          console.error("FFmpeg Error:", err.message);
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