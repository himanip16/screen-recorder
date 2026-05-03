const { ipcRenderer } = require('electron');

console.log("[Renderer] Script loaded successfully.");

let mediaRecorder;
let chunks = [];

// Helper function to get the full screen stream
async function getStream() {
  console.log("[Renderer] Attempting to acquire display media stream...");
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false
    });
    console.log("[Renderer] Display Media stream acquired:", stream);
    return stream;
  } catch (error) {
    console.error("[Renderer] Error in navigator.mediaDevices.getDisplayMedia:", error);
    throw error;
  }
}

// Helper to set up a hidden video element
function createHiddenVideo(stream) {
  console.log("[Renderer] Creating hidden video element to render stream frames...");
  const video = document.createElement('video');
  video.srcObject = stream;
  
  // Hide visually but keep it in the DOM
  video.style.position = 'fixed';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  
  document.body.appendChild(video);
  console.log("[Renderer] Video element appended to DOM.");
  return video;
}


// ================= SCREENSHOT FULL SCREEN =================

const snapBtn = document.getElementById('snap-full');
if (snapBtn) {
  console.log("[Renderer] 'snap-full' button listener initialized.");
  snapBtn.onclick = async () => {
    console.log("[Renderer] Full Screenshot button clicked.");
    try {
      const stream = await getStream();
      const video = createHiddenVideo(stream);

      video.onloadedmetadata = async () => {
        console.log("[Renderer] Video metadata loaded. Dimensions:", video.videoWidth, "x", video.videoHeight);
        await video.play();
        console.log("[Renderer] Video started playing.");

        // Wait for first visual frame
        video.addEventListener('timeupdate', async () => {
          console.log("[Renderer] 'timeupdate' event fired. Snapping canvas frame now...");
          
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          console.log("[Renderer] Frame copied to canvas.");

          // Cleanup stream & element
          console.log("[Renderer] Cleaning up stream tracks and video element...");
          stream.getTracks().forEach(track => {
            console.log(`[Renderer] Stopping track: ${track.label}`);
            track.stop();
          });
          video.remove();

          const dataUrl = canvas.toDataURL('image/png');
          console.log("[Renderer] Canvas converted to PNG Data URL. Sending to backend...");
          
          const saved = await ipcRenderer.invoke('save-screenshot-dialog', dataUrl);
          console.log("[Renderer] Main process response for screenshot save:", saved);

          if (saved) alert('Screenshot saved successfully!');
        }, { once: true });
      };
    } catch (err) {
      console.error("[Renderer] Screenshot execution crashed:", err);
    }
  };
} else {
  console.error("[Renderer] ERROR: Could not find HTML element with id='snap-full'. Check your HTML file.");
}


// ================= RECORD FULL SCREEN =================

const startBtn = document.getElementById("snip");
if (startBtn) {
  console.log("[Renderer] 'snip' (Start) button listener initialized.");
  startBtn.onclick = async () => {
    console.log("[Renderer] Start Recording button clicked.");
    chunks = []; // Reset chunks array

    try {
      const stream = await getStream();
      console.log("[Renderer] Preparing MediaRecorder with video stream...");

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      });
      console.log("[Renderer] MediaRecorder initialized successfully. State:", mediaRecorder.state);

      mediaRecorder.ondataavailable = e => {
        console.log(`[Renderer] Data chunk available: ${e.data.size} bytes`);
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("[Renderer] MediaRecorder stopped. Processing saved chunks...");
        console.log(`[Renderer] Total chunks collected: ${chunks.length}`);

        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log("[Renderer] Blob created. Size:", blob.size, "bytes. Generating array buffer...");
        
        const buffer = await blob.arrayBuffer();
        console.log("[Renderer] Array buffer ready. Invoking main process save dialog...");

        const saved = await ipcRenderer.invoke('save-video-dialog', buffer);
        console.log("[Renderer] Main process response for video save:", saved);

        if (saved) alert('Recording saved successfully!');

        // Cleanup
        console.log("[Renderer] Stopping stream tracks after saving...");
        stream.getTracks().forEach(track => {
          console.log(`[Renderer] Stopping track: ${track.label}`);
          track.stop();
        });
      };

      // Start recording, grabbing a chunk every 100ms
      mediaRecorder.start(100);
      console.log("[Renderer] MediaRecorder started! State:", mediaRecorder.state);
      alert('Recording started!');

    } catch (err) {
      console.error("[Renderer] Video recording setup failed:", err);
    }
  };
} else {
  console.error("[Renderer] ERROR: Could not find HTML element with id='snip'. Check your HTML file.");
}

const stopBtn = document.getElementById("stop");
if (stopBtn) {
  console.log("[Renderer] 'stop' button listener initialized.");
  stopBtn.onclick = () => {
    console.log("[Renderer] Stop Recording button clicked.");
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.log("[Renderer] Stopping existing MediaRecorder...");
      mediaRecorder.stop();
    } else {
      console.warn("[Renderer] Warning: Either MediaRecorder doesn't exist or it is already inactive.");
    }
  };
} else {
  console.error("[Renderer] ERROR: Could not find HTML element with id='stop'. Check your HTML file.");
}