// adapters/AudioController.js
import { IAudioPort } from '../usecases/ports/IAudioPort.js';

export class AudioController extends IAudioPort {
  /**
   * @param {Object} webAudio - Layer 4 infrastructure
   * @param {boolean} muted
   */
  constructor(webAudio, muted) {
    super();
    this._audio = webAudio;
    this._muted = muted;
  }

  setMuted(muted) {
    this._muted = muted;
  }

  isMuted() {
    return this._muted;
  }

  _play(fn) {
    if (!this._muted) {
      fn();
    }
  }

  // IAudioPort implementation
  playFlap() {
    this._play(() => this._audio.playSfx('jump'));
  }

  playGameOver() {
    this._play(() => this._audio.playSfx('game_over'));
  }

  playScore(tierId) {
    this._play(() => this._audio.playTone(SCORE_TONES[tierId]));
  }

  playModifier() {
    this._play(() => this._audio.playTone({ freq: 880, dur: 0.12, wave: 'sine' }));
  }

  startMusic() {
    this._play(() => this._audio.startMusic());
  }

  pauseMusic() {
    this._audio.pauseMusic(); // pause is unconditional
  }

  stopMusic() {
    this._audio.stopMusic(); // stop is unconditional
  }
}

const SCORE_TONES = {
  PERFECTO: { freq: 1046, dur: 0.10, wave: 'square' }, // high C
  BUENO:    { freq:  784, dur: 0.10, wave: 'square' }, // mid G
  CASI:     { freq:  523, dur: 0.10, wave: 'square' }, // low C
};
