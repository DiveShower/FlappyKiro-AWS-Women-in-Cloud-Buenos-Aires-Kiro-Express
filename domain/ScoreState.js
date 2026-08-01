// domain/ScoreState.js

/**
 * @typedef {Object} ScoreState
 * @property {number} total              - Current accumulated score
 * @property {number} highScore          - All-time best score (loaded from storage)
 * @property {number} multiplier         - Active multiplier value (1 when inactive)
 * @property {number} multiplierCounter  - Remaining gap passages at current multiplier
 * @property {string|null} lastModifierId - Last non-multiplier modifier collected
 * @property {string|null} lastPrecisionTierId
 */
