const { ipcRenderer } = require('electron');

let mediaRecorder = null;
let recordedChunks = [];
let currentCrop = null;

function start(stream, onSaveComplete, cropSettings = null) {
  recordedChunks = [];
  currentCrop = cropSettings; // Save the crop configuration for this session

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const buffer = Buffer.from(await blob.arrayBuffer());

    stream.getTracks().forEach(track => track.stop());

    // Send the buffer along with the crop configuration to the backend
    const saved = await ipcRenderer.invoke('save-video-dialog', buffer, currentCrop);
    if (onSaveComplete) onSaveComplete(saved);
  };

  mediaRecorder.start(1000);
}

function stop() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}

function pause() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.pause();
}

function resume() {
  if (mediaRecorder && mediaRecorder.state === 'paused') mediaRecorder.resume();
}

function getState() {
  return mediaRecorder ? mediaRecorder.state : 'inactive';
}

module.exports = { start, stop, pause, resume, getState };