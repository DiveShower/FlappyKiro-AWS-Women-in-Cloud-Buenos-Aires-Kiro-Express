// adapters/GameOrchestrator.js
import CONFIG from '../config.js';
import { gapCenterY } from '../domain/Gap.js';

export class GameOrchestrator {
  /**
   * @param {Object} deps - Injected dependencies
   */
  constructor({
    stateMachine,
    physicsEngine,
    collisionUC,
    scoringUC,
    difficultyUC,
    pipeFactory,
    modifierUC,
    resetUC,
    inputPort,
    audioCtrl,
    storage,
    presenter
  }) {
    Object.assign(this, {
      stateMachine,
      physicsEngine,
      collisionUC,
      scoringUC,
      difficultyUC,
      pipeFactory,
      modifierUC,
      resetUC,
      inputPort,
      audioCtrl,
      storage,
      presenter
    });

    const hs = this.storage.loadHighScore();
    const init = this.resetUC.reset(hs);

    // Game world state (mutable, owned by orchestrator)
    this.ghosty = init.ghosty;
    this.score = init.score;
    this.difficulty = init.difficulty;
    this.pipes = [];
    this.particles = { trail: [], burst: [] };
    this.feedback = null; // FeedbackLabelDto
    this.subtitle = null; // SubtitleDto
    this.floats = []; // FloatingScoreDto[]
    this.screenShake = null; // { elapsed, duration, peak }
    this.pauseButtonRect = Object.freeze({
      x: CONFIG.PAUSE_BTN_X,
      y: CONFIG.PAUSE_BTN_Y,
      w: CONFIG.PAUSE_BTN_SIZE,
      h: CONFIG.PAUSE_BTN_SIZE
    });

    // M7 delay & low-end variables
    this._gameOverTimer = 0;
    this._overlayVisible = false;
    this.trailEnabled = true;

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
   * @param {number} rawDt - Raw ms since last frame
   * @returns {Object} WorldSnapshot
   */
  tick(rawDt) {
    const dt = Math.min(rawDt / 1000, CONFIG.DT_CAP);

    switch (this.stateMachine.current) {
      case 'PLAYING':
        this._tickPlaying(dt);
        break;
      case 'PAUSED':
        this._tickPaused();
        break;
      case 'GAME_OVER':
        this._tickGameOver(dt);
        break;
      case 'MAIN_MENU':
        this._tickMainMenu();
        break;
    }

    return this._buildSnapshot();
  }

  _tickPlaying(dt) {
    // 1. Input
    const flap = this.inputPort.consumeFlapIntent();
    const pause = this.inputPort.consumePauseIntent();
    const mute = this.inputPort.consumeMuteIntent();

    if (mute) this._toggleMute();
    if (pause) {
      this.stateMachine.transition('PAUSED');
      return;
    }
    if (flap) {
      this.audioCtrl.playFlap();
    }

    // 2. Physics
    this.ghosty = this.physicsEngine.tick(this.ghosty, flap, dt);

    // 3. Collision check
    const hitbox = this.physicsEngine.getHitbox(this.ghosty);
    const { hit, type } = this.collisionUC.check(
      hitbox,
      this.ghosty,
      this.pipes,
      CONFIG.CANVAS_HEIGHT
    );
    if (hit) {
      this._handleCollision(type);
      return;
    }

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
    const mute = this.inputPort.consumeMuteIntent();
    if (mute) this._toggleMute();
    if (pause) {
      this.stateMachine.transition('PLAYING');
    }
  }

  _tickGameOver(dt) {
    if (this._gameOverTimer > 0) {
      this._gameOverTimer -= dt;
      if (this._gameOverTimer <= 0) {
        this._overlayVisible = true;
      }
    }
    this._tickParticles(dt);
    this._tickScreenShake(dt);

    const flap = this.inputPort.consumeFlapIntent();
    const mute = this.inputPort.consumeMuteIntent();

    if (this._overlayVisible) {
      if (flap) {
        this.startNewGame();
      }
      if (mute) {
        this.stateMachine.transition('MAIN_MENU');
      }
    } else {
      // Clear pause inputs to avoid queuing
      this.inputPort.consumePauseIntent();
    }
  }

  _tickMainMenu() {
    const flap = this.inputPort.consumeFlapIntent();
    const mute = this.inputPort.consumeMuteIntent();
    if (mute) this._toggleMute();
    if (flap) {
      this.startNewGame();
    }
  }

  _handleCollision(type) {
    if (this.ghosty.shieldActive) {
      // Shield absorbs collision (REQ-CDT-010/011)
      this.ghosty = Object.freeze({
        ...this.ghosty,
        shieldActive: false,
        iFrameTimer: CONFIG.IFRAMES_DURATION // 1.5 s
      });
      this.subtitle = this.presenter.buildSubtitle('Shield Broken!');
      this._emitBurstParticles(true); // shield-break variant
      return;
    }

    // Real game over (REQ-GSM-014)
    this.score = Object.freeze({
      ...this.score,
      highScore: Math.max(this.score.total, this.score.highScore)
    });
    this.storage.saveHighScore(this.score.highScore);
    this.screenShake = { elapsed: 0, duration: CONFIG.SHAKE_DURATION, peak: CONFIG.SHAKE_PEAK };
    this._emitBurstParticles(false);
    this.audioCtrl.playGameOver();

    // Start delay timer instead of immediate overlay presentation
    this._gameOverTimer = CONFIG.GAME_OVER_DELAY; // 0.8 s
    this._overlayVisible = false;

    this.stateMachine.transition('GAME_OVER');
  }

  _scrollPipes(dt) {
    const speed = this.difficulty.pipeSpeed;
    this.pipes = this.pipes.map(pipe => {
      let nextX = pipe.x - speed * dt;
      let nextPassed = pipe.passed;
      if (!pipe.passed && this.ghosty.x > nextX + CONFIG.PIPE_WIDTH) {
        nextPassed = true;
        const res = this.difficultyUC.onPipePassed(this.difficulty);
        this.difficulty = res.next;
        if (res.speededUp) {
          this.subtitle = this.presenter.buildSubtitle('Speed Up!');
        }
      }

      // Drift calculation (T-090)
      let nextDriftPhase = pipe.driftPhase;
      let nextGaps = pipe.gaps.map(g => ({ ...g }));

      if (this.difficulty.thirdAxisActive && pipe.driftPhase !== undefined) {
        const oldOffset = Math.sin(pipe.driftPhase) * CONFIG.PIPE_DRIFT_AMPLITUDE;
        nextDriftPhase = pipe.driftPhase + CONFIG.PIPE_DRIFT_FREQ * 2 * Math.PI * dt;
        const newOffset = Math.sin(nextDriftPhase) * CONFIG.PIPE_DRIFT_AMPLITUDE;
        let shift = newOffset - oldOffset;

        // Clamp shift
        if (nextGaps[0].topY + shift < CONFIG.GAP_MARGIN) {
          shift = CONFIG.GAP_MARGIN - nextGaps[0].topY;
        }
        const lastGap = nextGaps[nextGaps.length - 1];
        const maxY = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN;
        if (lastGap.bottomY + shift > maxY) {
          shift = maxY - lastGap.bottomY;
        }

        // Apply shift
        for (const gap of nextGaps) {
          gap.topY += shift;
          gap.bottomY += shift;
        }
      }

      return Object.freeze({
        ...pipe,
        x: nextX,
        passed: nextPassed,
        driftPhase: nextDriftPhase,
        gaps: nextGaps
      });
    });
  }

  _checkScoringMoments(ghostyHitbox) {
    const ghostyCX = ghostyHitbox.x + ghostyHitbox.w / 2;
    const ghostyCY = ghostyHitbox.y + ghostyHitbox.h / 2;

    for (const pipe of this.pipes) {
      if (pipe.gaps.some(g => g.scored)) continue;

      const gapMidX = pipe.x + CONFIG.PIPE_WIDTH / 2;
      if (ghostyCX >= gapMidX) {
        // Determine traversed gap
        let traversedGap = pipe.gaps[0];
        if (pipe.gapType === 'DOUBLE') {
          const dist0 = Math.abs(ghostyCY - gapCenterY(pipe.gaps[0]));
          const dist1 = Math.abs(ghostyCY - gapCenterY(pipe.gaps[1]));
          traversedGap = dist0 < dist1 ? pipe.gaps[0] : pipe.gaps[1];
        }

        // Mark all gaps scored to prevent double-scoring
        pipe.gaps.forEach(g => {
          g.scored = true;
        });

        this._applyScoringMoment(pipe, traversedGap, ghostyHitbox);
      }
    }
  }

  _applyScoringMoment(pipe, gap, ghostyHitbox) {
    const ghostyCY = ghostyHitbox.y + ghostyHitbox.h / 2;
    const { nextScore, tier, pointsAwarded } = this.scoringUC.applyGapScore(
      this.score,
      { y: ghostyCY },
      gap,
      pipe.rarity
    );
    this.score = nextScore;
    this.feedback = this.presenter.buildFeedbackLabel(tier);
    this.floats.push(this.presenter.buildFloatingScore(
      pointsAwarded,
      nextScore.multiplier,
      pipe.rarity,
      ghostyHitbox.x + ghostyHitbox.w / 2,
      ghostyHitbox.y
    ));
    this.audioCtrl.playScore(tier.id);

    // Apply modifier if present and uncollected (REQ-DGP-009)
    if (gap.modifierId && !gap.modifierCollected) {
      gap.modifierCollected = true;
      const result = this.modifierUC.apply(
        gap.modifierId,
        this.score,
        this.difficulty,
        this.ghosty
      );
      this.score = result.nextScore;
      this.difficulty = result.nextDifficulty;
      this.ghosty = result.nextGhosty;
      this.subtitle = this.presenter.buildSubtitle(result.notification);
      this.audioCtrl.playModifier();

      // SLOW_TIME screen pulse (T-092)
      if (gap.modifierId === 'SLOW_TIME') {
        this.screenShake = { elapsed: 0, duration: 0.3, peak: 3 };
      }

      // Spawn separate float for modifier (REQ-AVF-019)
      this.floats.push({
        text: this._getModifierTextLabel(gap.modifierId),
        color: '#FFD700', // Gold color
        x: pipe.x + CONFIG.PIPE_WIDTH / 2,
        y: gapCenterY(gap),
        vy: -CONFIG.FLOAT_SPEED,
        holdTime: CONFIG.FLOAT_HOLD,
        fadeTime: CONFIG.FLOAT_FADE,
        timer: CONFIG.FLOAT_HOLD
      });
    }
  }

  _getModifierTextLabel(modifierId) {
    switch (modifierId) {
      case 'MULTIPLIER_2X': return '×2 Score';
      case 'MULTIPLIER_3X': return '×3 Score';
      case 'BONUS_FLAT': return 'Bonus';
      case 'SCORE_DOUBLE': return 'Double';
      case 'GHOST_SHIELD': return 'SHIELD';
      case 'SLOW_TIME': return 'SLOW';
      default: return modifierId;
    }
  }

  _maybeSpawnPipe() {
    let spawnX = 0;
    if (this.pipes.length === 0) {
      spawnX = CONFIG.GHOSTY_START_X + CONFIG.FIRST_PIPE_OFFSET;
    } else {
      const lastPipe = this.pipes[this.pipes.length - 1];
      if (lastPipe.x <= CONFIG.CANVAS_WIDTH - this.difficulty.pipeSpacing) {
        spawnX = lastPipe.x + this.difficulty.pipeSpacing;
      } else {
        return; // No spawn needed yet
      }
    }

    // Decide single vs double gap spawning
    if (this.difficulty.singleGapCounter >= this.difficulty.doubleGapThreshold) {
      const pipe = this.pipeFactory.createDouble(spawnX, this.difficulty, this.score.total);
      this.pipes.push(pipe);
      const nextThreshold = Math.floor(Math.random() * (CONFIG.DOUBLE_GAP_THRESHOLD_MAX - CONFIG.DOUBLE_GAP_THRESHOLD_MIN + 1)) + CONFIG.DOUBLE_GAP_THRESHOLD_MIN;
      this.difficulty = Object.freeze({
        ...this.difficulty,
        singleGapCounter: 0,
        doubleGapThreshold: nextThreshold
      });
    } else {
      const pipe = this.pipeFactory.createSingle(spawnX, this.difficulty, this.score.total);
      this.pipes.push(pipe);
      this.difficulty = Object.freeze({
        ...this.difficulty,
        singleGapCounter: this.difficulty.singleGapCounter + 1
      });
    }
  }

  _recyclePipes() {
    this.pipes = this.pipes.filter(p => p.x >= -CONFIG.PIPE_WIDTH);
  }

  _tickParticles(dt) {
    this.particles.trail = this.particles.trail.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.radius = p.maxRadius * Math.max(0, p.life / p.maxLife);
      return p.life > 0;
    });

    this.particles.burst = this.particles.burst.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.radius = p.maxRadius * Math.max(0, p.life / p.maxLife);
      return p.life > 0;
    });
  }

  _tickFeedback(dt) {
    if (this.feedback) {
      if (this.feedback.timer > 0) {
        this.feedback.timer -= dt;
        if (this.feedback.timer <= 0) {
          this.feedback.fadeTimer = CONFIG.FEEDBACK_FADE;
        }
      } else if (this.feedback.fadeTimer > 0) {
        this.feedback.fadeTimer -= dt;
        if (this.feedback.fadeTimer <= 0) {
          this.feedback = null;
        }
      }
    }
  }

  _tickFloats(dt) {
    this.floats = this.floats.filter(f => {
      f.y += f.vy * dt;
      f.timer -= dt;
      return f.timer > -f.fadeTime;
    });
  }

  _tickScreenShake(dt) {
    if (this.screenShake) {
      this.screenShake.elapsed += dt;
      if (this.screenShake.elapsed >= this.screenShake.duration) {
        this.screenShake = null;
      }
    }
  }

  _emitTrailParticles() {
    if (this.trailEnabled === false) return; // disabled on low-end devices
    if (this.stateMachine.current === 'GAME_OVER') return;

    const count = Math.floor(CONFIG.TRAIL_SPAWN_RATE) + (Math.random() < (CONFIG.TRAIL_SPAWN_RATE % 1) ? 1 : 0);
    const t = performance.now() / 1000;
    const isShield = this.ghosty.shieldActive;
    const shieldColor = Math.sin(2 * Math.PI * CONFIG.SHIELD_TRAIL_FREQ * t) > 0 ? '#00FFFF' : '#FFFFFF';
    const color = isShield ? shieldColor : '#FFFFFF';

    for (let i = 0; i < count; i++) {
      const p = {
        x: this.ghosty.x - CONFIG.GHOSTY_SPRITE_W / 2,
        y: this.ghosty.y,
        vx: CONFIG.TRAIL_VX_BIAS + (Math.random() * 2 - 1) * CONFIG.TRAIL_VX_SPREAD,
        vy: (Math.random() * 2 - 1) * CONFIG.TRAIL_VY_SPREAD,
        radius: CONFIG.TRAIL_RADIUS_MIN + Math.random() * (CONFIG.TRAIL_RADIUS_MAX - CONFIG.TRAIL_RADIUS_MIN),
        life: CONFIG.TRAIL_LIFE_MIN + Math.random() * (CONFIG.TRAIL_LIFE_MAX - CONFIG.TRAIL_LIFE_MIN),
        color
      };
      p.maxLife = p.life;
      p.maxRadius = p.radius;

      this.particles.trail.push(p);
      if (this.particles.trail.length > CONFIG.TRAIL_POOL_MAX) {
        this.particles.trail.shift();
      }
    }
  }

  _emitBurstParticles(isShieldBreak) {
    const count = Math.floor(CONFIG.BURST_MIN_PARTICLES + Math.random() * (CONFIG.BURST_MAX_PARTICLES - CONFIG.BURST_MIN_PARTICLES + 1));
    const color = isShieldBreak ? '#00FFFF' : '#FF6600';

    for (let i = 0; i < count; i++) {
      let vx, vy;
      if (isShieldBreak) {
        const angle = (i / count) * 2 * Math.PI;
        const speed = 150 + Math.random() * 50;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else {
        const angle = Math.random() * 2 * Math.PI;
        const speed = 100 + Math.random() * 150;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }

      const radius = 3 + Math.random() * 4;
      const life = CONFIG.BURST_LIFE_MIN + Math.random() * (CONFIG.BURST_LIFE_MAX - CONFIG.BURST_LIFE_MIN);

      const p = {
        x: this.ghosty.x,
        y: this.ghosty.y,
        vx,
        vy,
        radius,
        maxRadius: radius,
        life,
        maxLife: life,
        color
      };

      this.particles.burst.push(p);
      if (this.particles.burst.length > CONFIG.BURST_POOL_MAX) {
        this.particles.burst.shift();
      }
    }
  }

  _toggleMute() {
    const nextMuted = !this.audioCtrl.isMuted();
    this.audioCtrl.setMuted(nextMuted);
    this.storage.saveMuteState(nextMuted);
  }

  startNewGame() {
    const hs = this.storage.loadHighScore();
    const init = this.resetUC.reset(hs);
    this.ghosty = init.ghosty;
    this.score = init.score;
    this.difficulty = init.difficulty;
    this.pipes = [];
    this.particles = { trail: [], burst: [] };
    this.feedback = null;
    this.subtitle = null;
    this.floats = [];
    this.screenShake = null;

    this._gameOverTimer = 0;
    this._overlayVisible = false;

    this.stateMachine.transition('PLAYING');
  }

  _buildSnapshot() {
    return {
      state: this.stateMachine.current,
      ghosty: this.ghosty,
      score: this.score,
      difficulty: this.difficulty,
      pipes: this.pipes,
      particles: this.particles,
      feedback: this.feedback,
      subtitle: this.subtitle,
      floats: this.floats,
      screenShake: this.screenShake,
      pauseButtonRect: this.pauseButtonRect,
      overlayVisible: this._overlayVisible,
    };
  }
}
