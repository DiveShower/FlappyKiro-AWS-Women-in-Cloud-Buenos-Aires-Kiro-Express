// infrastructure/BrowserInputAdapter.js
import CONFIG from '../config.js';

export class BrowserInputAdapter {
  /**
   * @param {InputController} inputCtrl
   * @param {HTMLCanvasElement} canvas
   * @param {GameOrchestrator} orchestrator
   */
  constructor(inputCtrl, canvas, orchestrator) {
    this._ctrl = inputCtrl;

    // Keyboard inputs
    window.addEventListener('keydown', e => {
      // Prevent browser scrolling for gameplay keys
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
      this._ctrl._onKeyDown(e.key);
    });

    const handleTap = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const logicalX = (clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
      const logicalY = (clientY - rect.top) * (CONFIG.CANVAS_HEIGHT / rect.height);

      if (orchestrator && orchestrator.isPauseButtonHit(logicalX, logicalY)) {
        this._ctrl._onKeyDown('Escape');
      } else {
        this._ctrl._onTouch();
      }
    };

    // Touch inputs (mobile/tablet)
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleTap(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    // Mouse click inputs (desktop)
    canvas.addEventListener('mousedown', e => {
      handleTap(e.clientX, e.clientY);
    });
  }
}
