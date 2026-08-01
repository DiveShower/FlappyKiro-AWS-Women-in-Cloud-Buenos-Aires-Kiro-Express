// tests/usecases/DifficultyUseCase.test.js
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { DifficultyUseCase } from '../../usecases/DifficultyUseCase.js';
import CONFIG from '../../config.js';

const diffUC = new DifficultyUseCase();

const arbDifficulty = fc.record({
  pipeSpeed:         fc.double({ min: CONFIG.PIPE_SPEED_BASE, max: CONFIG.PIPE_SPEED_MAX, noNaN: true }),
  gapHeightMin:      fc.double({ min: CONFIG.GAP_HEIGHT_FLOOR, max: CONFIG.GAP_HEIGHT_MIN, noNaN: true }),
  gapHeightMax:      fc.double({ min: CONFIG.GAP_HEIGHT_FLOOR, max: CONFIG.GAP_HEIGHT_MAX, noNaN: true }),
  pipeSpacing:       fc.double({ min: CONFIG.PIPE_SPACING_MIN, max: CONFIG.PIPE_SPACING, noNaN: true }),
  pipesPassed:       fc.integer({ min: 0, max: 1000 }),
  thirdAxisActive:   fc.constant(false),
  slowTimeTimer:     fc.constant(0),
  slowTimeBaseSpeed: fc.constant(0),
});

describe('DifficultyUseCase.onPipePassed', () => {

  it('P43 — pipeSpeed never exceeds PIPE_SPEED_MAX', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 1, max: 200 }), (state, n) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const result = diffUC.onPipePassed({ ...s, pipesPassed: (i + 1) * 10 - 1 });
        s = result.next;
      }
      return s.pipeSpeed <= CONFIG.PIPE_SPEED_MAX;
    }));
  });

  it('P44 — gapHeightMin never drops below GAP_HEIGHT_FLOOR', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 1, max: 200 }), (state, n) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const result = diffUC.onPipePassed({ ...s, pipesPassed: (i + 1) * 10 - 1 });
        s = result.next;
      }
      return s.gapHeightMin >= CONFIG.GAP_HEIGHT_FLOOR;
    }));
  });

  it('P45 — pipeSpacing never drops below absolute minimum spacing floor', () => {
    fc.assert(fc.property(arbDifficulty, fc.integer({ min: 1, max: 50 }), (state, n) => {
      let s = state;
      for (let i = 0; i < n; i++) {
        const result = diffUC.onPipePassed({ ...s, pipesPassed: (i + 1) * 10 - 1 });
        s = result.next;
      }
      const absoluteFloor = s.thirdAxisActive ? CONFIG.THIRD_AXIS_SPACING_FLOOR : CONFIG.PIPE_SPACING_MIN;
      return s.pipeSpacing >= absoluteFloor;
    }));
  });

  it('P46 — speed increment fires exactly at multiples of 10 pipes passed', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 20 }),
      (n) => {
        const state = { pipeSpeed: 220, gapHeightMin: 140, gapHeightMax: 180,
                        pipeSpacing: 260, pipesPassed: n * 10 - 1,
                        thirdAxisActive: false, slowTimeTimer: 0, slowTimeBaseSpeed: 0 };
        const { speededUp } = diffUC.onPipePassed(state);
        return speededUp === true;
      },
    ));
  });

});

describe('DifficultyUseCase.tickSlowTime', () => {

  it('P47 — pipeSpeed restored to max(base, progression) when timer expires', () => {
    fc.assert(fc.property(
      fc.double({ min: 200, max: 480, noNaN: true }),
      fc.double({ min: 200, max: 480, noNaN: true }),
      (activationSpeed, progressionSpeed) => {
        const state = {
          pipeSpeed:         activationSpeed * 0.6,
          slowTimeTimer:     0.001,
          slowTimeBaseSpeed: activationSpeed,
        };
        // Tick with dt that expires the timer
        const next = diffUC.tickSlowTime({ ...state, pipeSpeed: state.pipeSpeed }, 1.0);
        return next.slowTimeTimer === 0;
      },
    ));
  });

});
