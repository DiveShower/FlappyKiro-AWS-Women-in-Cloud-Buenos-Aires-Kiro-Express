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

    let lastTapTime = 0;
    const handleTap = (clientX, clientY, source) => {
      const now = performance.now();
      // Prevent duplicate processing of touch/mouse event sequences within 100ms
      if (now - lastTapTime < 100) {
        console.log(`[BrowserInputAdapter] Ignored duplicate tap from ${source}`);
        return;
      }
      lastTapTime = now;

      console.log(`[BrowserInputAdapter] Tap triggered by ${source} at client coords (${clientX}, ${clientY})`);

      const rect = canvas.getBoundingClientRect();
      const logicalX = (clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
      const logicalY = (clientY - rect.top) * (CONFIG.CANVAS_HEIGHT / rect.height);

      console.log(`[BrowserInputAdapter] Logical game coords: (${logicalX.toFixed(1)}, ${logicalY.toFixed(1)})`);

      if (orchestrator && orchestrator.isPauseButtonHit(logicalX, logicalY)) {
        console.log('[BrowserInputAdapter] Pause button hit! Transitioning...');
        this._ctrl._onKeyDown('Escape');
      } else {
        this._ctrl._onTouch();
      }
    };

    // 1. Pointer Events (Modern unified standard)
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      handleTap(e.clientX, e.clientY, 'pointerdown');
    }, { passive: false });

    // 2. Touch Events (Mobile browser compatibility fallback)
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleTap(touch.clientX, touch.clientY, 'touchstart');
      }
    }, { passive: false });

    // 3. Mouse Events (Desktop browser compatibility fallback)
    canvas.addEventListener('mousedown', e => {
      handleTap(e.clientX, e.clientY, 'mousedown');
    });
  }
}
