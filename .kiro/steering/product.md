# Flappy Kiro — Product Overview

Flappy Kiro is a browser-based Flappy Bird-style game with a ghost character (Ghosty) that navigates procedurally generated pipe obstacles. The game runs entirely client-side with no server dependencies.

## Core Gameplay
- Player taps/clicks/presses Space to flap Ghosty through gaps in scrolling pipes
- Pipes come in three rarity tiers: Green (common, 1pt), Purple (rare, 2pt), Gold (very rare, 3pt)
- Precision scoring rewards passing through the vertical center of a gap: Perfecto (≥0.75), Bueno (≥0.35), Casi (<0.35)
- Score formula: `floor((base_points + precision_bonus) × active_multiplier)`
- Speed and difficulty increase every 10 pipes passed

## Special Mechanics
- **Double-Gap Pipes** appear every 3–7 single-gap pipes and contain two navigable gaps
- Each Double-Gap Pipe holds two **Score Modifier badges** (always different types):
  - `MULTIPLIER_2X` / `MULTIPLIER_3X` — multiplies future scores
  - `BONUS_FLAT` — adds a percentage of current score
  - `SCORE_DOUBLE` — doubles the total accumulated score
  - `GHOST_SHIELD` — absorbs one collision
  - `SLOW_TIME` — reduces pipe speed by 40% for 4 seconds

## States
`LOADING → MAIN_MENU → PLAYING ⇄ PAUSED → GAME_OVER → (MAIN_MENU | PLAYING)`

## Persistence
High score and mute preference are stored in `localStorage` under keys `flappyKiro_highScore` and `flappyKiro_muted`.
