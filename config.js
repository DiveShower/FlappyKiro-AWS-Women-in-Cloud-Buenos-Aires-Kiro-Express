// config.js
// Single source of truth for every named constant.
// Importable by all layers. Read-only (Object.freeze). No logic — only values.

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

  // REQ-OBG-012 (gap height reduction per step)
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

  // ── Mobile Pause Button ───────────────────────────────────────────────────
  PAUSE_BTN_X:    10,   // px — left edge of pause button
  PAUSE_BTN_Y:    10,   // px — top edge of pause button
  PAUSE_BTN_SIZE: 44,   // px — width and height of pause button tap target

});

export default CONFIG;
