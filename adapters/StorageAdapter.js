// adapters/StorageAdapter.js
import CONFIG from '../config.js';
import { IStoragePort } from '../usecases/ports/IStoragePort.js';

export class StorageAdapter extends IStoragePort {
  /**
   * Loads high score from browser localStorage.
   * REQ-GSM-018
   *
   * @returns {number}
   */
  loadHighScore() {
    const val = localStorage.getItem(CONFIG.LS_HIGH_SCORE);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Saves high score to browser localStorage.
   * REQ-GSM-019
   *
   * @param {number} n
   */
  saveHighScore(n) {
    localStorage.setItem(CONFIG.LS_HIGH_SCORE, String(n));
  }

  /**
   * Loads audio mute preference.
   * REQ-GSM-020
   *
   * @returns {boolean}
   */
  loadMuteState() {
    return localStorage.getItem(CONFIG.LS_MUTED) === 'true';
  }

  /**
   * Saves audio mute preference.
   * REQ-GSM-020
   *
   * @param {boolean} b
   */
  saveMuteState(b) {
    localStorage.setItem(CONFIG.LS_MUTED, String(b));
  }
}
