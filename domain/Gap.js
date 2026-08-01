// domain/Gap.js

/**
 * A single navigable opening in a pipe obstacle.
 * @typedef {Object} Gap
 * @property {number} topY       - Y of top edge of the gap opening (px)
 * @property {number} bottomY    - Y of bottom edge of the gap opening (px)
 * @property {string|null} modifierId - ModifierId placed in this gap, or null
 * @property {boolean} modifierCollected
 * @property {boolean} scored    - true once the Scoring Moment has fired for this gap
 */

export function gapCenterY(gap) {
  return (gap.topY + gap.bottomY) / 2;
}

export function gapHeight(gap) {
  return gap.bottomY - gap.topY;
}
