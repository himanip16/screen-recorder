const { BrowserWindow, screen, desktopCapturer } = require('electron');

let mainWindow = null;
let overlayWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 52,
    frame: false,
    transparent: false,
    resizable: false,
    hasShadow: true,
    backgroundColor: '#0f172a',
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false 
    }
  });

  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.loadFile('src/renderer/index.html');
  
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
      callback({ video: sources[0] });
    });
  });

  return mainWindow;
}

function openOverlay() {
  const { width, height, x, y } = screen.getPrimaryDisplay().bounds;
  overlayWindow = new BrowserWindow({
    x, y, width, height,
    frame: false, transparent: true, alwaysOnTop: true,
    hasShadow: false, resizable: false, movable: false,
    backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  overlayWindow.loadFile('overlay.html');
}

function closeOverlay() {
  if (overlayWindow) {
    overlayWindow.destroy();
    overlayWindow = null;
  }
}

function getMainWindow() { return mainWindow; }

module.exports = { createMainWindow, openOverlay, closeOverlay, getMainWindow };