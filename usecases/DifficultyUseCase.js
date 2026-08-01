// usecases/DifficultyUseCase.js
import CONFIG from '../config.js';

export class DifficultyUseCase {
  /**
   * Called when a pipe is fully passed (REQ-GSM-009 trailing-edge trigger).
   * Returns updated DifficultyState.
   *
   * @param {DifficultyState} state
   * @returns {Object} {next: DifficultyState, speededUp: boolean}
   */
  onPipePassed(state) {
    const pipesPassed = state.pipesPassed + 1;
    const speededUp = pipesPassed % 10 === 0;

    if (!speededUp) {
      return {
        next: {
          ...state,
          pipesPassed
        },
        speededUp: false
      };
    }

    // Determine base progression speed
    const isSlow = state.slowTimeTimer > 0;
    let baseSpeed = isSlow ? state.slowTimeBaseSpeed : state.pipeSpeed;
    baseSpeed = Math.min(baseSpeed + CONFIG.SPEED_INCREMENT, CONFIG.PIPE_SPEED_MAX);

    // Speed increment (REQ-OBG-011)
    const pipeSpeed = isSlow ? baseSpeed * (1 - CONFIG.SLOW_TIME_REDUCTION) : baseSpeed;
    const slowTimeBaseSpeed = isSlow ? baseSpeed : state.slowTimeBaseSpeed;

    const gapMin = Math.max(state.gapHeightMin - CONFIG.GAP_STEP_REDUCTION, CONFIG.GAP_HEIGHT_FLOOR);
    const gapMax = Math.max(state.gapHeightMax - CONFIG.GAP_STEP_REDUCTION, CONFIG.GAP_HEIGHT_FLOOR);

    // Third axis unlock (REQ-OBG-016)
    const bothFloors = gapMin <= CONFIG.GAP_HEIGHT_FLOOR && baseSpeed >= CONFIG.PIPE_SPEED_MAX;
    const thirdAxisActive = state.thirdAxisActive || bothFloors;

    let thirdAxisSteps = state.thirdAxisSteps ?? 0;
    if (thirdAxisActive && state.thirdAxisActive) {
      thirdAxisSteps++;
    }

    const spacingMin = Math.max(CONFIG.PIPE_SPACING_MIN - CONFIG.THIRD_AXIS_SPACING_STEP * thirdAxisSteps, CONFIG.THIRD_AXIS_SPACING_FLOOR);
    const spacing = Math.max(state.pipeSpacing - CONFIG.SPACING_STEP_REDUCTION, spacingMin);

    return {
      next: {
        ...state,
        pipesPassed,
        pipeSpeed,
        slowTimeBaseSpeed,
        gapHeightMin: gapMin,
        gapHeightMax: gapMax,
        pipeSpacing: spacing,
        thirdAxisActive,
        thirdAxisSteps
      },
      speededUp: true
    };
  }

  /**
   * Apply SLOW_TIME modifier (REQ-DGP-008 SLOW_TIME row).
   *
   * @param {DifficultyState} state
   * @returns {DifficultyState}
   */
  activateSlowTime(state) {
    const baseSpeed = state.slowTimeTimer > 0 ? state.slowTimeBaseSpeed : state.pipeSpeed;
    return {
      ...state,
      slowTimeTimer: CONFIG.SLOW_TIME_DURATION,
      slowTimeBaseSpeed: baseSpeed,
      pipeSpeed: baseSpeed * (1 - CONFIG.SLOW_TIME_REDUCTION)
    };
  }

  /**
   * Tick the SLOW_TIME timer down each frame.
   * Restores speed when timer expires (REQ-DGP-008 SLOW_TIME restore).
   *
   * @param {DifficultyState} state
   * @param {number} dt
   * @returns {DifficultyState}
   */
  tickSlowTime(state, dt) {
    if (state.slowTimeTimer <= 0) return state;
    const timer = state.slowTimeTimer - dt;
    if (timer <= 0) {
      const restored = Math.max(state.slowTimeBaseSpeed, state.pipeSpeed);
      return {
        ...state,
        slowTimeTimer: 0,
        pipeSpeed: restored,
        slowTimeBaseSpeed: 0
      };
    }
    return {
      ...state,
      slowTimeTimer: timer
    };
  }
}
