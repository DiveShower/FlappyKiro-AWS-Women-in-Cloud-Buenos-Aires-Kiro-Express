// tests/domain/ScoreFormula.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { calcPointsAwarded, applyMinimumBonus } from '../../domain/ScoreFormula.js';

describe('calcPointsAwarded', () => {

  it('P9 — result is always a non-negative integer', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3  }),   // basePoints (rarity: 1/2/3)
      fc.integer({ min: 0, max: 2  }),   // precisionBonus (0/1/2)
      fc.integer({ min: 1, max: 10 }),   // multiplier (positive integer)
      (base, bonus, mult) => {
        const result = calcPointsAwarded(base, bonus, mult);
        return Number.isInteger(result) && result >= 0;
      },
    ));
  });

  it('P10 — result equals floor((base + bonus) * mult)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3  }),
      fc.integer({ min: 0, max: 2  }),
      fc.double ({ min: 1, max: 10, noNaN: true }),   // double multiplier (e.g. 2.0, 3.0)
      (base, bonus, mult) => {
        const expected = Math.floor((base + bonus) * mult);
        return calcPointsAwarded(base, bonus, mult) === expected;
      },
    ));
  });

  it('P11 — higher multiplier never produces fewer points than lower multiplier', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3 }),
      fc.integer({ min: 0, max: 2 }),
      fc.double ({ min: 1, max: 5, noNaN: true }),
      fc.double ({ min: 1, max: 5, noNaN: true }),
      (base, bonus, m1raw, m2raw) => {
        const [lo, hi] = m1raw < m2raw ? [m1raw, m2raw] : [m2raw, m1raw];
        return calcPointsAwarded(base, bonus, lo) <= calcPointsAwarded(base, bonus, hi);
      },
    ));
  });

  it('P12 — multiplier=1 with no precision bonus equals base points', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3 }),
      (base) => calcPointsAwarded(base, 0, 1) === base,
    ));
  });

  it('P13 — Gold+Perfecto+x3 produces maximum possible single-gap score (15)', () => {
    expect(calcPointsAwarded(3, 2, 3)).toBe(15);
  });

});

describe('applyMinimumBonus', () => {

  it('P14 — positive delta is always returned unchanged', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 10000 }),
      (delta) => applyMinimumBonus(delta) === delta,
    ));
  });

  it('P15 — zero or negative delta always returns MIN_BONUS (5)', () => {
    fc.assert(fc.property(
      fc.integer({ min: -10000, max: 0 }),
      (delta) => applyMinimumBonus(delta) === 5,
    ));
  });

  it('P16 — custom MIN_BONUS is respected', () => {
    fc.assert(fc.property(
      fc.integer({ min: -100, max: 0 }),
      fc.integer({ min: 1,   max: 50 }),
      (delta, minBonus) => applyMinimumBonus(delta, minBonus) === minBonus,
    ));
  });

});
