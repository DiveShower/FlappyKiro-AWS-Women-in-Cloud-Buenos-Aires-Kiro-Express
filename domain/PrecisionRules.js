// domain/PrecisionRules.js
import { PrecisionTier } from './PrecisionTier.js';

/**
 * Calculates a normalized precision value in [0, 1].
 * REQ-PSF-001B
 *
 * @param {number} ghostyCenterY
 * @param {number} gapCenterY
 * @param {number} gapHeight
 * @returns {number} precision in [0, 1]
 */
export function calcPrecision(ghostyCenterY, gapCenterY, gapHeight) {
  const raw = 1 - Math.abs(ghostyCenterY - gapCenterY) / (gapHeight / 2);
  return Math.max(0, Math.min(1, raw));
}

/**
 * Maps a precision value to its PrecisionTier.
 * REQ-PSF-002–004
 *
 * @param {number} precision
 * @returns {PrecisionTier}
 */
export function classifyPrecision(precision) {
  if (precision >= 0.75) return PrecisionTier.PERFECTO;
  if (precision >= 0.35) return PrecisionTier.BUENO;
  return PrecisionTier.CASI;
}
