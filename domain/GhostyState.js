// domain/GhostyState.js

/**
 * @typedef {Object} GhostyState
 * @property {number} x           - Fixed horizontal canvas position (px)
 * @property {number} y           - Vertical center position (px, 0 = top)
 * @property {number} velocityY   - Current vertical velocity (px/s, positive = down)
 * @property {number} rotation    - Current sprite rotation (degrees)
 * @property {number} iFrameTimer - Remaining invincibility time (seconds, 0 = none)
 * @property {boolean} shieldActive - Whether GHOST_SHIELD modifier is active
 */

export function createGhostyState(overrides = {}) {
  return Object.freeze({
    x:            overrides.x            ?? 120,
    y:            overrides.y            ?? 250,
    velocityY:    overrides.velocityY    ?? 0,
    rotation:     overrides.rotation     ?? 0,
    iFrameTimer:  overrides.iFrameTimer  ?? 0,
    shieldActive: overrides.shieldActive ?? false,
  });
}
