// usecases/ModifierApplicationUseCase.js
import CONFIG from '../config.js';
import { ModifierId } from '../domain/ModifierId.js';

export class ModifierApplicationUseCase {
  /**
   * @param {ScoringUseCase} scoringUC
   * @param {DifficultyUseCase} difficultyUC
   */
  constructor(scoringUC, difficultyUC) {
    this.scoringUC = scoringUC;
    this.difficultyUC = difficultyUC;
  }

  /**
   * Applies the effect of collecting a score modifier.
   * REQ-DGP-008/009/011, REQ-DGP-008C
   *
   * @param {string} modifierId
   * @param {ScoreState} scoreState
   * @param {DifficultyState} difficultyState
   * @param {GhostyState} ghosty
   * @returns {Object} {nextScore, nextDifficulty, nextGhosty, notification}
   */
  apply(modifierId, scoreState, difficultyState, ghosty) {
    let nextScore = { ...scoreState };
    let nextDifficulty = { ...difficultyState };
    let nextGhosty = { ...ghosty };

    switch (modifierId) {
      case ModifierId.MULTIPLIER_2X:
        nextScore = this.scoringUC.activateMultiplier(nextScore, 2, CONFIG.MULTIPLIER_2X_DURATION);
        break;
      case ModifierId.MULTIPLIER_3X:
        nextScore = this.scoringUC.activateMultiplier(nextScore, 3, CONFIG.MULTIPLIER_3X_DURATION);
        break;
      case ModifierId.BONUS_FLAT:
        nextScore = this.scoringUC.applyBonusFlat(nextScore);
        break;
      case ModifierId.SCORE_DOUBLE:
        nextScore = this.scoringUC.applyScoreDouble(nextScore);
        break;
      case ModifierId.GHOST_SHIELD:
        nextGhosty = {
          ...nextGhosty,
          shieldActive: true
        };
        break;
      case ModifierId.SLOW_TIME:
        nextDifficulty = this.difficultyUC.activateSlowTime(nextDifficulty);
        break;
    }

    // Ensure nextScore is a frozen object and has lastModifierId set in all cases
    nextScore = Object.freeze({
      ...nextScore,
      lastModifierId: modifierId
    });

    nextGhosty = Object.freeze(nextGhosty);
    nextDifficulty = Object.freeze(nextDifficulty);

    return {
      nextScore,
      nextDifficulty,
      nextGhosty,
      notification: modifierId
    };
  }
}
