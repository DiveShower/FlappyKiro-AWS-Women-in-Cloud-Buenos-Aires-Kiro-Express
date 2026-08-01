// usecases/CollisionUseCase.js
import CONFIG from '../config.js';
import { aabbIntersects } from '../domain/PhysicsFormulas.js';

export class CollisionUseCase {
  /**
   * Checks collisions between Ghosty and the ground or pipes.
   * REQ-CDT-001–007, REQ-CGL-007/008
   *
   * @param {Object} ghostyHitbox - Ghosty's active bounding box {x, y, w, h}
   * @param {GhostyState} ghosty   - Ghosty's state
   * @param {Array<Pipe>} pipes   - List of active pipes
   * @param {number} canvasHeight
   * @returns {Object} {hit: boolean, type: 'PIPE'|'GROUND'|null}
   */
  check(ghostyHitbox, ghosty, pipes, canvasHeight) {
    // If invincibility frames are active, ignore collisions
    // REQ-CDT-011
    if (ghosty.iFrameTimer > 0) {
      return { hit: false, type: null };
    }

    // Ground check: boundary is canvasHeight - HUD_HEIGHT
    // REQ-CDT-006, REQ-CGL-007
    const groundY = canvasHeight - CONFIG.HUD_HEIGHT;
    if (ghostyHitbox.y + ghostyHitbox.h >= groundY) {
      return { hit: true, type: 'GROUND' };
    }

    // Pipe collision checks
    for (const pipe of pipes) {
      const rects = this._pipeRects(pipe, canvasHeight);
      for (const rect of rects) {
        if (aabbIntersects(ghostyHitbox, rect)) {
          return { hit: true, type: 'PIPE' };
        }
      }
    }

    return { hit: false, type: null };
  }

  /**
   * Generates hitboxes for all solid segments of a pipe.
   *
   * @param {Pipe} pipe
   * @param {number} canvasHeight
   * @returns {Array<Object>} list of {x, y, w, h} bounding boxes
   * @private
   */
  _pipeRects(pipe, canvasHeight) {
    const rects = [];
    const pipeWidth = CONFIG.PIPE_WIDTH;
    const groundY = canvasHeight - CONFIG.HUD_HEIGHT;

    if (pipe.gapType === 'SINGLE') {
      const gap = pipe.gaps[0];
      // Top segment
      rects.push({
        x: pipe.x,
        y: 0,
        w: pipeWidth,
        h: gap.topY
      });
      // Bottom segment
      rects.push({
        x: pipe.x,
        y: gap.bottomY,
        w: pipeWidth,
        h: groundY - gap.bottomY
      });
    } else if (pipe.gapType === 'DOUBLE') {
      const upperGap = pipe.gaps[0];
      const lowerGap = pipe.gaps[1];
      // Top segment
      rects.push({
        x: pipe.x,
        y: 0,
        w: pipeWidth,
        h: upperGap.topY
      });
      // Middle segment
      rects.push({
        x: pipe.x,
        y: upperGap.bottomY,
        w: pipeWidth,
        h: lowerGap.topY - upperGap.bottomY
      });
      // Bottom segment
      rects.push({
        x: pipe.x,
        y: lowerGap.bottomY,
        w: pipeWidth,
        h: groundY - lowerGap.bottomY
      });
    }

    return rects;
  }
}
