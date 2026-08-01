// domain/ModifierBadgeExpressions.js
import { ModifierId } from './ModifierId.js';

/**
 * Computes the dynamic badge expression string for each modifier type.
 * REQ-DGP-007B — called at pipe spawn time with current score S.
 *
 * @param {string} modifierId
 * @param {number} currentScore  (S)
 * @param {number} pipeBasePoints  (for MULTIPLIER_3X display)
 * @param {number} MIN_BONUS
 * @returns {string} Human-readable expression
 */
export function buildBadgeExpression(modifierId, currentScore, pipeBasePoints, MIN_BONUS = 5) {
  const S = currentScore;
  switch (modifierId) {
    case ModifierId.MULTIPLIER_2X:
      return "total\n* 1.1";
    case ModifierId.MULTIPLIER_3X:
      return `Tubo\n* 3`;
    case ModifierId.BONUS_FLAT: {
      const v = Math.max(MIN_BONUS, Math.round(S * (0.9 + Math.random() * 0.2)));
      return makeConfusingMath(v);
    }
    case ModifierId.SCORE_DOUBLE: {
      if (S === 0) return `+${MIN_BONUS}`;
      const expressions = [
        `${S} × 2`,
        `${S} + ${S}`,
        `${S} / 0.5`,
        `${S} << 1`
      ];
      return expressions[Math.floor(Math.random() * expressions.length)];
    }
    case ModifierId.GHOST_SHIELD:
      return 'Shield';
    case ModifierId.SLOW_TIME:
      return 'Slow';
    default:
      return '?';
  }
}

/**
 * Generates a confusing math expression representation for a number.
 *
 * @param {number} v
 * @returns {string}
 */
function makeConfusingMath(v) {
  const choice = Math.floor(Math.random() * 3);
  if (choice === 0) {
    // Try to factor it (e.g. 3x4 for 12)
    for (let i = 9; i >= 2; i--) {
      if (v % i === 0) {
        const other = v / i;
        return `${i}×${other}`;
      }
    }
  }
  if (choice === 1) {
    // Division form (e.g. 30/3 for 10)
    const mult = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    return `${v * mult}/${mult}`;
  }
  // Addition form (e.g. +8+2 for 10)
  const offset = Math.floor(Math.random() * 4) + 1;
  const base = v - offset;
  return `+${base}+${offset}`;
}
