// usecases/ScoringUseCase.js
import CONFIG from '../config.js';
import { calcPrecision, classifyPrecision } from '../domain/PrecisionRules.js';
import { gapCenterY, gapHeight } from '../domain/Gap.js';
import { calcPointsAwarded } from '../domain/ScoreFormula.js';

export class ScoringUseCase {
  /**
   * Calculates precision and awards score when Ghosty passes a gap.
   * REQ-PRS-006, REQ-PSF-001/001B
   *
   * @param {ScoreState} scoreState
   * @param {GhostyState} ghosty
   * @param {Gap} gap
   * @param {Object} rarity - PipeRarity object
   * @returns {Object} {nextScore: ScoreState, tier: PrecisionTier, pointsAwarded: number}
   */
  applyGapScore(scoreState, ghosty, gap, rarity) {
    const precision = calcPrecision(ghosty.y, gapCenterY(gap), gapHeight(gap));
    const tier = classifyPrecision(precision);
    const pointsAwarded = calcPointsAwarded(rarity.basePoints, tier.bonus, scoreState.multiplier);

    const nextTotal = scoreState.total + pointsAwarded;
    const nextHighScore = Math.max(scoreState.highScore, nextTotal);

    let nextMultiplier = scoreState.multiplier;
    let nextMultiplierCounter = scoreState.multiplierCounter;

    if (nextMultiplierCounter > 0) {
      nextMultiplierCounter--;
      if (nextMultiplierCounter === 0) {
        nextMultiplier = 1;
      }
    }

    const nextScore = Object.freeze({
      total: nextTotal,
      highScore: nextHighScore,
      multiplier: nextMultiplier,
      multiplierCounter: nextMultiplierCounter,
      lastModifierId: scoreState.lastModifierId,
      lastPrecisionTierId: tier.id
    });

    return {
      nextScore,
      tier,
      pointsAwarded
    };
  }

  /**
   * Applies the flat bonus modifier.
   * REQ-DGP-008C, REQ-DGP-008 (Adds max(5, round(S * (0.9 + rand * 0.2))))
   *
   * @param {ScoreState} scoreState
   * @returns {ScoreState}
   */
  applyBonusFlat(scoreState) {
    const S = scoreState.total;
    const rand = Math.random();
    const rawDelta = Math.round(S * (0.9 + rand * 0.2));
    const delta = Math.max(CONFIG.MODIFIER_MIN_BONUS, rawDelta);

    const nextTotal = S + delta;
    const nextHighScore = Math.max(scoreState.highScore, nextTotal);

    return Object.freeze({
      total: nextTotal,
      highScore: nextHighScore,
      multiplier: scoreState.multiplier,
      multiplierCounter: scoreState.multiplierCounter,
      lastModifierId: 'BONUS_FLAT',
      lastPrecisionTierId: scoreState.lastPrecisionTierId
    });
  }

  /**
   * Applies the score doubling modifier.
   * REQ-DGP-008C, REQ-DGP-008 (Adds max(5, total))
   *
   * @param {ScoreState} scoreState
   * @returns {ScoreState}
   */
  applyScoreDouble(scoreState) {
    const S = scoreState.total;
    const delta = Math.max(CONFIG.MODIFIER_MIN_BONUS, S);

    const nextTotal = S + delta;
    const nextHighScore = Math.max(scoreState.highScore, nextTotal);

    return Object.freeze({
      total: nextTotal,
      highScore: nextHighScore,
      multiplier: scoreState.multiplier,
      multiplierCounter: scoreState.multiplierCounter,
      lastModifierId: 'SCORE_DOUBLE',
      lastPrecisionTierId: scoreState.lastPrecisionTierId
    });
  }

  /**
   * Overwrites the active multiplier with a new value and duration.
   * REQ-DGP-008, REQ-DGP-008B
   *
   * @param {ScoreState} scoreState
   * @param {number} multiplierValue
   * @param {number} duration - In gap passages
   * @returns {ScoreState}
   */
  activateMultiplier(scoreState, multiplierValue, duration) {
    return Object.freeze({
      total: scoreState.total,
      highScore: scoreState.highScore,
      multiplier: multiplierValue,
      multiplierCounter: duration,
      lastModifierId: scoreState.lastModifierId,
      lastPrecisionTierId: scoreState.lastPrecisionTierId
    });
  }
}
