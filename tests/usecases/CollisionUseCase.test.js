// tests/usecases/CollisionUseCase.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { CollisionUseCase } from '../../usecases/CollisionUseCase.js';

const collisionUC = new CollisionUseCase();
const CANVAS_H = 500;

// Helper: ghosty hitbox fully inside a single gap (should not collide with pipe)
function hitboxInsideGap(gapTop, gapBottom) {
  const cy = (gapTop + gapBottom) / 2;
  return { x: 100, y: cy - 10, w: 20, h: 20 };  // well inside
}

describe('CollisionUseCase.check', () => {

  it('P32 — no collision when hitbox is entirely inside a single-gap opening', () => {
    fc.assert(fc.property(
      fc.integer({ min: 80, max: 200 }),   // gapTop
      fc.integer({ min: 60, max: 100 }),   // gapHeight
      (gapTop, gapH) => {
        const gap = { topY: gapTop, bottomY: gapTop + gapH, scored: false, modifierId: null, modifierCollected: false };
        const pipe = { x: 90, gapType: 'SINGLE', gaps: [gap], passed: false };
        const hb   = hitboxInsideGap(gap.topY, gap.bottomY);
        const ghosty = { iFrameTimer: 0, shieldActive: false };
        const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
        return !result.hit;
      },
    ));
  });

  it('P33 — collision always fires when hitbox overlaps top pipe segment', () => {
    fc.assert(fc.property(
      fc.integer({ min: 150, max: 300 }),  // gapTop
      fc.integer({ min: 60,  max: 120 }),  // gapH
      (gapTop, gapH) => {
        const gap  = { topY: gapTop, bottomY: gapTop + gapH, scored: false };
        const pipe = { x: 90, gapType: 'SINGLE', gaps: [gap], passed: false };
        const hb = { x: 90, y: 0, w: 20, h: gapTop - 10 };
        const ghosty = { iFrameTimer: 0 };
        const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
        return result.hit && result.type === 'PIPE';
      },
    ));
  });

  it('P34 — iFrame timer > 0 always suppresses pipe collision', () => {
    fc.assert(fc.property(
      fc.double({ min: 0.001, max: 1.5, noNaN: true }),  // active iFrameTimer
      fc.integer({ min: 0, max: 400 }),
      (timer, y) => {
        const gap  = { topY: 200, bottomY: 340, scored: false };
        const pipe = { x: 0, gapType: 'SINGLE', gaps: [gap], passed: false };
        const hb   = { x: 0, y: 0, w: 500, h: 500 };  // full canvas hitbox
        const ghosty = { iFrameTimer: timer };
        const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
        return !result.hit;
      },
    ));
  });

  it('P35 — ground collision fires when hitbox bottom >= canvas_height - HUD_HEIGHT', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 10 }),   // small overshoot
      (extra) => {
        const groundY = CANVAS_H - 40;   // HUD_HEIGHT = 40
        const hb = { x: 100, y: groundY - 10, w: 20, h: 10 + extra };
        const ghosty = { iFrameTimer: 0 };
        const result = collisionUC.check(hb, ghosty, [], CANVAS_H);
        return result.hit && result.type === 'GROUND';
      },
    ));
  });

  it('P36 — no collision against empty pipe list (only ground matters)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 420 }),  // y well above ground
      (y) => {
        const hb = { x: 100, y, w: 20, h: 20 };
        const ghosty = { iFrameTimer: 0 };
        const result = collisionUC.check(hb, ghosty, [], CANVAS_H);
        // y + 20 < 460 (ground), so no collision expected
        if (y + 20 < CANVAS_H - 40) return !result.hit;
        return true;  // skip edge cases near ground
      },
    ));
  });

  it('P37 — middle block of double-gap pipe is a collision zone', () => {
    const upperGap = { topY: 80,  bottomY: 180, scored: false };
    const lowerGap = { topY: 280, bottomY: 380, scored: false };
    const pipe = { x: 90, gapType: 'DOUBLE', gaps: [upperGap, lowerGap], passed: false };
    // Hitbox in the middle block between 180 and 280
    const hb = { x: 90, y: 190, w: 52, h: 30 };
    const ghosty = { iFrameTimer: 0 };
    const result = collisionUC.check(hb, ghosty, [pipe], CANVAS_H);
    expect(result.hit).toBe(true);
    expect(result.type).toBe('PIPE');
  });

});
