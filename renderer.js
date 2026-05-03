const { ipcRenderer } = require('electron');

let mediaRecorder;
let chunks = [];

// Helper to get raw video stream using standard browser picker
async function getStream() {
  return await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: "always" },
    audio: false
  });
}

// === SCREENSHOT CONTROLS ===

// Full Screen Screenshot
document.getElementById('snap-full').onclick = async () => {
  try {
    const stream = await getStream();
    const video = document.createElement('video');
    video.srcObject = stream;

    video.onloadedmetadata = async () => {
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach(track => track.stop());

      const dataUrl = canvas.toDataURL('image/png');
      const saved = await ipcRenderer.invoke('save-screenshot-dialog', dataUrl);
      if (saved) alert('Full screenshot saved successfully!');
    };
  } catch (err) {
    console.error("Screenshot error:", err);
  }
};

// Snip Area Screenshot
document.getElementById('snap-snip').onclick = async () => {
  await ipcRenderer.invoke('open-overlay', 'screenshot-snip');
};

ipcRenderer.on('process-screenshot-snip', async (event, { rect }) => {
  try {
    const stream = await getStream();
    const video = document.createElement('video');
    video.srcObject = stream;

    video.onloadedmetadata = async () => {
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');

      // Crop out the dragged area
      ctx.drawImage(
        video,
        rect.x, rect.y, rect.width, rect.height,
        0, 0, rect.width, rect.height
      );

      stream.getTracks().forEach(track => track.stop());

      const croppedDataUrl = canvas.toDataURL('image/png');
      const saved = await ipcRenderer.invoke('save-screenshot-dialog', croppedDataUrl);
      if (saved) alert('Snip screenshot saved successfully!');
    };
  } catch (err) {
    console.error("Error creating snip screenshot:", err);
  }
});


// === VIDEO CONTROLS ===

document.getElementById("snip").onclick = async () => {
  await ipcRenderer.invoke('open-overlay', 'video-record');
};

ipcRenderer.on('start-recording-area', async (event, { rect }) => {
  chunks = [];
  try {
    const stream = await getStream();
    const video = document.createElement('video');
    video.srcObject = stream;

    video.onloadedmetadata = async () => {
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');

      function draw() {
        if (video.paused || video.ended) return;
        ctx.drawImage(
          video,
          rect.x, rect.y, rect.width, rect.height,
          0, 0, rect.width, rect.height
        );
        requestAnimationFrame(draw);
      }
      draw();

      const croppedStream = canvas.captureStream(30);
      mediaRecorder = new MediaRecorder(croppedStream, { mimeType: 'video/webm' });

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const buffer = await blob.arrayBuffer();
        
        const saved = await ipcRenderer.invoke('save-video-dialog', buffer);
        if (saved) alert('Recording saved successfully!');

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
    };
  } catch (err) {
    console.error("Error recording video:", err);
  }
});

document.getElementById("stop").onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
};