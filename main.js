const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');

// Import FFmpeg modules
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Point fluent-ffmpeg to the correct downloaded binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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

// UPDATED DIALOG: Save video recording as MP4
ipcMain.handle('save-video-dialog', async (event, buffer) => {
  console.log("[Main Process] Received 'save-video-dialog' request.");
  
  try {
    // 1. Ask the user where to save the MP4 file
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Video Recording',
      defaultPath: `recording-${Date.now()}.mp4`, // Change extension to .mp4
      filters: [{ name: 'Videos', extensions: ['mp4'] }]
    });

    if (!filePath) {
      console.log("[Main Process] Video save dialog cancelled by user.");
      return false;
    }

    console.log(`[Main Process] Saving video file: ${filePath}`);

    // 2. Define temporary file paths for conversion
    const tempWebmPath = path.join(app.getPath('temp'), `temp-${Date.now()}.webm`);

    // 3. Write the initial buffer as a temporary WebM file
    fs.writeFileSync(tempWebmPath, Buffer.from(buffer));
    console.log(`[Main Process] Temporary WebM file saved at: ${tempWebmPath}`);

    // 4. Convert WebM to MP4 using FFmpeg
    return new Promise((resolve, reject) => {
      ffmpeg(tempWebmPath)
        .output(filePath)
        .videoCodec('libx264') // Converts VP8/VP9 video to H.264
        .audioCodec('aac')     // Converts Opus audio to AAC
        .on('start', () => {
          console.log('[Main Process] FFmpeg conversion started.');
        })
        .on('end', () => {
          console.log('[Main Process] FFmpeg conversion completed successfully.');
          
          // Delete the temporary WebM file when done
          fs.unlinkSync(tempWebmPath);
          resolve(true);
        })
        .on('error', (err) => {
          console.error('[Main Process] FFmpeg error during conversion:', err);
          
          // Cleanup temp file if error occurs
          if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
          reject(false);
        })
        .run();
    });

  } catch (err) {
    console.error("[Main Process] Error saving video:", err);
    return false;
  }
});