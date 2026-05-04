// mediaUtils.js

/**
 * Grabs the full screen display media stream.
 */
async function getScreenStream() {
  console.log("[Utils] Requesting display media stream...");
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false
    });
  } catch (err) {
    console.error("[Utils] Failed to get display stream:", err);
    throw err;
  }
}

/**
 * Creates and injects a hidden video element into the DOM so Chromium paints frames.
 */
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