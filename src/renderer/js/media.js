/**
 * Captures the screen stream and merges optional audio.
 * @param {boolean} includeAudio 
 * @returns {Promise<MediaStream>}
 */
async function getScreenStream(includeAudio = false) {
  try {
    const videoStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false
    });

    if (!includeAudio) {
      return videoStream;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      });

      const combinedTracks = [
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ];

      return new MediaStream(combinedTracks);
    } catch (audioErr) {
      console.warn("Microphone denied or failed. Capturing video only.", audioErr);
      return videoStream;
    }
  } catch (err) {
    console.error("Failed to fetch display media stream:", err);
    throw err;
  }
}

/**
 * Generates a hidden video element to process frames.
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