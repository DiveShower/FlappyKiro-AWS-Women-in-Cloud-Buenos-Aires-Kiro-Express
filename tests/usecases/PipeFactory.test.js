// tests/usecases/PipeFactory.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { PipeFactory } from '../../usecases/PipeFactory.js';
import CONFIG from '../../config.js';

const factory = new PipeFactory();

const arbDifficulty = fc.record({
  gapHeightMin: fc.constant(CONFIG.GAP_HEIGHT_MIN),
  gapHeightMax: fc.constant(CONFIG.GAP_HEIGHT_MAX),
});

describe('PipeFactory invariants', () => {

  it('P38 — single-gap top < bottom always', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 0, max: 5 }), (diff) => {
      const pipe = factory.createSingle(400, diff, 0);
      const gap  = pipe.gaps[0];
      return gap.topY < gap.bottomY;
    }));
  });

  it('P39 — single-gap height is within [GAP_HEIGHT_MIN, GAP_HEIGHT_MAX]', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createSingle(400, diff, 0);
      const h = pipe.gaps[0].bottomY - pipe.gaps[0].topY;
      return h >= CONFIG.GAP_HEIGHT_MIN && h <= CONFIG.GAP_HEIGHT_MAX;
    }));
  });

  it('P40 — double-gap pipe has exactly 2 gaps with different modifier types', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createDouble(400, diff, 50);
      if (pipe.gapType !== 'DOUBLE') return true;  // fell back to single (geometry fail)
      expect(pipe.gaps).toHaveLength(2);
      return pipe.gaps[0].modifierId !== pipe.gaps[1].modifierId;
    }));
  });

  it('P41 — double-gap centers are at least MIN_GAP_SEPARATION apart', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createDouble(400, diff, 0);
      if (pipe.gapType !== 'DOUBLE') return true;
      const [upper, lower] = pipe.gaps;
      const upperCY = (upper.topY + upper.bottomY) / 2;
      const lowerCY = (lower.topY + lower.bottomY) / 2;
      return (lowerCY - upperCY) >= CONFIG.MIN_GAP_SEPARATION;
    }));
  });

  it('P42 — all gap edges are within canvas safe-zone margins', () => {
    fc.assert(fc.property(arbDifficulty, (diff) => {
      const pipe = factory.createSingle(400, diff, 0);
      const gap  = pipe.gaps[0];
      const minY = CONFIG.GAP_MARGIN;
      const maxY = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN;
      return gap.topY >= minY && gap.bottomY <= maxY;
    }));
  });

});
