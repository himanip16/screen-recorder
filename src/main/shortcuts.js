const { globalShortcut } = require('electron');
const { getMainWindow } = require('./windowManager');

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Alt+P', () => {
    const win = getMainWindow();
    if (win) win.webContents.send('hotkey-pause');
  });

  globalShortcut.register('CommandOrControl+Alt+S', () => {
    const win = getMainWindow();
    if (win) win.webContents.send('hotkey-stop');
  });
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

module.exports = { registerShortcuts, unregisterShortcuts };