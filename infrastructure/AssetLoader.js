// infrastructure/AssetLoader.js

export class AssetLoader {
  /**
   * Loads all game image and audio assets.
   * REQ-GSM-003/004, REQ-AVF-006 (never rejects)
   *
   * @returns {Promise<Object>} { ghostyImg, audioBuffers }
   */
  load() {
    return Promise.all([
      this._loadImage('assets/ghosty.png'),
      this._loadAudio('assets/jump.wav'),
      this._loadAudio('assets/game_over.wav'),
      this._loadBgm()
    ]).then(([ghostyImg, jumpBuf, gameOverBuf, bgmBuf]) => {
      return {
        ghostyImg,
        audioBuffers: {
          jump: jumpBuf,
          game_over: gameOverBuf,
          bgm: bgmBuf
        }
      };
    });
  }

  /**
   * Helper to load an image, generating a procedural fallback on failure.
   *
   * @param {string} src
   * @returns {Promise<HTMLImageElement>}
   * @private
   */
  _loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load image ${src}, generating procedural fallback...`);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 34;
          canvas.height = 34;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(17, 17, 17, 0, 2 * Math.PI);
          ctx.fill();

          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.src = canvas.toDataURL();
        } catch (e) {
          // Absolute fallback if canvas fails
          resolve(img);
        }
      };
      img.src = src;
    });
  }

  /**
   * Helper to fetch audio files as ArrayBuffers.
   *
   * @param {string} src
   * @returns {Promise<ArrayBuffer|null>}
   * @private
   */
  _loadAudio(src) {
    return fetch(src)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.arrayBuffer();
      })
      .catch(err => {
        console.warn(`Failed to load audio ${src}:`, err.message);
        return null;
      });
  }

  /**
   * Tries to load ogg first, then mp3, or resolves to null.
   *
   * @returns {Promise<ArrayBuffer|null>}
   * @private
   */
  _loadBgm() {
    return this._loadAudio('assets/bgm.ogg')
      .then(buf => {
        if (buf) return buf;
        return this._loadAudio('assets/bgm.mp3');
      });
  }
}
