// adapters/InputController.js
import { IInputPort } from '../usecases/ports/IInputPort.js';

export class InputController extends IInputPort {
  constructor() {
    super();
    this._flapIntent = false;
    this._pauseIntent = false;
    this._muteIntent = false;
    this._lastFlapMs = 0; // throttle for REQ-GAP-11 (80 ms debounce)
  }

  // Called by infrastructure (BrowserInputAdapter)
  _onKeyDown(key) {
    const now = performance.now();
    if ((key === ' ' || key === 'ArrowUp') && now - this._lastFlapMs > 80) {
      this._flapIntent = true;
      this._lastFlapMs = now;
    }
    if (key === 'Escape' || key === 'p' || key === 'P') {
      this._pauseIntent = true;
    }
    if (key === 'm' || key === 'M') {
      this._muteIntent = true;
    }
  }

  _onTouch() {
    const now = performance.now();
    if (now - this._lastFlapMs > 80) {
      this._flapIntent = true;
      this._lastFlapMs = now;
    }
  }

  // IInputPort implementation — consume (read + clear) intent flags
  consumeFlapIntent() {
    const v = this._flapIntent;
    this._flapIntent = false;
    return v;
  }

  consumePauseIntent() {
    const v = this._pauseIntent;
    this._pauseIntent = false;
    return v;
  }

  consumeMuteIntent() {
    const v = this._muteIntent;
    this._muteIntent = false;
    return v;
  }
}
