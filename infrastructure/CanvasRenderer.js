// infrastructure/CanvasRenderer.js
import CONFIG from '../config.js';

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} assets - { ghostyImg }
   */
  constructor(canvas, assets) {
    this._ctx = canvas.getContext('2d');
    this._canvas = canvas;
    this._assets = assets;
    this._cloudX = 0; // parallax cloud x offset
  }

  /**
   * Master draw call — invoked each frame with a WorldSnapshot.
   *
   * @param {Object} snap - WorldSnapshot
   * @param {number} dt
   */
  draw(snap, dt) {
    const ctx = this._ctx;
    const { width: W, height: H } = this._canvas;

    // Screen shake transform (REQ-AVF-011 / REQ-CDT-008)
    ctx.save();
    if (snap.screenShake) {
      const sh = snap.screenShake;
      const decay = 1 - sh.elapsed / sh.duration;
      const ox = (Math.random() * 2 - 1) * sh.peak * decay;
      const oy = (Math.random() * 2 - 1) * sh.peak * decay;
      ctx.translate(ox, oy);
    }

    this._drawBackground(ctx, W, H, dt);
    this._drawParticles(ctx, snap.particles.trail); // trail behind Ghosty
    this._drawPipes(ctx, snap.pipes, H);
    this._drawModifierBadges(ctx, snap.pipes, dt);
    this._drawParticles(ctx, snap.particles.burst); // burst above pipes
    this._drawGhosty(ctx, snap.ghosty, snap.state);
    this._drawFloatingScores(ctx, snap.floats);
    this._drawFeedbackLabel(ctx, snap.feedback, W);
    this._drawSubtitle(ctx, snap.subtitle, snap.feedback, W);
    this._drawHUD(ctx, snap.score, snap.difficulty, snap.pipes, W, H);
    this._drawMuteButton(ctx, W);
    this._drawPauseButton(ctx, snap);

    ctx.restore();

    // State overlays — drawn outside the shake transform
    if (snap.state === 'PAUSED') this._drawPauseOverlay(ctx, W, H);
    if (snap.state === 'GAME_OVER' && snap.overlayVisible) this._drawGameOverScreen(ctx, snap, W, H);
    if (snap.state === 'MAIN_MENU') this._drawMainMenu(ctx, snap, W, H);
  }

  // ── Background & Clouds (REQ-VUI-002) ────────────────────────────────────
  _drawBackground(ctx, W, H, dt) {
    ctx.fillStyle = '#AEE0F0';
    ctx.fillRect(0, 0, W, H);

    // Parallax clouds: scrolled at ~30% of pipe speed
    this._cloudX = (this._cloudX - 66 * dt) % W; // 220 * 0.3 = 66 px/s base
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
    const pw = CONFIG.PIPE_WIDTH;

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
    const capH = 12;
    const capW = w + 8;
    const capX = x - 4;
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
        const cx = pipe.x + CONFIG.PIPE_WIDTH / 2;
        const t = performance.now() / 1000;
        const bob = Math.sin(t * CONFIG.BADGE_BOB_FREQ * Math.PI * 2) * CONFIG.BADGE_BOB_AMPLITUDE;
        const cy = (gap.topY + gap.bottomY) / 2 + bob;
        const tint = BADGE_COLORS[gap.modifierId] ?? '#FFB800';
        const size = CONFIG.BADGE_SIZE;
        ctx.save();
        ctx.fillStyle = tint;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace'; // slightly smaller for multi-line fitting
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lines = (gap.badgeExpression ?? gap.modifierId).split('\n');
        if (lines.length === 1) {
          ctx.fillText(lines[0], cx, cy);
        } else {
          ctx.fillText(lines[0], cx, cy - 5);
          ctx.fillText(lines[1], cx, cy + 5);
        }
        ctx.restore();
      }
    }
  }

  // ── Ghosty (REQ-VUI-003, REQ-CDT-012, GAP-13) ──────────────────────────────
  _drawGhosty(ctx, ghosty, state) {
    if (!ghosty) return;
    const isBlink = ghosty.iFrameTimer > 0
      && Math.floor(performance.now() / 62.5) % 2 === 0; // ~8 Hz blink
    if (isBlink) return; // skip draw frame = pulsing effect

    const W = CONFIG.GHOSTY_SPRITE_W;
    const H = CONFIG.GHOSTY_SPRITE_H;
    ctx.save();
    let y = ghosty.y;
    if (state === 'MAIN_MENU' || state === 'GAME_OVER') {
      const t = performance.now() / 1000;
      const bob = Math.sin(t * CONFIG.IDLE_BOB_FREQ * Math.PI * 2) * CONFIG.IDLE_BOB_AMPLITUDE;
      y += bob;
    }
    ctx.translate(ghosty.x, y);
    ctx.rotate((ghosty.rotation * Math.PI) / 180);
    ctx.drawImage(this._assets.ghostyImg, -W / 2, -H / 2, W, H);
    ctx.restore();
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  _drawParticles(ctx, particles) {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      const r = p.radius * alpha;
      if (r < 0.5) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
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
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 36px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = fb.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeText(fb.text, W / 2, fb.y);
    ctx.fillText(fb.text, W / 2, fb.y);
    ctx.restore();
  }

  _drawSubtitle(ctx, sub, fb, W) {
    if (!sub || !sub.timer) return;
    const fbBottom = fb ? fb.y + 44 + CONFIG.SUBTITLE_GAP : 80; // approx label height + gap
    const alpha = sub.fadeTimer > 0
      ? Math.max(0, sub.fadeTimer / 0.4)
      : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = sub.color;
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
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  // ── HUD Bar (REQ-VUI-004) ──────────────────────────────────────────────────
  _drawHUD(ctx, score, difficulty, pipes, W, H) {
    const HH = CONFIG.HUD_HEIGHT;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, H - HH, W, HH);
    if (!score) return;
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
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
      10,
      y,
    );
  }

  // ── Mute Button ────────────────────────────────────────────────────────────
  _drawMuteButton(ctx, W) {
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('🔇', W - 12, 24);
  }

  // ── Pause Button ───────────────────────────────────────────────────────────
  _drawPauseButton(ctx, snap) {
    if (snap.state !== 'PLAYING') return;
    const r = snap.pauseButtonRect;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 8);
    ctx.fill();

    // Draw ⏸ icon
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(r.x + 14, r.y + 12, 5, 20);
    ctx.fillRect(r.x + 25, r.y + 12, 5, 20);
    ctx.restore();
  }

  // ── State Overlays ─────────────────────────────────────────────────────────
  _drawPauseOverlay(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('Esc / P to Resume', W / 2, H / 2 + 20);
  }

  _drawMainMenu(ctx, snap, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FLAPPY KIRO', W / 2, H / 2 - 60);
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`Best: ${snap.score?.highScore ?? 0}`, W / 2, H / 2);
    ctx.fillText('Space / Tap to Play', W / 2, H / 2 + 40);
  }

  _drawGameOverScreen(ctx, snap, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 28px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 70);
    ctx.fillStyle = '#fff';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(`Score: ${snap.score.total}`, W / 2, H / 2 - 20);
    ctx.fillText(`Best:  ${snap.score.highScore}`, W / 2, H / 2 + 10);
    if (snap.score.total >= snap.score.highScore && snap.score.total > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('NEW BEST!', W / 2, H / 2 + 45);
    }
    ctx.fillStyle = '#aaa';
    ctx.font = '10px "Press Start 2P", monospace';
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
