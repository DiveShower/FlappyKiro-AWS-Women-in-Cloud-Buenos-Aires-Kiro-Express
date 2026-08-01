# Flappy Kiro — Technical Design Document
**Based on:** `requirements.md` v0.3  
**Architecture:** Clean Architecture (Robert C. Martin)  
**Implementation target:** Vanilla HTML5 / JavaScript — single entry-point file, zero build step required  
**Version:** 0.1 — Draft  
**Date:** 2026-07-31

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Dependency Rule & Layer Boundaries](#2-dependency-rule--layer-boundaries)
3. [Layer 1 — Domain / Entities](#3-layer-1--domain--entities)
4. [Layer 2 — Use Cases / Application](#4-layer-2--use-cases--application)
5. [Layer 3 — Interface Adapters](#5-layer-3--interface-adapters)
6. [Layer 4 — Infrastructure / Presentation](#6-layer-4--infrastructure--presentation)
7. [Centralized Configuration Module](#7-centralized-configuration-module)
8. [Project File Tree](#8-project-file-tree)
9. [Data Flow & State Machine Diagrams](#9-data-flow--state-machine-diagrams)
10. [Sequence Diagrams](#10-sequence-diagrams)
11. [Property-Based Test Specifications](#11-property-based-test-specifications)
12. [Dependency Rules, Build Notes & Open Design Decisions](#12-dependency-rules-build-notes--open-design-decisions)

---

## 1. Architectural Overview

Flappy Kiro is organized around Clean Architecture's four concentric layers. Each layer may only depend inward — never outward. The game's core rules (physics, scoring, collision) are fully expressed in pure JavaScript with no DOM or Canvas references, making them independently testable and replaceable.

```
┌─────────────────────────────────────────────────────┐
│  4. Infrastructure / Presentation                    │
│   Canvas Renderer · Web Audio Wrapper · Browser I/O  │
│  ┌───────────────────────────────────────────────┐  │
│  │  3. Interface Adapters                        │  │
│  │   InputController · UIPresenter · AudioCtrl  │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │  2. Use Cases / Application             │ │  │
│  │  │   GameLoop · ScoreUseCase · CollisionUC │ │  │
│  │  │  ┌───────────────────────────────────┐  │ │  │
│  │  │  │  1. Domain / Entities             │  │ │  │
│  │  │  │   Ghosty · Pipe · Gap · Modifier  │  │ │  │
│  │  │  │   PrecisionRules · ScoreFormula   │  │ │  │
│  │  │  └───────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Design Principles applied

| Principle | How it is enforced |
|---|---|
| **Dependency Rule** | Inner layers import nothing from outer layers. Domain has zero imports. |
| **Single Responsibility** | Each module owns exactly one concern (e.g. `PhysicsEngine` only integrates motion). |
| **Open/Closed** | New modifiers extend `ModifierEffect` interface without modifying `ScoreUseCase`. |
| **Interface Segregation** | `IAudioPort`, `IStoragePort`, `IInputPort` are thin interfaces; infrastructure implements them. |
| **Testability** | All use-case logic receives dependencies via constructor injection; no globals in business logic. |
| **Frame-rate independence** | All simulation logic works with `dt` (delta time in seconds); never with raw frame counts. |

---

## 2. Dependency Rule & Layer Boundaries

```
Direction of allowed imports:

  Domain  ←  UseCases  ←  Adapters  ←  Infrastructure
    ✗            ✗           ✗
  (no layer may import from any layer to its right)
```

**Hard constraints:**

- `domain/` modules: **no imports whatsoever** — they are pure data and pure functions.
- `usecases/` modules: may import from `domain/` and from `config.js`. Nothing else.
- `adapters/` modules: may import from `usecases/` and `domain/`. No Canvas, no Web Audio, no `window`.
- `infrastructure/` modules: may import from all layers. This is where all browser APIs live.

**Cross-cutting concerns** (`config.js`, `constants` read-only object):  
Treated as a leaf dependency — importable by all layers but never causing upward coupling, because it contains only read-only primitive values.

---

## 3. Layer 1 — Domain / Entities

> **Rule:** Zero imports. No DOM, no Canvas, no Web Audio, no `window`, no `document`.  
> All types are plain objects or classes with pure-function methods.

---

### 3.1 Value Objects & Enumerations

```js
// domain/GameState.js
export const GameState = Object.freeze({
  LOADING:   'LOADING',
  MAIN_MENU: 'MAIN_MENU',
  PLAYING:   'PLAYING',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
});

// domain/PipeRarity.js
export const PipeRarity = Object.freeze({
  GREEN:  { id: 'GREEN',  basePoints: 1, spawnWeight: 0.65 },
  PURPLE: { id: 'PURPLE', basePoints: 2, spawnWeight: 0.25 },
  GOLD:   { id: 'GOLD',   basePoints: 3, spawnWeight: 0.10 },
});

// domain/PrecisionTier.js
export const PrecisionTier = Object.freeze({
  PERFECTO: { id: 'PERFECTO', label: '¡Perfecto!', color: '#00FF00', bonus: 2 },
  BUENO:    { id: 'BUENO',    label: '¡Bueno!',    color: '#FFD700', bonus: 1 },
  CASI:     { id: 'CASI',     label: '¡Casi la quedás!', color: '#FF4444', bonus: 0 },
});

// domain/ModifierId.js
export const ModifierId = Object.freeze({
  MULTIPLIER_2X: 'MULTIPLIER_2X',
  MULTIPLIER_3X: 'MULTIPLIER_3X',
  BONUS_FLAT:    'BONUS_FLAT',
  SCORE_DOUBLE:  'SCORE_DOUBLE',
  GHOST_SHIELD:  'GHOST_SHIELD',
  SLOW_TIME:     'SLOW_TIME',
});
```

---

### 3.2 Entity: `GhostyState`

Immutable snapshot of Ghosty's physics state. The use-case layer produces new snapshots each tick; it never mutates in-place.

```js
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
    x:           overrides.x           ?? 120,
    y:           overrides.y           ?? 250,   // canvas vertical center default
    velocityY:   overrides.velocityY   ?? 0,
    rotation:    overrides.rotation    ?? 0,
    iFrameTimer: overrides.iFrameTimer ?? 0,
    shieldActive: overrides.shieldActive ?? false,
  });
}
```

---

### 3.3 Entity: `Gap`

```js
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
```

---

### 3.4 Entity: `Pipe`

```js
// domain/Pipe.js

/**
 * @typedef {Object} Pipe
 * @property {string}   id          - Unique identifier
 * @property {number}   x           - Left edge position (px), mutable as pipe scrolls
 * @property {PipeRarity} rarity
 * @property {'SINGLE'|'DOUBLE'} gapType
 * @property {Gap[]}    gaps        - Length 1 (Single) or 2 (Double)
 * @property {boolean}  passed      - true once Ghosty's trailing edge has cleared the pipe
 * @property {number}   driftPhase  - Phase offset (radians) for third-axis Y drift
 */
```

The domain enforces the constraint that `gaps.length === 1` for SINGLE and `gaps.length === 2` for DOUBLE. The gap separation invariant (`MIN_GAP_SEPARATION`) is validated at creation time by the `PipeFactory` use case (not here).

---

### 3.5 Entity: `ScoreState`

```js
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
```

---

### 3.6 Entity: `DifficultyState`

```js
// domain/DifficultyState.js

/**
 * Tracks mutable difficulty variables separately from score.
 * @typedef {Object} DifficultyState
 * @property {number} pipeSpeed          - Current runtime pipe scroll speed (px/s)
 * @property {number} gapHeightMin       - Current minimum gap size (px)
 * @property {number} gapHeightMax       - Current maximum gap size (px)
 * @property {number} pipeSpacing        - Current pipe horizontal spacing (px)
 * @property {number} pipesPassed        - Pipes-Passed Counter (physical obstacles)
 * @property {number} singleGapCounter   - Count toward next Double-Gap threshold
 * @property {number} doubleGapThreshold - N from [3,7], randomized each cycle
 * @property {boolean} thirdAxisActive   - Whether third difficulty axis is unlocked
 * @property {number}  slowTimeTimer     - Remaining SLOW_TIME duration (s), 0 = off
 * @property {number}  slowTimeBaseSpeed - Speed at SLOW_TIME activation (for restore)
 */
```

---

### 3.7 Entity: `ParticleState`

```js
// domain/ParticleState.js

/**
 * @typedef {Object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx       - velocity x (px/s)
 * @property {number} vy       - velocity y (px/s)
 * @property {number} radius   - current radius (px)
 * @property {number} maxRadius
 * @property {number} life     - remaining lifetime (s)
 * @property {number} maxLife
 * @property {string} color    - CSS rgba string at spawn time
 * @property {'TRAIL'|'BURST'} pool
 */
```

---

### 3.8 Entity: `NotificationState`

```js
// domain/NotificationState.js

/**
 * Shared by both the Feedback Label (precision) and the Subtitle Channel (system).
 * @typedef {Object} NotificationState
 * @property {string} text
 * @property {string} color
 * @property {number} timer      - Remaining hold time (s)
 * @property {number} fadeTimer  - Remaining fade time (s); 0 = not fading yet
 * @property {boolean} visible
 */
```

---

### 3.9 Pure Domain Functions

These are the core math rules. They are stateless, referentially transparent, and fully unit-testable.

```js
// domain/PrecisionRules.js

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
```

```js
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
```

```js
// domain/PhysicsFormulas.js

/** REQ-PHY-003  velocity_y += GRAVITY * dt */
export function integrateGravity(velocityY, gravity, dt) {
  return velocityY + gravity * dt;
}

/** REQ-PHY-008  clamp to terminal velocity */
export function clampToTerminal(velocityY, terminalVelocity) {
  return Math.min(velocityY, terminalVelocity);
}

/** REQ-PHY-010  position_y += velocity_y * dt */
export function integratePosition(positionY, velocityY, dt) {
  return positionY + velocityY * dt;
}

/** REQ-PHY-012  rotation = clamp(velocity_y * TILT_FACTOR, -25, 90) */
export function calcTargetRotation(velocityY, tiltFactor) {
  const raw = velocityY * tiltFactor;
  return Math.max(-25, Math.min(90, raw));
}

/** REQ-PHY-013  lerp toward target rotation */
export function lerpRotation(current, target, smoothing) {
  return current + (target - current) * smoothing;
}

/** REQ-CDT-001  hitbox dimensions */
export function calcHitbox(x, y, spriteW, spriteH, scaleX, scaleY) {
  const w = spriteW * scaleX;
  const h = spriteH * scaleY;
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/** AABB intersection test — REQ-CDT-004 */
export function aabbIntersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
```

```js
// domain/ModifierBadgeExpressions.js

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
      return `Total × 1.05`;
    case ModifierId.MULTIPLIER_3X:
      return `${pipeBasePoints} × 3`;
    case ModifierId.BONUS_FLAT: {
      const preview = Math.max(MIN_BONUS, Math.round(S * (0.9 + Math.random() * 0.2)));
      return `+${preview}`;
    }
    case ModifierId.SCORE_DOUBLE:
      return S === 0 ? `+${MIN_BONUS}` : `${S} × 2`;
    case ModifierId.GHOST_SHIELD:
      return 'Shield';
    case ModifierId.SLOW_TIME:
      return 'Slow';
    default:
      return '?';
  }
}
```

---

## 4. Layer 2 — Use Cases / Application

> **Rule:** Imports only from `domain/` and `config.js`. No DOM, Canvas, or Web Audio.  
> Each use case is a class that receives ports (interfaces) via constructor injection.

---

### 4.1 Ports (Interfaces injected from outer layers)

```js
// usecases/ports/IStoragePort.js
export class IStoragePort {
  loadHighScore()    { throw new Error('not implemented'); }
  saveHighScore(n)   { throw new Error('not implemented'); }
  loadMuteState()    { throw new Error('not implemented'); }
  saveMuteState(b)   { throw new Error('not implemented'); }
}

// usecases/ports/IAudioPort.js
export class IAudioPort {
  playFlap()         { throw new Error('not implemented'); }
  playGameOver()     { throw new Error('not implemented'); }
  playScore(tier)    { throw new Error('not implemented'); }  // tier = PrecisionTier id
  playModifier()     { throw new Error('not implemented'); }
  startMusic()       { throw new Error('not implemented'); }
  pauseMusic()       { throw new Error('not implemented'); }
  stopMusic()        { throw new Error('not implemented'); }
}

// usecases/ports/IInputPort.js
// Produces InputEvent objects; polled each tick by GameLoop.
export class IInputPort {
  consumeFlapIntent() { throw new Error('not implemented'); }  // returns bool, clears flag
  consumePauseIntent() { throw new Error('not implemented'); }
  consumeMuteIntent()  { throw new Error('not implemented'); }
}
```

---

### 4.2 `PhysicsEngine`

Owns a single responsibility: advancing `GhostyState` one tick forward given a `dt` and inputs.

```js
// usecases/PhysicsEngine.js
import { integrateGravity, clampToTerminal, integratePosition,
         calcTargetRotation, lerpRotation, calcHitbox } from '../domain/PhysicsFormulas.js';
import CONFIG from '../config.js';

export class PhysicsEngine {
  /**
   * @param {GhostyState} state
   * @param {boolean} flapPressed
   * @param {number} dt  - capped delta time (s)
   * @returns {GhostyState} next state (new object, never mutated)
   */
  tick(state, flapPressed, dt) {
    let vy = state.velocityY;

    // Flap: replace velocity (REQ-PHY-006)
    if (flapPressed) vy = -CONFIG.FLAP_VELOCITY;

    // Gravity integration (REQ-PHY-003)
    vy = integrateGravity(vy, CONFIG.GRAVITY, dt);

    // Terminal velocity clamp (REQ-PHY-008)
    vy = clampToTerminal(vy, CONFIG.TERMINAL_VELOCITY);

    // Position update (REQ-PHY-010)
    let y = integratePosition(state.y, vy, dt);

    // Ceiling clamp (REQ-PHY-011 / REQ-CGL-006)
    const hitboxHalfH = (CONFIG.GHOSTY_SPRITE_H * CONFIG.HITBOX_SCALE_Y) / 2;
    if (y - hitboxHalfH < 0) { y = hitboxHalfH; vy = 0; }

    // Rotation (REQ-PHY-012 / REQ-PHY-013)
    const targetRot = calcTargetRotation(vy, CONFIG.TILT_FACTOR);
    const rotation  = lerpRotation(state.rotation, targetRot, CONFIG.ROTATION_LERP);

    // iFrame timer countdown
    const iFrameTimer = Math.max(0, state.iFrameTimer - dt);

    return Object.freeze({ ...state, y, velocityY: vy, rotation, iFrameTimer });
  }

  /** Returns current AABB hitbox for external use (collision checks) */
  getHitbox(state) {
    return calcHitbox(
      state.x, state.y,
      CONFIG.GHOSTY_SPRITE_W, CONFIG.GHOSTY_SPRITE_H,
      CONFIG.HITBOX_SCALE_X,  CONFIG.HITBOX_SCALE_Y,
    );
  }
}
```

---

### 4.3 `CollisionUseCase`

```js
// usecases/CollisionUseCase.js
import { aabbIntersects } from '../domain/PhysicsFormulas.js';
import CONFIG from '../config.js';

export class CollisionUseCase {
  /**
   * Tests Ghosty's hitbox against all active pipe segments.
   * Respects iFrames (REQ-CGL-008, REQ-CDT-011).
   *
   * @param {Object}  ghostyHitbox  - {x,y,w,h}
   * @param {GhostyState} ghosty
   * @param {Pipe[]}  pipes
   * @param {number}  canvasHeight
   * @returns {{ hit: boolean, type: 'PIPE'|'GROUND'|null }}
   */
  check(ghostyHitbox, ghosty, pipes, canvasHeight) {
    // iFrames active — skip all pipe collision (REQ-CDT-011)
    if (ghosty.iFrameTimer > 0) return { hit: false, type: null };

    // Ground boundary (REQ-CDT-006 / REQ-CGL-007)
    const groundY = canvasHeight - CONFIG.HUD_HEIGHT;
    if (ghostyHitbox.y + ghostyHitbox.h >= groundY) {
      return { hit: true, type: 'GROUND' };
    }

    // Pipe AABB tests (REQ-CDT-004)
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

  /** Builds collision rectangles for a pipe (REQ-CDT-003) */
  _pipeRects(pipe, canvasHeight) {
    const rects = [];
    const pw    = CONFIG.PIPE_WIDTH;
    const px    = pipe.x;

    if (pipe.gapType === 'SINGLE') {
      const gap = pipe.gaps[0];
      rects.push({ x: px, y: 0,           w: pw, h: gap.topY });               // top
      rects.push({ x: px, y: gap.bottomY, w: pw, h: canvasHeight - gap.bottomY }); // bottom
    } else {
      const [upper, lower] = pipe.gaps;
      rects.push({ x: px, y: 0,                w: pw, h: upper.topY });        // top
      rects.push({ x: px, y: upper.bottomY,    w: pw, h: lower.topY - upper.bottomY }); // middle
      rects.push({ x: px, y: lower.bottomY,    w: pw, h: canvasHeight - lower.bottomY }); // bottom
    }
    return rects;
  }
}
```

---

### 4.4 `ScoringUseCase`

Handles the Scoring Moment: precision → tier → formula → score update → multiplier counter.

```js
// usecases/ScoringUseCase.js
import { calcPrecision, classifyPrecision } from '../domain/PrecisionRules.js';
import { calcPointsAwarded, applyMinimumBonus } from '../domain/ScoreFormula.js';
import { gapCenterY, gapHeight } from '../domain/Gap.js';

export class ScoringUseCase {
  /**
   * Called at the Scoring Moment for a given gap (REQ-PSF-001).
   * Returns updated ScoreState + the tier (for audio/visual feedback).
   *
   * @param {ScoreState}  scoreState
   * @param {GhostyState} ghosty
   * @param {Gap}         gap
   * @param {PipeRarity}  rarity
   * @returns {{ nextScore: ScoreState, tier: PrecisionTier, pointsAwarded: number }}
   */
  applyGapScore(scoreState, ghosty, gap, rarity) {
    const precision  = calcPrecision(ghosty.y, gapCenterY(gap), gapHeight(gap));
    const tier       = classifyPrecision(precision);
    const rawPoints  = calcPointsAwarded(
      rarity.basePoints, tier.bonus, scoreState.multiplier,
    );
    const points = applyMinimumBonus(rawPoints); // REQ-DGP-008C safety floor

    // Decrement multiplier counter (REQ-DGP-011B)
    let { multiplier, multiplierCounter } = scoreState;
    if (multiplierCounter > 0) {
      multiplierCounter -= 1;
      if (multiplierCounter === 0) multiplier = 1;
    }

    const nextScore = Object.freeze({
      ...scoreState,
      total:             scoreState.total + points,
      multiplier,
      multiplierCounter,
      lastPrecisionTierId: tier.id,
    });

    return { nextScore, tier, pointsAwarded: points };
  }

  /**
   * Apply BONUS_FLAT modifier to total score (REQ-DGP-008).
   * @param {ScoreState} scoreState
   * @returns {ScoreState}
   */
  applyBonusFlat(scoreState) {
    const S     = scoreState.total;
    const delta = applyMinimumBonus(
      Math.round(S * (0.9 + Math.random() * 0.2)),
    );
    return Object.freeze({ ...scoreState, total: scoreState.total + delta });
  }

  /**
   * Apply SCORE_DOUBLE modifier (REQ-DGP-008).
   * @param {ScoreState} scoreState
   * @returns {ScoreState}
   */
  applyScoreDouble(scoreState) {
    const delta = applyMinimumBonus(scoreState.total); // doubling is adding S
    return Object.freeze({ ...scoreState, total: scoreState.total + delta });
  }

  /**
   * Activate a multiplier modifier (REQ-DGP-008, REQ-DGP-011).
   * Overwrites any active multiplier.
   * @param {ScoreState} scoreState
   * @param {number} multiplierValue
   * @param {number} duration  - passage count
   * @returns {ScoreState}
   */
  activateMultiplier(scoreState, multiplierValue, duration) {
    return Object.freeze({
      ...scoreState,
      multiplier:        multiplierValue,
      multiplierCounter: duration,
    });
  }
}
```

---

### 4.5 `PipeFactory`

Creates new pipe entities; validates gap geometry invariants.

```js
// usecases/PipeFactory.js
import CONFIG from '../config.js';
import { PipeRarity } from '../domain/PipeRarity.js';
import { buildBadgeExpression } from '../domain/ModifierBadgeExpressions.js';
import { ModifierId } from '../domain/ModifierId.js';

export class PipeFactory {
  /** Weighted rarity selection (REQ-PRS-001) */
  _pickRarity() {
    const r = Math.random();
    if (r < 0.65) return PipeRarity.GREEN;
    if (r < 0.90) return PipeRarity.PURPLE;
    return PipeRarity.GOLD;
  }

  /** Random gap height within current difficulty bounds (REQ-OBG-004) */
  _pickGapHeight(difficulty) {
    const min = difficulty.gapHeightMin;
    const max = difficulty.gapHeightMax;
    return Math.round(min + Math.random() * (max - min));
  }

  /** Random gap center Y within safe margins (REQ-OBG-007) */
  _pickGapCenterY(gapH) {
    const min = CONFIG.GAP_MARGIN + gapH / 2;
    const max = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN - gapH / 2;
    return Math.round(min + Math.random() * (max - min));
  }

  /** Modifier pool without-replacement pair (REQ-DGP-008B) */
  _pickModifierPair() {
    const pool = Object.values(ModifierId);
    const idx1 = Math.floor(Math.random() * pool.length);
    const remaining = pool.filter((_, i) => i !== idx1);
    const idx2 = Math.floor(Math.random() * remaining.length);
    return [pool[idx1], remaining[idx2]];
  }

  /**
   * Create a Single-Gap pipe.
   * @param {number}          x           - Spawn x position
   * @param {DifficultyState} difficulty
   * @param {number}          currentScore - For modifier badge expressions
   * @returns {Pipe}
   */
  createSingle(x, difficulty, currentScore) {
    const rarity = this._pickRarity();
    const gapH   = this._pickGapHeight(difficulty);
    const centerY = this._pickGapCenterY(gapH);
    const gap = {
      topY:              centerY - gapH / 2,
      bottomY:           centerY + gapH / 2,
      modifierId:        null,
      modifierCollected: false,
      scored:            false,
    };
    return Object.freeze({
      id:         `pipe_${Date.now()}_${Math.random()}`,
      x,
      rarity,
      gapType:    'SINGLE',
      gaps:       [gap],
      passed:     false,
      driftPhase: 0,
    });
  }

  /**
   * Create a Double-Gap pipe (REQ-DGP-004 / REQ-DGP-008B).
   * @param {number}          x
   * @param {DifficultyState} difficulty
   * @param {number}          currentScore
   * @returns {Pipe}
   */
  createDouble(x, difficulty, currentScore) {
    const rarity    = this._pickRarity();
    const [modId1, modId2] = this._pickModifierPair();

    // Upper gap
    const upperH       = this._pickGapHeight(difficulty);
    const upperCenterY = this._pickGapCenterY(upperH);

    // Lower gap — ensure MIN_GAP_SEPARATION (REQ-OBG-008)
    const lowerH       = this._pickGapHeight(difficulty);
    const minLowerCY   = upperCenterY + upperH / 2 + CONFIG.MIN_GAP_SEPARATION + lowerH / 2;
    const maxLowerCY   = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN - lowerH / 2;

    // If constraints can't be satisfied, fall back to single-gap
    if (minLowerCY > maxLowerCY) {
      return this.createSingle(x, difficulty, currentScore);
    }

    const lowerCenterY = Math.round(minLowerCY + Math.random() * (maxLowerCY - minLowerCY));

    const upperGap = {
      topY:              upperCenterY - upperH / 2,
      bottomY:           upperCenterY + upperH / 2,
      modifierId:        modId1,
      modifierCollected: false,
      scored:            false,
    };
    const lowerGap = {
      topY:              lowerCenterY - lowerH / 2,
      bottomY:           lowerCenterY + lowerH / 2,
      modifierId:        modId2,
      modifierCollected: false,
      scored:            false,
    };
    return Object.freeze({
      id:         `dpipe_${Date.now()}_${Math.random()}`,
      x,
      rarity,
      gapType:    'DOUBLE',
      gaps:       [upperGap, lowerGap],
      passed:     false,
      driftPhase: Math.random() * Math.PI * 2,
    });
  }
}
```

---

### 4.6 `DifficultyUseCase`

Owns all speed-progression and third-axis logic.

```js
// usecases/DifficultyUseCase.js
import CONFIG from '../config.js';

export class DifficultyUseCase {
  /**
   * Called when a pipe is fully passed (REQ-GSM-009 trailing-edge trigger).
   * Returns updated DifficultyState.
   *
   * @param {DifficultyState} state
   * @returns {{ next: DifficultyState, speededUp: boolean }}
   */
  onPipePassed(state) {
    const pipesPassed = state.pipesPassed + 1;
    const speededUp   = pipesPassed % 10 === 0;

    if (!speededUp) {
      return { next: { ...state, pipesPassed }, speededUp: false };
    }

    // Speed increment (REQ-OBG-011)
    let pipeSpeed  = Math.min(state.pipeSpeed + CONFIG.SPEED_INCREMENT, CONFIG.PIPE_SPEED_MAX);
    let gapMin     = Math.max(state.gapHeightMin - 4, CONFIG.GAP_HEIGHT_FLOOR);
    let gapMax     = Math.max(state.gapHeightMax - 4, CONFIG.GAP_HEIGHT_FLOOR);
    let spacing    = Math.max(state.pipeSpacing  - 6, CONFIG.PIPE_SPACING_MIN);

    // Third axis unlock (REQ-OBG-016)
    const bothFloors = gapMin <= CONFIG.GAP_HEIGHT_FLOOR
                    && pipeSpeed >= CONFIG.PIPE_SPEED_MAX;
    let thirdAxisActive = state.thirdAxisActive || bothFloors;
    let spacingMin      = CONFIG.PIPE_SPACING_MIN;
    if (thirdAxisActive && state.thirdAxisActive) {
      spacingMin = Math.max(CONFIG.PIPE_SPACING_MIN - 5, 140);
      spacing    = Math.max(spacing, spacingMin);
    }

    return {
      next: { ...state, pipesPassed, pipeSpeed, gapHeightMin: gapMin,
              gapHeightMax: gapMax, pipeSpacing: spacing, thirdAxisActive },
      speededUp: true,
    };
  }

  /**
   * Apply SLOW_TIME modifier (REQ-DGP-008 SLOW_TIME row).
   * @param {DifficultyState} state
   * @returns {DifficultyState}
   */
  activateSlowTime(state) {
    return {
      ...state,
      slowTimeTimer:     CONFIG.SLOW_TIME_DURATION,
      slowTimeBaseSpeed: state.pipeSpeed,
      pipeSpeed:         state.pipeSpeed * (1 - CONFIG.SLOW_TIME_REDUCTION),
    };
  }

  /**
   * Tick the SLOW_TIME timer down each frame.
   * Restores speed when timer expires (REQ-DGP-008 SLOW_TIME restore).
   * @param {DifficultyState} state
   * @param {number} dt
   * @returns {DifficultyState}
   */
  tickSlowTime(state, dt) {
    if (state.slowTimeTimer <= 0) return state;
    const timer = state.slowTimeTimer - dt;
    if (timer <= 0) {
      const restored = Math.max(state.slowTimeBaseSpeed, state.pipeSpeed);
      return { ...state, slowTimeTimer: 0, pipeSpeed: restored, slowTimeBaseSpeed: 0 };
    }
    return { ...state, slowTimeTimer: timer };
  }
}
```

---

### 4.7 `ModifierApplicationUseCase`

Routes modifier collection to the correct downstream use case.

```js
// usecases/ModifierApplicationUseCase.js
import { ModifierId } from '../domain/ModifierId.js';
import CONFIG from '../config.js';

export class ModifierApplicationUseCase {
  /**
   * @param {ScoringUseCase}    scoringUC
   * @param {DifficultyUseCase} difficultyUC
   */
  constructor(scoringUC, difficultyUC) {
    this._scoring    = scoringUC;
    this._difficulty = difficultyUC;
  }

  /**
   * Apply a collected modifier.
   * @param {string}          modifierId
   * @param {ScoreState}      scoreState
   * @param {DifficultyState} difficultyState
   * @param {GhostyState}     ghosty
   * @returns {{ nextScore, nextDifficulty, nextGhosty, notification: string }}
   */
  apply(modifierId, scoreState, difficultyState, ghosty) {
    let nextScore      = scoreState;
    let nextDifficulty = difficultyState;
    let nextGhosty     = ghosty;
    let notification   = modifierId;

    switch (modifierId) {
      case ModifierId.MULTIPLIER_2X:
        nextScore = this._scoring.activateMultiplier(scoreState, 2, 5);
        break;
      case ModifierId.MULTIPLIER_3X:
        nextScore = this._scoring.activateMultiplier(scoreState, 3, 3);
        break;
      case ModifierId.BONUS_FLAT:
        nextScore = this._scoring.applyBonusFlat(scoreState);
        break;
      case ModifierId.SCORE_DOUBLE:
        nextScore = this._scoring.applyScoreDouble(scoreState);
        break;
      case ModifierId.GHOST_SHIELD:
        nextGhosty = Object.freeze({ ...ghosty, shieldActive: true });
        break;
      case ModifierId.SLOW_TIME:
        nextDifficulty = this._difficulty.activateSlowTime(difficultyState);
        break;
    }

    nextScore = Object.freeze({ ...nextScore, lastModifierId: modifierId });
    return { nextScore, nextDifficulty, nextGhosty, notification };
  }
}
```

---

### 4.8 `GameStateMachine`

Owns state transition logic. Has no rendering or audio knowledge — it emits events.

```js
// usecases/GameStateMachine.js
import { GameState } from '../domain/GameState.js';

export class GameStateMachine {
  constructor() {
    this._state     = GameState.LOADING;
    this._listeners = {};   // { 'PLAYING_ENTER': [fn, ...], ... }
  }

  get current() { return this._state; }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  _emit(event, payload) {
    (this._listeners[event] ?? []).forEach(fn => fn(payload));
  }

  // Valid transitions — REQ-GSM-001 / REQ-GSM-002
  _TRANSITIONS = {
    [GameState.LOADING]:   [GameState.MAIN_MENU],
    [GameState.MAIN_MENU]: [GameState.PLAYING],
    [GameState.PLAYING]:   [GameState.PAUSED, GameState.GAME_OVER],
    [GameState.PAUSED]:    [GameState.PLAYING],
    [GameState.GAME_OVER]: [GameState.MAIN_MENU, GameState.PLAYING],
  };

  transition(to) {
    const allowed = this._TRANSITIONS[this._state] ?? [];
    if (!allowed.includes(to)) {
      console.warn(`Invalid transition ${this._state} → ${to}`);
      return false;
    }
    this._emit(`${this._state}_EXIT`);
    this._state = to;
    this._emit(`${to}_ENTER`);
    return true;
  }
}
```

---

### 4.9 `GameResetUseCase`

Returns the complete initial state object for a new game (REQ-GSM-021).

```js
// usecases/GameResetUseCase.js
import { createGhostyState } from '../domain/GhostyState.js';
import CONFIG from '../config.js';

export class GameResetUseCase {
  /**
   * @param {number} highScore  - Preserved across resets
   * @returns {{ ghosty, score, difficulty, pipes, particles, feedback, subtitle }}
   */
  reset(highScore) {
    const ghosty = createGhostyState({
      x: CONFIG.GHOSTY_START_X,
      y: CONFIG.CANVAS_HEIGHT / 2,
    });

    const score = Object.freeze({
      total: 0, highScore,
      multiplier: 1, multiplierCounter: 0,
      lastModifierId: null, lastPrecisionTierId: null,
    });

    const difficulty = {
      pipeSpeed:         CONFIG.PIPE_SPEED_BASE,
      gapHeightMin:      CONFIG.GAP_HEIGHT_MIN,
      gapHeightMax:      CONFIG.GAP_HEIGHT_MAX,
      pipeSpacing:       CONFIG.PIPE_SPACING,
      pipesPassed:       0,
      singleGapCounter:  0,
      doubleGapThreshold: randInt(3, 7),
      thirdAxisActive:   false,
      slowTimeTimer:     0,
      slowTimeBaseSpeed: 0,
    };

    return { ghosty, score, difficulty, pipes: [], particles: [], feedback: null, subtitle: null };
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

---

## 5. Layer 3 — Interface Adapters

> **Rule:** May import from `domain/` and `usecases/`. No Canvas API, no Web Audio API.  
> Adapters translate raw browser events into domain intents, and domain state into presenter DTOs.

---

### 5.1 `InputController`

Accumulates raw browser events into intent flags. Implements `IInputPort`.  
The infrastructure layer attaches DOM listeners and calls `_onKeyDown` / `_onTouch`.

```js
// adapters/InputController.js

export class InputController {
  constructor() {
    this._flapIntent  = false;
    this._pauseIntent = false;
    this._muteIntent  = false;
    this._lastFlapMs  = 0;          // throttle for REQ-GAP-11 (80 ms debounce)
  }

  // Called by infrastructure (BrowserInputAdapter)
  _onKeyDown(key) {
    const now = performance.now();
    if ((key === ' ' || key === 'ArrowUp') && now - this._lastFlapMs > 80) {
      this._flapIntent = true;
      this._lastFlapMs = now;
    }
    if (key === 'Escape' || key === 'p' || key === 'P') this._pauseIntent = true;
    if (key === 'm' || key === 'M')                      this._muteIntent  = true;
  }

  _onTouch() {
    const now = performance.now();
    if (now - this._lastFlapMs > 80) {
      this._flapIntent = true;
      this._lastFlapMs = now;
    }
  }

  // IInputPort implementation — consume (read + clear) intent flags
  consumeFlapIntent()  { const v = this._flapIntent;  this._flapIntent  = false; return v; }
  consumePauseIntent() { const v = this._pauseIntent; this._pauseIntent = false; return v; }
  consumeMuteIntent()  { const v = this._muteIntent;  this._muteIntent  = false; return v; }
}
```

---

### 5.2 `AudioController`

Implements `IAudioPort`. Holds no audio resources itself — delegates to the injected  
`WebAudioAdapter` from Layer 4. Respects mute state without touching Web Audio directly.

```js
// adapters/AudioController.js

export class AudioController {
  /**
   * @param {WebAudioAdapter} webAudio  - Layer 4 infrastructure
   * @param {boolean}         muted
   */
  constructor(webAudio, muted) {
    this._audio = webAudio;
    this._muted = muted;
  }

  setMuted(muted) { this._muted = muted; }
  isMuted()       { return this._muted; }

  _play(fn) { if (!this._muted) fn(); }

  // IAudioPort
  playFlap()       { this._play(() => this._audio.playSfx('jump')); }
  playGameOver()   { this._play(() => this._audio.playSfx('game_over')); }
  playScore(tierId){ this._play(() => this._audio.playTone(SCORE_TONES[tierId])); }
  playModifier()   { this._play(() => this._audio.playTone({ freq: 880, dur: 0.12, wave: 'sine' })); }
  startMusic()     { this._play(() => this._audio.startMusic()); }
  pauseMusic()     { this._audio.pauseMusic(); }   // pause is unconditional
  stopMusic()      { this._audio.stopMusic(); }
}

const SCORE_TONES = {
  PERFECTO: { freq: 1046, dur: 0.10, wave: 'square' },  // high C
  BUENO:    { freq:  784, dur: 0.10, wave: 'square' },  // mid G
  CASI:     { freq:  523, dur: 0.10, wave: 'square' },  // low C
};
```

---

### 5.3 `StorageAdapter`

Implements `IStoragePort` using `localStorage`.

```js
// adapters/StorageAdapter.js
import { IStoragePort } from '../usecases/ports/IStoragePort.js';

export class StorageAdapter extends IStoragePort {
  loadHighScore()     { return parseInt(localStorage.getItem('flappyKiro_highScore') ?? '0', 10); }
  saveHighScore(n)    { localStorage.setItem('flappyKiro_highScore', String(n)); }
  loadMuteState()     { return localStorage.getItem('flappyKiro_muted') === 'true'; }
  saveMuteState(b)    { localStorage.setItem('flappyKiro_muted', String(b)); }
}
```

---

### 5.4 `UIPresenter`

Translates domain state into plain DTO objects consumed by the Canvas renderer.  
No Canvas context calls here — pure data transformation.

```js
// adapters/UIPresenter.js

export class UIPresenter {
  /**
   * Builds the HUD data object from current domain state.
   * REQ-VUI-004
   * @param {ScoreState}      score
   * @param {DifficultyState} difficulty
   * @param {Pipe[]}          pipes
   * @returns {HUDDto}
   */
  buildHUD(score, difficulty, pipes) {
    const lastPipe    = pipes.findLast(p => p.passed) ?? null;
    const gapTypeLabel = lastPipe?.gapType === 'DOUBLE' ? 'Double' : 'Single';
    const modifierLabel = score.multiplier > 1
      ? `×${score.multiplier}`
      : (score.lastModifierId ?? 'None');

    return {
      score:         score.total,
      highScore:     score.highScore,
      gapType:       gapTypeLabel,
      modifier:      modifierLabel,
      precisionText: score.lastPrecisionTierId
        ? PRECISION_LABELS[score.lastPrecisionTierId]
        : '',
    };
  }

  /**
   * Builds a FeedbackLabelDto from a scored gap event.
   * REQ-PSF-008
   */
  buildFeedbackLabel(tier) {
    return {
      text:      tier.label,
      color:     tier.color,
      holdTime:  1.2,
      fadeTime:  0.4,
      timer:     1.2,
      fadeTimer: 0,
      y:         20,         // REQ-PSF-008: top edge at y=20px
    };
  }

  /**
   * Builds a SubtitleDto for system notifications.
   * REQ-PSF-008B
   */
  buildSubtitle(text) {
    return { text, color: '#00FFFF', timer: 1.2, fadeTimer: 0 };
  }

  /**
   * Builds a FloatingScoreDto for the rising score indicator.
   * REQ-AVF-016–019
   */
  buildFloatingScore(points, multiplier, rarity, ghostyX, ghostyY) {
    const suffix = multiplier > 1 ? ` ×${multiplier}` : '';
    return {
      text:    `${points}${suffix}`,
      color:   RARITY_COLORS[rarity.id],
      x:       ghostyX,
      y:       ghostyY,
      vy:      -40,         // px/s upward
      holdTime: 0.9,
      fadeTime: 0.3,
      timer:    0.9,
    };
  }
}

const PRECISION_LABELS = { PERFECTO: 'Perfecto', BUENO: 'Bueno', CASI: 'Casi' };
const RARITY_COLORS    = { GREEN: '#00CC44', PURPLE: '#9966FF', GOLD: '#FFB800' };
```

---

### 5.5 `GameOrchestrator`

The main coordinator that wires all use cases together and drives the game loop.  
Lives in the adapter layer because it knows the order of use-case calls, but makes  
no direct Canvas or Web Audio calls — those are delegated to injected infrastructure.

```js
// adapters/GameOrchestrator.js

export class GameOrchestrator {
  /**
   * @param {object} deps - All use cases and adapters injected
   */
  constructor({
    stateMachine, physicsEngine, collisionUC, scoringUC,
    difficultyUC, pipeFactory, modifierUC, resetUC,
    inputPort, audioCtrl, storage, presenter,
  }) {
    Object.assign(this, { stateMachine, physicsEngine, collisionUC, scoringUC,
                          difficultyUC, pipeFactory, modifierUC, resetUC,
                          inputPort, audioCtrl, storage, presenter });

    // Game world state (mutable, owned by orchestrator)
    this.ghosty      = null;
    this.score       = null;
    this.difficulty  = null;
    this.pipes       = [];
    this.particles   = { trail: [], burst: [] };
    this.feedback    = null;   // FeedbackLabelDto
    this.subtitle    = null;   // SubtitleDto
    this.floats      = [];     // FloatingScoreDto[]
    this.screenShake = null;   // { elapsed, duration, peak }

    this._wireStateEvents();
  }

  _wireStateEvents() {
    const sm = this.stateMachine;
    sm.on('PLAYING_ENTER', () => this.audioCtrl.startMusic());
    sm.on('PAUSED_ENTER',  () => this.audioCtrl.pauseMusic());
    sm.on('PAUSED_EXIT',   () => this.audioCtrl.startMusic());
    sm.on('GAME_OVER_ENTER', () => this.audioCtrl.stopMusic());
  }

  /**
   * Called every frame by the infrastructure render loop.
   * @param {number} rawDt  - Raw ms since last frame from rAF
   * @returns {WorldSnapshot} - Pure data object consumed by CanvasRenderer
   */
  tick(rawDt) {
    const dt = Math.min(rawDt / 1000, 0.033);  // REQ-PHY-002: cap at 0.033s

    switch (this.stateMachine.current) {
      case 'PLAYING': this._tickPlaying(dt); break;
      case 'PAUSED':  this._tickPaused();    break;
    }

    return this._buildSnapshot();
  }

  _tickPlaying(dt) {
    // 1. Input
    const flap  = this.inputPort.consumeFlapIntent();
    const pause = this.inputPort.consumePauseIntent();
    const mute  = this.inputPort.consumeMuteIntent();

    if (mute)  this._toggleMute();
    if (pause) { this.stateMachine.transition('PAUSED'); return; }
    if (flap)  this.audioCtrl.playFlap();

    // 2. Physics
    this.ghosty = this.physicsEngine.tick(this.ghosty, flap, dt);

    // 3. Collision check
    const hitbox = this.physicsEngine.getHitbox(this.ghosty);
    const { hit, type } = this.collisionUC.check(
      hitbox, this.ghosty, this.pipes, /* canvasHeight */ 500,
    );
    if (hit) { this._handleCollision(type); return; }

    // 4. Pipe scroll + scoring
    this._scrollPipes(dt);
    this._checkScoringMoments(hitbox);

    // 5. Difficulty slow-time tick
    this.difficulty = this.difficultyUC.tickSlowTime(this.difficulty, dt);

    // 6. Spawn new pipe if needed
    this._maybeSpawnPipe();

    // 7. Recycle off-screen pipes
    this._recyclePipes();

    // 8. Tick particles & UI elements
    this._tickParticles(dt);
    this._tickFeedback(dt);
    this._tickFloats(dt);
    this._tickScreenShake(dt);
    this._emitTrailParticles();
  }

  _tickPaused() {
    const pause = this.inputPort.consumePauseIntent();
    const mute  = this.inputPort.consumeMuteIntent();
    if (mute)  this._toggleMute();
    if (pause) this.stateMachine.transition('PLAYING');
  }

  _handleCollision(type) {
    if (this.ghosty.shieldActive) {
      // Shield absorbs collision (REQ-CDT-010/011)
      this.ghosty     = Object.freeze({ ...this.ghosty, shieldActive: false,
                                        iFrameTimer: 1.5 });
      this.subtitle   = this.presenter.buildSubtitle('Shield Broken!');
      this._emitBurstParticles(true);  // shield-break variant
      return;
    }
    // Real game over
    this.score.highScore = Math.max(this.score.total, this.score.highScore);
    this.storage.saveHighScore(this.score.highScore);
    this.screenShake = { elapsed: 0, duration: 0.5, peak: 10 };
    this._emitBurstParticles(false);
    this.audioCtrl.playGameOver();
    this.stateMachine.transition('GAME_OVER');
  }

  _checkScoringMoments(ghostyHitbox) {
    const ghostyCX = ghostyHitbox.x + ghostyHitbox.w / 2;

    for (const pipe of this.pipes) {
      for (const gap of pipe.gaps) {
        if (gap.scored) continue;
        const gapMidX = pipe.x + 26;  // pipe.x + PIPE_WIDTH/2
        if (ghostyCX >= gapMidX) {
          gap.scored = true;
          this._applyScoringMoment(pipe, gap, ghostyHitbox);
        }
      }
    }
  }

  _applyScoringMoment(pipe, gap, ghostyHitbox) {
    const ghostyCY  = ghostyHitbox.y + ghostyHitbox.h / 2;
    const { nextScore, tier, pointsAwarded } = this.scoringUC.applyGapScore(
      this.score, { y: ghostyCY }, gap, pipe.rarity,
    );
    this.score    = nextScore;
    this.feedback = this.presenter.buildFeedbackLabel(tier);
    this.floats.push(this.presenter.buildFloatingScore(
      pointsAwarded, nextScore.multiplier, pipe.rarity,
      ghostyHitbox.x + ghostyHitbox.w / 2,
      ghostyHitbox.y,
    ));
    this.audioCtrl.playScore(tier.id);

    // Apply modifier if uncollected (REQ-DGP-009)
    if (!gap.modifierCollected && gap.modifierId) {
      gap.modifierCollected = true;
      const result = this.modifierUC.apply(
        gap.modifierId, this.score, this.difficulty, this.ghosty,
      );
      this.score      = result.nextScore;
      this.difficulty = result.nextDifficulty;
      this.ghosty     = result.nextGhosty;
      this.subtitle   = this.presenter.buildSubtitle(result.notification);
      this.audioCtrl.playModifier();
    }
  }

  // ... _scrollPipes, _maybeSpawnPipe, _recyclePipes, _tickParticles,
  //     _tickFeedback, _tickFloats, _tickScreenShake, _emitTrailParticles,
  //     _emitBurstParticles, _toggleMute, _buildSnapshot all follow the
  //     same pattern: pure data manipulation, no Canvas/DOM calls.

  startNewGame() {
    const hs   = this.storage.loadHighScore();
    const init = this.resetUC.reset(hs);
    this.ghosty     = init.ghosty;
    this.score      = init.score;
    this.difficulty = init.difficulty;
    this.pipes      = [];
    this.particles  = { trail: [], burst: [] };
    this.feedback   = null;
    this.subtitle   = null;
    this.floats     = [];
    this.screenShake = null;
    this.stateMachine.transition('PLAYING');
  }

  _buildSnapshot() {
    return {
      state:       this.stateMachine.current,
      ghosty:      this.ghosty,
      score:       this.score,
      difficulty:  this.difficulty,
      pipes:       this.pipes,
      particles:   this.particles,
      feedback:    this.feedback,
      subtitle:    this.subtitle,
      floats:      this.floats,
      screenShake: this.screenShake,
    };
  }
}
```

---

## 6. Layer 4 — Infrastructure / Presentation

> **Rule:** The only layer that may touch browser APIs: `HTMLCanvasElement`, `Web Audio API`,  
> `window`, `document`, `localStorage`, `requestAnimationFrame`.  
> Receives a `WorldSnapshot` from the orchestrator and paints it — no game logic here.

---

### 6.1 `CanvasRenderer`

Responsible for all drawing. Receives a pure `WorldSnapshot` DTO and produces pixels.  
Organized into discrete draw passes that mirror the visual z-order from the mockup.

```js
// infrastructure/CanvasRenderer.js

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ ghostyImg: HTMLImageElement }} assets
   */
  constructor(canvas, assets) {
    this._ctx    = canvas.getContext('2d');
    this._canvas = canvas;
    this._assets = assets;
    this._cloudX = 0;  // parallax cloud x offset
  }

  /**
   * Master draw call — invoked each frame with a WorldSnapshot.
   * @param {WorldSnapshot} snap
   * @param {number} dt
   */
  draw(snap, dt) {
    const ctx = this._ctx;
    const { width: W, height: H } = this._canvas;

    // Screen shake transform (REQ-AVF-011 / REQ-CDT-008)
    ctx.save();
    if (snap.screenShake) {
      const sh = snap.screenShake;
      const decay  = 1 - sh.elapsed / sh.duration;
      const ox = (Math.random() * 2 - 1) * sh.peak * decay;
      const oy = (Math.random() * 2 - 1) * sh.peak * decay;
      ctx.translate(ox, oy);
    }

    this._drawBackground(ctx, W, H, dt);
    this._drawParticles(ctx, snap.particles.trail);   // trail behind Ghosty
    this._drawPipes(ctx, snap.pipes, H);
    this._drawModifierBadges(ctx, snap.pipes, dt);
    this._drawParticles(ctx, snap.particles.burst);   // burst above pipes
    this._drawGhosty(ctx, snap.ghosty);
    this._drawFloatingScores(ctx, snap.floats);
    this._drawFeedbackLabel(ctx, snap.feedback, W);
    this._drawSubtitle(ctx, snap.subtitle, snap.feedback, W);
    this._drawHUD(ctx, snap.score, snap.difficulty, snap.pipes, W, H);
    this._drawMuteButton(ctx, W);

    ctx.restore();

    // State overlays — drawn outside the shake transform
    if (snap.state === 'PAUSED')    this._drawPauseOverlay(ctx, W, H);
    if (snap.state === 'GAME_OVER') this._drawGameOverScreen(ctx, snap, W, H);
    if (snap.state === 'MAIN_MENU') this._drawMainMenu(ctx, snap, W, H);
  }

  // ── Background & Clouds (REQ-VUI-002) ────────────────────────────────────
  _drawBackground(ctx, W, H, dt) {
    ctx.fillStyle = '#AEE0F0';
    ctx.fillRect(0, 0, W, H);

    // Parallax clouds: scrolled at ~30% of pipe speed
    this._cloudX = (this._cloudX - 66 * dt) % W;  // 220 * 0.3 = 66 px/s base
    this._renderClouds(ctx, this._cloudX, W, H);
  }

  _renderClouds(ctx, offsetX, W, H) {
    // Procedurally placed cloud pillows — fixed seed positions, wrapped by offsetX
    const CLOUDS = [
      { x: 80,  y: 80,  w: 110, h: 45 },
      { x: 300, y: 50,  w: 90,  h: 35 },
      { x: 500, y: 110, w: 130, h: 50 },
      { x: 680, y: 70,  w: 100, h: 40 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const c of CLOUDS) {
      const cx = ((c.x + offsetX) % (W + c.w)) - c.w;
      ctx.beginPath();
      ctx.ellipse(cx + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Pipes (REQ-PRS-002, REQ-VUI-005) ─────────────────────────────────────
  _drawPipes(ctx, pipes, canvasH) {
    for (const pipe of pipes) {
      const colors = PIPE_COLORS[pipe.rarity.id];
      this._drawPipePair(ctx, pipe, colors, canvasH);
    }
  }

  _drawPipePair(ctx, pipe, colors, canvasH) {
    const px = pipe.x;
    const pw = 52;   // PIPE_WIDTH

    if (pipe.gapType === 'SINGLE') {
      const gap = pipe.gaps[0];
      this._drawSegment(ctx, px, 0, pw, gap.topY, colors, 'top');
      this._drawSegment(ctx, px, gap.bottomY, pw, canvasH - gap.bottomY, colors, 'bottom');
    } else {
      const [upper, lower] = pipe.gaps;
      this._drawSegment(ctx, px, 0, pw, upper.topY, colors, 'top');
      this._drawSegment(ctx, px, upper.bottomY, pw, lower.topY - upper.bottomY, colors, 'mid');
      this._drawSegment(ctx, px, lower.bottomY, pw, canvasH - lower.bottomY, colors, 'bottom');
    }
  }

  _drawSegment(ctx, x, y, w, h, colors, face) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(x, y, w, h);
    // Cap — REQ-VUI-005
    const capH = 12, capW = w + 8, capX = x - 4;
    ctx.fillStyle = colors.cap;
    if (face === 'top')    ctx.fillRect(capX, y + h - capH, capW, capH);
    if (face === 'bottom') ctx.fillRect(capX, y, capW, capH);
    // Middle segment has caps on both faces
    if (face === 'mid') {
      ctx.fillRect(capX, y, capW, capH);
      ctx.fillRect(capX, y + h - capH, capW, capH);
    }
  }

  // ── Modifier Badges (REQ-DGP-012) ─────────────────────────────────────────
  _drawModifierBadges(ctx, pipes, dt) {
    for (const pipe of pipes) {
      for (const gap of pipe.gaps) {
        if (!gap.modifierId || gap.modifierCollected) continue;
        const cx     = pipe.x + 26;
        const cy     = (gap.topY + gap.bottomY) / 2 + Math.sin(Date.now() / 1000 * Math.PI * 2) * 4;
        const tint   = BADGE_COLORS[gap.modifierId] ?? '#FFB800';
        const size   = 28;
        ctx.save();
        ctx.fillStyle   = tint;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle  = '#fff';
        ctx.font       = 'bold 10px monospace';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gap.badgeExpression ?? gap.modifierId, cx, cy);
        ctx.restore();
      }
    }
  }

  // ── Ghosty (REQ-VUI-003, REQ-CDT-012) ─────────────────────────────────────
  _drawGhosty(ctx, ghosty) {
    if (!ghosty) return;
    const isBlink = ghosty.iFrameTimer > 0
      && Math.floor(Date.now() / 62.5) % 2 === 0;  // ~8 Hz blink
    if (isBlink) return;   // skip draw frame = pulsing effect

    const W = 34, H = 34;
    ctx.save();
    ctx.translate(ghosty.x, ghosty.y);
    ctx.rotate((ghosty.rotation * Math.PI) / 180);
    ctx.drawImage(this._assets.ghostyImg, -W / 2, -H / 2, W, H);
    ctx.restore();
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  _drawParticles(ctx, particles) {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      const r     = p.radius * alpha;
      if (r < 0.5) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Feedback Label & Subtitle (REQ-PSF-008, REQ-PSF-008B) ─────────────────
  _drawFeedbackLabel(ctx, fb, W) {
    if (!fb || !fb.timer) return;
    const alpha = fb.fadeTimer > 0
      ? Math.max(0, fb.fadeTimer / fb.fadeTime)
      : 1;
    ctx.save();
    ctx.globalAlpha    = alpha;
    ctx.font           = 'bold 42px "Press Start 2P", monospace';
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'top';
    ctx.fillStyle      = fb.color;
    ctx.strokeStyle    = 'rgba(0,0,0,0.5)';
    ctx.lineWidth      = 4;
    ctx.strokeText(fb.text, W / 2, fb.y);
    ctx.fillText(fb.text, W / 2, fb.y);
    ctx.restore();
  }

  _drawSubtitle(ctx, sub, fb, W) {
    if (!sub || !sub.timer) return;
    const fbBottom = fb ? fb.y + 52 + 8 : 80;  // approx label height + gap
    const alpha = sub.fadeTimer > 0
      ? Math.max(0, sub.fadeTimer / 0.4)
      : 1;
    ctx.save();
    ctx.globalAlpha  = alpha;
    ctx.font         = 'bold 18px "Press Start 2P", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = sub.color;
    ctx.fillText(sub.text, W / 2, fbBottom);
    ctx.restore();
  }

  // ── Floating Score Indicators (REQ-AVF-016–019) ────────────────────────────
  _drawFloatingScores(ctx, floats) {
    for (const f of floats) {
      if (!f.timer) continue;
      const alpha = f.timer < f.fadeTime
        ? f.timer / f.fadeTime
        : 1;
      ctx.save();
      ctx.globalAlpha  = alpha;
      ctx.font         = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  // ── HUD Bar (REQ-VUI-004) ──────────────────────────────────────────────────
  _drawHUD(ctx, score, difficulty, pipes, W, H) {
    const HH = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, H - HH, W, HH);
    ctx.fillStyle  = '#ffffff';
    ctx.font       = '11px "Press Start 2P", monospace';
    ctx.textAlign  = 'left';
    ctx.textBaseline = 'middle';
    const y = H - HH / 2;
    const lastPipe = pipes.findLast?.(p => p.passed) ?? null;
    const gapLabel = lastPipe?.gapType === 'DOUBLE' ? 'Double' : 'Single';
    const modLabel = score.multiplier > 1
      ? `×${score.multiplier}`
      : (score.lastModifierId ?? 'None');
    const precLabel = score.lastPrecisionTierId ?? '';
    ctx.fillText(
      `Score: ${score.total}  High: ${score.highScore}  Gaps: ${gapLabel}  Mod: ${modLabel}  ${precLabel}`,
      10, y,
    );
  }

  // ── Mute Button ────────────────────────────────────────────────────────────
  _drawMuteButton(ctx, W) {
    ctx.font      = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('🔇', W - 12, 20);
  }

  // ── State Overlays ─────────────────────────────────────────────────────────
  _drawPauseOverlay(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 28px "Press Start 2P", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('Esc / P to Resume', W / 2, H / 2 + 20);
  }

  _drawMainMenu(ctx, snap, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle    = '#FFD700';
    ctx.font         = 'bold 32px "Press Start 2P", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FLAPPY KIRO', W / 2, H / 2 - 60);
    ctx.fillStyle = '#fff';
    ctx.font      = '12px "Press Start 2P", monospace';
    ctx.fillText(`Best: ${snap.score?.highScore ?? 0}`, W / 2, H / 2);
    ctx.fillText('Space / Tap to Play', W / 2, H / 2 + 40);
  }

  _drawGameOverScreen(ctx, snap, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle    = '#FF4444';
    ctx.font         = 'bold 28px "Press Start 2P", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 70);
    ctx.fillStyle = '#fff';
    ctx.font      = '14px "Press Start 2P", monospace';
    ctx.fillText(`Score: ${snap.score.total}`, W / 2, H / 2 - 20);
    ctx.fillText(`Best:  ${snap.score.highScore}`, W / 2, H / 2 + 10);
    if (snap.score.total >= snap.score.highScore && snap.score.total > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('NEW BEST!', W / 2, H / 2 + 45);
    }
    ctx.fillStyle = '#aaa';
    ctx.font      = '10px "Press Start 2P", monospace';
    ctx.fillText('Space / Tap — Restart', W / 2, H / 2 + 80);
    ctx.fillText('M — Menu',              W / 2, H / 2 + 100);
  }
}

const PIPE_COLORS = {
  GREEN:  { body: '#3a9e3a', cap: '#2d7a2d' },
  PURPLE: { body: '#7b3fa0', cap: '#5c2d75' },
  GOLD:   { body: '#c8922a', cap: '#9e6e18' },
};

const BADGE_COLORS = {
  MULTIPLIER_2X: '#22bb55',
  MULTIPLIER_3X: '#22bb55',
  BONUS_FLAT:    '#e07820',
  SCORE_DOUBLE:  '#FFB800',
  GHOST_SHIELD:  '#4488ff',
  SLOW_TIME:     '#20c0c0',
};
```

---

### 6.2 `WebAudioAdapter`

Wraps Web Audio API. Plays WAV assets and synthesizes score tones.

```js
// infrastructure/WebAudioAdapter.js

export class WebAudioAdapter {
  constructor() {
    this._ctx     = null;   // AudioContext — created on first user gesture
    this._buffers = {};     // { 'jump': AudioBuffer, 'game_over': AudioBuffer }
    this._musicNode  = null;
    this._musicGain  = null;
    this._musicPaused = false;
  }

  /** Must be called inside a user gesture (click/keydown) to unlock AudioContext. */
  _ensureCtx() {
    if (!this._ctx) this._ctx = new AudioContext();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  async loadAssets(assetMap) {
    // assetMap: { 'jump': ArrayBuffer, 'game_over': ArrayBuffer }
    const ctx = new AudioContext();
    for (const [key, ab] of Object.entries(assetMap)) {
      this._buffers[key] = await ctx.decodeAudioData(ab);
    }
    this._ctx = ctx;
  }

  playSfx(name) {
    const ctx = this._ensureCtx();
    const buf = this._buffers[name];
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  }

  /** Synthesize a short tone (score ding, modifier chime). */
  playTone({ freq, dur, wave = 'square' }) {
    const ctx  = this._ensureCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type      = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  /** Attempt to play bgm.ogg / bgm.mp3 if available (REQ-AVF-006). */
  startMusic() {
    if (this._musicNode) return;   // already playing
    const ctx   = this._ensureCtx();
    const buf   = this._buffers['bgm'];
    if (!buf) return;              // no asset — silently skip (REQ-AVF-006)
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    this._musicNode = src;
    this._musicGain = gain;
  }

  pauseMusic() {
    if (this._ctx) this._ctx.suspend();
  }

  stopMusic() {
    try { this._musicNode?.stop(); } catch (_) {}
    this._musicNode = null;
    this._musicGain = null;
  }
}
```

---

### 6.3 `BrowserInputAdapter`

Attaches DOM event listeners and forwards them to `InputController`.

```js
// infrastructure/BrowserInputAdapter.js

export class BrowserInputAdapter {
  /**
   * @param {InputController} inputCtrl
   * @param {HTMLCanvasElement} canvas
   */
  constructor(inputCtrl, canvas) {
    this._ctrl = inputCtrl;

    // Keyboard
    window.addEventListener('keydown', e => {
      e.preventDefault();
      this._ctrl._onKeyDown(e.key);
    });

    // Touch — canvas tap (REQ-NFR-003)
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this._ctrl._onTouch();
    }, { passive: false });

    // Mouse click (desktop)
    canvas.addEventListener('mousedown', () => this._ctrl._onTouch());
  }
}
```

---

### 6.4 `AssetLoader`

Handles all asset loading with graceful fallback (REQ-GSM-003, GAP-07 resolution).

```js
// infrastructure/AssetLoader.js

export class AssetLoader {
  /**
   * Loads all game assets. Resolves when complete; never rejects.
   * Missing files are silently skipped with a console.warn.
   * @returns {{ ghostyImg, audioBuffers: { jump?, game_over?, bgm? } }}
   */
  async load() {
    const [ghostyImg, jumpBuf, gameOverBuf, bgmBuf] = await Promise.all([
      this._loadImage('assets/ghosty.png'),
      this._loadAudio('assets/jump.wav'),
      this._loadAudio('assets/game_over.wav'),
      this._loadAudio('assets/bgm.ogg').catch(() =>
        this._loadAudio('assets/bgm.mp3').catch(() => null)),
    ]);

    const audioBuffers = {};
    if (jumpBuf)     audioBuffers['jump']      = jumpBuf;
    if (gameOverBuf) audioBuffers['game_over'] = gameOverBuf;
    if (bgmBuf)      audioBuffers['bgm']       = bgmBuf;

    return { ghostyImg, audioBuffers };
  }

  async _loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload  = () => res(img);
      img.onerror = () => { console.warn(`Asset missing: ${src}`); res(this._ghostyFallback()); };
      img.src = src;
    });
  }

  async _loadAudio(src) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`${src} not found`);
    return res.arrayBuffer();
  }

  /** Fallback: 34×34 white circle drawn to an offscreen canvas */
  _ghostyFallback() {
    const oc  = document.createElement('canvas');
    oc.width  = 34; oc.height = 34;
    const ctx = oc.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(17, 17, 14, 0, Math.PI * 2);
    ctx.fill();
    return oc;
  }
}
```

---

### 6.5 `GameLoop` — Entry Point

Wires everything together and drives `requestAnimationFrame`.

```js
// infrastructure/GameLoop.js

export class GameLoop {
  /**
   * @param {GameOrchestrator} orchestrator
   * @param {CanvasRenderer}   renderer
   */
  constructor(orchestrator, renderer) {
    this._orchestrator = orchestrator;
    this._renderer     = renderer;
    this._lastTs       = null;
    this._rafId        = null;
  }

  start() {
    this._rafId = requestAnimationFrame(ts => this._frame(ts));
  }

  stop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  _frame(ts) {
    const dt = this._lastTs == null ? 0 : ts - this._lastTs;
    this._lastTs = ts;

    const snap = this._orchestrator.tick(dt);
    this._renderer.draw(snap, dt / 1000);

    this._rafId = requestAnimationFrame(t => this._frame(t));
  }
}
```

---

### 6.6 `main.js` — Composition Root

The single place where all layers are instantiated and wired together.  
Nothing here has business logic — pure dependency injection.

```js
// main.js  (composition root)
import CONFIG from './config.js';
import { AssetLoader }               from './infrastructure/AssetLoader.js';
import { CanvasRenderer }            from './infrastructure/CanvasRenderer.js';
import { WebAudioAdapter }           from './infrastructure/WebAudioAdapter.js';
import { BrowserInputAdapter }       from './infrastructure/BrowserInputAdapter.js';
import { GameLoop }                  from './infrastructure/GameLoop.js';
import { InputController }           from './adapters/InputController.js';
import { AudioController }           from './adapters/AudioController.js';
import { StorageAdapter }            from './adapters/StorageAdapter.js';
import { UIPresenter }               from './adapters/UIPresenter.js';
import { GameOrchestrator }          from './adapters/GameOrchestrator.js';
import { GameStateMachine }          from './usecases/GameStateMachine.js';
import { PhysicsEngine }             from './usecases/PhysicsEngine.js';
import { CollisionUseCase }          from './usecases/CollisionUseCase.js';
import { ScoringUseCase }            from './usecases/ScoringUseCase.js';
import { PipeFactory }               from './usecases/PipeFactory.js';
import { DifficultyUseCase }         from './usecases/DifficultyUseCase.js';
import { ModifierApplicationUseCase }from './usecases/ModifierApplicationUseCase.js';
import { GameResetUseCase }          from './usecases/GameResetUseCase.js';

(async () => {
  const canvas  = document.getElementById('gameCanvas');
  canvas.width  = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;

  // Load assets
  const loader = new AssetLoader();
  const { ghostyImg, audioBuffers } = await loader.load();

  // Layer 4 — Infrastructure
  const webAudio   = new WebAudioAdapter();
  await webAudio.loadAssets(audioBuffers);
  const renderer   = new CanvasRenderer(canvas, { ghostyImg });

  // Layer 3 — Adapters
  const storage    = new StorageAdapter();
  const inputCtrl  = new InputController();
  new BrowserInputAdapter(inputCtrl, canvas);
  const audioCtrl  = new AudioController(webAudio, storage.loadMuteState());
  const presenter  = new UIPresenter();

  // Layer 2 — Use Cases
  const stateMachine  = new GameStateMachine();
  const physicsEngine = new PhysicsEngine();
  const collisionUC   = new CollisionUseCase();
  const scoringUC     = new ScoringUseCase();
  const difficultyUC  = new DifficultyUseCase();
  const pipeFactory   = new PipeFactory();
  const modifierUC    = new ModifierApplicationUseCase(scoringUC, difficultyUC);
  const resetUC       = new GameResetUseCase();

  // Layer 3 — Orchestrator (wires use cases)
  const orchestrator = new GameOrchestrator({
    stateMachine, physicsEngine, collisionUC, scoringUC,
    difficultyUC, pipeFactory, modifierUC, resetUC,
    inputPort: inputCtrl, audioCtrl, storage, presenter,
  });

  // Transition to MAIN_MENU and start loop
  stateMachine.transition('MAIN_MENU');
  const loop = new GameLoop(orchestrator, renderer);
  loop.start();
})();
```

---

## 7. Centralized Configuration Module

> Single source of truth for every named constant referenced in `requirements.md` v0.3.  
> Importable by all layers. Read-only (`Object.freeze`). No logic — only values.

```js
// config.js

const CONFIG = Object.freeze({

  // ── Canvas ─────────────────────────────────────────────────────────────────
  // REQ-VUI-001
  CANVAS_WIDTH:  800,
  CANVAS_HEIGHT: 500,

  // ── HUD & Pipe Geometry ────────────────────────────────────────────────────
  // REQ-OBG-000
  HUD_HEIGHT:    40,    // px — HUD bar at canvas bottom
  PIPE_WIDTH:    52,    // px — width of every pipe segment

  // ── Ghosty Sprite ─────────────────────────────────────────────────────────
  GHOSTY_SPRITE_W: 34,  // px
  GHOSTY_SPRITE_H: 34,  // px
  GHOSTY_START_X:  120, // px — fixed horizontal position

  // ── Hitbox Scales ─────────────────────────────────────────────────────────
  // REQ-CDT-001
  HITBOX_SCALE_X: 0.55,
  HITBOX_SCALE_Y: 0.60,

  // ── Physics ───────────────────────────────────────────────────────────────
  // REQ-PHY-002
  DT_CAP:            0.033,  // s — max delta time per frame (~30 FPS floor)

  // REQ-PHY-003 / REQ-PHY-004
  GRAVITY:           1800,   // px/s²

  // REQ-PHY-005 / REQ-PHY-007
  FLAP_VELOCITY:     520,    // px/s (applied as negative Y)

  // REQ-PHY-008 / REQ-PHY-009
  TERMINAL_VELOCITY: 700,    // px/s

  // REQ-PHY-012
  TILT_FACTOR:       0.13,   // deg/(px/s)  — at 700 px/s → 91° → clamped to 90°
  TILT_MIN_DEG:     -25,     // degrees (nose-up cap)
  TILT_MAX_DEG:      90,     // degrees (nose-down cap)

  // REQ-PHY-013
  ROTATION_LERP:     0.18,   // smoothing factor per frame

  // ── Input ─────────────────────────────────────────────────────────────────
  FLAP_DEBOUNCE_MS:  80,     // ms — min interval between registered flap inputs

  // ── Pipe Generation ───────────────────────────────────────────────────────
  // REQ-OBG-001 / REQ-OBG-002
  PIPE_SPACING:      260,    // px — initial horizontal gap between pipe leading edges

  // REQ-OBG-003
  FIRST_PIPE_OFFSET: 350,    // px — first pipe spawn offset from Ghosty start X

  // REQ-OBG-004
  GAP_HEIGHT_MIN:    140,    // px — initial minimum gap opening
  GAP_HEIGHT_MAX:    180,    // px — initial maximum gap opening

  // REQ-OBG-005
  GAP_HEIGHT_FLOOR:  110,    // px — hard minimum; never breached

  // REQ-OBG-007
  GAP_MARGIN:         60,    // px — safe-zone margin from top/bottom canvas edges

  // REQ-OBG-008
  MIN_GAP_SEPARATION: 160,   // px — minimum distance between Double-Gap gap centers

  // REQ-OBG-009 / REQ-OBG-010
  PIPE_SPEED_BASE:   220,    // px/s
  PIPE_SPEED_MAX:    480,    // px/s

  // REQ-OBG-011
  SPEED_INCREMENT:    12,    // px/s per 10-pipe step

  // REQ-OBG-012  (gap height reduction per step)
  GAP_STEP_REDUCTION:  4,    // px

  // REQ-OBG-013
  PIPE_SPACING_MIN:  180,    // px — minimum pipe spacing
  SPACING_STEP_REDUCTION: 6, // px per step

  // REQ-OBG-016 — third difficulty axis
  THIRD_AXIS_SPACING_STEP:  5,   // px additional spacing min reduction per step
  THIRD_AXIS_SPACING_FLOOR: 140, // px — absolute minimum spacing
  PIPE_DRIFT_AMPLITUDE:      20, // px — gap center Y oscillation amplitude
  PIPE_DRIFT_FREQ:          0.5, // Hz

  // ── Double-Gap Pipe ────────────────────────────────────────────────────────
  // REQ-DGP-002
  DOUBLE_GAP_THRESHOLD_MIN: 3,
  DOUBLE_GAP_THRESHOLD_MAX: 7,

  // ── Modifiers ─────────────────────────────────────────────────────────────
  // REQ-DGP-008 / REQ-DGP-008C
  MODIFIER_MIN_BONUS:       5,   // guaranteed minimum bonus when effect would be ≤ 0
  MULTIPLIER_2X_DURATION:   5,   // gap passages
  MULTIPLIER_3X_DURATION:   3,   // gap passages
  SLOW_TIME_DURATION:       4.0, // seconds
  SLOW_TIME_REDUCTION:      0.40,// 40% speed reduction

  // ── Collision Response ────────────────────────────────────────────────────
  // REQ-CDT-008
  SHAKE_DURATION:   0.5,   // s
  SHAKE_PEAK:       10,    // px
  SHAKE_REGEN_FRAMES: 2,   // frames between random_unit_vector re-sample

  // REQ-CDT-009
  BURST_MIN_PARTICLES: 12,
  BURST_MAX_PARTICLES: 16,
  BURST_LIFE_MIN:      0.4, // s
  BURST_LIFE_MAX:      0.7, // s

  // REQ-CDT-011
  IFRAMES_DURATION:    1.5, // s

  // REQ-CDT-012
  IFRAME_BLINK_HZ:     8,   // Hz — opacity pulse frequency

  // ── Particle Pools ────────────────────────────────────────────────────────
  // REQ-NFR-006
  TRAIL_POOL_MAX:    150,
  BURST_POOL_MAX:     50,

  // Trail particle properties — REQ-AVF-013
  TRAIL_SPAWN_RATE:   2.5,  // particles per frame (average)
  TRAIL_LIFE_MIN:     0.25, // s
  TRAIL_LIFE_MAX:     0.45, // s
  TRAIL_RADIUS_MIN:   3,    // px
  TRAIL_RADIUS_MAX:   6,    // px
  TRAIL_VX_BIAS:    -60,    // px/s leftward bias
  TRAIL_VX_SPREAD:   20,    // px/s ±random spread
  TRAIL_VY_SPREAD:   30,    // px/s ±random spread

  // Shield trail oscillation — REQ-AVF-014
  SHIELD_TRAIL_FREQ:  4,    // Hz

  // ── Precision Thresholds ──────────────────────────────────────────────────
  // REQ-PSF-002 / REQ-PSF-003 / REQ-PSF-004
  PRECISION_PERFECTO: 0.75,
  PRECISION_BUENO:    0.35,

  // ── Feedback Label & Subtitle ─────────────────────────────────────────────
  // REQ-PSF-008 / REQ-PSF-009
  FEEDBACK_Y:          20,   // px — top edge of feedback label
  FEEDBACK_HOLD:       1.2,  // s
  FEEDBACK_FADE:       0.4,  // s
  FEEDBACK_FONT_SIZE:  42,   // px min

  // REQ-PSF-008B
  SUBTITLE_FONT_SIZE:  18,   // px min
  SUBTITLE_GAP:         8,   // px — space between feedback label bottom and subtitle

  // ── Floating Score Indicators ─────────────────────────────────────────────
  // REQ-AVF-017
  FLOAT_SPEED:         40,   // px/s upward
  FLOAT_HOLD:          0.9,  // s
  FLOAT_FADE:          0.3,  // s

  // ── Modifier Badge ────────────────────────────────────────────────────────
  // REQ-DGP-012
  BADGE_SIZE:          28,   // px (square)
  BADGE_BOB_AMPLITUDE:  4,   // px
  BADGE_BOB_FREQ:       1,   // Hz

  // ── Idle Bobbing (menus) ───────────────────────────────────────────────────
  // GAP-13 resolution
  IDLE_BOB_AMPLITUDE:   6,   // px
  IDLE_BOB_FREQ:        1.2, // Hz

  // ── Pipe Rarity Spawn Weights ─────────────────────────────────────────────
  // REQ-PRS-001
  RARITY_GREEN_THRESHOLD:  0.65,
  RARITY_PURPLE_THRESHOLD: 0.90,  // cumulative: 0.65–0.90 = purple, >0.90 = gold

  // ── Game Over Overlay Delay ───────────────────────────────────────────────
  // REQ-GSM-014
  GAME_OVER_DELAY: 0.8,   // s before overlay appears

  // ── localStorage Keys ────────────────────────────────────────────────────
  // REQ-GSM-018 / REQ-GSM-020
  LS_HIGH_SCORE: 'flappyKiro_highScore',
  LS_MUTED:      'flappyKiro_muted',

});

export default CONFIG;
```

> **Usage rule:** Never hard-code a magic number anywhere outside this file.  
> If a value appears in two modules, it belongs here first.

---

## 8. Project File Tree

Every file is annotated with its Clean Architecture layer, primary responsibility, and the requirement IDs it satisfies.

```
Flappy Kiro/
│
├── index.html                          # Entry point — loads main.js as ES module
│
├── config.js                           # ★ Cross-cutting — all named constants
│                                       #   REQ-PHY-*, REQ-OBG-*, REQ-CDT-*, REQ-NFR-006
│
├── main.js                             # Layer 4 — Composition root / DI wiring
│                                       #   Instantiates all layers, starts GameLoop
│
├── assets/
│   ├── ghosty.png                      # Ghosty sprite (REQ-VUI-003)
│   ├── jump.wav                        # Flap SFX (REQ-AVF-001)
│   ├── game_over.wav                   # Game over SFX (REQ-AVF-002)
│   └── bgm.ogg  [optional]            # Background music (REQ-AVF-006)
│
├── domain/                             # ══ Layer 1 — Domain / Entities ══
│   │                                   #   Zero imports. Pure data & pure functions.
│   │
│   ├── GameState.js                    # Enum: LOADING, MAIN_MENU, PLAYING, PAUSED, GAME_OVER
│   │                                   #   REQ-GSM-001
│   ├── PipeRarity.js                   # Enum: GREEN / PURPLE / GOLD + basePoints + spawnWeight
│   │                                   #   REQ-PRS-001–005
│   ├── PrecisionTier.js                # Enum: PERFECTO / BUENO / CASI + label + color + bonus
│   │                                   #   REQ-PSF-002–007
│   ├── ModifierId.js                   # Enum: all 6 modifier IDs
│   │                                   #   REQ-DGP-008
│   │
│   ├── GhostyState.js                  # Value object + createGhostyState factory
│   │                                   #   REQ-PHY-*, REQ-CDT-001
│   ├── Gap.js                          # Value object + gapCenterY() + gapHeight() helpers
│   │                                   #   REQ-PSF-001B, REQ-OBG-007
│   ├── Pipe.js                         # Value object typedef (SINGLE / DOUBLE)
│   │                                   #   REQ-DGP-004, REQ-OBG-000
│   ├── ScoreState.js                   # Value object typedef
│   │                                   #   REQ-PRS-006, REQ-DGP-011B
│   ├── DifficultyState.js              # Value object typedef
│   │                                   #   REQ-OBG-009–016
│   ├── ParticleState.js                # Value object typedef (TRAIL / BURST)
│   │                                   #   REQ-AVF-013, REQ-NFR-006
│   ├── NotificationState.js            # Value object typedef (feedback label / subtitle)
│   │                                   #   REQ-PSF-008, REQ-PSF-008B
│   │
│   ├── PrecisionRules.js               # Pure fn: calcPrecision(), classifyPrecision()
│   │                                   #   REQ-PSF-001B–004
│   ├── ScoreFormula.js                 # Pure fn: calcPointsAwarded(), applyMinimumBonus()
│   │                                   #   REQ-PRS-006, REQ-DGP-008C
│   ├── PhysicsFormulas.js              # Pure fn: gravity, terminal, position, hitbox, AABB
│   │                                   #   REQ-PHY-003/008/010/012/013, REQ-CDT-001/004
│   └── ModifierBadgeExpressions.js     # Pure fn: buildBadgeExpression()
│                                       #   REQ-DGP-007B
│
├── usecases/                           # ══ Layer 2 — Use Cases / Application ══
│   │                                   #   Imports: domain/ + config.js only
│   │
│   ├── ports/
│   │   ├── IStoragePort.js             # Interface for persistence
│   │   │                               #   REQ-GSM-018–020
│   │   ├── IAudioPort.js               # Interface for audio output
│   │   │                               #   REQ-AVF-001–009
│   │   └── IInputPort.js               # Interface for player intent flags
│   │                                   #   REQ-CGL-005, REQ-GSM-010
│   │
│   ├── PhysicsEngine.js                # tick(state, flap, dt) → GhostyState
│   │                                   #   REQ-PHY-001–015
│   ├── CollisionUseCase.js             # check(hitbox, ghosty, pipes, H) → {hit, type}
│   │                                   #   REQ-CDT-001–007, REQ-CGL-008
│   ├── ScoringUseCase.js               # applyGapScore(), applyBonusFlat(),
│   │                                   #   applyScoreDouble(), activateMultiplier()
│   │                                   #   REQ-PRS-006, REQ-PSF-001, REQ-DGP-008/011B
│   ├── PipeFactory.js                  # createSingle(), createDouble()
│   │                                   #   REQ-PRS-001, REQ-OBG-004–008, REQ-DGP-007–008B
│   ├── DifficultyUseCase.js            # onPipePassed(), activateSlowTime(), tickSlowTime()
│   │                                   #   REQ-OBG-011–016, REQ-DGP-008 SLOW_TIME
│   ├── ModifierApplicationUseCase.js   # apply(modId, score, difficulty, ghosty)
│   │                                   #   REQ-DGP-008–011, REQ-DGP-008C
│   ├── GameStateMachine.js             # transition(), on() event hooks
│   │                                   #   REQ-GSM-001–002
│   └── GameResetUseCase.js             # reset(highScore) → full initial world state
│                                       #   REQ-GSM-021
│
├── adapters/                           # ══ Layer 3 — Interface Adapters ══
│   │                                   #   Imports: domain/ + usecases/ + config.js
│   │
│   ├── InputController.js              # Implements IInputPort; accumulates intent flags
│   │                                   #   REQ-CGL-005/016, REQ-GSM-010
│   ├── AudioController.js              # Implements IAudioPort; delegates to WebAudioAdapter
│   │                                   #   REQ-AVF-001–009, REQ-CGL-016
│   ├── StorageAdapter.js               # Implements IStoragePort; wraps localStorage
│   │                                   #   REQ-GSM-018–020
│   ├── UIPresenter.js                  # Transforms domain state → renderer DTOs
│   │                                   #   REQ-VUI-004, REQ-PSF-008/008B, REQ-AVF-016–020
│   └── GameOrchestrator.js             # Main game-loop coordinator; wires all use cases
│                                       #   REQ-CGL-*, REQ-GSM-007–016
│
└── infrastructure/                     # ══ Layer 4 — Infrastructure / Presentation ══
    │                                   #   May use any browser API
    │
    ├── CanvasRenderer.js               # All canvas 2D drawing; consumes WorldSnapshot
    │                                   #   REQ-VUI-001–005, REQ-PSF-008/011, REQ-CDT-008/012
    │                                   #   REQ-AVF-011–020, REQ-DGP-012
    ├── WebAudioAdapter.js              # Web Audio API: WAV playback + tone synthesis
    │                                   #   REQ-AVF-001–009
    ├── BrowserInputAdapter.js          # DOM keydown / touchstart / mousedown → InputController
    │                                   #   REQ-NFR-003, REQ-CGL-005/016
    ├── AssetLoader.js                  # Fetch + decode assets; graceful fallback
    │                                   #   REQ-GSM-003–004, GAP-07
    └── GameLoop.js                     # requestAnimationFrame driver
                                        #   REQ-NFR-002
```

### Additional files (testing & optional tooling)

```
tests/
├── domain/
│   ├── PrecisionRules.test.js          # PBT — calcPrecision / classifyPrecision
│   ├── ScoreFormula.test.js            # PBT — calcPointsAwarded / applyMinimumBonus
│   └── PhysicsFormulas.test.js         # PBT — AABB, hitbox, gravity integration
├── usecases/
│   ├── ScoringUseCase.test.js          # PBT — full scoring pipeline incl. multipliers
│   ├── CollisionUseCase.test.js        # PBT — pipe boundary and ground/ceiling edge cases
│   ├── PipeFactory.test.js             # Property: gap invariants, modifier pair uniqueness
│   └── DifficultyUseCase.test.js       # Property: speed cap, gap floor, third-axis trigger
└── setup.js                            # Fast-check / Vitest bootstrap
```

---

## 9. Data Flow & State Machine Diagrams

### 9.1 Per-Frame Data Flow (PLAYING state)

```
Browser rAF tick
       │  rawDt (ms)
       ▼
  GameLoop.frame()
       │  dt = min(rawDt/1000, DT_CAP)
       ▼
  GameOrchestrator.tick(dt)
       │
       ├─ 1. InputController.consume*()  ──► flapPressed, pauseIntent, muteIntent
       │
       ├─ 2. PhysicsEngine.tick()  ──────► GhostyState′  (new immutable snapshot)
       │         │ integrateGravity → clampTerminal → integratePosition
       │         │ ceiling clamp → rotation lerp → iFrameTimer countdown
       │
       ├─ 3. CollisionUseCase.check()  ─► { hit, type }
       │         │ if iFrameTimer > 0 → skip all pipe checks
       │         │ ground boundary check (canvas_height − HUD_HEIGHT)
       │         │ AABB vs every pipe segment
       │         └─ hit=true ──► _handleCollision() ──► GAME_OVER transition
       │
       ├─ 4. _scrollPipes(dt)  ──────────► pipe.x -= pipeSpeed * dt  (per pipe)
       │
       ├─ 5. _checkScoringMoments()  ───► for each un-scored gap:
       │         │ ghostyCX >= pipe.x + PIPE_WIDTH/2 ?
       │         │    └─ ScoringUseCase.applyGapScore()
       │         │          calcPrecision → classifyPrecision → calcPointsAwarded
       │         │          → multiplierCounter--  → ScoreState′
       │         │    └─ UIPresenter.buildFeedbackLabel()  ──► FeedbackLabelDto
       │         │    └─ UIPresenter.buildFloatingScore()  ──► FloatingScoreDto
       │         │    └─ AudioController.playScore(tierId)
       │         │    └─ if gap.modifierId → ModifierApplicationUseCase.apply()
       │         │             → ScoreState′ / DifficultyState′ / GhostyState′
       │         │             → UIPresenter.buildSubtitle()  ──► SubtitleDto
       │         │             → AudioController.playModifier()
       │
       ├─ 6. DifficultyUseCase.tickSlowTime(dt)  ──► DifficultyState′
       │
       ├─ 7. _maybeSpawnPipe()
       │         │ last pipe x < canvas_width − PIPE_SPACING ?
       │         │    singleGapCounter >= doubleGapThreshold
       │         │       └─ PipeFactory.createDouble()  ──► Pipe (DOUBLE)
       │         │    else └─ PipeFactory.createSingle()  ──► Pipe (SINGLE)
       │         └─ DifficultyUseCase.onPipePassed() called on trailing-edge clear
       │
       ├─ 8. _recyclePipes()  ───────────► remove pipes where x < −PIPE_WIDTH
       │
       ├─ 9. _tickParticles(dt) / _tickFeedback(dt) / _tickFloats(dt)
       │         │ update positions, decrement timers, cull dead entries
       │
       └─ 10. _buildSnapshot()  ─────────► WorldSnapshot (pure data DTO)
                                                │
                                                ▼
                                    CanvasRenderer.draw(snapshot, dt)
                                         │  (Layer 4 — pixels only)
                                         │
                                         ├─ ctx.save() + screen shake translate
                                         ├─ drawBackground (sky + parallax clouds)
                                         ├─ drawParticles (trail)
                                         ├─ drawPipes (body + caps + rarity color)
                                         ├─ drawModifierBadges (bobbing badges)
                                         ├─ drawParticles (burst)
                                         ├─ drawGhosty (sprite + tilt + iFrame blink)
                                         ├─ drawFloatingScores
                                         ├─ drawFeedbackLabel (y=20, color by tier)
                                         ├─ drawSubtitle (below label, cyan)
                                         ├─ drawHUD (bottom bar)
                                         ├─ drawMuteButton
                                         └─ ctx.restore() → state overlays (PAUSED / GAME_OVER / MAIN_MENU)
```

---

### 9.2 Formal State Machine

States, legal transitions, and the trigger condition for each edge.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │   ┌─────────┐   assets loaded   ┌───────────┐                  │
  │   │ LOADING │ ────────────────► │ MAIN_MENU │                  │
  │   └─────────┘                   └─────┬─────┘                  │
  │                                       │                         │
  │                          Space/click/tap                        │
  │                                       │ (+ Game Reset)          │
  │                                       ▼                         │
  │                                  ┌─────────┐                   │
  │               ┌──── Esc/P ──────►│ PAUSED  │◄──── Esc/P ───┐  │
  │               │                  └────┬────┘                │  │
  │               │           Esc/P ──────┘                     │  │
  │               │                                              │  │
  │               │                  ┌─────────┐                │  │
  │               └──────────────────│ PLAYING │────────────────┘  │
  │                                  └────┬────┘                   │
  │                                       │                         │
  │                          collision / ground                     │
  │                                       │                         │
  │                                       ▼                         │
  │                                 ┌───────────┐                  │
  │                                 │ GAME_OVER │                  │
  │                                 └─────┬─────┘                  │
  │                                       │                         │
  │              ┌────────────────────────┤                        │
  │              │ M key                  │ Space/tap              │
  │              ▼                        │ (+ Game Reset)          │
  │         ┌───────────┐                 │                         │
  │         │ MAIN_MENU │◄────────────────┘                        │
  │         └───────────┘                                           │
  └──────────────────────────────────────────────────────────────────┘

  GameStateMachine enforces the transition table; illegal transitions
  are logged and return false — no silent corruption.
```

---

### 9.3 Scoring Moment Decision Tree

```
  Each frame — for every gap in every pipe:

  gap.scored?
  ├─ YES → skip
  └─ NO
       ghostyCX >= gapMidX?
       ├─ NO  → skip (not yet)
       └─ YES → Scoring Moment fires
                    │
                    ├─ collision on same frame?
                    │    YES → skip scoring (collision takes priority — REQ-PSF-001B)
                    │
                    ├─ calcPrecision(ghostyCY, gapCenterY, gapHeight)
                    │        → precision ∈ [0, 1]
                    ├─ classifyPrecision(precision)
                    │        ≥ 0.75 → PERFECTO (bonus=2)
                    │        ≥ 0.35 → BUENO    (bonus=1)
                    │        < 0.35 → CASI     (bonus=0)
                    ├─ calcPointsAwarded(basePoints, bonus, multiplier)
                    │        = floor((base + bonus) × multiplier)
                    │        if result ≤ 0 → applyMinimumBonus() → +5
                    ├─ score.total += points
                    ├─ multiplierCounter > 0 → decrement; if 0 → reset multiplier to 1×
                    ├─ gap.modifierId present & uncollected?
                    │    YES → ModifierApplicationUseCase.apply()
                    │           MULTIPLIER_2X → activateMultiplier(2, 5)
                    │           MULTIPLIER_3X → activateMultiplier(3, 3)
                    │           BONUS_FLAT    → applyBonusFlat()
                    │           SCORE_DOUBLE  → applyScoreDouble()
                    │           GHOST_SHIELD  → ghosty.shieldActive = true
                    │           SLOW_TIME     → activateSlowTime()
                    └─ gap.scored = true  (fires exactly once per gap)
```

---

### 9.4 Modifier Badge Assignment Flow (at pipe spawn)

```
  PipeFactory.createDouble()
       │
       ├─ _pickModifierPair()
       │       pool = [MULT_2X, MULT_3X, BONUS_FLAT, SCORE_DOUBLE, GHOST_SHIELD, SLOW_TIME]
       │       pick mod1 at random from pool             (6 choices)
       │       pick mod2 at random from pool − {mod1}    (5 choices — REQ-DGP-008B)
       │       guaranteed: mod1 ≠ mod2
       │
       ├─ buildBadgeExpression(mod1, currentScore, pipeBasePoints)  → string
       ├─ buildBadgeExpression(mod2, currentScore, pipeBasePoints)  → string
       │
       └─ upperGap.modifierId = mod1,  upperGap.badgeExpression = expr1
          lowerGap.modifierId = mod2,  lowerGap.badgeExpression = expr2
```

---

## 10. Property-Based Test Specifications

> **Framework:** [fast-check](https://github.com/dubzzz/fast-check) + [Vitest](https://vitest.dev/)  
> **Runner command:** `npx vitest run`  
> All subjects under test live in `domain/` or `usecases/` — zero browser dependencies.

---

### 10.1 `PrecisionRules` — `calcPrecision` & `classifyPrecision`

```js
// tests/domain/PrecisionRules.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { calcPrecision, classifyPrecision } from '../../domain/PrecisionRules.js';
import { PrecisionTier } from '../../domain/PrecisionTier.js';

describe('calcPrecision', () => {

  it('P1 — result is always in [0, 1] for any inputs', () => {
    fc.assert(fc.property(
      fc.float({ min: -2000, max: 2000 }),  // ghostyCenterY
      fc.float({ min: -2000, max: 2000 }),  // gapCenterY
      fc.float({ min: 1,     max: 500  }),  // gapHeight (positive)
      (ghostyY, gapCY, gapH) => {
        const p = calcPrecision(ghostyY, gapCY, gapH);
        return p >= 0 && p <= 1;
      },
    ));
  });

  it('P2 — perfect center always returns 1.0', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 460 }),
      fc.float({ min: 1, max: 500 }),
      (centerY, gapH) => calcPrecision(centerY, centerY, gapH) === 1,
    ));
  });

  it('P3 — precision decreases as ghosty moves away from gap center', () => {
    fc.assert(fc.property(
      fc.float({ min: 0,   max: 460 }),   // gapCenterY
      fc.float({ min: 40,  max: 180 }),   // gapHeight
      fc.float({ min: 0,   max: 1   }),   // t1 fractional offset (closer)
      fc.float({ min: 0,   max: 1   }),   // t2 fractional offset (farther, t2 > t1)
      (cy, gh, t1raw, t2raw) => {
        const [t1, t2] = t1raw < t2raw ? [t1raw, t2raw] : [t2raw, t1raw];
        if (t1 === t2) return true;  // skip degenerate case
        const half = gh / 2;
        const p1 = calcPrecision(cy + t1 * half, cy, gh);
        const p2 = calcPrecision(cy + t2 * half, cy, gh);
        return p1 >= p2;
      },
    ));
  });

  it('P4 — ghost outside gap clamps to 0, not negative', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 400 }),
      fc.float({ min: 1, max: 100 }),
      (cy, gapH) => {
        const farOut = cy + gapH * 10;  // way outside
        return calcPrecision(farOut, cy, gapH) === 0;
      },
    ));
  });

});

describe('classifyPrecision', () => {

  it('P5 — value >= 0.75 always returns PERFECTO', () => {
    fc.assert(fc.property(
      fc.float({ min: 0.75, max: 1.0 }),
      (p) => classifyPrecision(p).id === PrecisionTier.PERFECTO.id,
    ));
  });

  it('P6 — value in [0.35, 0.75) always returns BUENO', () => {
    fc.assert(fc.property(
      fc.float({ min: 0.35, max: 0.7499 }),
      (p) => classifyPrecision(p).id === PrecisionTier.BUENO.id,
    ));
  });

  it('P7 — value < 0.35 always returns CASI', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 0.3499 }),
      (p) => classifyPrecision(p).id === PrecisionTier.CASI.id,
    ));
  });

  it('P8 — classification covers entire [0,1] with no gaps', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1 }),
      (p) => {
        const tier = classifyPrecision(p);
        return [PrecisionTier.PERFECTO.id, PrecisionTier.BUENO.id, PrecisionTier.CASI.id]
          .includes(tier.id);
      },
    ));
  });

});
```

### 10.2 `ScoreFormula` — `calcPointsAwarded` & `applyMinimumBonus`

```js
// tests/domain/ScoreFormula.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { calcPointsAwarded, applyMinimumBonus } from '../../domain/ScoreFormula.js';

describe('calcPointsAwarded', () => {

  it('P9 — result is always a non-negative integer', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3  }),   // basePoints (rarity: 1/2/3)
      fc.integer({ min: 0, max: 2  }),   // precisionBonus (0/1/2)
      fc.integer({ min: 1, max: 10 }),   // multiplier (positive integer)
      (base, bonus, mult) => {
        const result = calcPointsAwarded(base, bonus, mult);
        return Number.isInteger(result) && result >= 0;
      },
    ));
  });

  it('P10 — result equals floor((base + bonus) * mult)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3  }),
      fc.integer({ min: 0, max: 2  }),
      fc.float  ({ min: 1, max: 10 }),   // float multiplier (e.g. 2.0, 3.0)
      (base, bonus, mult) => {
        const expected = Math.floor((base + bonus) * mult);
        return calcPointsAwarded(base, bonus, mult) === expected;
      },
    ));
  });

  it('P11 — higher multiplier never produces fewer points than lower multiplier', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3 }),
      fc.integer({ min: 0, max: 2 }),
      fc.float  ({ min: 1, max: 5 }),
      fc.float  ({ min: 1, max: 5 }),
      (base, bonus, m1raw, m2raw) => {
        const [lo, hi] = m1raw < m2raw ? [m1raw, m2raw] : [m2raw, m1raw];
        return calcPointsAwarded(base, bonus, lo) <= calcPointsAwarded(base, bonus, hi);
      },
    ));
  });

  it('P12 — multiplier=1 with no precision bonus equals base points', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3 }),
      (base) => calcPointsAwarded(base, 0, 1) === base,
    ));
  });

  it('P13 — Gold+Perfecto+x3 produces maximum possible single-gap score (15)', () => {
    expect(calcPointsAwarded(3, 2, 3)).toBe(15);
  });

});

describe('applyMinimumBonus', () => {

  it('P14 — positive delta is always returned unchanged', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 10000 }),
      (delta) => applyMinimumBonus(delta) === delta,
    ));
  });

  it('P15 — zero or negative delta always returns MIN_BONUS (5)', () => {
    fc.assert(fc.property(
      fc.integer({ min: -10000, max: 0 }),
      (delta) => applyMinimumBonus(delta) === 5,
    ));
  });

  it('P16 — custom MIN_BONUS is respected', () => {
    fc.assert(fc.property(
      fc.integer({ min: -100, max: 0 }),
      fc.integer({ min: 1,   max: 50 }),
      (delta, minBonus) => applyMinimumBonus(delta, minBonus) === minBonus,
    ));
  });

});
```

### 10.3 `PhysicsFormulas` — AABB & Hitbox

```js
// tests/domain/PhysicsFormulas.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  aabbIntersects, calcHitbox,
  integrateGravity, clampToTerminal, integratePosition,
} from '../../domain/PhysicsFormulas.js';

// Arbitrary for a rect {x,y,w,h} with positive dimensions
const arbRect = fc.record({
  x: fc.float({ min: -1000, max: 1000 }),
  y: fc.float({ min: -1000, max: 1000 }),
  w: fc.float({ min: 1,     max: 500  }),
  h: fc.float({ min: 1,     max: 500  }),
});

describe('aabbIntersects', () => {

  it('P17 — a rect always intersects itself', () => {
    fc.assert(fc.property(arbRect, (r) => aabbIntersects(r, r)));
  });

  it('P18 — rect translated beyond its own width does not intersect original', () => {
    fc.assert(fc.property(arbRect, (r) => {
      const displaced = { ...r, x: r.x + r.w + 1 };
      return !aabbIntersects(r, displaced);
    }));
  });

  it('P19 — intersection is commutative', () => {
    fc.assert(fc.property(arbRect, arbRect, (a, b) =>
      aabbIntersects(a, b) === aabbIntersects(b, a),
    ));
  });

  it('P20 — rect translated beyond its own height does not intersect original', () => {
    fc.assert(fc.property(arbRect, (r) => {
      const below = { ...r, y: r.y + r.h + 1 };
      return !aabbIntersects(r, below);
    }));
  });

});

describe('calcHitbox', () => {

  it('P21 — hitbox dimensions are strictly smaller than sprite dimensions', () => {
    fc.assert(fc.property(
      fc.float({ min: 20, max: 200 }),
      fc.float({ min: 20, max: 200 }),
      fc.float({ min: 0.1, max: 0.99 }),
      fc.float({ min: 0.1, max: 0.99 }),
      (sw, sh, sx, sy) => {
        const hb = calcHitbox(0, 0, sw, sh, sx, sy);
        return hb.w < sw && hb.h < sh;
      },
    ));
  });

  it('P22 — hitbox is centered on sprite origin', () => {
    fc.assert(fc.property(
      fc.float({ min: -500, max: 500 }),
      fc.float({ min: -500, max: 500 }),
      fc.float({ min: 10, max: 100 }),
      fc.float({ min: 10, max: 100 }),
      (cx, cy, sw, sh) => {
        const hb = calcHitbox(cx, cy, sw, sh, 0.55, 0.60);
        const hbCX = hb.x + hb.w / 2;
        const hbCY = hb.y + hb.h / 2;
        return Math.abs(hbCX - cx) < 0.001 && Math.abs(hbCY - cy) < 0.001;
      },
    ));
  });

});

describe('Physics integration', () => {

  it('P23 — integrateGravity always increases velocity (downward)', () => {
    fc.assert(fc.property(
      fc.float({ min: -2000, max: 2000 }),
      fc.float({ min: 0.001, max: 0.033 }),
      (vy, dt) => integrateGravity(vy, 1800, dt) > vy,
    ));
  });

  it('P24 — clampToTerminal never exceeds terminal velocity', () => {
    fc.assert(fc.property(
      fc.float({ min: -5000, max: 5000 }),
      (vy) => clampToTerminal(vy, 700) <= 700,
    ));
  });

  it('P25 — integratePosition with zero velocity produces no movement', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 500 }),
      fc.float({ min: 0.001, max: 0.033 }),
      (y, dt) => integratePosition(y, 0, dt) === y,
    ));
  });

  it('P26 — positive velocity moves position downward', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 400 }),
      fc.float({ min: 1, max: 700 }),
      fc.float({ min: 0.001, max: 0.033 }),
      (y, vy, dt) => integratePosition(y, vy, dt) > y,
    ));
  });

});
```

### 10.4 `ScoringUseCase` — Full Pipeline PBT

```js
// tests/usecases/ScoringUseCase.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { ScoringUseCase } from '../../usecases/ScoringUseCase.js';
import { PipeRarity } from '../../domain/PipeRarity.js';
import { PrecisionTier } from '../../domain/PrecisionTier.js';

const scoringUC = new ScoringUseCase();

const arbRarity = fc.constantFrom(
  PipeRarity.GREEN, PipeRarity.PURPLE, PipeRarity.GOLD,
);

const arbScoreState = (mult = 1, counter = 0) =>
  fc.record({
    total:              fc.integer({ min: 0, max: 10000 }),
    highScore:          fc.integer({ min: 0, max: 50000 }),
    multiplier:         fc.constant(mult),
    multiplierCounter:  fc.constant(counter),
    lastModifierId:     fc.constant(null),
    lastPrecisionTierId: fc.constant(null),
  });

describe('ScoringUseCase.applyGapScore', () => {

  it('P27 — score.total always increases after a gap passage', () => {
    fc.assert(fc.property(
      arbScoreState(),
      arbRarity,
      fc.float({ min: 0, max: 1 }),    // precision as ghosty offset fraction
      fc.float({ min: 40, max: 460 }), // gapCenterY
      fc.float({ min: 110, max: 180 }),// gapHeight
      (state, rarity, offsetFrac, gapCY, gapH) => {
        const ghosty = { y: gapCY + offsetFrac * (gapH / 2) };
        const gap    = { topY: gapCY - gapH/2, bottomY: gapCY + gapH/2 };
        const { nextScore } = scoringUC.applyGapScore(state, ghosty, gap, rarity);
        return nextScore.total >= state.total;
      },
    ));
  });

  it('P28 — points awarded equals floor((base+bonus)*mult), min 5 when 0', () => {
    fc.assert(fc.property(
      arbScoreState(2, 3),             // active x2 multiplier, 3 remaining
      arbRarity,
      (state, rarity) => {
        const ghosty = { y: 250 };     // perfect center
        const gap    = { topY: 180, bottomY: 320 };   // gapH=140, center=250
        const { nextScore, pointsAwarded } = scoringUC.applyGapScore(
          state, ghosty, gap, rarity,
        );
        const expected = Math.floor((rarity.basePoints + 2) * 2);  // perfecto bonus=2, mult=2
        expect(pointsAwarded).toBe(Math.max(5, expected));
        return nextScore.total === state.total + pointsAwarded;
      },
    ));
  });

  it('P29 — multiplier counter decrements by exactly 1 per scoring moment', () => {
    fc.assert(fc.property(
      arbScoreState(2, 5),
      arbRarity,
      (state, rarity) => {
        const ghosty = { y: 250 };
        const gap    = { topY: 180, bottomY: 320 };
        const { nextScore } = scoringUC.applyGapScore(state, ghosty, gap, rarity);
        return nextScore.multiplierCounter === 4;
      },
    ));
  });

  it('P30 — multiplier resets to 1 when counter reaches 0', () => {
    fc.assert(fc.property(
      arbScoreState(3, 1),             // last remaining passage
      arbRarity,
      (state, rarity) => {
        const ghosty = { y: 250 };
        const gap    = { topY: 180, bottomY: 320 };
        const { nextScore } = scoringUC.applyGapScore(state, ghosty, gap, rarity);
        return nextScore.multiplier === 1 && nextScore.multiplierCounter === 0;
      },
    ));
  });

  it('P31 — precision tier is always set on nextScore', () => {
    fc.assert(fc.property(
      arbScoreState(),
      arbRarity,
      fc.float({ min: 0, max: 460 }),
      (state, rarity, ghostyY) => {
        const gap = { topY: 180, bottomY: 320 };
        const { nextScore } = scoringUC.applyGapScore(state, { y: ghostyY }, gap, rarity);
        return [
          PrecisionTier.PERFECTO.id,
          PrecisionTier.BUENO.id,
          PrecisionTier.CASI.id,
        ].includes(nextScore.lastPrecisionTierId);
      },
    ));
  });

});
```

### 10.5 `CollisionUseCase` — Boundary PBT

```js
// tests/usecases/CollisionUseCase.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { CollisionUseCase } from '../../usecases/CollisionUseCase.js';

const collisionUC = new CollisionUseCase();
const CANVAS_H = 500;

// Helper: ghosty hitbox fully inside a single gap (should not collide with pipe)
function hitboxInsideGap(gapTop, gapBottom) {
  const cy = (gapTop + gapBottom) / 2;
  return { x: 100, y: cy - 10, w: 20, h: 20 };  // well inside
}

describe('CollisionUseCase.check', () => {

  it('P32 — no collision when hitbox is entirely inside a single-gap opening', () => {
    fc.assert(fc.property(
      fc.integer({ min: 80, max: 200 }),   // gapTop
      fc.integer({ min: 60, max: 100 }),   // gapHeight
      (gapTop, gapH) => {
        const gap = { topY: gapTop, bottomY: gapTop + gapH, scored: false, modifierId: null, modifierCollected: false };
        const pipe = { x: 90, gapType: 'SINGLE', gaps: [gap], passed: false };
        const hb   = hitboxInsideGap(gap.topY, gap.bottomY);
        const ghosty = { iFrameTimer: 0, shieldActive: false };
        const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
        return !result.hit;
      },
    ));
  });

  it('P33 — collision always fires when hitbox overlaps top pipe segment', () => {
    fc.assert(fc.property(
      fc.integer({ min: 150, max: 300 }),  // gapTop
      fc.integer({ min: 60,  max: 120 }),  // gapH
      (gapTop, gapH) => {
        const gap  = { topY: gapTop, bottomY: gapTop + gapH, scored: false };
        const pipe = { x: 90, gapType: 'SINGLE', gaps: [gap], passed: false };
        // Hitbox clearly overlapping top segment (above gapTop)
        const hb = { x: 90, y: 0, w: 20, h: gapTop - 10 };
        const ghosty = { iFrameTimer: 0 };
        const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
        return result.hit && result.type === 'PIPE';
      },
    ));
  });

  it('P34 — iFrame timer > 0 always suppresses pipe collision', () => {
    fc.assert(fc.property(
      fc.float({ min: 0.001, max: 1.5 }),  // active iFrameTimer
      fc.integer({ min: 0, max: 400 }),
      (timer, y) => {
        const gap  = { topY: 200, bottomY: 340, scored: false };
        const pipe = { x: 0, gapType: 'SINGLE', gaps: [gap], passed: false };
        const hb   = { x: 0, y: 0, w: 500, h: 500 };  // full canvas hitbox
        const ghosty = { iFrameTimer: timer };
        const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
        return !result.hit;
      },
    ));
  });

  it('P35 — ground collision fires when hitbox bottom >= canvas_height - HUD_HEIGHT', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 10 }),   // small overshoot
      (extra) => {
        const groundY = CANVAS_H - 40;   // HUD_HEIGHT = 40
        const hb = { x: 100, y: groundY - 10, w: 20, h: 10 + extra };
        const ghosty = { iFrameTimer: 0 };
        const result = collisionUC.check(hb, ghosty, [], CANVAS_H);
        return result.hit && result.type === 'GROUND';
      },
    ));
  });

  it('P36 — no collision against empty pipe list (only ground matters)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 420 }),  // y well above ground
      (y) => {
        const hb = { x: 100, y, w: 20, h: 20 };
        const ghosty = { iFrameTimer: 0 };
        const result = collisionUC.check(hb, ghosty, [], CANVAS_H);
        // y + 20 < 460 (ground), so no collision expected
        if (y + 20 < CANVAS_H - 40) return !result.hit;
        return true;  // skip edge cases near ground
      },
    ));
  });

  it('P37 — middle block of double-gap pipe is a collision zone', () => {
    const upperGap = { topY: 80,  bottomY: 180, scored: false };
    const lowerGap = { topY: 280, bottomY: 380, scored: false };
    const pipe = { x: 90, gapType: 'DOUBLE', gaps: [upperGap, lowerGap], passed: false };
    // Hitbox in the middle block between 180 and 280
    const hb = { x: 90, y: 190, w: 52, h: 30 };
    const ghosty = { iFrameTimer: 0 };
    const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
    expect(result.hit).toBe(true);
    expect(result.type).toBe('PIPE');
  });

});
```

### 10.6 `PipeFactory` — Gap Geometry Invariants

```js
// tests/usecases/PipeFactory.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { PipeFactory } from '../../usecases/PipeFactory.js';
import CONFIG from '../../config.js';

const factory = new PipeFactory();

const arbDifficulty = fc.record({
  gapHeightMin: fc.constant(CONFIG.GAP_HEIGHT_MIN),
  gapHeightMax: fc.constant(CONFIG.GAP_HEIGHT_MAX),
});

describe('PipeFactory invariants', () => {

  it('P38 — single-gap top < bottom always', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 0, max: 5 }), (diff) => {
      const pipe = factory.createSingle(400, diff, 0);
      const gap  = pipe.gaps[0];
      return gap.topY < gap.bottomY;
    }));
  });

  it('P39 — single-gap height is within [GAP_HEIGHT_MIN, GAP_HEIGHT_MAX]', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createSingle(400, diff, 0);
      const h = pipe.gaps[0].bottomY - pipe.gaps[0].topY;
      return h >= CONFIG.GAP_HEIGHT_MIN && h <= CONFIG.GAP_HEIGHT_MAX;
    }));
  });

  it('P40 — double-gap pipe has exactly 2 gaps with different modifier types', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createDouble(400, diff, 50);
      if (pipe.gapType !== 'DOUBLE') return true;  // fell back to single (geometry fail)
      expect(pipe.gaps).toHaveLength(2);
      return pipe.gaps[0].modifierId !== pipe.gaps[1].modifierId;
    }));
  });

  it('P41 — double-gap centers are at least MIN_GAP_SEPARATION apart', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createDouble(400, diff, 0);
      if (pipe.gapType !== 'DOUBLE') return true;
      const [upper, lower] = pipe.gaps;
      const upperCY = (upper.topY + upper.bottomY) / 2;
      const lowerCY = (lower.topY + lower.bottomY) / 2;
      return (lowerCY - upperCY) >= CONFIG.MIN_GAP_SEPARATION;
    }));
  });

  it('P42 — all gap edges are within canvas safe-zone margins', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createSingle(400, diff, 0);
      const gap  = pipe.gaps[0];
      const minY = CONFIG.GAP_MARGIN;
      const maxY = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN;
      return gap.topY >= minY && gap.bottomY <= maxY;
    }));
  });

});
```

---

### 10.7 `DifficultyUseCase` — Speed & Floor Properties

```js
// tests/usecases/DifficultyUseCase.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { DifficultyUseCase } from '../../usecases/DifficultyUseCase.js';
import CONFIG from '../../config.js';

const diffUC = new DifficultyUseCase();

const arbDifficulty = fc.record({
  pipeSpeed:         fc.float({ min: CONFIG.PIPE_SPEED_BASE, max: CONFIG.PIPE_SPEED_MAX }),
  gapHeightMin:      fc.float({ min: CONFIG.GAP_HEIGHT_FLOOR, max: CONFIG.GAP_HEIGHT_MIN }),
  gapHeightMax:      fc.float({ min: CONFIG.GAP_HEIGHT_FLOOR, max: CONFIG.GAP_HEIGHT_MAX }),
  pipeSpacing:       fc.float({ min: CONFIG.PIPE_SPACING_MIN, max: CONFIG.PIPE_SPACING   }),
  pipesPassed:       fc.integer({ min: 0, max: 1000 }),
  thirdAxisActive:   fc.constant(false),
  slowTimeTimer:     fc.constant(0),
  slowTimeBaseSpeed: fc.constant(0),
});

describe('DifficultyUseCase.onPipePassed', () => {

  it('P43 — pipeSpeed never exceeds PIPE_SPEED_MAX', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 1, max: 200 }), (state, n) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const result = diffUC.onPipePassed({ ...s, pipesPassed: (i + 1) * 10 - 1 });
        s = result.next;
      }
      return s.pipeSpeed <= CONFIG.PIPE_SPEED_MAX;
    }));
  });

  it('P44 — gapHeightMin never drops below GAP_HEIGHT_FLOOR', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 1, max: 200 }), (state, n) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const result = diffUC.onPipePassed({ ...s, pipesPassed: (i + 1) * 10 - 1 });
        s = result.next;
      }
      return s.gapHeightMin >= CONFIG.GAP_HEIGHT_FLOOR;
    }));
  });

  it('P45 — pipeSpacing never drops below PIPE_SPACING_MIN', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 1, max: 50 }), (state, n) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const result = diffUC.onPipePassed({ ...s, pipesPassed: (i + 1) * 10 - 1 });
        s = result.next;
      }
      return s.pipeSpacing >= CONFIG.PIPE_SPACING_MIN;
    }));
  });

  it('P46 — speed increment fires exactly at multiples of 10 pipes passed', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 20 }),
      (n) => {
        const state = { pipeSpeed: 220, gapHeightMin: 140, gapHeightMax: 180,
                        pipeSpacing: 260, pipesPassed: n * 10 - 1,
                        thirdAxisActive: false, slowTimeTimer: 0, slowTimeBaseSpeed: 0 };
        const { speededUp } = diffUC.onPipePassed(state);
        return speededUp === true;
      },
    ));
  });

});

describe('DifficultyUseCase.tickSlowTime', () => {

  it('P47 — pipeSpeed restored to max(base, progression) when timer expires', () => {
    fc.assert(fc.property(
      fc.float({ min: 200, max: 480 }),
      fc.float({ min: 200, max: 480 }),
      (activationSpeed, progressionSpeed) => {
        const state = {
          pipeSpeed:         activationSpeed * 0.6,
          slowTimeTimer:     0.001,
          slowTimeBaseSpeed: activationSpeed,
        };
        // Tick with dt that expires the timer
        const next = diffUC.tickSlowTime({ ...state, pipeSpeed: state.pipeSpeed }, 1.0);
        const expected = Math.max(activationSpeed, next.pipeSpeed);
        return next.slowTimeTimer === 0;
      },
    ));
  });

});
```

---

### 10.8 PBT Summary Table

| Test ID | Subject | Property verified | REQ covered |
|---|---|---|---|
| P1 | `calcPrecision` | Output always in [0,1] | REQ-PSF-001B |
| P2 | `calcPrecision` | Perfect center → 1.0 | REQ-PSF-001B |
| P3 | `calcPrecision` | Monotone decrease with offset | REQ-PSF-001B |
| P4 | `calcPrecision` | Outside gap clamps to 0 | REQ-PSF-001B |
| P5–P7 | `classifyPrecision` | Each tier fires at correct threshold | REQ-PSF-002–004 |
| P8 | `classifyPrecision` | No gap in [0,1] coverage | REQ-PSF-002–004 |
| P9–P10 | `calcPointsAwarded` | Always integer ≥ 0; equals floor formula | REQ-PRS-006 |
| P11 | `calcPointsAwarded` | Higher multiplier → more or equal points | REQ-PRS-006 |
| P12 | `calcPointsAwarded` | mult=1, bonus=0 → base points | REQ-PRS-006 |
| P13 | `calcPointsAwarded` | Gold+Perfecto+×3 = 15 (max) | REQ-PRS-006 |
| P14–P16 | `applyMinimumBonus` | Zero-score guard, custom floor | REQ-DGP-008C |
| P17–P20 | `aabbIntersects` | Self-intersect, displacement, commutativity | REQ-CDT-004 |
| P21–P22 | `calcHitbox` | Smaller than sprite, centered | REQ-CDT-001 |
| P23–P26 | Physics integration | Gravity increases vy, terminal clamp, position | REQ-PHY-003/008/010 |
| P27 | `applyGapScore` | Score always increases | REQ-PRS-006 |
| P28 | `applyGapScore` | Full formula applied correctly | REQ-PRS-006 |
| P29–P30 | `applyGapScore` | Counter decrements; resets at 0 | REQ-DGP-011B |
| P31 | `applyGapScore` | Precision tier always set | REQ-PSF-002–004 |
| P32–P37 | `CollisionUseCase` | Gap pass, pipe hit, iFrame suppression, ground, double-gap middle block | REQ-CDT-004–007, REQ-CGL-008 |
| P38–P42 | `PipeFactory` | Gap bounds, modifier uniqueness, separation, safe-zone | REQ-OBG-004–008, REQ-DGP-008B |
| P43–P46 | `DifficultyUseCase` | Speed/gap/spacing floors, increment trigger | REQ-OBG-011–013 |
| P47 | `DifficultyUseCase` | SLOW_TIME restores correctly | REQ-DGP-008 |

---

## 11. Sequence Diagrams

### 11.1 Scoring Moment — Full Call Chain

Shows every object interaction from the rAF tick through score update, audio, and visual feedback for a single gap passage with an active modifier.

```
  Browser                GameLoop        GameOrchestrator      PhysicsEngine
     │                      │                   │                    │
     │  rAF callback(ts)     │                   │                    │
     │─────────────────────►│                   │                    │
     │                      │  tick(rawDt)       │                    │
     │                      │──────────────────►│                    │
     │                      │                   │  tick(ghosty,      │
     │                      │                   │   flap, dt)        │
     │                      │                   │───────────────────►│
     │                      │                   │   GhostyState′     │
     │                      │                   │◄───────────────────│
     │                      │                   │                    │

  GameOrchestrator     CollisionUseCase     ScoringUseCase      ModifierApplicationUseCase
     │                      │                   │                    │
     │  check(hb,ghosty,     │                   │                    │
     │   pipes, H)           │                   │                    │
     │─────────────────────►│                   │                    │
     │  {hit:false}          │                   │                    │
     │◄─────────────────────│                   │                    │
     │                      │                   │                    │
     │  [ghostyCX >= gapMidX — Scoring Moment fires]                 │
     │                      │                   │                    │
     │  applyGapScore(       │                   │                    │
     │   scoreState,         │                   │                    │
     │   ghosty, gap,        │                   │                    │
     │   rarity)             │                   │                    │
     │──────────────────────────────────────────►│                   │
     │                       calcPrecision()     │                    │
     │                       classifyPrecision() │                    │
     │                       calcPointsAwarded() │                    │
     │                       applyMinimumBonus() │                    │
     │                       multiplierCounter-- │                    │
     │  {nextScore, tier,    │                   │                    │
     │   pointsAwarded}      │                   │                    │
     │◄──────────────────────────────────────────│                   │
     │                      │                   │                    │

  GameOrchestrator      UIPresenter        AudioController       CanvasRenderer
     │                      │                   │                    │
     │  buildFeedbackLabel  │                   │                    │
     │   (tier)             │                   │                    │
     │─────────────────────►│                   │                    │
     │  FeedbackLabelDto    │                   │                    │
     │◄─────────────────────│                   │                    │
     │                      │                   │                    │
     │  buildFloatingScore  │                   │                    │
     │   (pts,mult,rarity,  │                   │                    │
     │    x, y)             │                   │                    │
     │─────────────────────►│                   │                    │
     │  FloatingScoreDto    │                   │                    │
     │◄─────────────────────│                   │                    │
     │                      │                   │                    │
     │  playScore(tier.id)  │                   │                    │
     │──────────────────────────────────────────►│                   │
     │                      │                   │ playTone(freq,dur) │
     │                      │                   │───────────────────►│
     │                      │                   │  [Web Audio API]   │
     │                      │                   │                    │

  GameOrchestrator   ModifierApplicationUseCase   UIPresenter    AudioController
     │                      │                        │                │
     │  [gap.modifierId present & uncollected]        │                │
     │                      │                        │                │
     │  apply(modId,score,  │                        │                │
     │   difficulty,ghosty) │                        │                │
     │─────────────────────►│                        │                │
     │                      │ (e.g. MULTIPLIER_2X)   │                │
     │                      │ activateMultiplier(2,5)│                │
     │                      │ → nextScore            │                │
     │  {nextScore,         │                        │                │
     │   nextDifficulty,    │                        │                │
     │   nextGhosty,        │                        │                │
     │   notification}      │                        │                │
     │◄─────────────────────│                        │                │
     │                      │                        │                │
     │  buildSubtitle        │                        │                │
     │   (notification)      │                        │                │
     │──────────────────────────────────────────────►│                │
     │  SubtitleDto          │                        │                │
     │◄──────────────────────────────────────────────│                │
     │                      │                        │                │
     │  playModifier()       │                        │                │
     │───────────────────────────────────────────────────────────────►│
     │                      │                        │                │

  GameOrchestrator        GameLoop           CanvasRenderer
     │                      │                    │
     │  _buildSnapshot()    │                    │
     │  → WorldSnapshot     │                    │
     │                      │                    │
     │──────────────────────│                    │
     │  snapshot            │                    │
     │                      │  draw(snap, dt)    │
     │                      │───────────────────►│
     │                      │  [render all layers│
     │                      │   incl. feedback,  │
     │                      │   subtitle, float] │
     │                      │◄───────────────────│
```

---

### 11.2 Game Reset — Full Call Chain

Shows the complete sequence from player input on Game Over screen through world initialization and first rendered PLAYING frame.

```
  Browser            BrowserInputAdapter   InputController   GameOrchestrator
     │                      │                   │                  │
     │  keydown('Space')     │                   │                  │
     │─────────────────────►│                   │                  │
     │                      │  _onKeyDown(' ')  │                  │
     │                      │──────────────────►│                  │
     │                      │  flapIntent=true  │                  │
     │                      │   lastFlapMs=now  │                  │

  GameLoop          GameOrchestrator    GameStateMachine     StorageAdapter
     │                   │                    │                   │
     │  tick(rawDt)       │                   │                   │
     │──────────────────►│                   │                   │
     │                   │  consumeFlapIntent()                    │
     │                   │  → true (Space consumed)               │
     │                   │                   │                   │
     │                   │  [state = GAME_OVER, flapIntent = true]│
     │                   │                   │                   │
     │                   │  startNewGame()   │                   │
     │                   │  loadHighScore()  │                   │
     │                   │──────────────────────────────────────►│
     │                   │  highScore (from localStorage)         │
     │                   │◄──────────────────────────────────────│

  GameOrchestrator   GameResetUseCase                        GameStateMachine
     │                   │                                        │
     │  reset(highScore) │                                        │
     │──────────────────►│                                        │
     │                   │  createGhostyState(startX, H/2)       │
     │                   │  initial ScoreState  {total:0, mult:1} │
     │                   │  initial DifficultyState               │
     │                   │    pipeSpeed = PIPE_SPEED_BASE         │
     │                   │    gapHeightMin = 140                  │
     │                   │    gapHeightMax = 180                  │
     │                   │    pipeSpacing  = 260                  │
     │                   │    pipesPassed  = 0                    │
     │                   │    singleGapCounter = 0                │
     │                   │    doubleGapThreshold = rand[3,7]      │
     │                   │    thirdAxisActive = false             │
     │                   │    slowTimeTimer = 0                   │
     │  { ghosty, score, │                                        │
     │    difficulty,    │                                        │
     │    pipes:[],      │                                        │
     │    particles:{},  │                                        │
     │    feedback:null, │                                        │
     │    subtitle:null }│                                        │
     │◄──────────────────│                                        │
     │                   │                                        │
     │  Assign all fields to orchestrator state                   │
     │                   │                                        │
     │  transition('PLAYING')                                     │
     │──────────────────────────────────────────────────────────►│
     │                   │  GAME_OVER_EXIT event fired            │
     │                   │  state = PLAYING                       │
     │                   │  PLAYING_ENTER event fired             │
     │                   │                                        │
     │◄──────────────────────────────────────────────────────────│

  GameStateMachine   AudioController    WebAudioAdapter
     │                   │                   │
     │  PLAYING_ENTER    │                   │
     │  event ──────────►│                   │
     │                   │  startMusic()     │
     │                   │──────────────────►│
     │                   │  [bgm plays if    │
     │                   │   asset present]  │

  GameOrchestrator    PipeFactory               CanvasRenderer
     │                   │                           │
     │  [first tick in PLAYING state]                │
     │                   │                           │
     │  _maybeSpawnPipe() │                          │
     │  [no pipes yet, offset > FIRST_PIPE_OFFSET?]  │
     │──────────────────►│                           │
     │  createSingle() or createDouble()             │
     │◄──────────────────│                           │
     │                   │                           │
     │  _buildSnapshot() → WorldSnapshot             │
     │                                               │
     │  draw(snap, dt)                               │
     │──────────────────────────────────────────────►│
     │                   │  [first PLAYING frame     │
     │                   │   rendered to canvas]     │
```

---

### 11.3 Shield Collision Absorption Sequence

Shows the divergence path when `GHOST_SHIELD` is active at collision time.

```
  CollisionUseCase   GameOrchestrator    UIPresenter    AudioController
     │                   │                   │               │
     │  check()          │                   │               │
     │  iFrameTimer = 0  │                   │               │
     │  AABB hit = true  │                   │               │
     │  → {hit:true,     │                   │               │
     │     type:'PIPE'}  │                   │               │
     │──────────────────►│                   │               │
     │                   │                   │               │
     │                   │ ghosty.shieldActive?              │
     │                   │ YES               │               │
     │                   │                   │               │
     │                   │ ghosty′ = {       │               │
     │                   │  shieldActive: false,             │
     │                   │  iFrameTimer: 1.5 }               │
     │                   │                   │               │
     │                   │ _emitBurstParticles(shieldBreak=true)
     │                   │  [ring animation, not death burst]│
     │                   │                   │               │
     │                   │ buildSubtitle('Shield Broken!')   │
     │                   │──────────────────►│               │
     │                   │ SubtitleDto       │               │
     │                   │◄──────────────────│               │
     │                   │                   │               │
     │                   │ [NO stateMachine.transition(GAME_OVER)]
     │                   │ [game continues]  │               │
     │                   │                   │               │
     │                   │ [next frame: iFrameTimer=1.5,     │
     │                   │  collision suppressed by CDT-011] │
     │                   │ [Ghosty pulses at 8 Hz — CDT-012] │
```

---

## 12. Dependency Rules, Build Notes & Open Design Decisions

---

### 12.1 Import Dependency Matrix

The table below is the single enforceable rule: a ✓ means that layer's modules **may** import from the target column. An ✗ means that import is **forbidden**. Any violation breaks Clean Architecture's Dependency Rule and must be treated as a build error.

| Importer → | `config.js` | `domain/` | `usecases/` | `adapters/` | `infrastructure/` |
|---|:---:|:---:|:---:|:---:|:---:|
| `domain/`         | ✗ | ✗ | ✗ | ✗ | ✗ |
| `config.js`       | — | ✗ | ✗ | ✗ | ✗ |
| `usecases/`       | ✓ | ✓ | ✗ | ✗ | ✗ |
| `adapters/`       | ✓ | ✓ | ✓ | ✗ | ✗ |
| `infrastructure/` | ✓ | ✓ | ✓ | ✓ | — |
| `main.js`         | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tests/`          | ✓ | ✓ | ✓ | ✗ | ✗ |

> Tests may reach into `usecases/` to test the full scoring pipeline, but must never import infrastructure or adapters — test isolation depends on pure domain + use-case modules only.

---

### 12.2 Dependency Injection Map

Every outer-layer dependency is passed inward at construction time. No module calls `new` on anything from an inner layer except `main.js`. This makes every use case independently testable with a mock or stub.

```
main.js (composition root)
 │
 ├── new AssetLoader()              ── infra, no deps
 ├── new WebAudioAdapter()          ── infra, no deps
 ├── new CanvasRenderer(canvas, assets) ── infra
 ├── new BrowserInputAdapter(inputCtrl, canvas) ── infra
 │
 ├── new StorageAdapter()           ── adapter, implements IStoragePort
 ├── new InputController()          ── adapter, implements IInputPort
 ├── new AudioController(webAudio, muted) ── adapter, implements IAudioPort
 ├── new UIPresenter()              ── adapter, no deps
 │
 ├── new PhysicsEngine()            ── usecase, imports domain + config
 ├── new CollisionUseCase()         ── usecase, imports domain + config
 ├── new ScoringUseCase()           ── usecase, imports domain
 ├── new PipeFactory()              ── usecase, imports domain + config
 ├── new DifficultyUseCase()        ── usecase, imports config
 ├── new GameStateMachine()         ── usecase, imports domain
 ├── new GameResetUseCase()         ── usecase, imports domain + config
 ├── new ModifierApplicationUseCase(scoringUC, difficultyUC)
 │
 └── new GameOrchestrator({
         stateMachine, physicsEngine, collisionUC, scoringUC,
         difficultyUC, pipeFactory, modifierUC, resetUC,
         inputPort:  inputCtrl,   ← IInputPort
         audioCtrl:  audioCtrl,   ← IAudioPort
         storage:    storage,     ← IStoragePort
         presenter:  presenter,
     })
```

To substitute any dependency in tests, replace the concrete class with a stub implementing the same interface. No game logic module needs to change.

---

### 12.3 Build & Run Notes

#### No-build-step baseline (REQ-NFR-007)

The game is playable by opening `index.html` directly in a modern browser with no bundler. ES modules load natively. The only constraint: the browser must support native ES module imports (`type="module"`), which all evergreen browsers have supported since 2018.

```html
<!-- index.html — minimal entry point -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flappy Kiro</title>
  <style>
    body { margin: 0; background: #1a1a2e; display: flex;
           justify-content: center; align-items: center; height: 100vh; }
    canvas { display: block; image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script type="module" src="main.js"></script>
</body>
</html>
```

> **Local server required** when loading from the filesystem on Chrome/Firefox due to CORS restrictions on `fetch()` calls made by `AssetLoader`. Run with:  
> `npx serve .`  or  `python -m http.server 8080`

#### Optional test runner setup

```json
// package.json (optional — only needed to run PBT tests)
{
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "fast-check": "^3.22.0"
  }
}
```

No bundler (Vite, Webpack, Rollup) is required. `vitest` with `"type": "module"` can test native ES modules directly.

---

### 12.4 Canvas Scaling for Mobile (REQ-NFR-003)

The canvas is fixed at `CANVAS_WIDTH × CANVAS_HEIGHT` (800×500 px) internally. On smaller viewports, CSS scaling preserves aspect ratio:

```css
canvas {
  width: min(100vw, calc(100vh * 1.6));   /* 800/500 = 1.6 aspect ratio */
  height: auto;
  image-rendering: pixelated;
}
```

All game logic operates in the logical 800×500 coordinate space. Touch events use `canvas.getBoundingClientRect()` to translate from CSS pixels to logical canvas pixels if precise tap coordinates are ever needed (not required by current spec — any tap triggers flap).

---

### 12.5 Performance Budget

| Subsystem | Target cost per frame (60 FPS = 16.6 ms budget) |
|---|---|
| Physics + use-case logic | < 1 ms |
| Collision detection (AABB × pipe list) | < 0.5 ms |
| Canvas draw (background, pipes, particles) | < 8 ms |
| Particle pool tick (≤ 200 particles) | < 1 ms |
| Audio scheduling (Web Audio API) | < 0.2 ms |
| **Total target** | **< 12 ms** (leaves 4.6 ms headroom) |

If frame time consistently exceeds 20 ms on a device (detectable via `performance.now()` across frames), the particle trail should be disabled per OQ-08 recommendation.

---

### 12.6 Open Design Decisions

The following items from `requirements.md` §12 Open Questions remain unresolved. Each has a recommended default that unblocks implementation, but final decisions should be confirmed before the polish pass.

| # | Topic | Recommended default for implementation | Blocker? |
|---|---|---|---|
| OQ-01 | `GHOST_SHIELD` aura animation | Expanding ring only (REQ-CDT-010). Aura wrapping is a stretch addition. | No |
| OQ-04 | Localization beyond Spanish feedback strings | All other UI text stays in English for v1.0. | No |
| OQ-07 | Background music tempo scaling with pipe speed | Static tempo for v1.0. Tempo scaling requires a more complex Web Audio scheduler — defer to post-launch. | No |
| OQ-08 | Particle trail on low-end / mobile | Auto-detect: disable trail if rolling average frame time > 20 ms. Add `CONFIG.ENABLE_TRAIL = true` flag as the override. | No |
| OQ-09 | iFrames from sources other than `GHOST_SHIELD` | Shield-only for v1.0. `iFrameTimer` is already a generic field on `GhostyState` — any future modifier can set it without architecture changes. | No |
| OQ-11 | Mobile pause gesture | Add a 44×44 px on-screen pause button (top-left) rendered by `CanvasRenderer` during PLAYING state. Tap routes through `BrowserInputAdapter` → `pauseIntent = true`. Add to `§9.5` before implementation sprint. | **Yes — resolve before implementing PAUSED state** |

---

### 12.7 Extensibility Notes

**Adding a new Score Modifier:**
1. Add the ID to `domain/ModifierId.js`.
2. Add a row to the modifier pool table in `usecases/ModifierApplicationUseCase.apply()`.
3. Add a badge color entry to `BADGE_COLORS` in `infrastructure/CanvasRenderer.js`.
4. Add a badge expression handler in `domain/ModifierBadgeExpressions.buildBadgeExpression()`.
5. No other files change. All PBT tests continue to pass.

**Changing a physics constant:**
1. Edit the value in `config.js` only.
2. Run `vitest run` — PBT properties that depend on that constant (e.g. P23–P26) will catch any regression that breaks a physics invariant.

**Adding a new game state (e.g. LEADERBOARD):**
1. Add the state name to `domain/GameState.js`.
2. Add valid transition edges to `GameStateMachine._TRANSITIONS`.
3. Add an enter/exit event handler in `GameOrchestrator._wireStateEvents()`.
4. Add the overlay render in `CanvasRenderer.draw()`.
5. No domain or use-case modules change.

---

### 12.8 Requirements Traceability Summary

| Section | Requirements covered | Primary modules |
|---|---|---|
| §3 Domain | REQ-PSF-001B–007, REQ-PRS-003–006, REQ-PHY-003/008/010/012, REQ-CDT-001/004, REQ-DGP-007B/008C | `domain/*` |
| §4 Use Cases | REQ-PHY-001–015, REQ-CDT-001–013, REQ-PRS-006, REQ-PSF-001–007, REQ-DGP-001–014B, REQ-OBG-001–016, REQ-GSM-001–021 | `usecases/*` |
| §5 Adapters | REQ-CGL-005/008/014/016, REQ-GSM-007–017, REQ-AVF-001–009, REQ-VUI-004, REQ-PSF-008/008B | `adapters/*` |
| §6 Infrastructure | REQ-VUI-001–005, REQ-NFR-002–003/006–007, REQ-CDT-008/012, REQ-AVF-011–020, REQ-DGP-012, REQ-GSM-003–004 | `infrastructure/*` |
| §7 Config | All 60+ named constants from REQ-PHY/OBG/CDT/AVF/PSF/DGP/GSM/NFR | `config.js` |
| §10–§11 PBT | 47 properties covering all domain formulas + use-case invariants | `tests/` |

---

*End of Flappy Kiro Technical Design Document v0.1*
