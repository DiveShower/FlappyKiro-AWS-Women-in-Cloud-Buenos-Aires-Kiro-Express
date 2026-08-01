# Flappy Kiro — Implementation Task Plan
**Based on:** `design.md` v0.1 · `requirements.md` v0.3  
**Architecture:** Clean Architecture (Domain → Use Cases → Adapters → Infrastructure)  
**Date:** 2026-07-31  
**OQ-11 resolution:** Mobile pause via dedicated 44×44 px on-screen button (top-left, PLAYING state)

---

## How to Read This Document

- Tasks are grouped into **Milestones** that map to Clean Architecture layers.  
- Each task has a unique ID (`T-XXX`), a **depends on** field, and a list of files to create or modify.  
- **REQ** citations trace back to `requirements.md` v0.3.  
- **Design ref** citations trace back to `design.md` sections.  
- Status column values: `[ ]` pending · `[~]` in progress · `[x]` complete.  
- Complete tasks strictly in dependency order — inner layers before outer layers.

---

## Milestone Index

| Milestone | Scope | Tasks |
|---|---|---|
| M0 | Project scaffold & config | T-001 – T-003 |
| M1 | Domain / Entities (Layer 1) | T-010 – T-022 |
| M2 | Use Cases / Application (Layer 2) | T-030 – T-042 |
| M3 | Interface Adapters (Layer 3) | T-050 – T-057 |
| M4 | Infrastructure / Presentation (Layer 4) | T-060 – T-069 |
| M5 | Integration & wiring | T-070 – T-074 |
| M6 | Property-based tests | T-080 – T-087 |
| M7 | Polish, edge cases & mobile | T-090 – T-097 |
| M8 | Final verification | T-100 – T-103 |

---

---

## M0 — Project Scaffold & Configuration

> Establish the folder structure, entry-point HTML, and the single source-of-truth constants file. Nothing else can start until this milestone is complete.

---

### T-001 — Create project directory structure

**Status:** `[ ]`  
**Depends on:** nothing  
**Design ref:** §8 (File Tree)  
**REQ:** REQ-NFR-007

**Description:**  
Create all empty directories and placeholder files so the import graph is valid from day one.

**Files to create:**
```
index.html                (entry point — see T-003)
config.js                 (constants — see T-002)
main.js                   (composition root — see T-070)
domain/                   (empty — populated in M1)
usecases/
usecases/ports/
adapters/
infrastructure/
assets/                   (ghosty.png, jump.wav, game_over.wav already present)
tests/
tests/domain/
tests/usecases/
```

**Acceptance criteria:**
- `index.html` opens in browser without JS errors (even before any game code).
- All directories exist.

---

### T-002 — Implement `config.js` (centralized constants)

**Status:** `[ ]`  
**Depends on:** T-001  
**Design ref:** §7  
**REQ:** REQ-PHY-002/004/007/009, REQ-OBG-000/002, REQ-CDT-001, REQ-NFR-006, REQ-VUI-001, REQ-GSM-018/020, REQ-PSF-008/008B, REQ-AVF-017, REQ-DGP-012, all physics constants

**Description:**  
Write the complete, frozen `config.js` as specified in `design.md §7`. Every named constant referenced across all layers must be defined here and only here.

**File to create:** `config.js`

**Key constant groups to implement (all in one `Object.freeze({})`):**
- Canvas: `CANVAS_WIDTH`, `CANVAS_HEIGHT`
- Geometry: `HUD_HEIGHT = 40`, `PIPE_WIDTH = 52`, `GHOSTY_SPRITE_W/H`, `GHOSTY_START_X`
- Hitbox: `HITBOX_SCALE_X = 0.55`, `HITBOX_SCALE_Y = 0.60`
- Physics: `DT_CAP = 0.033`, `GRAVITY = 1800`, `FLAP_VELOCITY = 520`, `TERMINAL_VELOCITY = 700`, `TILT_FACTOR = 0.13`, `TILT_MIN/MAX_DEG`, `ROTATION_LERP = 0.18`
- Input: `FLAP_DEBOUNCE_MS = 80`
- Pipes: `PIPE_SPACING = 260`, `FIRST_PIPE_OFFSET = 350`, `GAP_HEIGHT_MIN/MAX`, `GAP_HEIGHT_FLOOR = 110`, `GAP_MARGIN = 60`, `MIN_GAP_SEPARATION = 160`, `PIPE_SPEED_BASE = 220`, `PIPE_SPEED_MAX = 480`, `SPEED_INCREMENT = 12`
- Difficulty progression: `GAP_STEP_REDUCTION = 4`, `PIPE_SPACING_MIN = 180`, `SPACING_STEP_REDUCTION = 6`, `THIRD_AXIS_*`, `PIPE_DRIFT_*`
- Double-Gap: `DOUBLE_GAP_THRESHOLD_MIN/MAX = 3/7`
- Modifiers: `MODIFIER_MIN_BONUS = 5`, `MULTIPLIER_2X/3X_DURATION`, `SLOW_TIME_DURATION = 4.0`, `SLOW_TIME_REDUCTION = 0.40`
- Collision: `SHAKE_DURATION/PEAK/REGEN_FRAMES`, `BURST_MIN/MAX_PARTICLES`, `BURST_LIFE_MIN/MAX`, `IFRAMES_DURATION = 1.5`, `IFRAME_BLINK_HZ = 8`
- Particles: `TRAIL_POOL_MAX = 150`, `BURST_POOL_MAX = 50`, all trail properties, `SHIELD_TRAIL_FREQ = 4`
- Precision: `PRECISION_PERFECTO = 0.75`, `PRECISION_BUENO = 0.35`
- UI timings: `FEEDBACK_Y = 20`, `FEEDBACK_HOLD/FADE`, `SUBTITLE_*`, `FLOAT_*`, `BADGE_*`, `IDLE_BOB_*`
- Rarity weights: `RARITY_GREEN_THRESHOLD = 0.65`, `RARITY_PURPLE_THRESHOLD = 0.90`
- State: `GAME_OVER_DELAY = 0.8`, `LS_HIGH_SCORE`, `LS_MUTED`
- Mobile pause button: `PAUSE_BTN_X = 10`, `PAUSE_BTN_Y = 10`, `PAUSE_BTN_SIZE = 44`

**Acceptance criteria:**
- `import CONFIG from './config.js'` works in browser console with no errors.
- `Object.isFrozen(CONFIG)` returns `true`.
- All constants listed above are present and have correct default values.

---

### T-003 — Implement `index.html`

**Status:** `[ ]`  
**Depends on:** T-001  
**Design ref:** §12.3  
**REQ:** REQ-NFR-007, REQ-NFR-003

**Description:**  
Write the minimal HTML entry point with canvas element, mobile viewport meta tag, CSS scaling, and module script tag.

**File to create:** `index.html`

**Must include:**
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<canvas id="gameCanvas">` element
- CSS: `body` centered flexbox on `#1a1a2e`, canvas with `image-rendering: pixelated`
- CSS scaling rule: `width: min(100vw, calc(100vh * 1.6)); height: auto;`
- `<script type="module" src="main.js"></script>`

**Acceptance criteria:**
- Page opens with dark background, centered canvas, no console errors.
- Canvas scales correctly at 320px viewport width (mobile) and 1920px (desktop).

---

---

## M1 — Domain / Entities (Layer 1)

> Pure data types and pure functions. Zero imports per module (except sibling domain files for enum references). All modules in this milestone must be completable and testable without a browser.

---

### T-010 — Implement domain enumerations

**Status:** `[ ]`  
**Depends on:** T-002  
**Design ref:** §3.1  
**REQ:** REQ-GSM-001, REQ-PRS-001–005, REQ-PSF-002–007, REQ-DGP-008

**Files to create:**
- `domain/GameState.js` — `LOADING`, `MAIN_MENU`, `PLAYING`, `PAUSED`, `GAME_OVER`
- `domain/PipeRarity.js` — `GREEN / PURPLE / GOLD` with `basePoints` and `spawnWeight`
- `domain/PrecisionTier.js` — `PERFECTO / BUENO / CASI` with `label`, `color`, `bonus`
- `domain/ModifierId.js` — all 6 modifier ID strings

**Acceptance criteria:**
- `GameState.PLAYING` equals `'PLAYING'`.
- `PipeRarity.GOLD.basePoints === 3`.
- `PrecisionTier.PERFECTO.bonus === 2`.
- `Object.isFrozen(GameState)` returns `true` for all enums.

---

### T-011 — Implement `GhostyState` entity

**Status:** `[ ]`  
**Depends on:** T-010  
**Design ref:** §3.2  
**REQ:** REQ-PHY-003–015, REQ-CDT-001, REQ-CDT-011/012

**File to create:** `domain/GhostyState.js`

**Must include:**
- `createGhostyState(overrides)` factory returning frozen object
- Fields: `x`, `y`, `velocityY`, `rotation`, `iFrameTimer`, `shieldActive`
- All fields have sensible defaults when not provided in overrides

**Acceptance criteria:**
- `createGhostyState()` returns an object with all 6 fields.
- Returned object is frozen (`Object.isFrozen` = `true`).
- `createGhostyState({ y: 100 }).y === 100`.

---

### T-012 — Implement `Gap`, `Pipe`, `ScoreState`, `DifficultyState`, `ParticleState`, `NotificationState` entities

**Status:** `[ ]`  
**Depends on:** T-010  
**Design ref:** §3.3–3.8  
**REQ:** REQ-DGP-004, REQ-OBG-007, REQ-PRS-006, REQ-DGP-011B, REQ-OBG-009, REQ-AVF-013, REQ-PSF-008/008B

**Files to create:**
- `domain/Gap.js` — typedef JSDoc + `gapCenterY(gap)` + `gapHeight(gap)` pure helpers
- `domain/Pipe.js` — typedef JSDoc (SINGLE/DOUBLE, gaps array, rarity, x, passed, driftPhase)
- `domain/ScoreState.js` — typedef JSDoc (total, highScore, multiplier, multiplierCounter, lastModifierId, lastPrecisionTierId)
- `domain/DifficultyState.js` — typedef JSDoc (all 10 fields from design §3.6)
- `domain/ParticleState.js` — typedef JSDoc (x, y, vx, vy, radius, maxRadius, life, maxLife, color, pool)
- `domain/NotificationState.js` — typedef JSDoc (text, color, timer, fadeTimer, visible)

**Acceptance criteria:**
- `gapCenterY({ topY: 100, bottomY: 200 }) === 150`.
- `gapHeight({ topY: 100, bottomY: 240 }) === 140`.
- All typedef files import-clean (no runtime errors on import).

---

### T-013 — Implement `PrecisionRules.js` pure functions

**Status:** `[ ]`  
**Depends on:** T-010, T-012  
**Design ref:** §3.9  
**REQ:** REQ-PSF-001B, REQ-PSF-002–004

**File to create:** `domain/PrecisionRules.js`

**Must implement:**
- `calcPrecision(ghostyCenterY, gapCenterY, gapHeight)` → `[0, 1]`  
  Formula: `clamp(1 - |ghostyCY - gapCY| / (gapH / 2), 0, 1)`
- `classifyPrecision(precision)` → `PrecisionTier`  
  `≥ 0.75` → PERFECTO, `≥ 0.35` → BUENO, `< 0.35` → CASI

**Acceptance criteria:**
- `calcPrecision(250, 250, 140) === 1` (perfect center).
- `calcPrecision(250, 180, 140) < 1` (off center).
- `calcPrecision(0, 500, 140) === 0` (outside gap clamps to 0, not negative).
- `classifyPrecision(1.0).id === 'PERFECTO'`.
- `classifyPrecision(0.5).id === 'BUENO'`.
- `classifyPrecision(0.1).id === 'CASI'`.

---

### T-014 — Implement `ScoreFormula.js` pure functions

**Status:** `[ ]`  
**Depends on:** T-010  
**Design ref:** §3.9  
**REQ:** REQ-PRS-006, REQ-DGP-008C

**File to create:** `domain/ScoreFormula.js`

**Must implement:**
- `calcPointsAwarded(basePoints, precisionBonus, multiplier)` → integer  
  Formula: `Math.floor((basePoints + precisionBonus) * multiplier)`
- `applyMinimumBonus(rawDelta, MIN_BONUS = 5)` → integer  
  Returns `rawDelta` if `> 0`, else `MIN_BONUS`

**Acceptance criteria:**
- `calcPointsAwarded(3, 2, 3) === 15` (Gold + Perfecto + ×3).
- `calcPointsAwarded(1, 0, 1) === 1` (Green + Casi + no multiplier).
- `calcPointsAwarded(2, 1, 2) === 6` (Purple + Bueno + ×2).
- `applyMinimumBonus(0) === 5`.
- `applyMinimumBonus(-10) === 5`.
- `applyMinimumBonus(8) === 8`.

---

### T-015 — Implement `PhysicsFormulas.js` pure functions

**Status:** `[ ]`  
**Depends on:** T-002  
**Design ref:** §3.9  
**REQ:** REQ-PHY-003/008/010/012/013, REQ-CDT-001/004

**File to create:** `domain/PhysicsFormulas.js`

**Must implement:**
- `integrateGravity(velocityY, gravity, dt)` → `velocityY + gravity * dt`
- `clampToTerminal(velocityY, terminalVelocity)` → `Math.min(velocityY, terminalVelocity)`
- `integratePosition(positionY, velocityY, dt)` → `positionY + velocityY * dt`
- `calcTargetRotation(velocityY, tiltFactor)` → clamped to `[-25, 90]`
- `lerpRotation(current, target, smoothing)` → `current + (target - current) * smoothing`
- `calcHitbox(x, y, spriteW, spriteH, scaleX, scaleY)` → `{x, y, w, h}` centered
- `aabbIntersects(a, b)` → boolean AABB test

**Acceptance criteria:**
- `integrateGravity(0, 1800, 0.033) ≈ 59.4`.
- `clampToTerminal(800, 700) === 700`.
- `clampToTerminal(300, 700) === 300`.
- `calcHitbox(100, 200, 34, 34, 0.55, 0.60)` center equals `{x:100, y:200}`.
- `aabbIntersects({x:0,y:0,w:10,h:10}, {x:5,y:5,w:10,h:10}) === true`.
- `aabbIntersects({x:0,y:0,w:10,h:10}, {x:20,y:0,w:10,h:10}) === false`.

---

### T-016 — Implement `ModifierBadgeExpressions.js` pure function

**Status:** `[ ]`  
**Depends on:** T-010  
**Design ref:** §3.9  
**REQ:** REQ-DGP-007B, REQ-DGP-008C

**File to create:** `domain/ModifierBadgeExpressions.js`

**Must implement:**
- `buildBadgeExpression(modifierId, currentScore, pipeBasePoints, MIN_BONUS = 5)` → string
- Handles all 6 modifier IDs per the expression table in design §3.9
- `SCORE_DOUBLE` at S=0 → `'+5'`; at S=17 → `'17 × 2'`
- `GHOST_SHIELD` → `'Shield'`; `SLOW_TIME` → `'Slow'`

**Acceptance criteria:**
- `buildBadgeExpression('SCORE_DOUBLE', 20, 1)` returns `'20 × 2'`.
- `buildBadgeExpression('SCORE_DOUBLE', 0, 1)` returns `'+5'`.
- `buildBadgeExpression('GHOST_SHIELD', 100, 2)` returns `'Shield'`.
- `buildBadgeExpression('MULTIPLIER_3X', 50, 3)` returns `'3 × 3'`.

---

---

## M2 — Use Cases / Application (Layer 2)

> Business logic modules. Import only from `domain/` and `config.js`. Each class receives dependencies via constructor injection and is independently testable without a browser.

---

### T-030 — Implement port interfaces

**Status:** `[ ]`  
**Depends on:** T-010  
**Design ref:** §4.1  
**REQ:** REQ-GSM-018/020, REQ-AVF-001–009, REQ-CGL-005/016

**Files to create:**
- `usecases/ports/IStoragePort.js` — `loadHighScore()`, `saveHighScore(n)`, `loadMuteState()`, `saveMuteState(b)`
- `usecases/ports/IAudioPort.js` — `playFlap()`, `playGameOver()`, `playScore(tier)`, `playModifier()`, `startMusic()`, `pauseMusic()`, `stopMusic()`
- `usecases/ports/IInputPort.js` — `consumeFlapIntent()`, `consumePauseIntent()`, `consumeMuteIntent()`

**Acceptance criteria:**
- All three classes can be imported with no errors.
- Calling any method on a base class instance throws `'not implemented'`.

---

### T-031 — Implement `PhysicsEngine`

**Status:** `[ ]`  
**Depends on:** T-015, T-011, T-002  
**Design ref:** §4.2  
**REQ:** REQ-PHY-001–015, REQ-CGL-006

**File to create:** `usecases/PhysicsEngine.js`

**Must implement:**
- `tick(state, flapPressed, dt)` → new frozen `GhostyState`
  - Apply flap (replace velocity, not add)
  - Integrate gravity
  - Clamp to terminal velocity
  - Integrate position
  - Ceiling clamp (y=0, vy=0)
  - Calculate target rotation; lerp current rotation toward target
  - Decrement `iFrameTimer` by dt (floor at 0)
- `getHitbox(state)` → `{x, y, w, h}` AABB

**Acceptance criteria:**
- Flap sets `velocityY` to exactly `-FLAP_VELOCITY` regardless of prior velocity.
- Gravity integration increases `velocityY` each tick with positive dt.
- `velocityY` never exceeds `TERMINAL_VELOCITY`.
- At ceiling (y=0): position clamped, `velocityY === 0`.
- `getHitbox` returns a rect centered on `state.x, state.y` with correct scaled dimensions.

---

### T-032 — Implement `CollisionUseCase`

**Status:** `[ ]`  
**Depends on:** T-015, T-012, T-002  
**Design ref:** §4.3  
**REQ:** REQ-CDT-001–007, REQ-CGL-007/008

**File to create:** `usecases/CollisionUseCase.js`

**Must implement:**
- `check(ghostyHitbox, ghosty, pipes, canvasHeight)` → `{hit: boolean, type: 'PIPE'|'GROUND'|null}`
- Returns `{hit: false}` immediately when `ghosty.iFrameTimer > 0` (REQ-CDT-011)
- Ground check: `hitbox.y + hitbox.h >= canvasHeight - HUD_HEIGHT`
- Pipe AABB test against all active segments via `_pipeRects(pipe, canvasH)`
- `_pipeRects` generates top/bottom for SINGLE; top/middle/bottom for DOUBLE

**Acceptance criteria:**
- Returns `{hit:false}` when `iFrameTimer > 0`, even if hitbox overlaps pipe.
- Returns `{hit:true, type:'GROUND'}` when bottom of hitbox >= ground boundary.
- Returns `{hit:true, type:'PIPE'}` when hitbox overlaps top pipe segment.
- Returns `{hit:false}` when hitbox is cleanly inside the gap opening.
- Middle block of DOUBLE pipe triggers `type:'PIPE'`.

---

### T-033 — Implement `ScoringUseCase`

**Status:** `[ ]`  
**Depends on:** T-013, T-014, T-012  
**Design ref:** §4.4  
**REQ:** REQ-PRS-006, REQ-PSF-001/001B, REQ-DGP-011B, REQ-DGP-008C

**File to create:** `usecases/ScoringUseCase.js`

**Must implement:**
- `applyGapScore(scoreState, ghosty, gap, rarity)` → `{nextScore, tier, pointsAwarded}`
  - `calcPrecision` → `classifyPrecision` → `calcPointsAwarded` → `applyMinimumBonus`
  - Decrement `multiplierCounter`; reset `multiplier → 1` when counter hits 0
  - Return new frozen `ScoreState` with updated `total`, `multiplierCounter`, `multiplier`, `lastPrecisionTierId`
- `applyBonusFlat(scoreState)` — `max(5, round(S × (0.9 + rand * 0.2)))`
- `applyScoreDouble(scoreState)` — `total += max(5, total)`
- `activateMultiplier(scoreState, multiplierValue, duration)` — overwrite any active multiplier

**Acceptance criteria:**
- `applyGapScore` at perfect center with Gold pipe + no multiplier returns `pointsAwarded ≥ 3`.
- `applyGapScore` with `multiplierCounter = 1` sets `nextScore.multiplier === 1` and `multiplierCounter === 0`.
- `applyScoreDouble({total:0})` sets `total === 5` (minimum bonus).
- `applyScoreDouble({total:20})` sets `total === 40`.
- `activateMultiplier` overwrites existing multiplier and resets counter.

---

### T-034 — Implement `PipeFactory`

**Status:** `[ ]`  
**Depends on:** T-012, T-016, T-002  
**Design ref:** §4.5  
**REQ:** REQ-PRS-001, REQ-OBG-004–008, REQ-DGP-007/008B, REQ-DGP-004/005

**File to create:** `usecases/PipeFactory.js`

**Must implement:**
- `_pickRarity()` — weighted: < 0.65 GREEN, < 0.90 PURPLE, else GOLD
- `_pickGapHeight(difficulty)` — uniform random in `[gapHeightMin, gapHeightMax]`
- `_pickGapCenterY(gapH)` — uniform random in safe bounds (REQ-OBG-007 formula)
- `_pickModifierPair()` — without replacement from 6-item pool (REQ-DGP-008B)
- `createSingle(x, difficulty, currentScore)` → frozen `Pipe` (SINGLE, 1 gap, no modifier)
- `createDouble(x, difficulty, currentScore)` → frozen `Pipe` (DOUBLE, 2 gaps, 2 modifiers)
  - Enforce `MIN_GAP_SEPARATION` (REQ-OBG-008)
  - Fall back to `createSingle` if geometry constraints cannot be satisfied
  - Call `buildBadgeExpression` for each gap and store result in `gap.badgeExpression`

**Acceptance criteria:**
- `createSingle` always produces `gapType === 'SINGLE'` with exactly 1 gap.
- Gap height is in `[GAP_HEIGHT_MIN, GAP_HEIGHT_MAX]`.
- Gap top/bottom are within canvas safe-zone margins.
- `createDouble` produces two gaps with **different** `modifierId` values.
- Double-gap lower center is at least `MIN_GAP_SEPARATION` px below upper center.
- `_pickModifierPair()` never returns two identical IDs.

---

### T-035 — Implement `DifficultyUseCase`

**Status:** `[ ]`  
**Depends on:** T-002  
**Design ref:** §4.6  
**REQ:** REQ-OBG-011–016, REQ-DGP-008 (SLOW_TIME row)

**File to create:** `usecases/DifficultyUseCase.js`

**Must implement:**
- `onPipePassed(state)` → `{next: DifficultyState, speededUp: boolean}`
  - Increment `pipesPassed`
  - Every 10 pipes: `pipeSpeed += SPEED_INCREMENT` (capped at `PIPE_SPEED_MAX`)
  - Reduce `gapHeightMin/Max` by `GAP_STEP_REDUCTION` (floor at `GAP_HEIGHT_FLOOR`)
  - Reduce `pipeSpacing` by `SPACING_STEP_REDUCTION` (floor at `PIPE_SPACING_MIN`)
  - Activate third axis when both floors hit (REQ-OBG-016)
- `activateSlowTime(state)` → new `DifficultyState` with speed × 0.6, timer set
- `tickSlowTime(state, dt)` → decremented timer; restore speed on expiry  
  Restore to `max(slowTimeBaseSpeed, current progression speed)` (REQ-DGP-008)

**Acceptance criteria:**
- `pipeSpeed` never exceeds `PIPE_SPEED_MAX` after any number of calls.
- `gapHeightMin` never drops below `GAP_HEIGHT_FLOOR`.
- `pipeSpacing` never drops below `PIPE_SPACING_MIN`.
- `speededUp === true` exactly at pipe counts 10, 20, 30…
- `activateSlowTime` reduces `pipeSpeed` by 40%.
- `tickSlowTime` with dt > timer restores speed and sets `slowTimeTimer === 0`.

---

### T-036 — Implement `ModifierApplicationUseCase`

**Status:** `[ ]`  
**Depends on:** T-033, T-035, T-011  
**Design ref:** §4.7  
**REQ:** REQ-DGP-008/009/011, REQ-DGP-008C

**File to create:** `usecases/ModifierApplicationUseCase.js`

**Constructor:** `(scoringUC, difficultyUC)`

**Must implement:**
- `apply(modifierId, scoreState, difficultyState, ghosty)` → `{nextScore, nextDifficulty, nextGhosty, notification}`
- Routes each `ModifierId` to the correct downstream use-case method
- `MULTIPLIER_2X` → `activateMultiplier(score, 2, 5)`
- `MULTIPLIER_3X` → `activateMultiplier(score, 3, 3)`
- `BONUS_FLAT` → `applyBonusFlat(score)`
- `SCORE_DOUBLE` → `applyScoreDouble(score)`
- `GHOST_SHIELD` → sets `ghosty.shieldActive = true`
- `SLOW_TIME` → `activateSlowTime(difficulty)`
- Sets `nextScore.lastModifierId` in all cases

**Acceptance criteria:**
- `MULTIPLIER_2X` sets `nextScore.multiplier === 2` and `multiplierCounter === 5`.
- `GHOST_SHIELD` sets `nextGhosty.shieldActive === true`; score unchanged.
- `SLOW_TIME` reduces `nextDifficulty.pipeSpeed` by 40%.
- `notification` string is always the `modifierId` string.

---

### T-037 — Implement `GameStateMachine`

**Status:** `[ ]`  
**Depends on:** T-010  
**Design ref:** §4.8  
**REQ:** REQ-GSM-001/002

**File to create:** `usecases/GameStateMachine.js`

**Must implement:**
- `constructor()` — starts in `LOADING`
- `get current()` — returns current state string
- `on(event, fn)` — subscribe to `'STATE_ENTER'` / `'STATE_EXIT'` events
- `transition(to)` — validates against allowed transition table; emits exit then enter events; returns `boolean`
- Transition table (from design §4.8):
  - `LOADING → MAIN_MENU`
  - `MAIN_MENU → PLAYING`
  - `PLAYING → PAUSED, GAME_OVER`
  - `PAUSED → PLAYING`
  - `GAME_OVER → MAIN_MENU, PLAYING`

**Acceptance criteria:**
- `transition('MAIN_MENU')` from `LOADING` → returns `true`, state becomes `'MAIN_MENU'`.
- `transition('PLAYING')` from `LOADING` → returns `false`, state unchanged.
- `PLAYING_ENTER` event fires when transitioning into PLAYING.
- `PLAYING_EXIT` event fires when transitioning out of PLAYING.
- Invalid transition produces a `console.warn` and returns `false`.

---

### T-038 — Implement `GameResetUseCase`

**Status:** `[ ]`  
**Depends on:** T-011, T-002  
**Design ref:** §4.9  
**REQ:** REQ-GSM-021

**File to create:** `usecases/GameResetUseCase.js`

**Must implement:**
- `reset(highScore)` → `{ ghosty, score, difficulty, pipes, particles, feedback, subtitle }`
- All 21 variables from the reset table in REQ-GSM-021 initialized to their specified values
- `doubleGapThreshold` selected randomly from `[DOUBLE_GAP_THRESHOLD_MIN, DOUBLE_GAP_THRESHOLD_MAX]`
- `pipes`, `particles`, `feedback`, `subtitle` all reset to empty/null

**Acceptance criteria:**
- `reset(50).score.total === 0`.
- `reset(50).score.highScore === 50` (preserved).
- `reset(50).difficulty.pipeSpeed === CONFIG.PIPE_SPEED_BASE`.
- `reset(50).difficulty.thirdAxisActive === false`.
- `reset(50).ghosty.shieldActive === false`.
- `reset(50).pipes` is an empty array.
- `doubleGapThreshold` is in `[3, 7]` inclusive.

---

---

## M3 — Interface Adapters (Layer 3)

> Translate between domain/use-case types and the outside world. No Canvas API, no Web Audio API.

---

### T-050 — Implement `StorageAdapter`

**Status:** `[ ]`  
**Depends on:** T-030  
**Design ref:** §5.3  
**REQ:** REQ-GSM-018/019/020

**File to create:** `adapters/StorageAdapter.js`

**Must implement:** `IStoragePort` using `localStorage`  
- `loadHighScore()` → `parseInt(localStorage.getItem(LS_HIGH_SCORE) ?? '0', 10)`
- `saveHighScore(n)` → `localStorage.setItem(LS_HIGH_SCORE, String(n))`
- `loadMuteState()` → `localStorage.getItem(LS_MUTED) === 'true'`
- `saveMuteState(b)` → `localStorage.setItem(LS_MUTED, String(b))`

**Acceptance criteria:**
- Round-trip: `saveHighScore(42); loadHighScore() === 42`.
- `loadHighScore()` returns `0` when key is absent.
- `loadMuteState()` returns `false` when key is absent.

---

### T-051 — Implement `InputController`

**Status:** `[ ]`  
**Depends on:** T-030, T-002  
**Design ref:** §5.1  
**REQ:** REQ-CGL-005/016, REQ-GSM-010, REQ-NFR-003

**File to create:** `adapters/InputController.js`

**Must implement:** `IInputPort` with 80 ms debounce  
- `_onKeyDown(key)` — handles `' '`/`'ArrowUp'` (flap), `'Escape'`/`'p'`/`'P'` (pause), `'m'`/`'M'` (mute)
- `_onTouch()` — sets flap intent with 80 ms debounce
- `consumeFlapIntent()`, `consumePauseIntent()`, `consumeMuteIntent()` — read + clear pattern
- `_lastFlapMs` tracking prevents rapid-fire double-registration

**Acceptance criteria:**
- Two `_onKeyDown(' ')` calls < 80 ms apart only set `flapIntent` once.
- `consumeFlapIntent()` returns `true` then `false` on consecutive calls.
- Escape sets `pauseIntent`; M sets `muteIntent`.
- Touch event sets `flapIntent` with same debounce.

---

### T-052 — Implement `AudioController`

**Status:** `[ ]`  
**Depends on:** T-030  
**Design ref:** §5.2  
**REQ:** REQ-AVF-001–009, REQ-CGL-016

**File to create:** `adapters/AudioController.js`

**Constructor:** `(webAudio, muted: boolean)`

**Must implement:** `IAudioPort`  
- All play methods silently skip when `_muted === true`
- `pauseMusic()` and `stopMusic()` are unconditional (mute doesn't block them)
- `setMuted(bool)` / `isMuted()` accessors
- `SCORE_TONES` map: PERFECTO=1046 Hz, BUENO=784 Hz, CASI=523 Hz (square wave, 0.10s)

**Acceptance criteria:**
- `playFlap()` on muted controller calls nothing on `webAudio`.
- `stopMusic()` on muted controller still calls `webAudio.stopMusic()`.
- Tone frequencies match spec for each precision tier.

---

### T-053 — Implement `UIPresenter`

**Status:** `[ ]`  
**Depends on:** T-010, T-012  
**Design ref:** §5.4  
**REQ:** REQ-VUI-004, REQ-PSF-008/008B, REQ-AVF-016–020, REQ-DGP-013

**File to create:** `adapters/UIPresenter.js`

**Must implement:**
- `buildHUD(score, difficulty, pipes)` → `HUDDto` with `score`, `highScore`, `gapType`, `modifier`, `precisionText`
- `buildFeedbackLabel(tier)` → `FeedbackLabelDto` with `y = CONFIG.FEEDBACK_Y (20)`, `holdTime = 1.2`, `fadeTime = 0.4`
- `buildSubtitle(text)` → `SubtitleDto` with cyan color, `timer = 1.2`
- `buildFloatingScore(points, multiplier, rarity, x, y)` → `FloatingScoreDto`  
  - Appends ` ×N` suffix when `multiplier > 1`
  - Color matches rarity tier: GREEN=`#00CC44`, PURPLE=`#9966FF`, GOLD=`#FFB800`

**Acceptance criteria:**
- `buildHUD` with `multiplier = 2` → `modifier === '×2'`.
- `buildHUD` with no active multiplier and `lastModifierId = 'SLOW_TIME'` → `modifier === 'SLOW_TIME'`.
- `buildFeedbackLabel(PrecisionTier.PERFECTO).y === 20`.
- `buildFloatingScore(6, 2, PipeRarity.GREEN, 0, 0).text === '6 ×2'`.
- `buildFloatingScore(3, 1, PipeRarity.GOLD, 0, 0).text === '3'` (no suffix at ×1).

---

### T-054 — Implement `GameOrchestrator` — state wiring and reset

**Status:** `[ ]`  
**Depends on:** T-037, T-038, T-050, T-051, T-052, T-053  
**Design ref:** §5.5  
**REQ:** REQ-GSM-006/016/017, REQ-GSM-021, REQ-CGL-014

**File to create:** `adapters/GameOrchestrator.js` (partial — state management only)

**Implement in this task:**
- Constructor receiving all injected dependencies
- `startNewGame()` — loads high score, calls `resetUC.reset()`, assigns all fields, calls `stateMachine.transition('PLAYING')`
- `_wireStateEvents()` — music start/pause/stop wired to state machine events
- `_buildSnapshot()` — returns full `WorldSnapshot` from current orchestrator state
- Stub out `tick(rawDt)` with switch on `stateMachine.current` (leave `_tickPlaying` empty for T-055)

**Acceptance criteria:**
- `startNewGame()` sets `this.score.total === 0`.
- `startNewGame()` transitions state machine to `'PLAYING'`.
- `_buildSnapshot()` returns an object with all required snapshot fields.

---

### T-055 — Implement `GameOrchestrator` — full playing tick loop

**Status:** `[ ]`  
**Depends on:** T-054, T-031, T-032, T-033, T-034, T-035, T-036  
**Design ref:** §5.5  
**REQ:** REQ-GSM-007–009, REQ-CGL-003–008, REQ-PSF-001, REQ-DGP-009/014B

**Implement in this task (add to existing `GameOrchestrator.js`):**
- `tick(rawDt)` with `dt = Math.min(rawDt / 1000, CONFIG.DT_CAP)`
- `_tickPlaying(dt)`:
  1. Consume input intents (flap / pause / mute)
  2. Physics tick
  3. Collision check → `_handleCollision()` if hit
  4. `_scrollPipes(dt)` — move all pipe x positions
  5. `_checkScoringMoments()` — detect Scoring Moment per gap, call scoring + modifier
  6. `DifficultyUseCase.tickSlowTime(dt)`
  7. `_maybeSpawnPipe()` — spawn when last pipe is far enough left
  8. `_recyclePipes()` — remove pipes scrolled off-screen
  9. `_tickParticles(dt)` — advance all trail and burst particles
  10. `_tickFeedback(dt)` / `_tickFloats(dt)` / `_tickScreenShake(dt)` — UI element timers
  11. `_emitTrailParticles()` — spawn 2–3 trail particles per frame
- `_handleCollision(type)`:
  - Shield active → absorb, set `iFrameTimer`, `shieldActive=false`, emit shield burst, build subtitle
  - Otherwise → save high score, trigger screen shake, emit burst, play game over, transition to GAME_OVER
- `_checkScoringMoments()` — per gap: check `ghostyCX >= gapMidX`; call `_applyScoringMoment`
- `_applyScoringMoment(pipe, gap, ghostyHitbox)` — scoring + modifier + feedback + float + audio
- `_tickPaused()` — poll pause/mute intents only

**Acceptance criteria:**
- Score increases after Ghosty passes a pipe gap.
- Game transitions to `GAME_OVER` on pipe collision (no shield).
- Shield absorbs one collision and sets `iFrameTimer > 0`.
- `_maybeSpawnPipe` creates new pipe when last pipe x < canvas_width - pipeSpacing.
- Pipes with right edge < -PIPE_WIDTH are removed from the array.
- `dt` is always capped at `CONFIG.DT_CAP`.

---

### T-056 — Implement `GameOrchestrator` — particle systems

**Status:** `[ ]`  
**Depends on:** T-055, T-002  
**Design ref:** §5.5  
**REQ:** REQ-AVF-013/014/015, REQ-CDT-009/010, REQ-NFR-006

**Implement in this task (add to existing `GameOrchestrator.js`):**
- `_emitTrailParticles()`:
  - Spawn 2–3 particles/frame from Ghosty's trailing edge
  - Leftward bias `CONFIG.TRAIL_VX_BIAS`, random spread `±TRAIL_VX/VY_SPREAD`
  - Color: white normally; oscillates at `SHIELD_TRAIL_FREQ` Hz when shield active (REQ-AVF-014)
  - Respect `TRAIL_POOL_MAX = 150`; cull oldest trail particle if exceeded
- `_emitBurstParticles(isShieldBreak)`:
  - 12–16 particles with random outward velocities
  - Shield break: ring expansion variant (different velocity profile)
  - Respect `BURST_POOL_MAX = 50`
- `_tickParticles(dt)`:
  - Advance `x += vx*dt`, `y += vy*dt`, `life -= dt`, `radius = maxRadius * (life/maxLife)`
  - Remove dead particles (life ≤ 0)
- Stop emitting trail on GAME_OVER (REQ-AVF-015)

**Acceptance criteria:**
- Trail pool never exceeds 150 particles.
- Burst pool never exceeds 50 particles.
- Particles are removed when `life <= 0`.
- No new trail particles emitted after GAME_OVER transition.
- Shield active → trail color alternates between blue-white values.

---

### T-057 — Implement pause button state tracking in orchestrator

**Status:** `[ ]`  
**Depends on:** T-055  
**Design ref:** §12.6 (OQ-11 resolution)  
**REQ:** REQ-GSM-010–013, resolved OQ-11

**Implement in this task (add to `GameOrchestrator.js`):**
- Track `pauseButtonRect = { x: CONFIG.PAUSE_BTN_X, y: CONFIG.PAUSE_BTN_Y, w: CONFIG.PAUSE_BTN_SIZE, h: CONFIG.PAUSE_BTN_SIZE }`
- `isPauseButtonHit(tapX, tapY)` — point-in-rect test for mobile tap coordinates
- Expose `pauseButtonRect` in `_buildSnapshot()` so renderer can draw it

**Note:** The `BrowserInputAdapter` (T-062) will call `isPauseButtonHit` on touch events during PLAYING state.

**Acceptance criteria:**
- `isPauseButtonHit(10, 10) === true` (top-left corner).
- `isPauseButtonHit(200, 200) === false`.
- `WorldSnapshot.pauseButtonRect` is present.

---

---

## M4 — Infrastructure / Presentation (Layer 4)

> All browser API usage lives here. Receives pure data from the orchestrator; produces pixels and sound.

---

### T-060 — Implement `AssetLoader`

**Status:** `[ ]`  
**Depends on:** T-001  
**Design ref:** §6.4  
**REQ:** REQ-GSM-003/004, REQ-AVF-006

**File to create:** `infrastructure/AssetLoader.js`

**Must implement:**
- `load()` → `{ ghostyImg, audioBuffers }` — never rejects
- `_loadImage(src)` — returns `HTMLImageElement` or procedural fallback (34×34 white circle on offscreen canvas)
- `_loadAudio(src)` → `ArrayBuffer` or null on failure
- BGM: try `bgm.ogg` first, fall back to `bgm.mp3`, fall back to null (REQ-AVF-006 — silent skip)

**Acceptance criteria:**
- `load()` resolves even when all assets are missing.
- `ghostyImg` is always non-null (fallback is used if `ghosty.png` missing).
- `audioBuffers.bgm` is null when neither bgm file is present.
- No unhandled promise rejections.

---

### T-061 — Implement `WebAudioAdapter`

**Status:** `[ ]`  
**Depends on:** T-060  
**Design ref:** §6.2  
**REQ:** REQ-AVF-001–009

**File to create:** `infrastructure/WebAudioAdapter.js`

**Must implement:**
- `_ensureCtx()` — lazy `AudioContext` creation; resumes if suspended
- `loadAssets(audioBuffers)` — decode ArrayBuffers into `AudioBuffer`s
- `playSfx(name)` — play `jump` or `game_over` buffer
- `playTone({freq, dur, wave})` — synthesize short tone via oscillator + gain envelope
- `startMusic()` — loop bgm buffer if present; no-op if absent
- `pauseMusic()` — suspend `AudioContext`
- `stopMusic()` — stop and release music node

**Acceptance criteria:**
- `playTone` does not throw when called before `loadAssets`.
- `startMusic()` with no bgm buffer is a silent no-op.
- `stopMusic()` after no `startMusic` call does not throw.
- Two calls to `startMusic()` don't stack duplicate music nodes.

---

### T-062 — Implement `BrowserInputAdapter`

**Status:** `[ ]`  
**Depends on:** T-051  
**Design ref:** §6.3  
**REQ:** REQ-NFR-003, REQ-CGL-005/016, REQ-GSM-010, resolved OQ-11

**File to create:** `infrastructure/BrowserInputAdapter.js`

**Constructor:** `(inputCtrl, canvas, orchestrator)`

**Must implement:**
- `keydown` listener on `window` → `inputCtrl._onKeyDown(e.key)`; `e.preventDefault()` for Space/ArrowUp
- `touchstart` on canvas (passive: false) → check if tap hits pause button via `orchestrator.isPauseButtonHit(logicalX, logicalY)`:
  - If yes → `inputCtrl._onKeyDown('Escape')` (routes to pause intent)
  - If no → `inputCtrl._onTouch()` (routes to flap)
- `mousedown` on canvas → `inputCtrl._onTouch()`
- Logical coordinate calculation: `(touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width)`

**Acceptance criteria:**
- Tap inside pause button area sets `pauseIntent`, not `flapIntent`.
- Tap outside pause button area sets `flapIntent`.
- Space key sets `flapIntent`.
- Escape key sets `pauseIntent`.
- M key sets `muteIntent`.

---

### T-063 — Implement `CanvasRenderer` — setup and background

**Status:** `[ ]`  
**Depends on:** T-002  
**Design ref:** §6.1  
**REQ:** REQ-VUI-001/002

**File to create:** `infrastructure/CanvasRenderer.js` (partial)

**Implement in this task:**
- Constructor: `(canvas, assets)` — store `ctx`, `_canvas`, `_assets`, `_cloudX = 0`
- `draw(snap, dt)` — master draw method skeleton with `ctx.save()` / `ctx.restore()`
- Screen shake transform: apply `offset = peak * (1 - elapsed/dur) * randomUnitVec` when `snap.screenShake` present; re-sample direction every 2 frames
- `_drawBackground(ctx, W, H, dt)` — sky blue fill `#AEE0F0`; update `_cloudX` at ~30% pipe speed
- `_renderClouds(ctx, offsetX, W, H)` — 4 fixed-seed ellipse clouds with horizontal wrap

**Acceptance criteria:**
- Canvas is filled with `#AEE0F0` each frame.
- Clouds scroll leftward and wrap seamlessly.
- Screen shake translates ctx origin, not pipe/ghosty positions.

---

### T-064 — Implement `CanvasRenderer` — pipes and modifier badges

**Status:** `[ ]`  
**Depends on:** T-063  
**Design ref:** §6.1  
**REQ:** REQ-PRS-002, REQ-VUI-005, REQ-DGP-012

**Implement in this task (add to `CanvasRenderer.js`):**
- `_drawPipes(ctx, pipes, canvasH)` — iterate pipes, dispatch to `_drawPipePair`
- `_drawPipePair(ctx, pipe, colors, canvasH)` — draw top/bottom (SINGLE) or top/mid/bottom (DOUBLE)
- `_drawSegment(ctx, x, y, w, h, colors, face)` — body rect + cap block (12 px cap, 8 px wider)
- `PIPE_COLORS` map: GREEN/PURPLE/GOLD body + cap hex values
- `_drawModifierBadges(ctx, pipes, dt)`:
  - Skip if `modifierCollected`
  - 28×28 px rounded-rect badge centered in gap with `±4 px` sine bob at 1 Hz
  - Z-order: above pipes, below Ghosty
  - Distinct `BADGE_COLORS` per modifier type

**Acceptance criteria:**
- Green/Purple/Gold pipes render with visually distinct colors.
- Pipe cap appears on the gap-facing edge of every segment.
- Badge bobs vertically; stops rendering when `modifierCollected`.
- Middle segment of DOUBLE pipe has caps on both faces.

---

### T-065 — Implement `CanvasRenderer` — Ghosty and particles

**Status:** `[ ]`  
**Depends on:** T-064  
**Design ref:** §6.1  
**REQ:** REQ-VUI-003, REQ-CDT-012, REQ-AVF-013/014

**Implement in this task (add to `CanvasRenderer.js`):**
- `_drawGhosty(ctx, ghosty)`:
  - Skip every other 62.5 ms frame when `iFrameTimer > 0` (8 Hz blink)
  - `ctx.translate + ctx.rotate(rotation * π/180)` + `ctx.drawImage(ghostyImg, -W/2, -H/2, W, H)`
- `_drawParticles(ctx, particles)`:
  - Per particle: `alpha = life/maxLife`, `r = radius * alpha`
  - `ctx.globalAlpha = alpha`, `ctx.fillStyle = p.color`, circle arc at `(p.x, p.y)`

**Acceptance criteria:**
- Ghosty rotates nose-up on ascent, nose-down on fall.
- Ghosty blinks (appears/disappears) when `iFrameTimer > 0`.
- Particles fade out as `life` decreases.
- Trail particles render behind Ghosty; burst particles render in front of pipes.

---

### T-066 — Implement `CanvasRenderer` — UI text layers

**Status:** `[ ]`  
**Depends on:** T-065  
**Design ref:** §6.1  
**REQ:** REQ-PSF-008/008B/009/011, REQ-AVF-016–020, REQ-VUI-004

**Implement in this task (add to `CanvasRenderer.js`):**
- `_drawFeedbackLabel(ctx, fb, W)`:
  - `y = fb.y (20 px)`, centered, bold 42 px font
  - Alpha = 1 during hold, lerp to 0 during `fadeTimer`
  - Stroke + fill for legibility over busy backgrounds
- `_drawSubtitle(ctx, sub, fb, W)`:
  - Positioned `feedback_label_bottom + 8 px`
  - Cyan `#00FFFF`, bold 18 px
- `_drawFloatingScores(ctx, floats)`:
  - Fade alpha during last `FLOAT_FADE` seconds
  - Color from `RARITY_COLORS` map
- `_drawHUD(ctx, score, difficulty, pipes, W, H)`:
  - 40 px bar, `rgba(0,0,0,0.65)`, white 11 px text
  - Format: `Score: N | High: N | Gaps: X | Mod: X | TIER`
- `_drawMuteButton(ctx, W)` — top-right corner icon

**Acceptance criteria:**
- Feedback label appears at y=20, horizontally centered.
- Subtitle appears below feedback label, never overlaps it.
- Floating score fades out correctly over `FLOAT_FADE` duration.
- HUD bar is always visible at bottom of canvas.

---

### T-067 — Implement `CanvasRenderer` — state overlays and pause button

**Status:** `[ ]`  
**Depends on:** T-066  
**Design ref:** §6.1, §12.6  
**REQ:** REQ-GSM-005/011/015, REQ-CGL-001, resolved OQ-11

**Implement in this task (add to `CanvasRenderer.js`):**
- `_drawPauseOverlay(ctx, W, H)` — semi-transparent dark overlay, "PAUSED" + resume prompt
- `_drawMainMenu(ctx, snap, W, H)` — title "FLAPPY KIRO", idle bobbing Ghosty, best score, play prompt
- `_drawGameOverScreen(ctx, snap, W, H)` — "GAME OVER", score, best, optional "NEW BEST!" badge, restart/menu prompts
- `_drawPauseButton(ctx, snap)` — render 44×44 px pause icon (⏸ or `‖`) at `PAUSE_BTN_X/Y` during PLAYING state only; visible on mobile

**Acceptance criteria:**
- Pause overlay renders only in PAUSED state.
- Main menu shows "Best: 0" on first run.
- Game Over screen shows "NEW BEST!" only when `score.total >= score.highScore && score.total > 0`.
- Pause button renders at top-left during PLAYING; hidden in other states.

---

### T-068 — Implement `GameLoop`

**Status:** `[ ]`  
**Depends on:** T-002  
**Design ref:** §6.5  
**REQ:** REQ-NFR-002

**File to create:** `infrastructure/GameLoop.js`

**Must implement:**
- `constructor(orchestrator, renderer)`
- `start()` — schedules first `requestAnimationFrame`
- `stop()` — cancels pending frame
- `_frame(ts)` — computes `rawDt = ts - lastTs`, calls `orchestrator.tick(rawDt)`, passes snapshot and `dt/1000` to `renderer.draw()`, re-schedules

**Acceptance criteria:**
- `start()` causes `renderer.draw` to be called each animation frame.
- `stop()` prevents further frame callbacks.
- First frame uses `rawDt = 0` (no jump on first tick).

---

### T-069 — Implement `CanvasRenderer` — idle bobbing animation

**Status:** `[ ]`  
**Depends on:** T-067  
**Design ref:** §12.4 (GAP-13 resolution)  
**REQ:** REQ-VUI-003, REQ-GSM-005

**Implement in this task (add to `CanvasRenderer.js`):**
- Add `_idleBobOffset(t)` → `Math.sin(t * CONFIG.IDLE_BOB_FREQ * Math.PI * 2) * CONFIG.IDLE_BOB_AMPLITUDE`
- Apply bob offset to Ghosty Y when rendering in MAIN_MENU and GAME_OVER states
- Pass current timestamp (in seconds) to the draw methods that need bobbing

**Acceptance criteria:**
- Ghosty on main menu visibly bobs up and down at ~1.2 Hz with ±6 px amplitude.
- Bob does not affect Ghosty physics position — purely visual.

---

---

## M5 — Integration & Wiring

> Wire all layers together in `main.js` and verify the full system plays end-to-end.

---

### T-070 — Implement `main.js` (composition root)

**Status:** `[ ]`  
**Depends on:** T-038, T-054, T-055, T-056, T-057, T-060, T-061, T-062, T-063 through T-069  
**Design ref:** §6.6  
**REQ:** REQ-GSM-003/004, REQ-NFR-001/007

**File to create:** `main.js`

**Must implement:**
- IIFE async function: load assets → decode audio → instantiate all 4 layers in dependency order → wire `BrowserInputAdapter` → transition state machine to `MAIN_MENU` → start game loop
- Canvas dimensions set from `CONFIG.CANVAS_WIDTH / CANVAS_HEIGHT`
- Exact instantiation order from design §6.6

**Acceptance criteria:**
- Opening `index.html` (via local server) shows main menu with no JS errors.
- `GameStateMachine.current === 'MAIN_MENU'` after load.
- Pressing Space starts the game.

---

### T-071 — End-to-end smoke test: main menu → play → game over → restart

**Status:** `[ ]`  
**Depends on:** T-070  
**Design ref:** §9.2 (State Machine diagram)  
**REQ:** REQ-CGL-001/002/011/014, REQ-GSM-001

**Manual verification steps:**
1. Open `index.html` via `npx serve .`
2. Verify main menu renders with "FLAPPY KIRO" title, Ghosty bobbing, "Best: 0"
3. Press Space → game starts, pipes begin scrolling, Ghosty responds to flap
4. Allow Ghosty to fall → "GAME OVER" screen appears after 0.8 s delay
5. Press Space → new game starts with score reset to 0
6. Achieve score > 0 → game over → verify "Best:" shows the score
7. Press M on game over screen → returns to main menu

**Acceptance criteria:** All 7 steps complete without JS errors.

---

### T-072 — End-to-end smoke test: pause and resume

**Status:** `[ ]`  
**Depends on:** T-071  
**REQ:** REQ-GSM-010/011/012/013

**Manual verification steps:**
1. Start game
2. Press P → pause overlay appears, pipes frozen
3. Press P → game resumes exactly where it left off
4. Start game on mobile (or narrow viewport) → tap pause button (top-left) → pauses
5. Tap pause button again → resumes
6. While paused: press M → mute toggles

**Acceptance criteria:** All 6 steps complete correctly.

---

### T-073 — End-to-end smoke test: scoring and precision feedback

**Status:** `[ ]`  
**Depends on:** T-071  
**REQ:** REQ-PSF-001–008B, REQ-PRS-003–006, REQ-AVF-016/018/019

**Manual verification steps:**
1. Pass through a Green pipe → score increases by 1–3 (depending on precision)
2. Verify precision label ("¡Perfecto!", "¡Bueno!", or "¡Casi la quedás!") appears at top-center
3. Verify Floating Score Indicator rises from Ghosty's position in green color
4. Pass through a Gold pipe → base points = 3 + precision bonus
5. Collect a ×2 multiplier → next pipe shows multiplier suffix (e.g. "6 ×2")
6. Verify HUD updates score in real time

**Acceptance criteria:** All 6 steps produce correct outputs.

---

### T-074 — End-to-end smoke test: Double-Gap pipes and modifiers

**Status:** `[ ]`  
**Depends on:** T-073  
**REQ:** REQ-DGP-001/002/007/008/009/012

**Manual verification steps:**
1. Wait for a Double-Gap pipe to spawn (every 3–7 pipes)
2. Verify two gaps are visible with a middle solid block
3. Verify two different modifier badges appear, each with a dynamic expression
4. Pass through the upper gap → modifier activates, badge disappears, subtitle shows modifier name
5. Verify uncollected badge in lower gap disappears when pipe scrolls off-screen
6. Collect GHOST_SHIELD → get hit by next pipe → shield breaks, game continues (not game over)
7. Collect SLOW_TIME → pipes visibly slow down for 4 seconds then restore

**Acceptance criteria:** All 7 steps produce correct behavior.

---

---

## M6 — Property-Based Tests

> Automated tests using fast-check + Vitest. Run with `npx vitest run`. All tests target domain/ and usecases/ only.

---

### T-080 — Set up test tooling

**Status:** `[ ]`  
**Depends on:** T-001  
**Design ref:** §12.3, §10  
**REQ:** REQ-NFR-001 (testability)

**Steps:**
1. Create `package.json` with `"type": "module"`, `vitest ^2.0.0`, `fast-check ^3.22.0` devDependencies
2. Create `tests/setup.js` (empty for now; Vitest global config hook)
3. Add `vitest.config.js`:
   ```js
   import { defineConfig } from 'vitest/config';
   export default defineConfig({ test: { globals: false, environment: 'node' } });
   ```
4. Run `npm install`; verify `npx vitest run` exits with "no test files found" (not an error)

**Acceptance criteria:** `npm install` completes; `npx vitest run` runs without crashing.

---

### T-081 — PBT: `PrecisionRules` (P1–P8)

**Status:** `[ ]`  
**Depends on:** T-013, T-080  
**Design ref:** §10.1  
**REQ:** REQ-PSF-001B–004

**File to create:** `tests/domain/PrecisionRules.test.js`  
Implement all 8 properties from design §10.1 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/domain/PrecisionRules.test.js` — 8/8 pass, 0 failures.

---

### T-082 — PBT: `ScoreFormula` (P9–P16)

**Status:** `[ ]`  
**Depends on:** T-014, T-080  
**Design ref:** §10.2  
**REQ:** REQ-PRS-006, REQ-DGP-008C

**File to create:** `tests/domain/ScoreFormula.test.js`  
Implement all 8 properties from design §10.2 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/domain/ScoreFormula.test.js` — 8/8 pass, 0 failures.

---

### T-083 — PBT: `PhysicsFormulas` (P17–P26)

**Status:** `[ ]`  
**Depends on:** T-015, T-080  
**Design ref:** §10.3  
**REQ:** REQ-PHY-003/008/010, REQ-CDT-001/004

**File to create:** `tests/domain/PhysicsFormulas.test.js`  
Implement all 10 properties from design §10.3 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/domain/PhysicsFormulas.test.js` — 10/10 pass, 0 failures.

---

### T-084 — PBT: `ScoringUseCase` pipeline (P27–P31)

**Status:** `[ ]`  
**Depends on:** T-033, T-080  
**Design ref:** §10.4  
**REQ:** REQ-PRS-006, REQ-DGP-011B

**File to create:** `tests/usecases/ScoringUseCase.test.js`  
Implement all 5 properties from design §10.4 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/usecases/ScoringUseCase.test.js` — 5/5 pass, 0 failures.

---

### T-085 — PBT: `CollisionUseCase` boundaries (P32–P37)

**Status:** `[ ]`  
**Depends on:** T-032, T-080  
**Design ref:** §10.5  
**REQ:** REQ-CDT-004–007, REQ-CGL-008

**File to create:** `tests/usecases/CollisionUseCase.test.js`  
Implement all 6 properties from design §10.5 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/usecases/CollisionUseCase.test.js` — 6/6 pass, 0 failures.

---

### T-086 — PBT: `PipeFactory` invariants (P38–P42)

**Status:** `[ ]`  
**Depends on:** T-034, T-080  
**Design ref:** §10.6  
**REQ:** REQ-OBG-004–008, REQ-DGP-008B

**File to create:** `tests/usecases/PipeFactory.test.js`  
Implement all 5 properties from design §10.6 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/usecases/PipeFactory.test.js` — 5/5 pass, 0 failures.

---

### T-087 — PBT: `DifficultyUseCase` floors and triggers (P43–P47)

**Status:** `[ ]`  
**Depends on:** T-035, T-080  
**Design ref:** §10.7  
**REQ:** REQ-OBG-011–013, REQ-DGP-008 SLOW_TIME

**File to create:** `tests/usecases/DifficultyUseCase.test.js`  
Implement all 5 properties from design §10.7 exactly as specified.

**Acceptance criteria:** `npx vitest run tests/usecases/DifficultyUseCase.test.js` — 5/5 pass, 0 failures.

---

---

## M7 — Polish, Edge Cases & Mobile

> Refinements that complete the game experience. Each task is independent and can be parallelized once M5 and M6 are complete.

---

### T-090 — Difficulty third-axis pipe drift animation

**Status:** `[ ]`  
**Depends on:** T-055, T-035  
**Design ref:** §4.6 (REQ-OBG-016)  
**REQ:** REQ-OBG-016

**Description:**  
When third difficulty axis is active, pipes oscillate their gap center Y over time.

**Implement in `GameOrchestrator._scrollPipes(dt)`:**
- After scrolling, if `difficulty.thirdAxisActive` and pipe has `driftPhase`:
  - `driftOffset = Math.sin(driftPhase) * CONFIG.PIPE_DRIFT_AMPLITUDE`
  - `driftPhase += CONFIG.PIPE_DRIFT_FREQ * 2 * Math.PI * dt`
  - Update gap `topY / bottomY` by applying the delta from previous driftOffset
  - Clamp final gap edges to safe-zone margins

**Acceptance criteria:**
- After ~75 pipes, newly spawned pipes visibly oscillate vertically.
- Oscillation amplitude is ±20 px.
- Gaps never exit canvas safe-zone margins.

---

### T-091 — Speed-Up subtitle notification

**Status:** `[ ]`  
**Depends on:** T-055, T-057  
**Design ref:** §9.1 (data flow)  
**REQ:** REQ-OBG-014, REQ-PSF-008B

**Description:**  
Display "Speed Up!" in the Subtitle Channel when a speed increment fires.

**Implement in `GameOrchestrator._tickPlaying`:**
- When `difficultyUC.onPipePassed` returns `speededUp === true`:
  - `this.subtitle = this.presenter.buildSubtitle('Speed Up!')`

**Acceptance criteria:**
- "Speed Up!" appears in cyan below the feedback label at every 10th pipe.
- Does not replace or interrupt any active precision Feedback Label.

---

### T-092 — Slow-Time screen pulse effect

**Status:** `[ ]`  
**Depends on:** T-055  
**Design ref:** §6.1  
**REQ:** REQ-AVF-012

**Description:**  
When `SLOW_TIME` is collected, apply a brief ±3 px screen pulse.

**Implement in `GameOrchestrator._applyScoringMoment`:**
- When modifier = `SLOW_TIME`: set `this.screenShake = { elapsed: 0, duration: 0.3, peak: 3 }`

**Acceptance criteria:**
- Collecting SLOW_TIME produces a noticeable but gentle shake (3 px peak vs 10 px for collision).
- Lasts 0.3 s only.

---

### T-093 — localStorage round-trip: high score and mute persistence

**Status:** `[ ]`  
**Depends on:** T-050, T-071  
**REQ:** REQ-GSM-018/019/020, REQ-CGL-016

**Manual verification steps:**
1. Play a game, achieve score 15
2. Reload page → main menu shows "Best: 15"
3. Toggle mute (M key) → mute icon updates
4. Reload page → mute state preserved
5. Achieve score 20 → game over → "Best: 20" updates immediately
6. Reload → "Best: 20" persists

**Acceptance criteria:** All 6 steps pass.

---

### T-094 — GAME_OVER 0.8 s delay before overlay

**Status:** `[ ]`  
**Depends on:** T-055  
**Design ref:** §9.6  
**REQ:** REQ-GSM-014

**Description:**  
Screen shake and burst particles play immediately on collision; the game-over overlay appears after a 0.8 s delay.

**Implement in `GameOrchestrator._handleCollision`:**
- On real collision (no shield): set `this._gameOverTimer = CONFIG.GAME_OVER_DELAY`
- State machine transitions to `GAME_OVER` immediately (stops simulation)
- In `_tickGameOverDelay(dt)`: decrement timer; set `this._overlayVisible = true` when timer ≤ 0
- `_buildSnapshot()`: include `overlayVisible: this._overlayVisible`
- `CanvasRenderer._drawGameOverScreen`: only draw overlay when `snap.overlayVisible === true`

**Acceptance criteria:**
- Screen shake and particles play immediately on collision.
- Game over overlay appears ~0.8 s later.
- Player cannot restart before overlay appears (Space input ignored during delay).

---

### T-095 — Mobile canvas tap-coordinate mapping

**Status:** `[ ]`  
**Depends on:** T-062  
**Design ref:** §12.4  
**REQ:** REQ-NFR-003

**Description:**  
Ensure touch coordinates are correctly scaled from CSS pixels to logical game pixels when the canvas is CSS-scaled on mobile.

**Verify in `BrowserInputAdapter`:**
- Logical `tapX = (touch.clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width)`
- Logical `tapY = (touch.clientY - rect.top) * (CONFIG.CANVAS_HEIGHT / rect.height)`

**Acceptance criteria:**
- On a 375 px wide mobile viewport (iPhone SE), tapping top-left 44×44 zone correctly triggers pause.
- Tapping center-right of canvas triggers flap.

---

### T-096 — Performance: disable trail on low-end devices

**Status:** `[ ]`  
**Depends on:** T-056, T-068  
**Design ref:** §12.6 (OQ-08)  
**REQ:** REQ-NFR-002, OQ-08

**Description:**  
Auto-detect slow devices by measuring rolling frame time; disable trail particles if consistently slow.

**Implement in `GameLoop._frame`:**
- Maintain a rolling window of last 10 frame times
- If average > 20 ms (< 50 FPS): set `this._trailEnabled = false`
- Pass `trailEnabled` in the tick call or as a flag the orchestrator reads
- `_emitTrailParticles()` becomes a no-op when disabled

**Acceptance criteria:**
- On a throttled CPU (Chrome DevTools 4× slowdown): trail disables automatically.
- On a normal machine: trail remains enabled.
- Disabling trail does not affect burst particles.

---

### T-097 — Favicon and page title

**Status:** `[ ]`  
**Depends on:** T-003  
**REQ:** REQ-NFR-001 (polish)

**Description:**  
Set `<title>Flappy Kiro</title>` and add a minimal SVG favicon (ghost emoji or simple white circle).

**File to modify:** `index.html`

**Acceptance criteria:**
- Browser tab shows "Flappy Kiro" as title.
- Favicon is visible in browser tab (does not show default broken icon).

---

---

## M8 — Final Verification

> Full pass against `requirements.md` v0.3. Every requirement must be traceable to a passing test or a manual verification step.

---

### T-100 — Full PBT suite green

**Status:** `[ ]`  
**Depends on:** T-081 through T-087  
**REQ:** All domain and use-case requirements

**Command:** `npx vitest run`

**Acceptance criteria:**
- All 47 properties across 7 test files pass.
- Zero failures, zero skipped tests.
- Output: `Tests 47 passed (47)`.

---

### T-101 — Full requirements traceability check

**Status:** `[ ]`  
**Depends on:** T-100, T-074  
**Design ref:** §12.8

**Description:**  
Walk through every `REQ-*` in `requirements.md` v0.3 and confirm it maps to either a passing PBT property or a completed manual verification step.

**Spot-check list (highest-risk requirements):**
- REQ-PRS-006 — unified scoring formula → P9–P13, T-073
- REQ-CDT-006/007 — ground/ceiling boundaries → P34, T-032
- REQ-CDT-011 — iFrame suppression → P34, T-032
- REQ-DGP-008B — modifier without-replacement → P40, T-034
- REQ-DGP-008C — minimum +5 bonus → P14–P16, T-033
- REQ-OBG-016 — third-axis drift → T-090
- REQ-GSM-021 — full reset scope → T-038, T-071
- REQ-PSF-008B — subtitle channel never interrupts feedback → T-091, T-073
- OQ-11 (resolved) — mobile pause button → T-057, T-062, T-072

**Acceptance criteria:**
- No `REQ-*` is untraced.
- Any gap found must be filed as a new task before this task is marked complete.

---

### T-102 — Cross-browser smoke test

**Status:** `[ ]`  
**Depends on:** T-071  
**REQ:** REQ-NFR-002

**Test matrix:**

| Browser | Platform | Minimum check |
|---|---|---|
| Chrome latest | Windows | Full play session, 60 FPS |
| Firefox latest | Windows | Full play session |
| Edge latest | Windows | Main menu + one game |
| Safari (mobile) | iOS | Touch flap, pause button, scaling |
| Chrome (mobile) | Android | Touch flap, pause button, scaling |

**Acceptance criteria:**
- No JS errors in console on any browser.
- Canvas renders correctly on mobile (aspect ratio preserved).
- Touch controls work on iOS Safari and Android Chrome.

---

### T-103 — Git tag v1.0.0

**Status:** `[ ]`  
**Depends on:** T-100, T-101, T-102  
**REQ:** n/a

**Steps:**
1. Ensure `requirements.md` v0.3, `design.md` v0.1, and `tasks.md` are committed
2. `git add .` (all implementation files)
3. `git commit -m "feat: implement Flappy Kiro v1.0.0"`
4. `git tag v1.0.0`

**Acceptance criteria:**
- `git log --oneline` shows the commit.
- `git tag` shows `v1.0.0`.
- No uncommitted changes (`git status` clean).

---

## Appendix A — Task Dependency Graph

```
T-001 ──► T-002 ──► T-010 ──► T-011 ──► T-031
            │         │         │
            │         ├────────►T-012 ──► T-032
            │         │         │         │
            │         ├────────►T-013 ──► T-033 ──► T-036
            │         │                   │
            │         ├────────►T-014 ──► T-033
            │         │
            │         ├────────►T-015 ──► T-031
            │         │               └── T-032
            │         │               └── T-083
            │         │
            │         └────────►T-016 ──► T-034
            │
            ├──► T-003 ──► T-070
            │
            └──► T-030 ──► T-050
                      └──► T-051 ──► T-062
                      └──► T-052

T-031 ──► T-055 ──► T-056 ──► T-070
T-032 ──► T-055
T-033 ──► T-055
T-034 ──► T-055
T-035 ──► T-055
T-036 ──► T-055
T-037 ──► T-054 ──► T-055
T-038 ──► T-054

T-053 ──► T-054
T-050 ──► T-054

T-060 ──► T-061 ──► T-070
T-063 ──► T-064 ──► T-065 ──► T-066 ──► T-067 ──► T-069
T-068 ──► T-070

T-070 ──► T-071 ──► T-072 ──► T-073 ──► T-074
                                        │
                              ──────────► T-101

T-080 ──► T-081 ──► T-100
T-080 ──► T-082 ──► T-100
T-080 ──► T-083 ──► T-100
T-080 ──► T-084 ──► T-100
T-080 ──► T-085 ──► T-100
T-080 ──► T-086 ──► T-100
T-080 ──► T-087 ──► T-100

T-100 ──► T-101 ──► T-102 ──► T-103
```

---

## Appendix B — Requirements Coverage Matrix

| Req Group | Requirements | Milestone | Primary Tasks |
|---|---|---|---|
| Core game loop | REQ-CGL-001–016 | M0, M3, M5 | T-003, T-051/052/054/055, T-071 |
| Pipe rarity & score | REQ-PRS-001–007 | M1, M2 | T-010, T-013/014, T-033/034 |
| Precision scoring | REQ-PSF-001–012 | M1, M2, M3 | T-013, T-033, T-053, T-066 |
| Double-Gap & modifiers | REQ-DGP-001–014B | M2, M3 | T-034, T-036, T-053/055 |
| Visual & UI | REQ-VUI-001–005 | M4 | T-063–067, T-069 |
| Physics | REQ-PHY-001–015 | M1, M2 | T-015, T-031 |
| Obstacle generation | REQ-OBG-000–016 | M2, M7 | T-002, T-034, T-035, T-090 |
| Collision detection | REQ-CDT-001–013 | M1, M2 | T-015, T-032, T-055/056 |
| Game state management | REQ-GSM-001–021 | M2, M3, M5 | T-037/038, T-054/055, T-071/072 |
| Audio & visual feedback | REQ-AVF-001–020 | M3, M4 | T-052, T-061, T-064–066 |
| Non-functional | REQ-NFR-001–007 | M0, M4, M7 | T-002/003, T-062/068, T-095/096 |
| OQ-11 (resolved) | Mobile pause button | M3, M4 | T-057, T-062, T-067 |
