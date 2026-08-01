// adapters/UIPresenter.js
import CONFIG from '../config.js';

export class UIPresenter {
  /**
   * Builds the HUD data object from current domain state.
   * REQ-VUI-004
   * @param {ScoreState}      score
   * @param {DifficultyState} difficulty
   * @param {Pipe[]}          pipes
   * @returns {Object} HUDDto
   */
  buildHUD(score, difficulty, pipes) {
    const lastPipe = pipes.findLast(p => p.passed) ?? null;
    const gapTypeLabel = lastPipe?.gapType === 'DOUBLE' ? 'Double' : 'Single';
    const modifierLabel = score.multiplier > 1
      ? `×${score.multiplier}`
      : (score.lastModifierId ?? 'None');

    return {
      score: score.total,
      highScore: score.highScore,
      gapType: gapTypeLabel,
      modifier: modifierLabel,
      precisionText: score.lastPrecisionTierId
        ? PRECISION_LABELS[score.lastPrecisionTierId]
        : '',
    };
  }

  /**
   * Builds a FeedbackLabelDto from a scored gap event.
   * REQ-PSF-008
   * @param {PrecisionTier} tier
   * @returns {Object}
   */
  buildFeedbackLabel(tier) {
    return {
      text: tier.label,
      color: tier.color,
      holdTime: CONFIG.FEEDBACK_HOLD, // 1.2 s
      fadeTime: CONFIG.FEEDBACK_FADE, // 0.4 s
      timer: CONFIG.FEEDBACK_HOLD,
      fadeTimer: 0,
      y: CONFIG.FEEDBACK_Y, // 20 px
    };
  }

  /**
   * Builds a SubtitleDto for system notifications.
   * REQ-PSF-008B
   * @param {string} text
   * @returns {Object}
   */
  buildSubtitle(text) {
    return {
      text,
      color: '#00FFFF',
      timer: CONFIG.FEEDBACK_HOLD, // 1.2 s
      fadeTimer: 0
    };
  }

  /**
   * Builds a FloatingScoreDto for the rising score indicator.
   * REQ-AVF-016–019
   * @param {number} points
   * @param {number} multiplier
   * @param {Object} rarity - PipeRarity
   * @param {number} ghostyX
   * @param {number} ghostyY
   * @returns {Object}
   */
  buildFloatingScore(points, multiplier, rarity, ghostyX, ghostyY) {
    const suffix = multiplier > 1 ? ` ×${multiplier}` : '';
    return {
      text: `${points}${suffix}`,
      color: RARITY_COLORS[rarity.id],
      x: ghostyX,
      y: ghostyY,
      vy: -CONFIG.FLOAT_SPEED, // -40 px/s
      holdTime: CONFIG.FLOAT_HOLD, // 0.9 s
      fadeTime: CONFIG.FLOAT_FADE, // 0.3 s
      timer: CONFIG.FLOAT_HOLD,
    };
  }
}

const PRECISION_LABELS = { PERFECTO: 'Perfecto', BUENO: 'Bueno', CASI: 'Casi' };
const RARITY_COLORS = { GREEN: '#00CC44', PURPLE: '#9966FF', GOLD: '#FFB800' };
