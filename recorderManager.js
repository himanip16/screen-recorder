// recorderManager.js
const { ipcRenderer } = require('electron');

class ScreenRecorderManager {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.activeStream = null;
  }

  /**
   * Starts recording a stream (can be full screen or a cropped canvas stream).
   */
  start(stream, onStopCallback) {
    this.chunks = [];
    this.activeStream = stream;

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm'
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = async () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const buffer = await blob.arrayBuffer();

      // Send to backend via IPC
      const saved = await ipcRenderer.invoke('save-video-dialog', buffer);
      
      // Cleanup the screen capture stream
      this.activeStream.getTracks().forEach(track => track.stop());
      
      if (onStopCallback) onStopCallback(saved);
    };

    this.mediaRecorder.start(100);
  }

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  getState() {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }
}

module.exports = new ScreenRecorderManager();