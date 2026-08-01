# Flappy Kiro — Tech Stack

## Runtime
- **Vanilla HTML5 / CSS3 / JavaScript (ES Modules)** — no framework, no bundler
- Targets modern evergreen browsers (Chrome, Firefox, Edge, Safari)
- Single entry point: `index.html` with `<script type="module" src="main.js">`
- **No build step required** — open via a local HTTP server (CORS prevents direct file:// open)

## Browser APIs Used
- `HTMLCanvasElement` + Canvas 2D API — all rendering
- `Web Audio API` — sound effects (WAV playback) and synthesized score tones
- `requestAnimationFrame` — game loop at 60 FPS target
- `localStorage` — high score and mute preference persistence
- `fetch` — asset loading

## Assets
All assets live in `assets/`:
- `ghosty.png` — player sprite
- `jump.wav` — flap sound effect
- `game_over.wav` — game over sound effect
- `bgm.ogg` / `bgm.mp3` _(optional)_ — background music; silently skipped if absent

## Testing (Optional)
Property-based tests for domain and use-case logic only (no browser needed):
- **Vitest** `^2.0.0`
- **fast-check** `^3.22.0`

```json
// package.json (only needed for tests)
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

## Common Commands

| Task | Command |
|---|---|
| Run the game locally | `npx serve .` then open `http://localhost:3000` |
| Alternative local server | `python -m http.server 8080` |
| Run all tests | `npx vitest run` |
| Run tests in watch mode | `npx vitest` |
| Install test dependencies | `npm install` |
