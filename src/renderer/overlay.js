const { ipcRenderer } = require('electron');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let startX, startY, drawing = false;

function redraw(x, y) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const w = x - startX;
  const h = y - startY;

  ctx.clearRect(startX, startY, w, h);
  ctx.strokeStyle = 'red';
  ctx.strokeRect(startX, startY, w, h);
}

canvas.onmousedown = e => {
  startX = e.clientX;
  startY = e.clientY;
  drawing = true;
};

canvas.onmousemove = e => {
  if (!drawing) return;
  redraw(e.clientX, e.clientY);
};

canvas.onmouseup = e => {
  drawing = false;

  const rect = {
    x: Math.min(startX, e.clientX),
    y: Math.min(startY, e.clientY),
    width: Math.abs(e.clientX - startX),
    height: Math.abs(e.clientY - startY)
  };

  ipcRenderer.send('selection-made', rect);
};