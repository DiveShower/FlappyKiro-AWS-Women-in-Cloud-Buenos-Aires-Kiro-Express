// infrastructure/GameLoop.js

export class GameLoop {
  /**
   * @param {GameOrchestrator} orchestrator
   * @param {CanvasRenderer}   renderer
   */
  constructor(orchestrator, renderer) {
    this._orchestrator = orchestrator;
    this._renderer = renderer;
    this._lastTs = null;
    this._rafId = null;
    this._frameTimes = [];
    this._trailEnabled = true;
  }

  start() {
    this._rafId = requestAnimationFrame(ts => this._frame(ts));
  }

  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }
  }

  _frame(ts) {
    const dt = this._lastTs == null ? 0 : ts - this._lastTs;
    this._lastTs = ts;

    if (dt > 0) {
      this._frameTimes.push(dt);
      if (this._frameTimes.length > 10) {
        this._frameTimes.shift();
      }
      if (this._frameTimes.length === 10) {
        const avg = this._frameTimes.reduce((a, b) => a + b, 0) / 10;
        if (avg > 20) {
          this._trailEnabled = false;
        }
      }
    }

    this._orchestrator.trailEnabled = this._trailEnabled;

    const snap = this._orchestrator.tick(dt);
    this._renderer.draw(snap, dt / 1000);

    this._rafId = requestAnimationFrame(t => this._frame(t));
  }
}
