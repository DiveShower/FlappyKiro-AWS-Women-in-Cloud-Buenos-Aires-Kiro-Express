// domain/ScoreFormula.js

/**
 * Unified scoring formula. REQ-PRS-006
 *
 * @param {number} basePoints      - From PipeRarity.basePoints
 * @param {number} precisionBonus  - From PrecisionTier.bonus
 * @param {number} multiplier      - Active multiplier (default 1)
 * @returns {number} points_awarded (integer)
 */
export function calcPointsAwarded(basePoints, precisionBonus, multiplier) {
  return Math.floor((basePoints + precisionBonus) * multiplier);
}

/**
 * Zero-score guard — REQ-DGP-008C
 * Applied after any modifier effect that touches the total accumulated score.
 *
 * @param {number} rawDelta - The change in score the modifier would apply
 * @param {number} MIN_BONUS - Guaranteed minimum (default 5)
 * @returns {number}
 */
export function applyMinimumBonus(rawDelta, MIN_BONUS = 5) {
  return rawDelta <= 0 ? MIN_BONUS : rawDelta;
}
