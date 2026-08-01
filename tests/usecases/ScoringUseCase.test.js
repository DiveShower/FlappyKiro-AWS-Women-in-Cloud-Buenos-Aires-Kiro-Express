// tests/usecases/ScoringUseCase.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { ScoringUseCase } from '../../usecases/ScoringUseCase.js';
import { PipeRarity } from '../../domain/PipeRarity.js';
import { PrecisionTier } from '../../domain/PrecisionTier.js';

const scoringUC = new ScoringUseCase();

const arbRarity = fc.constantFrom(
  PipeRarity.GREEN, PipeRarity.PURPLE, PipeRarity.GOLD,
);

const arbScoreState = (mult = 1, counter = 0) =>
  fc.record({
    total:              fc.integer({ min: 0, max: 10000 }),
    highScore:          fc.integer({ min: 0, max: 50000 }),
    multiplier:         fc.constant(mult),
    multiplierCounter:  fc.constant(counter),
    lastModifierId:     fc.constant(null),
    lastPrecisionTierId: fc.constant(null),
  });

describe('ScoringUseCase.applyGapScore', () => {

  it('P27 — score.total always increases after a gap passage', () => {
    fc.assert(fc.property(
      arbScoreState(),
      arbRarity,
      fc.float({ min: 0, max: 1 }),    // precision as ghosty offset fraction
      fc.float({ min: 40, max: 460 }), // gapCenterY
      fc.float({ min: 110, max: 180 }),// gapHeight
      (state, rarity, offsetFrac, gapCY, gapH) => {
        const ghosty = { y: gapCY + offsetFrac * (gapH / 2) };
        const gap    = { topY: gapCY - gapH/2, bottomY: gapCY + gapH/2 };
        const { nextScore } = scoringUC.applyGapScore(state, ghosty, gap, rarity);
        return nextScore.total >= state.total;
      },
    ));
  });

  it('P28 — points awarded equals floor((base+bonus)*mult), min 5 when 0', () => {
    fc.assert(fc.property(
      arbScoreState(2, 3),             // active x2 multiplier, 3 remaining
      arbRarity,
      (state, rarity) => {
        const ghosty = { y: 250 };     // perfect center
        const gap    = { topY: 180, bottomY: 320 };   // gapH=140, center=250
        const { nextScore, pointsAwarded } = scoringUC.applyGapScore(
          state, ghosty, gap, rarity,
        );
        const expected = Math.floor((rarity.basePoints + 2) * 2);  // perfecto bonus=2, mult=2
        expect(pointsAwarded).toBe(Math.max(5, expected));
        return nextScore.total === state.total + pointsAwarded;
      },
    ));
  });

  it('P29 — multiplier counter decrements by exactly 1 per scoring moment', () => {
    fc.assert(fc.property(
      arbScoreState(2, 5),
      arbRarity,
      (state, rarity) => {
        const ghosty = { y: 250 };
        const gap    = { topY: 180, bottomY: 320 };
        const { nextScore } = scoringUC.applyGapScore(state, ghosty, gap, rarity);
        return nextScore.multiplierCounter === 4;
      },
    ));
  });

  it('P30 — multiplier resets to 1 when counter reaches 0', () => {
    fc.assert(fc.property(
      arbScoreState(3, 1),             // last remaining passage
      arbRarity,
      (state, rarity) => {
        const ghosty = { y: 250 };
        const gap    = { topY: 180, bottomY: 320 };
        const { nextScore } = scoringUC.applyGapScore(state, ghosty, gap, rarity);
        return nextScore.multiplier === 1 && nextScore.multiplierCounter === 0;
      },
    ));
  });

  it('P31 — precision tier is always set on nextScore', () => {
    fc.assert(fc.property(
      arbScoreState(),
      arbRarity,
      fc.float({ min: 0, max: 460 }),
      (state, rarity, ghostyY) => {
        const gap = { topY: 180, bottomY: 320 };
        const { nextScore } = scoringUC.applyGapScore(state, { y: ghostyY }, gap, rarity);
        return [
          PrecisionTier.PERFECTO.id,
          PrecisionTier.BUENO.id,
          PrecisionTier.CASI.id,
        ].includes(nextScore.lastPrecisionTierId);
      },
    ));
  });

});
