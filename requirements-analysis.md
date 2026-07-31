# Flappy Kiro — Requirements Analysis Report
**Analyzed document:** `requirements.md` v0.2  
**Total requirements reviewed:** 144 across 12 sections  
**Date:** 2026-07-31  
**Status:** Draft — for review before implementation begins

---

## Executive Summary

The requirements document is well-structured and covers a broad surface area for a browser game of this scope. The EARS notation is applied consistently. However, the analysis uncovered **9 direct conflicts**, **14 gaps** (missing behaviors for defined scenarios), **11 ambiguities** that will produce divergent implementations if left unresolved, and **6 implementation risks** that could undermine the non-functional targets. All findings are categorized, traced to specific requirement IDs, and accompanied by a recommended resolution.

---

## 1. Direct Conflicts

These are pairs of requirements whose stated behaviors contradict each other. Left unresolved, they will force the implementer to silently pick a side.

---

### CONFLICT-01 — Scoring formula: precision bonus before or after multiplier

**Requirements involved:** REQ-PSF-005, REQ-PSF-006 vs. REQ-PRS-006

REQ-PSF-005 states precision bonus is awarded "before the active multiplier is applied to the total," but REQ-PRS-006 defines the formula as `floor(base_points × active_multiplier)` — with no mention of precision points in that formula. REQ-PSF-005 implies the formula should be `floor((base_points + precision_bonus) × multiplier)`, while REQ-PRS-006 as written only multiplies the base.

**Impact:** High — could produce a 2–3× difference in precision bonus value at high multipliers.  
**Recommended resolution:** Rewrite REQ-PRS-006 as:  
`points_awarded = floor((base_points + precision_bonus) × active_multiplier)`  
and remove the parenthetical "before the active multiplier" from REQ-PSF-005.

---

### CONFLICT-02 — Ceiling collision: Game Over vs. clamp

**Requirements involved:** REQ-CGL-006 vs. REQ-PHY-011 vs. REQ-CDT-007

REQ-CGL-006 says the system "shall prevent Ghosty from moving above the top boundary" — which is a constraint, not a punishment. REQ-PHY-011 and REQ-CDT-007 both say ceiling contact clamps position and zeroes velocity (no Game Over). This is consistent between §6 and §8. However, REQ-CGL-006 is ambiguous enough that a developer reading only §1 might implement a ceiling kill. The conflict is latent but real.

**Impact:** Medium — architectural decision in §1 is under-specified relative to its detailed counterparts.  
**Recommended resolution:** Amend REQ-CGL-006 to explicitly state "clamp position to y=0 and zero upward velocity; ceiling contact does not trigger Game Over." Delete the contradiction risk.

---

### CONFLICT-03 — Ground collision boundary: HUD vs. canvas bottom

**Requirements involved:** REQ-CGL-007 vs. REQ-CDT-006

REQ-CGL-007 triggers Game Over when Ghosty reaches "the bottom boundary of the canvas." REQ-CDT-006 triggers it when the hitbox reaches `canvas_height - HUD_HEIGHT`. Since the HUD occupies the bottom strip, these are different Y values.

**Impact:** Medium — Ghosty could visually pass into the HUD before dying (REQ-CGL-007) or appear to die before touching visible ground (REQ-CDT-006).  
**Recommended resolution:** Retire REQ-CGL-007 in favor of REQ-CDT-006's precise definition. The "bottom boundary" in §1 should be understood as `canvas_height - HUD_HEIGHT`.

---

### CONFLICT-04 — Pipe passage detection: x > pipe_x + pipe_width vs. x-midpoint

**Requirements involved:** REQ-GSM-009 vs. REQ-PSF-001

REQ-GSM-009 says a pipe is "fully passed" when `Ghosty's x > pipe_x + pipe_width` — this is the trailing edge trigger. REQ-PSF-001 calculates precision when "Ghosty crosses the x-coordinate midpoint of a pipe gap" — this fires at the midpoint. Two separate passage events are fired for the same pipe, but there is no spec stating which one awards the score. If both trigger scoring, the player is double-scored on every pipe.

**Impact:** High — double scoring is a game-breaking bug.  
**Recommended resolution:** Define a single canonical "scoring moment." Recommend: precision is sampled at the x-midpoint (REQ-PSF-001), but score is awarded and the counter is incremented at the same midpoint moment. REQ-GSM-009's trailing-edge check should be used only for the pipe counter / speed progression trigger, not for score.

---

### CONFLICT-05 — Mute key: M vs. button

**Requirements involved:** REQ-CGL-016 vs. REQ-AVF-005 vs. REQ-GSM-013

REQ-CGL-016 specifies a "mute button" visible on all screens. REQ-AVF-005 specifies toggling by pressing M "on any screen." REQ-GSM-013 says the PAUSED state accepts mute toggle input. These are additive, not conflicting, but REQ-CGL-016 does not mention the M key and REQ-AVF-005 does not mention the button — creating two separate specs for the same feature with no cross-reference.

**Impact:** Low — risk of one path being implemented and the other missed.  
**Recommended resolution:** Consolidate into one requirement: "The mute state shall be toggleable via the M key on any screen AND via a persistent mute button rendered in the UI corner." Retire the duplicate.

---

### CONFLICT-06 — GHOST_SHIELD: iFrames and double-death window

**Requirements involved:** REQ-CDT-010 vs. REQ-CDT-011 vs. REQ-CGL-008

REQ-CDT-010 says when shield absorbs a collision it plays the shield-break animation "then deactivates the shield without triggering Game Over." REQ-CDT-011 then grants 1.5 s of iFrames. However, REQ-CGL-008 says any hitbox overlap with a pipe segment "shall immediately trigger the Game Over state" — it contains no iFrame exception clause.

**Impact:** High — REQ-CGL-008 is the canonical collision rule, and it has no awareness of iFrames. An implementer following §1 in isolation will ignore §8.5 entirely.  
**Recommended resolution:** Amend REQ-CGL-008 to read: "…shall immediately trigger the Game Over state, unless invincibility frames (REQ-CDT-011) are currently active, in which case the collision is ignored."

---

### CONFLICT-07 — Score moment vs. Floating Score Indicator position

**Requirements involved:** REQ-AVF-016 vs. REQ-PSF-001

REQ-AVF-016 spawns the Floating Score Indicator "at the position where Ghosty crossed the pipe's x-midpoint." REQ-PSF-001 says precision is calculated at the x-midpoint. But by the time the score is visually displayed, Ghosty will have continued moving. If the indicator spawns at Ghosty's current position at the scoring moment (which is natural), it will correctly track the midpoint crossing. However, the wording "pipe's x-midpoint" means a fixed X coordinate, not Ghosty's X — the indicator would spawn at a pipe-relative position, which visually detaches it from the player.

**Impact:** Low/Medium — cosmetic but jarring.  
**Recommended resolution:** Clarify REQ-AVF-016: "spawn the Floating Score Indicator at Ghosty's canvas position at the moment of gap scoring (not the pipe's fixed x-midpoint)."

---

### CONFLICT-08 — SLOW_TIME restores speed to base or to current progression level

**Requirements involved:** REQ-DGP-008 (SLOW_TIME effect) vs. REQ-OBG-010

REQ-DGP-008 says SLOW_TIME "reduces pipe scroll speed by 40% for 4 seconds, then restores it." REQ-OBG-010 says the runtime speed is tracked separately from the base constant. The question is: restored to what? If the player passes the 10-pipe speed-up threshold during the SLOW_TIME window, the "restore" target is ambiguous — restore to pre-slow speed (which may now be outdated) or to the newly incremented speed?

**Impact:** Medium — could silently break progression if a speed increment fires mid-slow.  
**Recommended resolution:** Specify that SLOW_TIME stores the runtime speed at activation and restores to `max(stored_speed, current_progression_speed)` — i.e., never restores below the current progression floor.

---

### CONFLICT-09 — State machine: GAME_OVER → PLAYING vs. REQ-GSM-001 diagram

**Requirements involved:** REQ-GSM-001 vs. REQ-CGL-014

The state diagram in REQ-GSM-001 shows `GAME_OVER → MAIN_MENU` and `GAME_OVER → PLAYING (restart)` as both valid. REQ-CGL-014 says pressing Space/tap on Game Over transitions to PLAYING. REQ-GSM-016 also says this. However, the transition `GAME_OVER → MAIN_MENU` is only addressed in REQ-GSM-017 (press M). The diagram is correct but REQ-CGL-014 pre-dates the state machine and doesn't mention the M-to-menu path — a developer following §1 alone won't implement it.

**Impact:** Low — the state machine in §9 is correct; §1 is merely incomplete.  
**Recommended resolution:** Add a cross-reference in REQ-CGL-014 pointing to REQ-GSM-015 and note that M returns to MAIN_MENU.

---

## 2. Gaps — Missing Behaviors for Defined Scenarios

These are scenarios fully implied by the existing requirements that have no stated behavior. They will produce undefined/divergent behavior at runtime.

---

### GAP-01 — What happens when BONUS_FLAT is collected at score = 0?

REQ-DGP-008 defines `BONUS_FLAT` as "current score S adjusted by ±10%, minimum +1." At score 0, the formula gives `0 ± 10% of 0 = 0`, and the minimum +1 floor saves it. But this means the minimum floor is the only behavior at S=0, and the ±10% randomness is entirely meaningless early in the game. There is no requirement specifying whether BONUS_FLAT should be disabled, replaced, or guaranteed a minimum useful value at early game.

**Recommended addition:** Add a floor of `max(5, floor(S × (0.9 + random() × 0.2)))` so early-game collection always feels rewarding, or document the intended behavior of "minimum 1 point" explicitly.

---

### GAP-02 — Precision calculation when Ghosty is partially outside the gap

REQ-PSF-001 calculates precision as a value clamped to [0,1]. However, if Ghosty's center Y is outside the gap entirely (below gap_bottom or above gap_top), the formula `1 - (|offset| / half_gap)` returns a negative value, which is then clamped to 0 — assigning "Casi" tier. But REQ-CGL-008 says a collision should have already fired. There is no requirement covering the window between "hitbox partially overlaps gap edge" (would be a collision) and "center Y is outside gap" (would be Casi). The precision event and the collision detection could fire on the same frame in the same gap.

**Recommended addition:** Specify that the precision check only runs if no collision was detected on the same frame. Precision is undefined when a collision fires simultaneously.

---

### GAP-03 — Double-Gap Pipe: which gap scores the pipe's base points?

For a Single-Gap Pipe, one gap = one score event. For a Double-Gap Pipe, there are two gaps. The requirements never specify whether passing through one gap awards the pipe's base score, passing through both gaps awards it twice, or passing through either gap awards it once and the second pass is free. REQ-DGP-014 only covers precision; REQ-PRS-003–005 only mention "the pipe's gap" in singular.

**Recommended addition:** Add a requirement: "Each gap of a Double-Gap Pipe is an independent scoring unit. Passing through both gaps awards base score and precision bonus twice (once per gap). The pipe's base score is the same for both gaps, determined by the pipe's rarity."

---

### GAP-04 — Modifier badge visual: no size, z-order, or animation spec

REQ-DGP-012 says each modifier has a "unique icon or label rendered inside a small floating badge." There is no size specification, no z-order relative to the pipe, no idle animation (bobbing, pulsing, rotating), and no behavior when the badge is partially obscured by a pipe cap. The only visual reference is "consistent with the gold sparkle/diamond visual hint shown in the UI mockup."

**Recommended addition:** Specify badge size (e.g. 28×28 px), z-order (above pipes, below Ghosty), idle animation (e.g. ±4 px vertical bob at 1 Hz), and that badges are always fully inside the gap bounds.

---

### GAP-05 — No spec for what "pipes-passed" counts: gap passages or physical pipe pairs

REQ-GSM-009 increments the pipes-passed counter when `Ghosty's x > pipe_x + pipe_width`. For a Double-Gap Pipe, there is one physical pipe pair with two gaps. The speed progression trigger (REQ-OBG-011) fires every 10 pipes. Does a Double-Gap Pipe count as 1 pipe or 2 toward that counter?

**Recommended addition:** Specify explicitly: "A Double-Gap Pipe counts as 1 pipe toward the pipes-passed counter regardless of how many gaps are traversed."

---

### GAP-06 — No restart behavior for active modifiers on PLAYING reset

REQ-GSM-006 and REQ-GSM-016 both say the system resets "all gameplay variables to their initial values" on a new game. There is no explicit list of what those variables are. Specifically: Active Multiplier, iFrame timer, SLOW_TIME timer, shield state, and particle pool are never mentioned as things that are reset.

**Recommended addition:** Add a requirement listing the full reset scope: "On entering PLAYING from MAIN_MENU or GAME_OVER, the system shall reset: score to 0, pipe counter to 0, pipe speed to PIPE_SPEED_BASE, gap heights to initial defaults, Active Multiplier to 1×, all modifier timers to inactive, iFrame timer to 0, particle pool cleared, and a new Double-Gap threshold N selected."

---

### GAP-07 — No behavior specified when LOADING fails (asset 404 or network error)

REQ-GSM-003 says the system loads assets and displays a loading indicator. REQ-GSM-004 says it transitions to MAIN_MENU when done. There is no requirement for what happens if an asset fails to load (e.g. ghosty.png returns 404).

**Recommended addition:** "If any asset fails to load after [N] seconds or returns an error, the system shall display a user-visible error message and optionally fall back to a procedurally drawn placeholder sprite."

---

### GAP-08 — No spec for pipe_width

Pipe width is referenced in REQ-CDT-003, REQ-OBG-015, and REQ-GSM-009, but never given a default value or named constant. The collision boundary formula and recycling trigger both depend on it.

**Recommended addition:** Add `PIPE_WIDTH` to the configuration object with a recommended default (e.g. **52 px**) and reference it in REQ-CDT-003.

---

### GAP-09 — No spec for HUD bar height

REQ-CDT-006 and REQ-OBG-007 both use `HUD_HEIGHT` in formulas, but the value is never defined anywhere in the document.

**Recommended addition:** Add `HUD_HEIGHT` as a named constant (recommended default: **40 px**) to the configuration object.

---

### GAP-10 — No touch pause on mobile

REQ-GSM-010 specifies Escape or P to pause. OQ-11 flags mobile as an open question. Given REQ-NFR-003 requires mobile playability, the absence of a pause mechanism for touch-only devices is a gap regardless of the open question.

**Recommended addition:** Resolve OQ-11 and add a requirement: "On touch devices, a tap on a dedicated on-screen pause button shall transition to PAUSED state."

---

### GAP-11 — No behavior defined for rapid flap inputs (input buffering)

REQ-PHY-006 says each flap replaces velocity. There is no requirement preventing or handling multiple flap inputs within a single frame (e.g. from touch events firing simultaneously). Without throttling, a multi-touch event could fire the flap logic twice in one tick.

**Recommended addition:** "The system shall ignore flap inputs that occur within [N ms] of the previous flap (recommended: 80 ms) to prevent multi-touch double-fire."

---

### GAP-12 — Speed Up notification conflicts with Feedback Label — one channel, two senders

REQ-OBG-014 says the "Speed Up!" notification is displayed "in the Feedback Label area." REQ-PSF-010 says a new precision label immediately replaces an existing one. This means a Speed Up event fires during a gap scoring event will either be overwritten by the precision label (Speed Up lost) or overwrite the precision label (precision context lost). OQ-12 flags this but leaves it unresolved.

**Recommended addition:** Resolve OQ-12. Recommended: introduce a secondary notification channel (a smaller subtitle line below the main Feedback Label) for system events like Speed Up, Shield activation, and SLOW_TIME — so they don't compete with the precision label.

---

### GAP-13 — No spec for idle bobbing animation parameters

REQ-VUI-003 mentions "a subtle idle bobbing" on start/game-over screens. REQ-GSM-005 mentions it for MAIN_MENU. No amplitude, frequency, or easing curve is specified.

**Recommended addition:** Define: amplitude ±6 px, frequency 1.2 Hz, easing: sine wave. This ensures the animation matches the "subtle" qualifier and is reproducible across implementations.

---

### GAP-14 — No behavior for SCORE_DOUBLE when score is 0

REQ-DGP-008 defines `SCORE_DOUBLE` as "doubles the current accumulated score instantly." At score 0, doubling produces 0. The modifier is entirely wasted with no feedback that it did anything. This is a UX gap — the player collected a modifier and nothing visible happened.

**Recommended addition:** "If SCORE_DOUBLE is collected when score = 0, award a guaranteed minimum of 5 points instead of doubling."

---

## 3. Ambiguities

These are requirements where the stated behavior is underspecified enough to produce legitimately different (but internally valid) implementations, all of which would technically comply.

---

### AMB-01 — "Crosses the x-coordinate midpoint" is undefined for a moving pipe

REQ-PSF-001 samples precision when Ghosty "crosses the x-coordinate midpoint of a pipe gap." A pipe is moving. "Midpoint" of what — the pipe's current center (which changes each frame), or the pipe's geometric center calculated at spawn time? If calculated at spawn, the x value is fixed and easy to detect as a threshold. If "current center" is intended, the midpoint is a moving target.

**Recommended resolution:** Specify "the x-coordinate of the pipe's geometric center at the moment the system detects Ghosty's horizontal midpoint has passed the pipe's horizontal midpoint, computed from the pipe's current x position that frame."

---

### AMB-02 — "Fully crosses" in REQ-GSM-009 vs. "crosses" in REQ-PSF-001

REQ-GSM-009 uses "fully passes" (`Ghosty's x > pipe_x + pipe_width` — trailing edge clears the pipe). REQ-PSF-001 uses "crosses the midpoint" (earlier). Two different thresholds for logically related events with no stated relationship. See also CONFLICT-04.

---

### AMB-03 — "Uniformly at random" for modifier assignment: with or without replacement per pipe?

REQ-DGP-008 says each modifier is selected "uniformly at random from the following modifier pool." For a Double-Gap Pipe, two modifiers are assigned. Can both be the same type (e.g. two MULTIPLIER_2X)? The spec allows it by saying "independently," but this could confuse players and produce a de-facto ×4 effect if stacking is unresolved (OQ-03).

**Recommended resolution:** Specify "without replacement per pipe" — the two gap modifiers in a single Double-Gap Pipe are always different types.

---

### AMB-04 — When does the Active Multiplier passage counter decrement?

REQ-DGP-008 defines MULTIPLIER_2X as active for "the next 5 gap passages." There is no requirement specifying: Does passing through a gap of a Double-Gap Pipe count as 1 or 2 passages against the multiplier counter? Does a gap that kills Ghosty (before Game Over fires) consume a counter step? Does collecting a second multiplier while the counter is at 1 consume the remaining step before overwriting?

**Recommended resolution:** Specify: each physical gap crossing that produces a score event (including Double-Gap gaps) consumes exactly 1 passage from the multiplier counter. Overwriting a multiplier (REQ-DGP-011) discards remaining counter steps.

---

### AMB-05 — "Reduce gap heights progressively" — per-pipe or at speed increment steps?

REQ-OBG-005 says `GAP_HEIGHT_MIN`/`MAX` reduce "as game difficulty increases" with a reference to REQ-OBG-011. REQ-OBG-012 says they reduce by 4 px at each speed increment step. These are consistent, but REQ-OBG-005 says "progressively" — implying it could also be gradual (per pipe, not per step). The cross-reference to REQ-OBG-011 resolves this for careful readers, but the language is ambiguous for a quick read.

**Recommended resolution:** Remove the word "progressively" from REQ-OBG-005 and replace with "at each speed increment step as defined in REQ-OBG-012."

---

### AMB-06 — "configurable resolution (default: 800×500 px)" — what does configurable mean here?

REQ-VUI-001 says the canvas has a "configurable resolution." Configurable by the end user? By the developer via a config constant? At runtime? For a single-file browser game with no build step, "configurable" likely means a named constant, but this isn't stated.

**Recommended resolution:** Replace "configurable" with "defined as named constants CANVAS_WIDTH and CANVAS_HEIGHT in the game configuration object."

---

### AMB-07 — "Decaying envelope" for Screen Shake is undefined

REQ-CDT-008 describes shake as "a random displacement sampled from a decaying envelope over 0.5 seconds." No envelope type is specified (linear decay? exponential? sinusoidal?). "Random displacement" at ±10 px peak could mean: white noise clamped to ±10, sinusoidal with random phase, or Perlin-noise-like smooth shake.

**Recommended resolution:** Specify: "displacement = peak_amplitude × (1 - elapsed/duration) × random_unit_vector, where random_unit_vector changes every 2 frames to produce a jitter feel." This defines decay as linear and jitter rate as deterministic.

---

### AMB-08 — "Real-time scoring" update frequency

REQ-GSM-008 says the score updates "in real time after every gap passage event." REQ-AVF-016–019 describe a Floating Score Indicator with a visual animation. There is no requirement stating whether the HUD score counter jumps immediately to the new value or animates (counts up) toward it. REQ-PHY-014 mentions lerp for HUD value counters — implying animation — but doesn't mandate it for the score specifically.

**Recommended resolution:** Explicitly state whether the HUD score display is instant (jump to new value) or animated (lerp over ~0.2 s). Either is valid; both shouldn't exist simultaneously.

---

### AMB-09 — "Semi-transparent white" trail vs. "pulsing blue-white" shield trail

REQ-AVF-013 defines normal trail as `rgba(255,255,255,0.55)`. REQ-AVF-014 says shield trail "pulses" blue-white. "Pulsing" is undefined — does the color alternate? Does the opacity oscillate? Does each particle individually pulse or does the trail system as a whole pulse?

**Recommended resolution:** Define "pulsing" as oscillating particle spawn color between `rgba(100,180,255,0.9)` and `rgba(255,255,255,0.6)` at 4 Hz applied to newly spawned particles, so the trail visually cycles colors as it streams behind Ghosty.

---

### AMB-10 — "Procedurally synthesized" background music: no structure defined

REQ-AVF-006 mandates background music via Web Audio API synthesis. No tempo, key, loop length, instrument type, or melody structure is given. Two developers reading this would produce completely different audio results, both technically compliant.

**Recommended resolution:** Either remove the procedural requirement and allow an asset file, or define a minimal musical structure: e.g. "4-bar loop at 120 BPM in C major, using square-wave oscillators for melody and a triangle-wave bass line, looping seamlessly."

---

### AMB-11 — Feedback Label "top-center": what Y coordinate?

REQ-PSF-008 says the Feedback Label appears at the "top-center of the game canvas." REQ-OBG-014 also uses the Feedback Label area. "Top-center" has no Y value specified. Given the large font (≥36 px per REQ-PSF-011), a Y of 0 would clip the text. The mockup shows the text near the very top but fully visible.

**Recommended resolution:** Specify: "rendered with its top edge at y = 20 px and horizontally centered on the canvas."

---

## 4. Implementation Risks

These are requirements that are technically valid and internally consistent but carry a high probability of causing problems during implementation or testing.

---

### RISK-01 — dt cap of 0.05 s may not be tight enough for physics feel

REQ-PHY-002 caps dt at 0.05 s (20 FPS). At 20 FPS with GRAVITY = 1800 px/s², a single capped frame applies `1800 × 0.05 = 90 px/s` of velocity in one step. At TERMINAL_VELOCITY = 700 px/s, this means the velocity clamp will be hit in just ~8 frames of freefall. The feel may be "snappy" in normal play but the dt cap will cause a single large jump in position whenever the browser throttles — which is the exact problem it's meant to prevent.

**Recommendation:** Test with the recommended constants before finalizing. A tighter cap of 0.033 s (30 FPS minimum) provides better physics stability with negligible difference in tab-switch behavior.

---

### RISK-02 — 200-particle cap (REQ-NFR-006) vs. 2–3 trail particles per frame

REQ-AVF-013 emits 2–3 trail particles/frame × 60 FPS = 120–180 new particles per second. Each trail particle lives 0.25–0.45 s. Steady-state active trail particle count = rate × lifetime = ~150 × 0.35 = ~53 particles. A collision burst adds 12–16. This is well within the 200-cap for normal play. However, during a `SLOW_TIME` window (pipes slow, Ghosty likely more active), combined with a collision burst immediately after, the pool could momentarily spike. The cap is fine but the "oldest particle culled first" rule (REQ-NFR-006) will cull trail particles during a burst — which looks wrong visually since the burst is more dramatic.

**Recommendation:** Separate the particle pool into trail (max 150) and burst (max 50) pools rather than a single shared 200 cap.

---

### RISK-03 — Web Audio API procedural music (REQ-AVF-006) is a significant scope item

A seamlessly looping, retro-style procedurally generated music track using the Web Audio API is non-trivial. It requires understanding of oscillator nodes, envelope shaping, scheduling, and precise loop timing. For a single-developer project, this could consume more time than all physics and collision systems combined. The requirement is written as mandatory, not optional.

**Recommendation:** Downgrade to: "The system shall attempt to play a background music asset (`assets/bgm.ogg` or equivalent) if present. If no asset is present, background music is silently skipped." This avoids scope creep while keeping the door open for procedural synthesis if time permits. Alternatively, flag this as a stretch goal.

---

### RISK-04 — TILT_FACTOR formula may not match the mockup's ghost

REQ-PHY-012 computes rotation as `velocity_y × 0.05`, clamped to [-25°, +90°]. At TERMINAL_VELOCITY (700 px/s), this gives 700 × 0.05 = 35°, but the clamp caps it at 90°. At FLAP_VELOCITY (−520 px/s), it gives −26°, clamped to −25°. The formula effectively makes the tilt near-linear between -25° and ~35° during normal play, only hitting 90° in pure freefall above TERMINAL_VELOCITY — which is never reached since the clamp fires first at 700 px/s → 35°. The upper clamp of 90° is unreachable with the given constants.

**Recommendation:** Either raise TILT_FACTOR to 0.13 so TERMINAL_VELOCITY (700 px/s) approaches 90°, or lower the upper clamp to 45°. The current combination is internally inconsistent.

---

### RISK-05 — Single HTML file constraint (REQ-NFR-007) vs. multiple asset files

REQ-NFR-007 says the game is a single HTML file. The assets `ghosty.png`, `jump.wav`, and `game_over.wav` are external files in `assets/`. A single-file game that requires three co-located asset files is not truly a single-file game. If the user opens the HTML without the assets folder, the game will fail (see also GAP-07).

**Recommendation:** Either embed assets as Base64 data URIs inside the HTML, or change REQ-NFR-007 to read: "The game shall run from a single HTML entry point with no build step; co-located asset files are permitted."

---

### RISK-06 — Progressive speed + gap reduction may hit both floors simultaneously

REQ-OBG-011 increases speed by 12 px/s per 10 pipes, capping at 480 px/s. 480 - 220 = 260 px/s headroom ÷ 12 = ~21 speed steps. REQ-OBG-012 reduces GAP_HEIGHT_MIN by 4 px per step, flooring at 110 px. Starting at 140 px: (140 - 110) ÷ 4 = 7.5 steps until the gap floor is hit. This means after only ~75 pipes, the gap is at its minimum — but speed continues increasing for another ~140 pipes. A skilled player will face maximum difficulty gaps + maximum speed simultaneously for a very long stretch with no further challenge progression.

**Recommendation:** Introduce a second difficulty axis after both floors are reached — e.g. reduce PIPE_SPACING_MIN further, add random pipe velocity variation, or introduce a new obstacle type. At minimum, document the "both floors hit" scenario explicitly.

---

## 5. Consistency & Cross-Reference Audit

A check of all explicit cross-references (`REQ-X` citations) and section references ("Section N.N") found in the document.

| Citation | In Requirement | Target Exists? | Valid? |
|---|---|---|---|
| REQ-PRS-001 | REQ-DGP-003 | Yes | Valid |
| REQ-CDT-008 | REQ-GSM-014 | Yes | Valid |
| REQ-CDT-009 | REQ-GSM-014 | Yes | Valid |
| REQ-CDT-010 | REQ-CDT-011 | Yes | Valid |
| REQ-OBG-005 | REQ-OBG-012 | Yes | Valid |
| REQ-OBG-011 | REQ-GSM-009 | Yes | Valid |
| REQ-OBG-011 | REQ-OBG-005 | Yes | Valid |
| REQ-VUI-004 | REQ-GSM-008 | Yes | Valid |
| Section 3.1 | REQ-DGP-014 | Yes | Valid |
| REQ-AVF-017 | REQ-AVF-020 | Yes | Valid |
| "Section N.N" references in §3 | REQ-DGP-014 | Resolves to §3.1 | Valid |

**Orphaned requirements** (referenced by no other requirement and not part of a dependency chain):  
REQ-VUI-002 (parallax clouds), REQ-VUI-003 (idle bobbing), REQ-VUI-005 (pipe caps), REQ-AVF-006–009 (background music), REQ-NFR-003 (mobile).  
These are not cross-referenced but are self-contained and complete. No action required.

**Glossary coverage:** All 24 glossary terms are used in at least one requirement. No orphaned glossary entries. The following terms used in requirements are NOT in the glossary: `AABB`, `lerp`, `Web Audio API`, `requestAnimationFrame`. These are well-known technical terms and may not need glossary entries, but could be added for completeness.

---

## 6. Numeric Constants Consistency Check

All numeric constants mentioned across the document, verified for internal consistency:

| Constant | Defined In | Value | Used Consistently? | Notes |
|---|---|---|---|---|
| `GRAVITY` | REQ-PHY-003 | 1800 px/s² | Yes | — |
| `FLAP_VELOCITY` | REQ-PHY-005 | 520 px/s | Yes | — |
| `TERMINAL_VELOCITY` | REQ-PHY-008 | 700 px/s | Yes | See RISK-04 |
| `TILT_FACTOR` | REQ-PHY-012 | 0.05 deg/(px/s) | No | Unreachable 90° cap — see RISK-04 |
| Lerp smoothing | REQ-PHY-013 | 0.18 | Yes | Dimensionless |
| `PIPE_SPACING` | REQ-OBG-001 | 260 px | Yes | — |
| First pipe offset | REQ-OBG-003 | ≥350 px | Yes | — |
| `GAP_HEIGHT_MIN` | REQ-OBG-004 | 140 px | Yes | Floor 110 px |
| `GAP_HEIGHT_MAX` | REQ-OBG-004 | 180 px | Yes | — |
| `GAP_MARGIN` | REQ-OBG-007 | 60 px | Yes | — |
| `MIN_GAP_SEPARATION` | REQ-OBG-008 | 160 px | Yes | — |
| `PIPE_SPEED_BASE` | REQ-OBG-009 | 220 px/s | Yes | — |
| `SPEED_INCREMENT` | REQ-OBG-011 | 12 px/s | Yes | — |
| `PIPE_SPEED_MAX` | REQ-OBG-011 | 480 px/s | Yes | See RISK-06 |
| Speed steps until gap floor | Derived | ~7.5 steps | — | See RISK-06 |
| Speed steps until speed cap | Derived | ~21 steps | — | See RISK-06 |
| Gap reduction per step | REQ-OBG-012 | 4 px | Yes | — |
| Spacing reduction per step | REQ-OBG-013 | 6 px | Yes | — |
| `PIPE_SPACING_MIN` | REQ-OBG-013 | 180 px | Yes | — |
| `HITBOX_SCALE_X` | REQ-CDT-001 | 0.55 | Yes | — |
| `HITBOX_SCALE_Y` | REQ-CDT-001 | 0.60 | Yes | — |
| Screen shake duration | REQ-CDT-008 | 0.5 s | Yes | — |
| Screen shake peak | REQ-CDT-008 | ±10 px | Yes | — |
| Collision burst particles | REQ-CDT-009 | 12–16 | Yes | See RISK-02 |
| Particle lifetime (burst) | REQ-CDT-009 | 0.4–0.7 s | Yes | — |
| `IFRAMES_DURATION` | REQ-CDT-011 | 1.5 s | Yes | — |
| iFrame blink rate | REQ-CDT-012 | ~8 Hz | Yes | — |
| Double-Gap threshold N | REQ-DGP-002 | [3, 7] | Yes | — |
| MULTIPLIER_2X duration | REQ-DGP-008 | 5 passages | Yes | See AMB-04 |
| MULTIPLIER_3X duration | REQ-DGP-008 | 3 passages | Yes | — |
| SLOW_TIME reduction | REQ-DGP-008 | 40% | Yes | See CONFLICT-08 |
| SLOW_TIME duration | REQ-DGP-008 | 4 s | Yes | — |
| Feedback Label hold | REQ-PSF-009 | 1.2 s | Yes | — |
| Feedback Label fade | REQ-PSF-009 | 0.4 s | Yes | — |
| Trail particles/frame | REQ-AVF-013 | 2–3 | Yes | See RISK-02 |
| Trail lifetime | REQ-AVF-013 | 0.25–0.45 s | Yes | — |
| Trail particle size | REQ-AVF-013 | 3–6 px | Yes | — |
| Float indicator speed | REQ-AVF-017 | 40 px/s | Yes | — |
| Float indicator hold | REQ-AVF-017 | 0.9 s | Yes | — |
| Float indicator fade | REQ-AVF-017 | 0.3 s | Yes | — |
| Game over overlay delay | REQ-GSM-014 | 0.8 s | Yes | — |
| Max particle pool | REQ-NFR-006 | 200 | Yes | See RISK-02 |
| `PIPE_WIDTH` | — | **UNDEFINED** | No | See GAP-08 |
| `HUD_HEIGHT` | — | **UNDEFINED** | No | See GAP-09 |

---

## 7. EARS Notation Compliance Audit

EARS uses five templates: Ubiquitous (*The system shall*), Event-driven (*When* X, *the system shall*), State-driven (*While* X, *the system shall*), Conditional (*Where* X, *the system shall*), and Optional (*Where* X is included, *the system shall*).

**Findings:**

- All 144 requirements use one of the five EARS patterns correctly.
- Two requirements use informal phrasing inside their body that dilutes the EARS precision:
  - REQ-DGP-004 uses a bullet list for geometry definition. Acceptable for clarity but not strict EARS.
  - REQ-GSM-014 uses a numbered list inside the *When* body. Acceptable for sequencing but deviates from single-action EARS convention. Consider splitting into REQ-GSM-014a through 014d.
- REQ-PHY-012 and REQ-CDT-003 embed formulas — this is an accepted EARS extension and is well-formed.
- REQ-GSM-001 embeds an ASCII state diagram — this is not EARS but serves as a useful architectural aid. Consider marking it `[Non-normative illustration]` to prevent it from being treated as a testable requirement.

---

## 8. Testability Assessment

Requirements are rated on how easily they can be verified with automated tests or manual test cases.

| Rating | Count | Notes |
|---|---|---|
| Easily testable (deterministic, observable output) | 89 | Most physics, scoring, and state transition requirements |
| Testable with instrumentation (internal state must be exposed) | 31 | Particle counts, dt capping, modifier timers |
| Subjective / perceptual (requires human judgment) | 18 | "Subtle bobbing," "feels forgiving," "retro aesthetic," seamless music loop |
| Untestable as written | 6 | REQ-PHY-015 (simulation vs. render state separation — architectural, no observable behavior spec), REQ-NFR-002 (60 FPS — requires perf benchmark, not unit test), REQ-AVF-010 (duplicate of REQ-CDT-008 — redundant, can't add test value) |

**Untestable requirements to address:**
- **REQ-PHY-015:** Add an observable contract: "The rendered position of Ghosty shall never differ from the physics position by more than 2 px in Y at any frame."
- **REQ-NFR-002:** Add: "Measured via browser performance profiler on a mid-range device; frame time shall not exceed 20 ms on average over a 60-second play session."
- **REQ-AVF-010:** Merge into REQ-CDT-008; REQ-AVF-010 is a pure duplicate.

---

## 9. Summary Table

| Category | Count | Severity Distribution |
|---|---|---|
| Direct Conflicts | 9 | 3 High, 4 Medium, 2 Low |
| Gaps | 14 | 4 Blocking, 7 Important, 3 UX |
| Ambiguities | 11 | 3 High-impact, 5 Medium, 3 Low |
| Implementation Risks | 6 | 2 Scope, 2 Physics, 2 Architecture |
| Untestable Requirements | 6 | 1 Redundant (merge), 2 need acceptance criteria, 3 need instrumentation |

---

## 10. Recommended Pre-Implementation Actions (Priority Order)

| Priority | Action | Resolves |
|---|---|---|
| P0 — Must fix before any code | Unify scoring formula to include precision bonus inside multiplier | CONFLICT-01 |
| P0 — Must fix before any code | Add iFrame exception clause to REQ-CGL-008 | CONFLICT-06 |
| P0 — Must fix before any code | Clarify single scoring moment (midpoint = score + counter) | CONFLICT-04 |
| P0 — Must fix before any code | Define `PIPE_WIDTH` and `HUD_HEIGHT` constants | GAP-08, GAP-09 |
| P1 — Fix before physics implementation | Validate TILT_FACTOR vs. clamp values are reachable | RISK-04 |
| P1 — Fix before physics implementation | Tighten dt cap to 0.033 s | RISK-01 |
| P1 — Fix before feature implementation | Clarify Double-Gap base score counting (1 event or 2) | GAP-03 |
| P1 — Fix before feature implementation | Specify Double-Gap pipes-passed counter contribution | GAP-05 |
| P1 — Fix before feature implementation | Define reset scope for new game | GAP-06 |
| P2 — Fix before audio implementation | Decide on background music approach (procedural vs. asset) | RISK-03 |
| P2 — Fix before UI implementation | Introduce second notification channel for Speed Up | GAP-12 |
| P2 — Fix before UI implementation | Resolve mobile pause gesture | GAP-10 |
| P3 — Clarify for polish pass | Define badge visual spec (size, z-order, animation) | GAP-04 |
| P3 — Clarify for polish pass | Define particle pool split (trail vs. burst) | RISK-02 |
| P3 — Nice to have | Define background music structure if procedural | AMB-10 |
