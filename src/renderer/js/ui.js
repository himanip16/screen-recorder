const statusBadge = document.getElementById('recording-status');
const pauseBtn = document.getElementById('pause');
const pauseIcon = document.getElementById('pause-icon');

function updateStatusUI(state) {
  if (!statusBadge || !pauseBtn || !pauseIcon) return;

  statusBadge.className = 'status-badge';

  if (state === 'recording') {
    statusBadge.classList.add('status-recording');
    statusBadge.setAttribute('data-tooltip', 'Recording');
    
    pauseBtn.setAttribute('data-tooltip', 'Pause');
    // Set to Pause icon SVG
    pauseIcon.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  } else if (state === 'paused') {
    statusBadge.classList.add('status-paused');
    statusBadge.setAttribute('data-tooltip', 'Paused');
    
    pauseBtn.setAttribute('data-tooltip', 'Resume');
    // Set to Play icon SVG
    pauseIcon.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  } else {
    statusBadge.classList.add('status-idle');
    statusBadge.setAttribute('data-tooltip', 'Idle');
    
    pauseBtn.setAttribute('data-tooltip', 'Pause');
    pauseIcon.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  }
}

function resetUI() {
  if (pauseBtn) pauseBtn.disabled = true;
  updateStatusUI('idle');
}

module.exports = { updateStatusUI, resetUI };