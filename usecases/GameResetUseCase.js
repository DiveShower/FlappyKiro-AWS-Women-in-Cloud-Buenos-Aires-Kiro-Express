// usecases/GameResetUseCase.js
import { createGhostyState } from '../domain/GhostyState.js';
import CONFIG from '../config.js';

export class GameResetUseCase {
  /**
   * Reset game state variables to start playing.
   * REQ-GSM-021
   *
   * @param {number} highScore  - Preserved across resets
   * @returns {Object} { ghosty, score, difficulty, pipes, particles, feedback, subtitle }
   */
  reset(highScore) {
    const ghosty = createGhostyState({
      x: CONFIG.GHOSTY_START_X,
      y: CONFIG.CANVAS_HEIGHT / 2
    });

    const score = Object.freeze({
      total: 0,
      highScore,
      multiplier: 1,
      multiplierCounter: 0,
      lastModifierId: null,
      lastPrecisionTierId: null
    });

    const doubleGapThreshold = this._randInt(
      CONFIG.DOUBLE_GAP_THRESHOLD_MIN,
      CONFIG.DOUBLE_GAP_THRESHOLD_MAX
    );

    const difficulty = Object.freeze({
      pipeSpeed: CONFIG.PIPE_SPEED_BASE,
      gapHeightMin: CONFIG.GAP_HEIGHT_MIN,
      gapHeightMax: CONFIG.GAP_HEIGHT_MAX,
      pipeSpacing: CONFIG.PIPE_SPACING,
      pipesPassed: 0,
      singleGapCounter: 0,
      doubleGapThreshold,
      thirdAxisActive: false,
      thirdAxisSteps: 0,
      slowTimeTimer: 0,
      slowTimeBaseSpeed: 0
    });

    return {
      ghosty,
      score,
      difficulty,
      pipes: [],
      particles: [],
      feedback: null,
      subtitle: null
    };
  }

  /**
   * Helper to pick a random integer in [min, max] inclusive.
   *
   * @param {number} min
   * @param {number} max
   * @returns {number}
   * @private
   */
  _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
