const { ipcRenderer } = require('electron');

let mediaRecorder = null;
let recordedChunks = [];

function start(stream, onSaveComplete) {
  recordedChunks = [];

  // Use a standard WebM codec; converted to MP4 on the backend
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Stop all original stream feeds cleanly
    stream.getTracks().forEach(track => track.stop());

    // Send the buffer to the main process to save as a file
    const saved = await ipcRenderer.invoke('save-video-dialog', buffer);
    if (onSaveComplete) onSaveComplete(saved);
  };

  mediaRecorder.start(1000); // Saves chunks every 1 second
}

function stop() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

function pause() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
  }
}

function resume() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
  }
}

function getState() {
  return mediaRecorder ? mediaRecorder.state : 'inactive';
}

module.exports = { start, stop, pause, resume, getState };