// main.js (composition root)
import CONFIG from './config.js';
import { AssetLoader } from './infrastructure/AssetLoader.js';
import { CanvasRenderer } from './infrastructure/CanvasRenderer.js';
import { WebAudioAdapter } from './infrastructure/WebAudioAdapter.js';
import { BrowserInputAdapter } from './infrastructure/BrowserInputAdapter.js';
import { GameLoop } from './infrastructure/GameLoop.js';
import { InputController } from './adapters/InputController.js';
import { AudioController } from './adapters/AudioController.js';
import { StorageAdapter } from './adapters/StorageAdapter.js';
import { UIPresenter } from './adapters/UIPresenter.js';
import { GameOrchestrator } from './adapters/GameOrchestrator.js';
import { GameStateMachine } from './usecases/GameStateMachine.js';
import { PhysicsEngine } from './usecases/PhysicsEngine.js';
import { CollisionUseCase } from './usecases/CollisionUseCase.js';
import { ScoringUseCase } from './usecases/ScoringUseCase.js';
import { PipeFactory } from './usecases/PipeFactory.js';
import { DifficultyUseCase } from './usecases/DifficultyUseCase.js';
import { ModifierApplicationUseCase } from './usecases/ModifierApplicationUseCase.js';
import { GameResetUseCase } from './usecases/GameResetUseCase.js';

(async () => {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;

  // Load assets
  const loader = new AssetLoader();
  const { ghostyImg, audioBuffers } = await loader.load();

  // Layer 4 — Infrastructure
  const webAudio = new WebAudioAdapter();
  await webAudio.loadAssets(audioBuffers);
  const renderer = new CanvasRenderer(canvas, { ghostyImg });

  // Layer 3 — Adapters
  const storage = new StorageAdapter();
  const inputCtrl = new InputController();
  const audioCtrl = new AudioController(webAudio, storage.loadMuteState());
  const presenter = new UIPresenter();

  // Layer 2 — Use Cases
  const stateMachine = new GameStateMachine();
  const physicsEngine = new PhysicsEngine();
  const collisionUC = new CollisionUseCase();
  const scoringUC = new ScoringUseCase();
  const difficultyUC = new DifficultyUseCase();
  const pipeFactory = new PipeFactory();
  const modifierUC = new ModifierApplicationUseCase(scoringUC, difficultyUC);
  const resetUC = new GameResetUseCase();

  // Layer 3 — Orchestrator (wires use cases)
  const orchestrator = new GameOrchestrator({
    stateMachine,
    physicsEngine,
    collisionUC,
    scoringUC,
    difficultyUC,
    pipeFactory,
    modifierUC,
    resetUC,
    inputPort: inputCtrl,
    audioCtrl,
    storage,
    presenter,
  });

  // Wires Browser Input Adapter with orchestrator reference for pause button detection
  new BrowserInputAdapter(inputCtrl, canvas, orchestrator);

  // Transition to MAIN_MENU and start loop
  stateMachine.transition('MAIN_MENU');
  const loop = new GameLoop(orchestrator, renderer);
  loop.start();
})();
