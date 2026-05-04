const { app } = require('electron');
const { createMainWindow } = require('./src/main/windowManager');
const { registerShortcuts, unregisterShortcuts } = require('./src/main/shortcuts');
const { setupIpcHandlers } = require('./src/main/ipcHandlers');

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createMainWindow();
  registerShortcuts();
  setupIpcHandlers();
});

app.on('will-quit', () => {
  unregisterShortcuts();
});