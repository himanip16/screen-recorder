const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. Establish the FFmpeg path immediately
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  let ffmpegPath = ffmpegInstaller.path;

  if (app.isPackaged) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  }

  process.env.FFMPEG_PATH = ffmpegPath;
} catch (err) {
  console.error("Failed to map FFmpeg binary:", err);
}

// 2. Safely load the rest of your files
const { createMainWindow } = require('./src/main/windowManager');
const { registerShortcuts, unregisterShortcuts } = require('./src/main/shortcuts');
const { setupIpcHandlers } = require('./src/main/ipcHandlers');

app.whenReady().then(() => {
  createMainWindow();
  registerShortcuts();
  setupIpcHandlers();
});

app.on('will-quit', () => {
  unregisterShortcuts();
});