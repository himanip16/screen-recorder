const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const fs = require('fs');

let mainWindow;

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
  mainWindow.webContents.openDevTools();

  // ================= THE FIX IS HERE =================
  // Intercept the browser's getDisplayMedia call and feed it screen sources
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      console.log("[Main Process] Found screen sources:", sources.map(s => s.name));
      
      // Select the first available screen (usually the primary display)
      callback({ video: sources[0] });
    }).catch(err => {
      console.error("[Main Process] Failed to get desktop sources:", err);
    });
  });
  // ===================================================
}

app.whenReady().then(() => {
  setTimeout(createWindow, 100);
});


// DIALOG: Save screenshot to computer
ipcMain.handle('save-screenshot-dialog', async (event, base64Data) => {
  console.log("[Main Process] Received 'save-screenshot-dialog' request.");
  
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Screenshot',
      defaultPath: `screenshot-${Date.now()}.png`,
      filters: [{ name: 'Images', extensions: ['png'] }]
    });

    if (filePath) {
      console.log(`[Main Process] User selected path for screenshot: ${filePath}`);
      const base64Image = base64Data.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(filePath, base64Image, 'base64');
      console.log("[Main Process] Screenshot file successfully written to disk.");
      return true;
    } else {
      console.log("[Main Process] Save dialog cancelled by user.");
      return false;
    }
  } catch (err) {
    console.error("[Main Process] Error saving screenshot:", err);
    return false;
  }
});

// DIALOG: Save video recording to computer
ipcMain.handle('save-video-dialog', async (event, buffer) => {
  console.log("[Main Process] Received 'save-video-dialog' request.");
  
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Video Recording',
      defaultPath: `recording-${Date.now()}.webm`,
      filters: [{ name: 'Videos', extensions: ['webm'] }]
    });

    if (filePath) {
      console.log(`[Main Process] User selected path for video: ${filePath}`);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log("[Main Process] Video file successfully written to disk.");
      return true;
    } else {
      console.log("[Main Process] Video save dialog cancelled by user.");
      return false;
    }
  } catch (err) {
    console.error("[Main Process] Error saving video:", err);
    return false;
  }
});