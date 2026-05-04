const { ipcRenderer } = require('electron');
const { getScreenStream, createHiddenVideo } = require('./mediaUtils');
const recorder = require('./recorderManager');

// DOM Elements
const snapBtn = document.getElementById('snap-full');
const startBtn = document.getElementById('snip');
const areaBtn = document.getElementById('snip-area');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');

// DOM Elements for visual status
const statusBadge = document.getElementById('recording-status');
const statusText = document.getElementById('status-text');

// Helper to update the badge color and text
function updateStatusUI(state) {
  if (!statusBadge || !statusText) return;
  statusBadge.className = 'status-badge';

  if (state === 'recording') {
    statusBadge.classList.add('status-recording');
    statusText.innerText = 'REC';
  } else if (state === 'paused') {
    statusBadge.classList.add('status-paused');
    statusText.innerText = 'PAUSED';
  } else {
    statusBadge.classList.add('status-idle');
    statusText.innerText = 'Idle';
  }
}

// Reset UI helper
function resetUI() {
  if (pauseBtn) {
    pauseBtn.disabled = true;
    pauseBtn.innerText = "Pause";
  }
  updateStatusUI('idle');
  // Always ensure the main window is back up when completely stopped
  ipcRenderer.send('restore-app');
}

// ================= 1. FULL SCREENSHOT =================
if (snapBtn) {
  snapBtn.onclick = async () => {
    try {
      const stream = await getScreenStream();
      const video = createHiddenVideo(stream);

      video.onloadedmetadata = async () => {
        await video.play();

        video.addEventListener('timeupdate', async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          stream.getTracks().forEach(track => track.stop());
          video.remove();

          const dataUrl = canvas.toDataURL('image/png');
          const saved = await ipcRenderer.invoke('save-screenshot-dialog', dataUrl);
          if (saved) alert('Screenshot saved successfully!');
        }, { once: true });
      };
    } catch (err) {
      console.error("Screenshot error:", err);
    }
  };
}

// 1. Add the checkbox element mapping at the top of renderer.js
const audioCheckbox = document.getElementById('record-audio');

// 2. Update your start recording handler
if (startBtn) {
  startBtn.onclick = async () => {
    try {
      // Check if the user wants audio
      const includeAudio = audioCheckbox ? audioCheckbox.checked : false;
      const stream = await getScreenStream(includeAudio);
      
      recorder.start(stream, (saved) => {
        if (saved) alert('Recording saved successfully!');
        resetUI();
      });

      updateStatusUI('recording');

      setTimeout(() => {
        ipcRenderer.send('minimize-app');
      }, 500);

      if (pauseBtn) {
        pauseBtn.disabled = false;
        pauseBtn.innerText = "Pause";
      }
    } catch (err) {
      console.error("Start recording error:", err);
    }
  };
}

// 3. Update your Record Area handler similarly
ipcRenderer.on('start-recording-area', async (event, { rect }) => {
  try {
    const includeAudio = audioCheckbox ? audioCheckbox.checked : false;
    const stream = await getScreenStream(includeAudio);
    const video = createHiddenVideo(stream);

    video.onloadedmetadata = async () => {
      await video.play();

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = rect.width;
      cropCanvas.height = rect.height;
      const cropCtx = cropCanvas.getContext('2d');

      function drawFrame() {
        if (video.paused || video.ended) return;
        cropCtx.drawImage(
          video,
          rect.x, rect.y, rect.width, rect.height,
          0, 0, rect.width, rect.height
        );
        requestAnimationFrame(drawFrame);
      }
      drawFrame();

      // Capture visual stream from canvas
      const croppedStream = cropCanvas.captureStream(30);

      // IMPORTANT: If we captured audio tracks, inject them into our cropped canvas stream
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => croppedStream.addTrack(track));
      }

      recorder.start(croppedStream, (saved) => {
        if (saved) alert('Cropped recording saved!');
        video.remove();
        resetUI();
      });

      updateStatusUI('recording');

      setTimeout(() => {
        ipcRenderer.send('minimize-app');
      }, 500);

      if (pauseBtn) {
        pauseBtn.disabled = false;
        pauseBtn.innerText = "Pause";
      }
    };
  } catch (err) {
    console.error("Area recording error:", err);
  }
});



// ================= 3. RECORD AREA =================
if (areaBtn) {
  areaBtn.onclick = async () => {
    await ipcRenderer.invoke('open-overlay');
  };
}


// ================= 4. PAUSE / RESUME =================
if (pauseBtn) {
  pauseBtn.onclick = () => {
    const state = recorder.getState();
    if (state === 'recording') {
      recorder.pause();
      pauseBtn.innerText = "Resume";
      updateStatusUI('paused');
      
      // Bring the window back up when paused so user can see control buttons
      ipcRenderer.send('restore-app');
      
    } else if (state === 'paused') {
      recorder.resume();
      pauseBtn.innerText = "Pause";
      updateStatusUI('recording');
      
      // Minimize the window again once the user resumes
      setTimeout(() => {
        ipcRenderer.send('minimize-app');
      }, 500);
    }
  };
}

// ================= 5. STOP RECORDING =================
if (stopBtn) {
  stopBtn.onclick = () => {
    // Instantly bring the window up so the user can see the Save file dialog
    ipcRenderer.send('restore-app');
    recorder.stop();
  };
}

// When user presses Ctrl + Alt + P
ipcRenderer.on('hotkey-pause', () => {
  const pauseBtn = document.getElementById('pause');
  if (pauseBtn && !pauseBtn.disabled) {
    console.log("[Renderer] Hotkey received: Toggling Pause/Resume via script");
    pauseBtn.click(); // This triggers your existing pause/resume logic automatically!
  }
});

// When user presses Ctrl + Alt + S
ipcRenderer.on('hotkey-stop', () => {
  const stopBtn = document.getElementById('stop');
  if (stopBtn) {
    console.log("[Renderer] Hotkey received: Stopping recording via script");
    stopBtn.click(); // This stops the recording and restores the window
  }
});