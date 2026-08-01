# Flappy Kiro — Project Structure

## Architecture
Clean Architecture with four concentric layers. **Dependencies only flow inward** — outer layers import inner layers, never the reverse.

```
Infrastructure  →  Adapters  →  Use Cases  →  Domain
(browser APIs)     (wiring)     (logic)       (pure data/functions)
```

## Directory Layout

```
Flappy Kiro/
├── index.html              # Entry point; loads main.js as ES module
├── main.js                 # Composition root — instantiates and wires all layers
├── config.js               # Single source of truth for ALL named constants (frozen object)
│
├── assets/                 # Static game assets
│   ├── ghosty.png
│   ├── jump.wav
│   └── game_over.wav
│
├── domain/                 # Layer 1 — pure data types and pure functions; ZERO imports
│   ├── GameState.js        # Enum: LOADING, MAIN_MENU, PLAYING, PAUSED, GAME_OVER
│   ├── PipeRarity.js       # Enum: GREEN / PURPLE / GOLD
│   ├── PrecisionTier.js    # Enum: PERFECTO / BUENO / CASI
│   ├── ModifierId.js       # Enum: all 6 modifier IDs
│   ├── GhostyState.js      # Value object + factory
│   ├── Gap.js              # Value object + gapCenterY / gapHeight helpers
│   ├── Pipe.js             # Value object (SINGLE / DOUBLE)
│   ├── ScoreState.js       # Value object
│   ├── DifficultyState.js  # Value object
│   ├── ParticleState.js    # Value object
│   ├── NotificationState.js
│   ├── PrecisionRules.js   # calcPrecision(), classifyPrecision()
│   ├── ScoreFormula.js     # calcPointsAwarded(), applyMinimumBonus()
│   ├── PhysicsFormulas.js  # gravity, terminal velocity, AABB, hitbox
│   └── ModifierBadgeExpressions.js  # buildBadgeExpression()
│
├── usecases/               # Layer 2 — business logic; imports domain/ + config.js only
│   ├── ports/
│   │   ├── IStoragePort.js
│   │   ├── IAudioPort.js
│   │   └── IInputPort.js
│   ├── PhysicsEngine.js
│   ├── CollisionUseCase.js
│   ├── ScoringUseCase.js
│   ├── PipeFactory.js
│   ├── DifficultyUseCase.js
│   ├── ModifierApplicationUseCase.js
│   ├── GameStateMachine.js
│   └── GameResetUseCase.js
│
├── adapters/               # Layer 3 — translation; imports domain/ + usecases/; no browser APIs
│   ├── InputController.js  # Implements IInputPort; accumulates intent flags
│   ├── AudioController.js  # Implements IAudioPort; delegates to WebAudioAdapter
│   ├── StorageAdapter.js   # Implements IStoragePort; wraps localStorage
│   ├── UIPresenter.js      # Transforms domain state → renderer DTOs
│   └── GameOrchestrator.js # Main game-loop coordinator; wires all use cases
│
├── infrastructure/         # Layer 4 — browser APIs only; imports everything
│   ├── CanvasRenderer.js   # All Canvas 2D drawing; consumes WorldSnapshot DTO
│   ├── WebAudioAdapter.js  # Web Audio API: WAV playback + tone synthesis
│   ├── BrowserInputAdapter.js  # DOM event listeners → InputController
│   ├── AssetLoader.js      # Fetch + decode assets; graceful fallback if missing
│   └── GameLoop.js         # requestAnimationFrame driver
│
└── tests/                  # Property-based tests (Vitest + fast-check)
    ├── domain/
    └── usecases/
```

## Key Conventions

- **`config.js` is the only place for magic numbers.** All constants must be named and live in the frozen `CONFIG` object. Never hard-code values in game logic.
- **Domain modules have zero imports.** If a domain file needs to import anything, that's a signal it belongs in `usecases/` instead.
- **State is immutable at the domain level.** Use cases produce new frozen objects rather than mutating in place.
- **`GameOrchestrator` owns all mutable game world state** (`ghosty`, `score`, `difficulty`, `pipes`, `particles`, etc.) and is the sole coordinator between use cases.
- **`CanvasRenderer` is read-only.** It consumes a `WorldSnapshot` DTO and produces pixels. It never writes game state.
- **Tests only reach into `domain/` and `usecases/`.** Never import adapters or infrastructure in tests.
