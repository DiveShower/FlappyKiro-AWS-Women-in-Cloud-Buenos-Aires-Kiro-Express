// infrastructure/WebAudioAdapter.js

export class WebAudioAdapter {
  constructor() {
    this._ctx = null; // AudioContext — created on first user gesture
    this._buffers = {}; // { 'jump': AudioBuffer, 'game_over': AudioBuffer }
    this._musicNode = null;
    this._musicGain = null;
  }

  /**
   * Must be called inside a user gesture (click/keydown/touch) to unlock AudioContext.
   *
   * @returns {AudioContext}
   * @private
   */
  _ensureCtx() {
    if (!this._ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AudioCtx();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  /**
   * Decodes array buffers from assets map.
   *
   * @param {Object} assetMap - { jump: ArrayBuffer, game_over: ArrayBuffer, bgm: ArrayBuffer }
   */
  async loadAssets(assetMap) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    for (const [key, ab] of Object.entries(assetMap)) {
      if (ab) {
        try {
          // Decode audio data (ab is consumed unless cloned, which is fine since we load once)
          this._buffers[key] = await ctx.decodeAudioData(ab);
        } catch (e) {
          console.warn(`Failed to decode audio asset: ${key}`, e.message);
        }
      }
    }
    this._ctx = ctx;
  }

  /**
   * Play SFX jump or game_over
   *
   * @param {string} name
   */
  playSfx(name) {
    const ctx = this._ensureCtx();
    const buf = this._buffers[name];
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  }

  /**
   * Synthesizes short tone for score.
   *
   * @param {Object} tone - { freq, dur, wave }
   */
  playTone({ freq, dur, wave = 'square' }) {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = wave;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  /**
   * Play BGM loop if loaded.
   */
  startMusic() {
    if (this._musicNode) return; // already playing
    const ctx = this._ensureCtx();
    const buf = this._buffers['bgm'];
    if (!buf) return; // silent no-op (REQ-AVF-006)

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.35;

    src.connect(gain);
    gain.connect(ctx.destination);

    src.start();
    this._musicNode = src;
    this._musicGain = gain;
  }

  /**
   * Suspend AudioContext to pause all music.
   */
  pauseMusic() {
    if (this._ctx) {
      this._ctx.suspend();
    }
  }

  /**
   * Stop BGM.
   */
  stopMusic() {
    try {
      if (this._musicNode) {
        this._musicNode.stop();
      }
    } catch (_) {}
    this._musicNode = null;
    this._musicGain = null;
  }
}
