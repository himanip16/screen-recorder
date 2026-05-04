// mediaUtils.js

/**
 * Grabs display media and optionally merges it with microphone audio.
 * @param {boolean} includeAudio Whether to request audio tracks
 */
async function getScreenStream(includeAudio = false) {
  console.log(`[Utils] Requesting display media stream (audio: ${includeAudio})...`);
  try {
    // 1. Capture the visual screen
    const videoStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false // Screen recording doesn't capture computer sound cleanly this way
    });

    if (!includeAudio) {
      return videoStream;
    }

    try {
      // 2. Capture the microphone audio
      console.log("[Utils] Capturing microphone audio tracks...");
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        },
        video: false
      });

      // 3. Combine both screen video and microphone audio tracks together
      const combinedTracks = [
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ];

      return new MediaStream(combinedTracks);
    } catch (audioErr) {
      console.warn("[Utils] Microphone access was denied or failed. Saving video only.", audioErr);
      return videoStream; // Fallback to video only if the mic fails
    }

  } catch (err) {
    console.error("[Utils] Failed to get display stream:", err);
    throw err;
  }
}

function createHiddenVideo(stream) {
  const video = document.createElement('video');
  video.srcObject = stream;
  
  video.style.position = 'fixed';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  
  document.body.appendChild(video);
  return video;
}

module.exports = { getScreenStream, createHiddenVideo };