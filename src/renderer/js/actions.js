const { ipcRenderer } = require('electron');

// We use './js/' because the path is resolved relative to index.html
const { getScreenStream, createHiddenVideo } = require('./js/media.js');
const recorder = require('./js/recorder.js');
const { updateStatusUI, resetUI } = require('./js/ui.js');

// Target Elements
const snapFullBtn = document.getElementById('snap-full');
const snapAreaBtn = document.getElementById('snap-area');
const startBtn = document.getElementById('snip');
const areaBtn = document.getElementById('snip-area');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');
const closeBtn = document.getElementById('close-app');
const audioCheckbox = document.getElementById('record-audio');


// ... keep the rest of your actions.js file exactly as it is ...
let currentAction = null; // 'screenshot-area' | 'record-area'

if (closeBtn) closeBtn.onclick = () => window.close();

// === 1. SCREENSHOTS ===
if (snapFullBtn) {
  snapFullBtn.onclick = async () => {
    try {
      const stream = await getScreenStream(false);
      const video = createHiddenVideo(stream);

      video.onloadedmetadata = async () => {
        await video.play();
        video.addEventListener('timeupdate', async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          stream.getTracks().forEach(t => t.stop());
          video.remove();

          const dataUrl = canvas.toDataURL('image/png');
          const saved = await ipcRenderer.invoke('save-screenshot-dialog', dataUrl);
          if (saved) alert('Full screenshot saved!');
        }, { once: true });
      };
    } catch (e) { console.error("Full screenshot error:", e); }
  };
}

if (snapAreaBtn) {
  snapAreaBtn.onclick = async () => {
    currentAction = 'screenshot-area';
    await ipcRenderer.invoke('open-overlay');
  };
}

// === 2. RECORDINGS ===
if (startBtn) {
  startBtn.onclick = async () => {
    try {
      const includeAudio = audioCheckbox ? audioCheckbox.checked : false;
      const stream = await getScreenStream(includeAudio);
      
      recorder.start(stream, (saved) => {
        if (saved) alert('Full recording saved!');
        resetUI();
      });

      updateStatusUI('recording');
      setTimeout(() => ipcRenderer.send('minimize-app'), 500);
      if (pauseBtn) pauseBtn.disabled = false;
    } catch (err) { console.error("Full screen record error:", err); }
  };
}

if (areaBtn) {
  areaBtn.onclick = async () => {
    currentAction = 'record-area';
    await ipcRenderer.invoke('open-overlay');
  };
}

// Overlay response router
ipcRenderer.on('start-recording-area', async (event, { rect }) => {

  // === 1. Area Screenshot Mode ===
  if (currentAction === 'screenshot-area') {
    try {
      const stream = await getScreenStream(false);
      const video = createHiddenVideo(stream);

      video.addEventListener('playing', () => {
        // A short 150ms timeout ensures the stream frames are buffered
        setTimeout(async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Grab the true, native resolution of the desktop stream
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          // Grab logical viewport resolution
          const screenWidth = window.screen.width;
          const screenHeight = window.screen.height;

          // Calculate scaling factors to bridge logical vs native sizes
          const scaleX = videoWidth / screenWidth;
          const scaleY = videoHeight / screenHeight;

          // Set the canvas size to the exact logical selection
          canvas.width = rect.width;
          canvas.height = rect.height;

          // Crop and draw applying the scaling adjustments
          ctx.drawImage(
            video,
            rect.x * scaleX, 
            rect.y * scaleY, 
            rect.width * scaleX, 
            rect.height * scaleY,
            0, 0, 
            rect.width, 
            rect.height
          );

          // Terminate the active tracks
          stream.getTracks().forEach(t => t.stop());
          video.remove();

          const dataUrl = canvas.toDataURL('image/png');
          const saved = await ipcRenderer.invoke('save-screenshot-dialog', dataUrl);
          
          if (saved) {
            alert('Area screenshot saved!');
          }
          resetUI();
        }, 150);
      }, { once: true });

      await video.play();

    } catch (e) {
      console.error("Area snapshot error:", e);
      resetUI();
    }
    return;
  }


 // === 2. Area Recording Mode ===

  if (currentAction === 'record-area') {
    try {
      const includeAudio = audioCheckbox ? audioCheckbox.checked : false;
      const stream = await getScreenStream(includeAudio);

      // Measure Retina scaling factors immediately
      const scaleX = window.devicePixelRatio || 1;
      const scaleY = window.devicePixelRatio || 1;

      // Calculate the physical pixel crop settings for the Mac screen
      const cropSettings = {
        x: Math.round(rect.x * scaleX),
        y: Math.round(rect.y * scaleY),
        width: Math.round(rect.width * scaleX),
        height: Math.round(rect.height * scaleY)
      };

      // Record the stream natively. When done, pass the cropSettings to the backend.
      recorder.start(stream, (saved) => {
        if (saved) alert('Area recording saved!');
        resetUI();
      }, cropSettings); // Passing the cropSettings to the recorder

      updateStatusUI('recording');
      setTimeout(() => ipcRenderer.send('minimize-app'), 500);
      if (pauseBtn) pauseBtn.disabled = false;
    } catch (err) {
      console.error("Area record error:", err);
      resetUI();
    }
  }
});

// === 3. CONTROLS ===
if (pauseBtn) {
  pauseBtn.onclick = () => {
    const state = recorder.getState();
    if (state === 'recording') {
      recorder.pause();
      updateStatusUI('paused');
      ipcRenderer.send('restore-app');
    } else if (state === 'paused') {
      recorder.resume();
      updateStatusUI('recording');
      setTimeout(() => ipcRenderer.send('minimize-app'), 500);
    }
  };
}

if (stopBtn) {
  stopBtn.onclick = () => {
    ipcRenderer.send('restore-app');
    recorder.stop();
  };
}

// === 4. GLOBAL SHORTCUTS ===
ipcRenderer.on('hotkey-pause', () => {
  if (pauseBtn && !pauseBtn.disabled) pauseBtn.click();
});

ipcRenderer.on('hotkey-stop', () => {
  if (stopBtn) stopBtn.click();
});