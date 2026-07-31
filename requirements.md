# Flappy Kiro — Requirements Document
**Notation:** EARS (Easy Approach to Requirements Syntax)  
**Version:** 0.3 — Draft  
**Date:** 2026-07-31  
**Changes from v0.2:** Resolves all 9 conflicts, 14 gaps, 11 ambiguities, and 6 implementation risks identified in `requirements-analysis.md`. Incorporates user clarifications on Double-Gap pipe counting, modifier scope, scoring formula, and notification channels.

---

## Glossary

| Term | Definition |
|---|---|
| **Ghosty** | The player-controlled ghost character sprite. |
| **Pipe** | A vertical obstacle pair (top + bottom segment) that Ghosty must fly through. |
| **Gap** | The vertical opening between the top and bottom pipe segments through which Ghosty passes. |
| **Single-Gap Pipe** | Standard pipe with one gap. |
| **Double-Gap Pipe** | Special pipe with two vertically-stacked gaps separated by a solid middle segment. |
| **Pipe Rarity** | Color-coded tier that determines base score awarded on gap passage: Green (Common), Purple (Rare), Gold (Very Rare). |
| **Precision Tier** | Rating of how centered Ghosty's vertical position is within the gap at the moment of passage: Perfecto, Bueno, or Casi. |
| **Score Modifier** | A floating collectible inside a Double-Gap Pipe's gap that applies a bonus or transformation to the current score when Ghosty passes through that gap. |
| **Active Multiplier** | A multiplier value (default 1×) applied to all base score gains until it expires or is overwritten. |
| **Scoring Moment** | The single canonical instant at which score, precision, and modifier effects are all calculated: when Ghosty's horizontal midpoint crosses the x-midpoint of a gap. |
| **System Notification** | A brief in-game message (e.g., "Speed Up!", "Shield Active!") displayed in a subtitle channel below the Feedback Label, distinct from precision feedback. |
| **Pipes-Passed Counter** | An integer tracking the number of physical pipe obstacles fully traversed since game start, used for speed-progression triggers. Each physical pipe (Single or Double-Gap) increments this counter by exactly 1. |
| **Game Reset** | The full restoration of all gameplay variables to their initial values when a new game begins. Covers score, speed, modifiers, timers, iFrames, and particle systems. |
| **HUD** | Heads-Up Display bar rendered at the bottom of the canvas showing live game state. |
| **Feedback Label** | Short animated text rendered at the top-center of the screen after a precision event. |
| **Gravity Constant** | Fixed downward acceleration (px/frame²) applied to Ghosty every game tick. |
| **Flap Velocity** | Upward velocity impulse (px/frame, negative Y) applied to Ghosty on each flap input. |
| **Terminal Velocity** | Maximum downward speed (px/frame) Ghosty can reach; velocity is clamped to this value. |
| **Hitbox** | Axis-aligned bounding rectangle used for collision testing, smaller than Ghosty's sprite. |
| **Invincibility Frame (iFrame)** | A brief period after a collision event during which additional collisions are ignored. |
| **Screen Shake** | Temporary camera-offset animation applied to the canvas to communicate impact. |
| **Particle Trail** | Small short-lived visual particles emitted from Ghosty's position each frame. |
| **Floating Score Indicator** | Animated number that rises and fades at the score-award position after a gap passage. |
| **Pipe Pair Spacing** | Horizontal distance (px) between the leading edge of one pipe and the leading edge of the next. |
| **Gap Height** | Vertical opening size (px) of a single gap, defining how much vertical room Ghosty has. |
| **Gap Center Y** | Vertical midpoint of a gap opening, used for precision calculation and modifier placement. |
| **Pause State** | A suspended game state in which all simulation updates halt and a pause overlay is shown. |
| **Delta Time (dt)** | Elapsed time in seconds between frames, used for frame-rate-independent physics integration. |
| **PIPE_WIDTH** | Width in pixels of a pipe segment. Named constant; default value: **52 px**. |
| **HUD_HEIGHT** | Height in pixels of the HUD bar at the canvas bottom. Named constant; default value: **40 px**. |
| **Modifier Badge** | A visual collectible icon displayed inside a Double-Gap Pipe's gap showing a dynamic arithmetic expression representing the modifier's effect on the total accumulated score. |
| **Subtitle Channel** | A secondary notification line rendered below the Feedback Label, used exclusively for system events (Speed Up, shield activation, etc.) so they do not overwrite precision feedback. |

---

## 1. Core Game Loop

### 1.1 Start Screen

**REQ-CGL-001**  
*Where* the game is first loaded in a browser, *the system shall* display a start screen showing the game title "Flappy Kiro", the Ghosty sprite, the current high score, and a prompt to begin play (spacebar, click, or tap).

**REQ-CGL-002**  
*When* the player presses Space, clicks, or taps on the start screen, *the system shall* transition immediately to the Playing state and begin spawning pipes.

### 1.2 Playing State

**REQ-CGL-003**  
*While* the game is in the Playing state, *the system shall* continuously scroll all pipes from right to left at a configurable base speed.

**REQ-CGL-004**  
*While* the game is in the Playing state, *the system shall* apply a constant downward gravitational acceleration to Ghosty's vertical position each frame.

**REQ-CGL-005**  
*When* the player presses Space, clicks, or taps during the Playing state, *the system shall* apply an upward velocity impulse to Ghosty.

**REQ-CGL-006**  
*While* the game is in the Playing state, *the system shall* clamp Ghosty's position to y = 0 and zero upward velocity when the top of the hitbox would exceed the top canvas boundary. Ceiling contact does **not** trigger Game Over (see REQ-CDT-007).

**REQ-CGL-007**  
*When* the bottom of Ghosty's hitbox reaches or exceeds `canvas_height − HUD_HEIGHT`, *the system shall* trigger the Game Over state (ground collision). The ground boundary is `canvas_height − HUD_HEIGHT`, not the raw canvas bottom edge.

### 1.3 Collision Detection

**REQ-CGL-008**  
*When* Ghosty's hitbox overlaps with any pipe segment (top, bottom, or middle solid block of a Double-Gap Pipe), *the system shall* immediately trigger the Game Over state, **unless** invincibility frames are currently active (REQ-CDT-011), in which case the collision is ignored and the game continues.

**REQ-CGL-009**  
*The system shall* use a reduced hitbox (smaller than the visible sprite bounds) for Ghosty to provide forgiving collision detection consistent with the retro game feel.

### 1.4 Scrolling Speed Progression

**REQ-CGL-010**  
*While* the game is in the Playing state, *the system shall* incrementally increase the pipe scroll speed every 10 pipes passed, up to a configurable maximum speed cap.

### 1.5 Game Over State

**REQ-CGL-011**  
*When* the Game Over state is triggered, *the system shall* stop all pipe movement, play the game-over sound (`assets/game_over.wav`), and display the Game Over screen.

**REQ-CGL-012**  
*The* Game Over screen *shall* display the final score, the all-time high score, and a prompt to restart.

**REQ-CGL-013**  
*When* the final score exceeds the stored high score, *the system shall* update the high score in browser `localStorage` before displaying the Game Over screen.

**REQ-CGL-014**  
*When* the player presses Space, clicks, or taps on the Game Over screen, *the system shall* perform a full Game Reset (REQ-GSM-021) and transition to the Playing state. The player may also press **M** on the Game Over screen to return to MAIN_MENU without restarting (see REQ-GSM-017).

### 1.6 Audio

**REQ-CGL-015**  
*When* the player triggers a flap input during the Playing state, *the system shall* play the jump sound (`assets/jump.wav`).

**REQ-CGL-016**  
*The system shall* allow the player to toggle mute via **both** the **M key** (on any screen) and a **persistent mute button** rendered in a fixed UI corner (recommended: top-right) visible on all game screens. Both inputs toggle the same mute state. The mute preference *shall* persist in `localStorage` (REQ-GSM-020). *(Supersedes REQ-AVF-005 — see §10.1.)*

---

## 2. Pipe Rarity & Base Score

### 2.1 Pipe Color & Rarity Assignment

**REQ-PRS-001**  
*When* the system spawns a new Single-Gap Pipe, *the system shall* assign its rarity tier according to the following weighted probability distribution:
- **Green (Common):** 65% probability
- **Purple (Rare):** 25% probability
- **Gold (Very Rare):** 10% probability

**REQ-PRS-002**  
*The system shall* render each pipe using a distinct color palette matching its rarity tier:
- Green pipes: green hue consistent with classic Flappy Bird style.
- Purple pipes: deep violet/purple hue as depicted in the UI mockup.
- Gold pipes: warm gold/amber hue as depicted in the UI mockup.

### 2.2 Base Score on Gap Passage

**REQ-PRS-003**  
*When* the Scoring Moment is reached for a Green pipe's gap, *the system shall* use **1** as the base point value for that gap.

**REQ-PRS-004**  
*When* the Scoring Moment is reached for a Purple pipe's gap, *the system shall* use **2** as the base point value for that gap.

**REQ-PRS-005**  
*When* the Scoring Moment is reached for a Gold pipe's gap, *the system shall* use **3** as the base point value for that gap.

**REQ-PRS-006**  
*At* the Scoring Moment, *the system shall* calculate and award points using the unified formula:  
`points_awarded = floor((base_points + precision_bonus) × active_multiplier)`  
where `base_points` is determined by rarity (REQ-PRS-003–005), `precision_bonus` is determined by the precision tier (REQ-PSF-005–007), and `active_multiplier` defaults to 1 when no multiplier is active. The result is added immediately to the running score.

### 2.3 HUD Score Display

**REQ-PRS-007**  
*While* the game is in the Playing state, *the system shall* display the current score and all-time high score in the HUD bar at the bottom of the canvas, updating in real time after each gap passage.

---

## 3. Precision Scoring & UI Feedback

### 3.1 Precision Calculation & Scoring Moment

**REQ-PSF-001**  
*The system shall* define the **Scoring Moment** as the instant when Ghosty's horizontal midpoint crosses the x-midpoint of a pipe gap (computed from the pipe's current x position that frame). At this single moment, the system shall simultaneously: (1) calculate the precision value, (2) determine the precision tier and bonus, and (3) apply the unified scoring formula (REQ-PRS-006). No additional score event fires for the same gap after this moment.

**REQ-PSF-001B**  
*At* the Scoring Moment, *the system shall* calculate a **precision value** defined as:  
`precision = 1 - (|ghosty_center_y - gap_center_y| / (gap_height / 2))`  
where `precision` is clamped to the range `[0, 1]`, with 1.0 being perfectly centered. If a collision is also detected on the same frame, the collision takes priority and no score is awarded for that gap.

### 3.2 Precision Tier Classification

**REQ-PSF-002**  
*When* the precision value is **≥ 0.75**, *the system shall* classify the pass as **Perfecto** tier.

**REQ-PSF-003**  
*When* the precision value is **≥ 0.35 and < 0.75**, *the system shall* classify the pass as **Bueno** tier.

**REQ-PSF-004**  
*When* the precision value is **< 0.35**, *the system shall* classify the pass as **Casi** tier.

### 3.3 Precision Bonus Points

**REQ-PSF-005**  
*When* the precision tier is **Perfecto**, *the system shall* set `precision_bonus = 2` for use in the scoring formula (REQ-PRS-006).

**REQ-PSF-006**  
*When* the precision tier is **Bueno**, *the system shall* set `precision_bonus = 1` for use in the scoring formula (REQ-PRS-006).

**REQ-PSF-007**  
*When* the precision tier is **Casi**, *the system shall* set `precision_bonus = 0` for use in the scoring formula (REQ-PRS-006).

### 3.4 Feedback Label Display

**REQ-PSF-008**  
*When* a gap passage is scored, *the system shall* render a **Feedback Label** with its top edge at **y = 20 px**, horizontally centered on the canvas, using the following mapping:

| Precision Tier | Label Text | Text Color |
|---|---|---|
| Perfecto | `"¡Perfecto!"` | Green (`#00FF00` or equivalent) |
| Bueno | `"¡Bueno!"` | Yellow (`#FFD700` or equivalent) |
| Casi | `"¡Casi la quedás!"` | Red (`#FF4444` or equivalent) |

**REQ-PSF-008B**  
*The system shall* provide a **Subtitle Channel** rendered directly below the Feedback Label (top edge at `feedback_label_bottom + 8 px`), used exclusively for system event notifications (e.g. "Speed Up!", "Shield Active!", "Slow Time!"). The Subtitle Channel text *shall* use a distinct cyan color (`#00FFFF` or equivalent), a smaller font (minimum 18 px), and the same fade-out lifecycle as the Feedback Label. System notifications in the Subtitle Channel **never** replace or interrupt the Feedback Label above them.

**REQ-PSF-009**  
*The* Feedback Label *shall* appear at full opacity, remain visible for approximately 1.2 seconds, then fade out over approximately 0.4 seconds.

**REQ-PSF-010**  
*When* a new gap is scored while a Feedback Label is already displayed, *the system shall* immediately replace the current label with the new one, resetting the display timer.

**REQ-PSF-011**  
*The* Feedback Label *shall* use a bold, large font (minimum 36px) consistent with the retro aesthetic shown in the UI mockup, matching the style of the "PERFECTO" display in the reference image.

### 3.5 HUD Precision State

**REQ-PSF-012**  
*While* the game is in the Playing state, *the system shall* display the most recent Feedback Label text (e.g. "Perfecto", "Bueno", "Casi") as a static field labeled "Text:" in the HUD bar at the bottom.

---

## 4. Special Double-Gap Pipes & Score Modifiers

### 4.1 Double-Gap Pipe Spawning

**REQ-DGP-001**  
*While* the game is in the Playing state, *the system shall* maintain an internal counter tracking the number of Single-Gap Pipes spawned since the last Double-Gap Pipe (or since the game started). A Double-Gap Pipe counts as **exactly 1** toward the Pipes-Passed Counter (REQ-GSM-009) regardless of how many of its gaps are traversed.

**REQ-DGP-002**  
*When* the Single-Gap Pipe counter reaches a threshold value **N**, *the system shall* spawn a Double-Gap Pipe in place of the next standard pipe and reset the counter to zero. The threshold **N** *shall* be selected uniformly at random from the integer range **[3, 7]** each time a new threshold is set.

**REQ-DGP-003**  
*The* Double-Gap Pipe *shall* have the same rarity assignment rules as Single-Gap Pipes (REQ-PRS-001), with the rarity tier applied to the entire pipe structure.

### 4.2 Double-Gap Pipe Geometry

**REQ-DGP-004**  
*The* Double-Gap Pipe *shall* consist of:
- A **top pipe segment** extending downward from the top of the canvas.
- A **middle solid block** separating the two gaps.
- A **bottom pipe segment** extending upward from the bottom of the canvas.
- **Upper gap:** the opening between the top segment and the top of the middle block.
- **Lower gap:** the opening between the bottom of the middle block and the bottom segment.

**REQ-DGP-005**  
*The system shall* ensure both gaps in a Double-Gap Pipe are each at least as large as the minimum single-gap height to allow Ghosty to pass through either gap independently.

**REQ-DGP-006**  
*The system shall* display "Double" in the "Gaps:" field of the HUD bar while a Double-Gap Pipe is the most recently spawned or most recently passed pipe; otherwise it *shall* display "Single".

### 4.3 Score Modifier Collectibles

**REQ-DGP-007**  
*When* a Double-Gap Pipe is spawned, *the system shall* place exactly one **Score Modifier collectible** (Modifier Badge) floating at the horizontal and vertical center of **each** of its two gaps, yielding two collectibles per Double-Gap Pipe. The two badges *shall* always carry **different** modifier types (assigned without replacement from the pool — see REQ-DGP-008B).

**REQ-DGP-007B**  
*Each* Modifier Badge *shall* display a **dynamic arithmetic expression** computed at spawn time using the current total accumulated score `S`, so the player can evaluate the reward before choosing which gap to traverse. The expression format per modifier type is:

| Modifier ID | Badge Expression Example | Notes |
|---|---|---|
| `MULTIPLIER_2X` | `Total × 1.05` | Shows approximate score gain over 5 passages at ×2 |
| `MULTIPLIER_3X` | `[pipe_value] × 3` | Shows per-pipe value at the current pipe's rarity |
| `BONUS_FLAT` | `S ± 10%` → rendered as e.g. `+18` (if S=17) | Exact value computed with sampled random at spawn |
| `SCORE_DOUBLE` | `S × 2` → rendered as e.g. `34` (if S=17) | Shows resulting total |
| `GHOST_SHIELD` | `Shield` | Static label; no arithmetic expression |
| `SLOW_TIME` | `Slow` | Static label; no arithmetic expression |

Where S = 0, all arithmetic expressions that would yield 0 or less *shall* display the guaranteed minimum value (`+5`) instead (see REQ-DGP-008C).

**REQ-DGP-008**  
*The system shall* define the modifier pool and each modifier's effect on the **total accumulated score** as follows:

| Modifier ID | Label | Effect on Total Score |
|---|---|---|
| `MULTIPLIER_2X` | `×2` | Sets the Active Multiplier to 2 for the next **5** gap passages. Each passage's `points_awarded` (REQ-PRS-006) is multiplied. |
| `MULTIPLIER_3X` | `×3` | Sets the Active Multiplier to 3 for the next **3** gap passages. Each passage's `points_awarded` is multiplied. |
| `BONUS_FLAT` | `+[S ± 10%]` | Adds a flat bonus to the total score equal to `max(5, round(S × (0.9 + random() × 0.2)))`, where S is the total accumulated score at the moment of collection. |
| `SCORE_DOUBLE` | `×2 Score` | Sets the total accumulated score to `max(5, S × 2)` instantly. |
| `GHOST_SHIELD` | `Shield` | Grants one free collision pardon; the next pipe collision is negated and the shield consumed. No direct score effect. |
| `SLOW_TIME` | `Slow` | Reduces current runtime pipe speed by 40% for 4 seconds, then restores to `max(speed_at_activation, current_progression_speed)` to never drop below the earned difficulty floor. |

**REQ-DGP-008B**  
*When* assigning modifiers to the two gaps of a Double-Gap Pipe, *the system shall* select the first modifier uniformly at random from the full pool, then select the second modifier uniformly at random from the remaining pool (i.e. **without replacement**), ensuring the two gaps always carry different modifier types.

**REQ-DGP-008C**  
*When* any modifier's computed score effect would result in a total score change of zero or less (e.g. `SCORE_DOUBLE` when S = 0, `BONUS_FLAT` when S = 0, `MULTIPLIER_2X` when base + precision = 0), *the system shall* apply a guaranteed minimum bonus of **+5 points** to the total accumulated score instead, so no collectible is ever wasted.

**REQ-DGP-009**  
*When* Ghosty passes through a gap of a Double-Gap Pipe that contains an uncollected Score Modifier, *the system shall* trigger that modifier's effect immediately upon gap crossing and remove the collectible from the canvas.

**REQ-DGP-010**  
*When* a Score Modifier collectible is not collected (i.e., Ghosty passes through the other gap or the pipe scrolls off-screen), *the system shall* discard that modifier with no effect.

**REQ-DGP-011**  
*When* a new `MULTIPLIER_2X` or `MULTIPLIER_3X` modifier is collected while an Active Multiplier is already running, *the system shall* overwrite the existing multiplier with the new one, discarding any remaining passage count from the previous multiplier and resetting the counter to the new multiplier's duration.

**REQ-DGP-011B**  
*The* Active Multiplier passage counter *shall* decrement by **exactly 1** for each Scoring Moment that produces a `points_awarded` value (REQ-PRS-006), regardless of whether the Scoring Moment is for a Single-Gap or Double-Gap pipe gap. When the counter reaches 0, the Active Multiplier reverts to 1× immediately after that final passage's score is applied.

**REQ-DGP-012**  
*The system shall* render each Modifier Badge as a **28 × 28 px** floating badge centered within its gap. Each badge *shall*:
- Display the dynamic expression text from REQ-DGP-007B in a bold font at the badge's center.
- Animate with a vertical bob of **±4 px** at **1 Hz** (sine wave) to draw the player's attention.
- Render **above** pipe segments in z-order but **below** Ghosty, so it is never obscured by pipes.
- Be fully contained within the gap's vertical bounds at all bob positions.
- Visually distinguish each modifier type via a distinct background color or icon tint (e.g. gold for SCORE_DOUBLE, blue for GHOST_SHIELD, green for MULTIPLIER, orange for BONUS_FLAT, teal for SLOW_TIME).

**REQ-DGP-013**  
*While* an Active Multiplier is in effect, *the system shall* display the active multiplier value (e.g. "×2") in the "Modifier:" field of the HUD bar; when no multiplier is active, *the system shall* display "None" or the name of the last non-multiplier modifier collected.

### 4.4 Scoring on Double-Gap Pipes

**REQ-DGP-014**  
*When* Ghosty passes through a gap of a Double-Gap Pipe, *the system shall* treat **only the traversed gap** as the Scoring Moment. The other gap produces no score and its modifier (if uncollected) is discarded when the pipe scrolls off-screen (REQ-DGP-010). Passing through both gaps (two separate traversals of the same pipe) is physically impossible within a single pass; one gap is chosen by Ghosty's vertical path.

**REQ-DGP-014B**  
*At* the Scoring Moment for the traversed gap, *the system shall* apply the unified scoring formula (REQ-PRS-006) using the precision value calculated for that specific gap's center (REQ-PSF-001B), and trigger the modifier effect for that gap's badge (REQ-DGP-009).

---

## 5. Visual & UI Requirements

### 5.1 Canvas & Background

**REQ-VUI-001**  
*The system shall* render the game on an HTML5 `<canvas>` element with dimensions defined as named constants `CANVAS_WIDTH` and `CANVAS_HEIGHT` in the game configuration object (recommended defaults: **800 × 500 px**), centered in the browser viewport.

**REQ-VUI-002**  
*The* game background *shall* be a sky-blue color (`#AEE0F0` or equivalent) as depicted in the UI mockup, with decorative cloud sprites scrolling slowly in the background at a rate slower than the pipes (parallax effect).

**REQ-VUI-003**  
*The system shall* render Ghosty using the provided sprite `assets/ghosty.png` and animate a subtle idle bobbing when on the start/game-over screens.

### 5.2 HUD Bar

**REQ-VUI-004**  
*While* the game is in the Playing state, *the system shall* render a dark semi-transparent HUD bar at the bottom of the canvas containing the following fields in order:  
`Score: [N] | High: [N] | Gaps: [Single|Double] | Modifier: [value] | Text: [label]`  
matching the layout shown in the UI mockup.

### 5.3 Pipe Caps

**REQ-VUI-005**  
*The system shall* render a horizontal cap/header block at the open end of each pipe segment (the end facing the gap) to match the classic Flappy Bird aesthetic and the mockup's pipe silhouettes.

---

## 6. Physics System

### 6.1 Frame-Rate-Independent Integration

**REQ-PHY-001**  
*The system shall* drive all physics calculations using **delta time (dt)** — the elapsed seconds since the previous frame — so that Ghosty's movement is consistent regardless of frame rate fluctuations.

**REQ-PHY-002**  
*The system shall* cap `dt` to a maximum of **0.033 seconds** (equivalent to ~30 FPS) to prevent large position jumps caused by tab-switching or browser throttling. This tighter cap avoids the physics instability that occurs at the prior 0.05 s cap when GRAVITY = 1800 px/s² is applied in a single step.

### 6.2 Gravity

**REQ-PHY-003**  
*While* the game is in the Playing state, *the system shall* apply a downward gravitational acceleration to Ghosty each frame using the formula:  
`velocity_y += GRAVITY × dt`  
where `GRAVITY` is a configurable constant with a recommended default of **1800 px/s²**.

**REQ-PHY-004**  
*The system shall* expose `GRAVITY` as a named constant in the game configuration object so it can be tuned without modifying game logic.

### 6.3 Flap / Ascent Velocity

**REQ-PHY-005**  
*When* the player triggers a flap input (Space, click, or tap) during the Playing state, *the system shall* set Ghosty's vertical velocity to a fixed upward impulse:  
`velocity_y = -FLAP_VELOCITY`  
where `FLAP_VELOCITY` is a configurable constant with a recommended default of **520 px/s** (negative Y = upward).

**REQ-PHY-006**  
*The system shall* replace (not add to) any current vertical velocity with `FLAP_VELOCITY` on each flap input, ensuring predictable, consistent ascent regardless of prior momentum.

**REQ-PHY-007**  
*The system shall* expose `FLAP_VELOCITY` as a named constant in the game configuration object.

### 6.4 Terminal Velocity

**REQ-PHY-008**  
*While* the game is in the Playing state, *the system shall* clamp Ghosty's downward velocity to a maximum of `TERMINAL_VELOCITY` after each gravity integration step:  
`velocity_y = min(velocity_y, TERMINAL_VELOCITY)`  
where `TERMINAL_VELOCITY` is a configurable constant with a recommended default of **700 px/s**.

**REQ-PHY-009**  
*The system shall* expose `TERMINAL_VELOCITY` as a named constant in the game configuration object.

### 6.5 Position Update

**REQ-PHY-010**  
*Each frame*, *the system shall* update Ghosty's Y position using the integrated velocity:  
`position_y += velocity_y × dt`

**REQ-PHY-011**  
*When* Ghosty's computed position_y would place the top of the hitbox above the canvas top boundary (y < 0), *the system shall* clamp position_y to 0 and set velocity_y to 0 (ceiling bounce suppression).

### 6.6 Rotation & Sprite Tilt

**REQ-PHY-012**  
*The system shall* rotate the Ghosty sprite each frame to visually reflect vertical velocity, using:  
`rotation = clamp(velocity_y × TILT_FACTOR, -25°, 90°)`  
where `TILT_FACTOR` is a configurable constant with a recommended default of **0.13 deg/(px/s)**. At `TERMINAL_VELOCITY` (700 px/s), this produces `700 × 0.13 = 91°`, which clamps to the 90° maximum — ensuring the full tilt range is reachable. On ascent at `FLAP_VELOCITY` (−520 px/s), rotation = −25° (nose-up, at clamp floor).

**REQ-PHY-013**  
*The system shall* interpolate the rendered sprite rotation toward the target rotation each frame using lerp with a configurable smoothing factor (recommended default: **0.18**) to avoid abrupt snapping.

### 6.7 Smooth Movement Interpolation

**REQ-PHY-014**  
*The system shall* use **linear interpolation (lerp)** for all non-physics visual transitions (e.g. HUD value counters animating to their new values, Feedback Label scale-in pop effect) with per-element configurable speeds.

**REQ-PHY-015**  
*The system shall* separate simulation state (physics positions, velocities) from render state (interpolated draw positions) so that rendering can interpolate between the previous and current simulation step when sub-frame smoothing is applied.

---

## 7. Obstacle Generation

### 7.1 Pipe Pair Spacing

**REQ-OBG-000**  
*The system shall* define the following pipe dimension constants in the game configuration object:
- `PIPE_WIDTH = 52` px — the horizontal width of every pipe segment (Single and Double-Gap).
- `HUD_HEIGHT = 40` px — the height of the HUD bar at the canvas bottom, used in gap positioning (REQ-OBG-007) and ground collision detection (REQ-CDT-006).

These values are used in all pipe collision boundaries (REQ-CDT-003), recycling triggers (REQ-OBG-015), and safe-bounds formulas throughout §7 and §8.

**REQ-OBG-001**  
*The system shall* spawn pipes such that the horizontal distance between the leading edges of consecutive pipe pairs is `PIPE_SPACING` pixels, where `PIPE_SPACING` is a configurable constant with a recommended default of **260 px**.

**REQ-OBG-002**  
*The system shall* expose `PIPE_SPACING` as a named constant in the game configuration object.

**REQ-OBG-003**  
*The system shall* spawn the first pipe pair at a horizontal offset of at least **350 px** from Ghosty's starting X position to give the player a brief reaction window at game start.

### 7.2 Gap Size

**REQ-OBG-004**  
*The system shall* define a configurable `GAP_HEIGHT_MIN` and `GAP_HEIGHT_MAX` (recommended defaults: **140 px** and **180 px** respectively) and select the gap height for each new pipe uniformly at random within that range.

**REQ-OBG-005**  
*The system shall* reduce `GAP_HEIGHT_MIN` and `GAP_HEIGHT_MAX` at each speed increment step as defined in REQ-OBG-012, with a hard floor of **110 px** that is never breached regardless of speed or score.

**REQ-OBG-006**  
*For* Double-Gap Pipes, *the system shall* apply the same gap height selection independently to each of the two gaps.

### 7.3 Random Gap Vertical Positioning

**REQ-OBG-007**  
*When* spawning a new pipe, *the system shall* place the vertical center of the gap at a random Y position within safe bounds:  
`gap_center_y ∈ [GAP_MARGIN + gap_height/2,  canvas_height - HUD_HEIGHT - GAP_MARGIN - gap_height/2]`  
where `GAP_MARGIN` is a configurable constant (recommended default: **60 px**) that prevents gaps from appearing too close to the top or bottom edge.

**REQ-OBG-008**  
*When* spawning a Double-Gap Pipe, *the system shall* ensure the two gap centers are at least `MIN_GAP_SEPARATION` pixels apart (recommended default: **160 px**) so both gaps are clearly navigable.

### 7.4 Wall Movement Speed

**REQ-OBG-009**  
*The system shall* move all active pipe pairs leftward each frame by:  
`pipe_x -= PIPE_SPEED × dt`  
where `PIPE_SPEED` starts at a configurable base value `PIPE_SPEED_BASE` (recommended default: **220 px/s**).

**REQ-OBG-010**  
*The system shall* expose `PIPE_SPEED_BASE` as a named constant and track the current runtime speed in a separate mutable variable so modifiers (e.g. `SLOW_TIME`) can adjust it without altering the base constant.

### 7.5 Progressive Speed Increase

**REQ-OBG-011**  
*Every* time the player passes **10 pipes** (cumulative count since game start), *the system shall* increase the current pipe speed by `SPEED_INCREMENT` (recommended default: **12 px/s**), up to `PIPE_SPEED_MAX` (recommended default: **480 px/s**).

**REQ-OBG-012**  
*The system shall* simultaneously reduce `GAP_HEIGHT_MIN` by **4 px** and `GAP_HEIGHT_MAX` by **4 px** at each speed increment step, subject to the hard floor defined in REQ-OBG-005.

**REQ-OBG-013**  
*The system shall* reduce `PIPE_SPACING` by **6 px** at each speed increment step, down to a configurable minimum `PIPE_SPACING_MIN` (recommended default: **180 px**).

**REQ-OBG-016**  
*When* both `GAP_HEIGHT_MIN` has reached its hard floor (**110 px**) and `PIPE_SPEED` has reached `PIPE_SPEED_MAX` (**480 px/s**), *the system shall* activate a **third difficulty axis** for all subsequent speed increment steps:
- Reduce `PIPE_SPACING_MIN` by an additional **5 px** per step, down to an absolute minimum of **140 px**.
- Apply a random **vertical velocity variation** to newly spawned pipes: each pipe oscillates its gap center Y by ±`PIPE_DRIFT_AMPLITUDE` px at `PIPE_DRIFT_FREQ` Hz (recommended defaults: amplitude **20 px**, frequency **0.5 Hz**), creating a gentle drift to prevent pure pattern memorization.
- The third axis activates at most once per game session; it does not reset until a new game begins.

**REQ-OBG-014**  
*When* a speed increment is triggered, *the system shall* display a "Speed Up!" notification in the **Subtitle Channel** (REQ-PSF-008B) in cyan, distinct from and non-disruptive to any active precision Feedback Label.

### 7.6 Pipe Recycling

**REQ-OBG-015**  
*When* a pipe pair's right edge scrolls past x = −pipe_width, *the system shall* remove it from the active pipe list and release its resources to prevent unbounded memory growth.

---

## 8. Collision Detection

### 8.1 Ghosty Hitbox Definition

**REQ-CDT-001**  
*The system shall* define Ghosty's hitbox as an axis-aligned rectangle centered on the sprite with dimensions:  
`hitbox_width  = sprite_width  × HITBOX_SCALE_X`  
`hitbox_height = sprite_height × HITBOX_SCALE_Y`  
where `HITBOX_SCALE_X` and `HITBOX_SCALE_Y` are configurable constants (recommended defaults: **0.55** and **0.60** respectively).

**REQ-CDT-002**  
*The system shall* recalculate the hitbox position every frame based on Ghosty's current position_y and the fixed position_x before any collision checks are run.

### 8.2 Pipe Collision Boundaries

**REQ-CDT-003**  
*The system shall* define each pipe segment's collision boundary as a full-width axis-aligned rectangle:  
- **Top segment:** `{ x: pipe_x, y: 0, w: pipe_width, h: gap_top_y }`  
- **Bottom segment:** `{ x: pipe_x, y: gap_bottom_y, w: pipe_width, h: canvas_height - gap_bottom_y }`  
- **Middle block (Double-Gap only):** `{ x: pipe_x, y: upper_gap_bottom_y, w: pipe_width, h: lower_gap_top_y - upper_gap_bottom_y }`

**REQ-CDT-004**  
*The system shall* test Ghosty's hitbox against every active pipe segment's collision boundary each frame using AABB (Axis-Aligned Bounding Box) intersection.

**REQ-CDT-005**  
*The system shall* include the pipe cap block in the collision boundary of the respective segment (cap is not a separate collision zone).

### 8.3 Ground & Ceiling Detection

**REQ-CDT-006**  
*When* the bottom of Ghosty's hitbox reaches or exceeds `canvas_height - HUD_HEIGHT`, *the system shall* trigger the Game Over state (ground collision).

**REQ-CDT-007**  
*When* the top of Ghosty's hitbox reaches or goes above `y = 0`, *the system shall* clamp Ghosty's position to the ceiling and zero the upward velocity (ceiling collision, not game over).

### 8.4 Collision Response Animation

**REQ-CDT-008**  
*When* a pipe or ground collision triggers the Game Over state, *the system shall* play a **Screen Shake** effect implemented as:  
`offset = peak_amplitude × (1 - elapsed / duration) × random_unit_vector`  
where `peak_amplitude = 10 px`, `duration = 0.5 seconds`, and `random_unit_vector` is re-sampled every **2 frames** to produce a jitter feel. The resulting offset is applied as a translation of the canvas rendering context's origin (purely cosmetic — no physics positions are modified). Screen Shake also triggers the Subtitle Channel notification "!" for 0.5 s.

**REQ-CDT-009**  
*When* a pipe collision triggers the Game Over state, *the system shall* emit a **burst of 12–16 particles** from Ghosty's position, each particle having a random outward velocity, a lifetime of **0.4–0.7 seconds**, and fading from full opacity to transparent over its lifetime.

**REQ-CDT-010**  
*When* a collision triggers the Game Over state and the `GHOST_SHIELD` modifier is active, *the system shall* play a distinct **shield-break animation** (e.g. a brief expanding ring at Ghosty's position) instead of the standard collision burst, then deactivate the shield without triggering Game Over.

### 8.5 Invincibility Frames

**REQ-CDT-011**  
*When* the `GHOST_SHIELD` modifier absorbs a collision (REQ-CDT-010), *the system shall* grant Ghosty **invincibility frames** for a duration of `IFRAMES_DURATION` (recommended default: **1.5 seconds**) during which all subsequent pipe collisions are ignored.

**REQ-CDT-012**  
*While* invincibility frames are active, *the system shall* render Ghosty with a pulsing semi-transparent effect (alternating between full and 40% opacity at ~8 Hz) to communicate the invincible state to the player.

**REQ-CDT-013**  
*When* the invincibility frame period expires, *the system shall* restore normal collision detection and return Ghosty to full-opacity rendering.

---

## 9. Game State Management

### 9.1 State Machine Overview

**REQ-GSM-001**  
*The system shall* implement a formal game state machine with the following named states and legal transitions:

```
LOADING → MAIN_MENU → PLAYING ⇄ PAUSED
                         ↓
                      GAME_OVER → MAIN_MENU
                                → PLAYING  (restart)
```

**REQ-GSM-002**  
*The system shall* ensure that each state has a defined enter, update, and exit handler, and that only transitions listed in REQ-GSM-001 are permitted.

### 9.2 LOADING State

**REQ-GSM-003**  
*When* the page loads, *the system shall* enter the LOADING state, pre-load all assets (`ghosty.png`, `jump.wav`, `game_over.wav`), and display a minimal loading indicator.

**REQ-GSM-004**  
*When* all assets have finished loading, *the system shall* automatically transition to MAIN_MENU.

### 9.3 MAIN_MENU State

**REQ-GSM-005**  
*While* in the MAIN_MENU state, *the system shall* display:
- The game title "Flappy Kiro" in large retro-styled font.
- The Ghosty sprite with idle bobbing animation.
- The all-time high score retrieved from `localStorage` (displayed as "Best: [N]").
- A "Press Space / Tap to Play" prompt.
- A mute toggle button.

**REQ-GSM-006**  
*When* the player presses Space, clicks, or taps while in MAIN_MENU, *the system shall* transition to PLAYING and perform a full Game Reset (REQ-GSM-021).

### 9.4 PLAYING State

**REQ-GSM-007**  
*While* in the PLAYING state, *the system shall* run the full game simulation loop: physics integration, pipe scrolling, collision detection, scoring, and all rendering layers at 60 FPS.

**REQ-GSM-008**  
*While* in the PLAYING state, *the system shall* display the HUD bar (REQ-VUI-004) and update the score in real time after every gap passage event.

**REQ-GSM-009**  
*When* a pipe is fully passed (Ghosty's x > pipe_x + pipe_width), *the system shall* increment the pipes-passed counter and trigger the speed progression check (REQ-OBG-011).

### 9.5 PAUSED State

**REQ-GSM-010**  
*When* the player presses **Escape** or **P** during the PLAYING state, *the system shall* transition to the PAUSED state, halting all simulation updates while keeping the current frame rendered.

**REQ-GSM-011**  
*While* in the PAUSED state, *the system shall* display a semi-transparent dark overlay over the canvas with the text "PAUSED" and the prompt "Press Escape / P to Resume".

**REQ-GSM-012**  
*When* the player presses Escape or P while in the PAUSED state, *the system shall* transition back to PLAYING, resuming simulation from the exact state it was paused in, with dt reset to zero for the first resumed frame to prevent a physics jump.

**REQ-GSM-013**  
*While* in the PAUSED state, *the system shall* continue to accept mute toggle input.

### 9.6 GAME_OVER State

**REQ-GSM-014**  
*When* the system enters the GAME_OVER state, *the system shall* perform the following sequence:
1. Halt all pipe movement and physics simulation.
2. Play `assets/game_over.wav` (unless muted).
3. Trigger Screen Shake and collision particle burst (REQ-CDT-008, REQ-CDT-009).
4. After a **0.8-second delay**, display the Game Over screen overlay.

**REQ-GSM-015**  
*The* Game Over screen *shall* display:
- "GAME OVER" header.
- Final score labeled "Score: [N]".
- All-time high score labeled "Best: [N]".
- A "NEW BEST!" badge if the current run set a new high score.
- "Press Space / Tap to Restart" prompt.
- "Press M for Menu" prompt to return to MAIN_MENU.

**REQ-GSM-016**  
*When* the player presses Space or taps on the Game Over screen, *the system shall* perform a full Game Reset (REQ-GSM-021) and transition to PLAYING.

**REQ-GSM-017**  
*When* the player presses M on the Game Over screen, *the system shall* transition to MAIN_MENU.

### 9.7 Persistent Score Storage

**REQ-GSM-018**  
*The system shall* read the high score from `localStorage` key `"flappyKiro_highScore"` on LOADING, defaulting to 0 if the key is absent.

**REQ-GSM-019**  
*When* the GAME_OVER state is entered and the current score exceeds the stored high score, *the system shall* write the new high score to `localStorage` key `"flappyKiro_highScore"` before the overlay is rendered.

**REQ-GSM-020**  
*The system shall* store the mute preference in `localStorage` key `"flappyKiro_muted"` (value: `"true"` or `"false"`) and read it on LOADING.

**REQ-GSM-021**  
*The* Game Reset procedure *shall* restore **all** of the following variables to their initial values before the PLAYING state begins:

| Variable | Reset Value |
|---|---|
| Current score | 0 |
| Pipes-Passed Counter | 0 |
| Single-Gap pipe spawn counter | 0 |
| Next Double-Gap threshold N | New random value from [3, 7] |
| Current pipe speed (`PIPE_SPEED`) | `PIPE_SPEED_BASE` |
| `GAP_HEIGHT_MIN` | Initial default (140 px) |
| `GAP_HEIGHT_MAX` | Initial default (180 px) |
| `PIPE_SPACING` | Initial default (260 px) |
| Active Multiplier | 1× (inactive) |
| Multiplier passage counter | 0 |
| `GHOST_SHIELD` active state | Inactive |
| `SLOW_TIME` active state & timer | Inactive, 0 s |
| iFrame timer | 0 s (no invincibility) |
| Trail particle pool | Cleared (all particles removed) |
| Burst particle pool | Cleared |
| Feedback Label | Hidden |
| Subtitle Channel | Hidden |
| Ghosty position | Starting X fixed, Y = canvas vertical center |
| Ghosty velocity_y | 0 |
| Ghosty rotation | 0° |
| All active pipes | Removed from pipe list |

---

## 10. Audio & Visual Feedback

### 10.1 Sound Effects

**REQ-AVF-001**  
*When* the player flaps during the PLAYING state, *the system shall* play `assets/jump.wav` at full volume (subject to mute state).

**REQ-AVF-002**  
*When* the Game Over state is entered, *the system shall* play `assets/game_over.wav` at full volume (subject to mute state).

**REQ-AVF-003**  
*When* a gap passage is scored, *the system shall* play a short synthetic "ding" or "score" sound (generated via the Web Audio API tone synthesis or a bundled asset) pitched to match the precision tier:
- Perfecto: higher pitch tone.
- Bueno: mid pitch tone.
- Casi: lower pitch tone.

**REQ-AVF-004**  
*When* a Score Modifier collectible is collected, *the system shall* play a distinct short "power-up" chime sound (Web Audio API synthesis acceptable) independent of the scoring sound.

**REQ-AVF-005**  
*The system shall* support a global mute toggle as defined in REQ-CGL-016 (M key + persistent button on all screens). All audio output is silenced when mute is active.

### 10.2 Background Music

**REQ-AVF-006**  
*While* in the PLAYING state, *the system shall* attempt to play a looping background music track from `assets/bgm.ogg` (or `assets/bgm.mp3` as fallback) if the file is present. If no music asset is found, background music is silently skipped with no error — gameplay continues unaffected.

**REQ-AVF-006B** *(Stretch Goal)*  
*Where* no background music asset is present and the Web Audio API is available, *the system shall* optionally synthesize a procedural looping track (4-bar loop at ~120 BPM in C major, using square-wave oscillators for melody and a triangle-wave bass line) as a fallback. This requirement is optional and may be deferred without impacting core gameplay.

**REQ-AVF-007**  
*The* background music *shall* loop seamlessly without audible gaps between iterations.

**REQ-AVF-008**  
*When* the PLAYING state is paused (PAUSED state), *the system shall* pause the background music and resume it when gameplay resumes.

**REQ-AVF-009**  
*When* the GAME_OVER state is entered, *the system shall* stop the background music immediately.

### 10.3 Screen Shake

*[Screen Shake behavior is fully specified in REQ-CDT-008. The implementation note below applies to the rendering layer.]*

**REQ-AVF-011**  
*The* Screen Shake defined in REQ-CDT-008 *shall* be implemented by translating the canvas rendering context's origin by the computed decaying offset each frame, not by moving game-object positions, so the effect is purely cosmetic and does not affect collision detection.

**REQ-AVF-012**  
*When* a `SLOW_TIME` modifier is collected, *the system shall* apply a brief **gentle screen pulse** (a single wave of ±3 px shake lasting 0.3 s) to signal the effect activation, distinct from the collision shake.

### 10.4 Ghosty Particle Trail

**REQ-AVF-013**  
*While* in the PLAYING state, *the system shall* emit a **particle trail** from Ghosty's rear each frame, with the following properties:
- Spawn rate: **2–3 particles per frame**.
- Initial position: Ghosty's center X/Y offset slightly toward the trailing edge.
- Initial velocity: small random spread (±20 px/s X, ±30 px/s Y) plus a fixed leftward bias of **−60 px/s**.
- Particle size: **3–6 px radius**, shrinking linearly to 0 over lifetime.
- Particle lifetime: **0.25–0.45 seconds**.
- Particle color: semi-transparent white (`rgba(255,255,255,0.55)`) fading to transparent.

**REQ-AVF-014**  
*When* the `GHOST_SHIELD` modifier is active, *the system shall* change the particle trail color for newly spawned particles to oscillate between `rgba(100,180,255,0.9)` and `rgba(255,255,255,0.6)` at **4 Hz**, applied to each new particle at its spawn time. This creates a flowing blue-white cycling effect in the trail stream. Existing trail particles retain the color they were spawned with.

**REQ-AVF-015**  
*When* the Game Over state is entered, *the system shall* stop emitting new trail particles; existing in-flight particles *shall* complete their lifetime animation.

### 10.5 Floating Score Indicators

**REQ-AVF-016**  
*When* a gap passage is scored, *the system shall* spawn a **Floating Score Indicator** at **Ghosty's current canvas position** at the moment of the Scoring Moment, showing the total `points_awarded` for that passage (the full result of REQ-PRS-006, including base + precision bonus × multiplier).

**REQ-AVF-017**  
*The* Floating Score Indicator *shall* animate upward from its spawn position at **40 px/s**, remain visible for **0.9 seconds**, then fade out over **0.3 seconds**.

**REQ-AVF-018**  
*The* Floating Score Indicator *shall* use a color matching the pipe's rarity tier:
- Green pipe → green text.
- Purple pipe → purple text.
- Gold pipe → gold text.

**REQ-AVF-019**  
*When* an Active Multiplier is in effect, *the system shall* suffix the Floating Score Indicator text with the multiplier label (e.g. "4 ×2") to make the multiplication visible to the player.

**REQ-AVF-020**  
*When* a Score Modifier is collected, *the system shall* spawn a separate Floating Score Indicator at the collectible's position showing the modifier's label (e.g. "SHIELD", "SLOW", "×2 Score"), using a gold color, that rises and fades using the same animation parameters as REQ-AVF-017.

---

## 11. Non-Functional Requirements

**REQ-NFR-001**  
*The system shall* run entirely in a modern web browser with no server-side dependencies, implemented in vanilla HTML5, CSS3, and JavaScript (or a single-file canvas game).

**REQ-NFR-002**  
*The system shall* maintain a target frame rate of 60 FPS on mainstream desktop browsers (Chrome, Firefox, Edge) using `requestAnimationFrame`.

**REQ-NFR-003**  
*The system shall* be playable on mobile browsers via touch input, scaling the canvas to fit the viewport while preserving the aspect ratio.

**REQ-NFR-004**  
*The system shall* store only the high score and mute preference in `localStorage`; no external API calls or user accounts are required.

**REQ-NFR-005**  
*The system shall* load and be fully playable within 3 seconds on a standard broadband connection, given the lightweight asset set (`ghosty.png`, `jump.wav`, `game_over.wav`).

**REQ-NFR-006**  
*The system shall* maintain **two separate particle pools**:
- **Trail pool:** maximum **150** active particles. When the cap is reached, the oldest trail particle is culled first.
- **Burst pool:** maximum **50** active particles. When the cap is reached, the oldest burst particle is culled first.

Trail and burst pools are independent so that a collision burst never displaces trail particles and vice versa.

**REQ-NFR-007**  
*The system shall* use a single HTML file with inlined or co-located JS/CSS so the game can be opened by double-clicking the file with no build step required.

---

## 12. Open Questions / To Be Decided

| # | Status | Question | Resolution / Owner |
|---|---|---|---|
| OQ-01 | **Open** | Should the `GHOST_SHIELD` visually wrap Ghosty in a shield aura? What is the animation? | Design — REQ-CDT-010 specifies expanding ring; aura wrapping is a stretch enhancement |
| OQ-02 | **Resolved** | Should `SLOW_TIME` affect Ghosty's gravity as well, or only pipe speed? | **Pipe speed only.** Gravity unchanged. See REQ-DGP-008 table. |
| OQ-03 | **Resolved** | Should Score Modifiers stack or overwrite? | **Overwrite.** See REQ-DGP-011. Two badges in the same Double-Gap Pipe are always different types (REQ-DGP-008B), so same-type stack scenario cannot arise within one pipe. |
| OQ-04 | **Open** | Localization plans beyond Spanish precision feedback strings? | Product |
| OQ-05 | **Resolved** | Maximum score cap? | **No cap.** Score grows unbounded. `SCORE_DOUBLE` and multipliers can theoretically produce very large numbers; integer overflow is not a concern in JavaScript (Number.MAX_SAFE_INTEGER = 2⁵³−1). |
| OQ-06 | **Resolved** | Should Double-Gap Pipes follow rarity weighting or fixed color? | **Same rarity weighting** as Single-Gap Pipes (REQ-DGP-003). Rarity tier applied to entire pipe structure. |
| OQ-07 | **Open** | Should background music vary in tempo with pipe speed? | Design — flagged as stretch goal in REQ-AVF-006B |
| OQ-08 | **Open** | Should particle trail be disabled on low-end/mobile devices? | Engineering — recommend feature-detect via `performance.now()` frame budget; disable trail if consistent frame time > 20 ms |
| OQ-09 | **Open** | Should iFrames be available only from `GHOST_SHIELD` or future modifiers too? | Design — current spec: Shield only. Extensibility is architectural; no requirement change needed now. |
| OQ-10 | **Resolved** | Should `PIPE_SPACING` reduction apply during `SLOW_TIME`? | **Yes, spacing reduction continues.** `SLOW_TIME` only affects runtime pipe scroll speed, not the difficulty progression counters. |
| OQ-11 | **Open** | Pause on mobile — no Escape key? | Design — recommended resolution: on-screen pause button (top-left corner) visible during PLAYING. Add to §9.5 once confirmed. |
| OQ-12 | **Resolved** | Should "Speed Up!" interrupt precision Feedback Label or queue? | **Neither — separate channel.** Speed Up uses Subtitle Channel (REQ-PSF-008B); never interrupts Feedback Label. |
| OQ-11 | Should the PAUSED state be available on mobile (no Escape key)? If so, what is the touch gesture? | Design |
| OQ-12 | Should the "Speed Up!" notification (REQ-OBG-014) interrupt a currently-displayed precision Feedback Label, or queue after it? | Design |
