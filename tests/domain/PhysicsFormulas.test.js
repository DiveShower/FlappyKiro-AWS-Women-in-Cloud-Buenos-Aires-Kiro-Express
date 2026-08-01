// tests/domain/PhysicsFormulas.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  aabbIntersects, calcHitbox,
  integrateGravity, clampToTerminal, integratePosition,
} from '../../domain/PhysicsFormulas.js';

// Arbitrary for a rect {x,y,w,h} with positive dimensions
const arbRect = fc.record({
  x: fc.double({ min: -1000, max: 1000, noNaN: true }),
  y: fc.double({ min: -1000, max: 1000, noNaN: true }),
  w: fc.double({ min: 1,     max: 500,  noNaN: true }),
  h: fc.double({ min: 1,     max: 500,  noNaN: true }),
});

describe('aabbIntersects', () => {

  it('P17 — a rect always intersects itself', () => {
    fc.assert(fc.property(arbRect, (r) => aabbIntersects(r, r)));
  });

  it('P18 — rect translated beyond its own width does not intersect original', () => {
    fc.assert(fc.property(arbRect, (r) => {
      const displaced = { ...r, x: r.x + r.w + 1 };
      return !aabbIntersects(r, displaced);
    }));
  });

  it('P19 — intersection is commutative', () => {
    fc.assert(fc.property(arbRect, arbRect, (a, b) =>
      aabbIntersects(a, b) === aabbIntersects(b, a),
    ));
  });

  it('P20 — rect translated beyond its own height does not intersect original', () => {
    fc.assert(fc.property(arbRect, (r) => {
      const displaced = { ...r, y: r.y + r.h + 1 };
      return !aabbIntersects(r, displaced);
    }));
  });

});

describe('calcHitbox', () => {

  it('P21 — hitbox dimensions are strictly smaller than sprite dimensions', () => {
    fc.assert(fc.property(
      fc.double({ min: 20, max: 200, noNaN: true }),
      fc.double({ min: 20, max: 200, noNaN: true }),
      fc.double({ min: 0.1, max: 0.99, noNaN: true }),
      fc.double({ min: 0.1, max: 0.99, noNaN: true }),
      (sw, sh, sx, sy) => {
        const hb = calcHitbox(0, 0, sw, sh, sx, sy);
        return hb.w < sw && hb.h < sh;
      },
    ));
  });

  it('P22 — hitbox is centered on sprite origin', () => {
    fc.assert(fc.property(
      fc.double({ min: -500, max: 500, noNaN: true }),
      fc.double({ min: -500, max: 500, noNaN: true }),
      fc.double({ min: 10, max: 100, noNaN: true }),
      fc.double({ min: 10, max: 100, noNaN: true }),
      (cx, cy, sw, sh) => {
        const hb = calcHitbox(cx, cy, sw, sh, 0.55, 0.60);
        const hbCX = hb.x + hb.w / 2;
        const hbCY = hb.y + hb.h / 2;
        return Math.abs(hbCX - cx) < 0.001 && Math.abs(hbCY - cy) < 0.001;
      },
    ));
  });

});

describe('Physics integration', () => {

  it('P23 — integrateGravity always increases velocity (downward)', () => {
    fc.assert(fc.property(
      fc.double({ min: -2000, max: 2000, noNaN: true }),
      fc.double({ min: 0.001, max: 0.033, noNaN: true }),
      (vy, dt) => integrateGravity(vy, 1800, dt) > vy,
    ));
  });

  it('P24 — clampToTerminal never exceeds terminal velocity', () => {
    fc.assert(fc.property(
      fc.double({ min: -5000, max: 5000, noNaN: true }),
      (vy) => clampToTerminal(vy, 700) <= 700,
    ));
  });

  it('P25 — integratePosition with zero velocity produces no movement', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 500, noNaN: true }),
      fc.double({ min: 0.001, max: 0.033, noNaN: true }),
      (y, dt) => integratePosition(y, 0, dt) === y,
    ));
  });

  it('P26 — positive velocity moves position downward', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 400, noNaN: true }),
      fc.double({ min: 1, max: 700, noNaN: true }),
      fc.double({ min: 0.001, max: 0.033, noNaN: true }),
      (y, vy, dt) => integratePosition(y, vy, dt) > y,
    ));
  });

});
