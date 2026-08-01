// usecases/PhysicsEngine.js
import CONFIG from '../config.js';
import { createGhostyState } from '../domain/GhostyState.js';
import {
  integrateGravity,
  clampToTerminal,
  integratePosition,
  calcTargetRotation,
  lerpRotation,
  calcHitbox
} from '../domain/PhysicsFormulas.js';

export class PhysicsEngine {
  /**
   * Updates Ghosty's physics state for one frame.
   * REQ-PHY-001–015, REQ-CGL-006
   *
   * @param {GhostyState} state
   * @param {boolean} flapPressed
   * @param {number} dt
   * @returns {GhostyState}
   */
  tick(state, flapPressed, dt) {
    let velocityY = state.velocityY;
    if (flapPressed) {
      velocityY = -CONFIG.FLAP_VELOCITY;
    }

    // Integrate gravity
    velocityY = integrateGravity(velocityY, CONFIG.GRAVITY, dt);

    // Clamp to terminal velocity
    velocityY = clampToTerminal(velocityY, CONFIG.TERMINAL_VELOCITY);

    // Integrate position
    let y = integratePosition(state.y, velocityY, dt);

    // Ceiling clamp: y=0, vy=0
    if (y <= 0) {
      y = 0;
      if (velocityY < 0) {
        velocityY = 0;
      }
    }

    // Calculate target rotation and lerp
    const targetRotation = calcTargetRotation(velocityY, CONFIG.TILT_FACTOR);
    const rotation = lerpRotation(state.rotation, targetRotation, CONFIG.ROTATION_LERP);

    // Decrement iFrameTimer
    const iFrameTimer = Math.max(0, state.iFrameTimer - dt);

    return createGhostyState({
      x: state.x,
      y,
      velocityY,
      rotation,
      iFrameTimer,
      shieldActive: state.shieldActive
    });
  }

  /**
   * Calculates Ghosty's bounding box.
   * REQ-CDT-001
   *
   * @param {GhostyState} state
   * @returns {Object} {x, y, w, h}
   */
  getHitbox(state) {
    return calcHitbox(
      state.x,
      state.y,
      CONFIG.GHOSTY_SPRITE_W,
      CONFIG.GHOSTY_SPRITE_H,
      CONFIG.HITBOX_SCALE_X,
      CONFIG.HITBOX_SCALE_Y
    );
  }
}
