// usecases/PipeFactory.js
import CONFIG from '../config.js';
import { PipeRarity } from '../domain/PipeRarity.js';
import { buildBadgeExpression } from '../domain/ModifierBadgeExpressions.js';
import { ModifierId } from '../domain/ModifierId.js';

export class PipeFactory {
  /**
   * Weighted rarity selection (REQ-PRS-001)
   * @returns {Object} PipeRarity
   * @private
   */
  _pickRarity() {
    const r = Math.random();
    if (r < CONFIG.RARITY_GREEN_THRESHOLD) return PipeRarity.GREEN;
    if (r < CONFIG.RARITY_PURPLE_THRESHOLD) return PipeRarity.PURPLE;
    return PipeRarity.GOLD;
  }

  /**
   * Random gap height within current difficulty bounds (REQ-OBG-004)
   * @param {DifficultyState} difficulty
   * @returns {number}
   * @private
   */
  _pickGapHeight(difficulty) {
    const min = difficulty.gapHeightMin;
    const max = difficulty.gapHeightMax;
    return Math.round(min + Math.random() * (max - min));
  }

  /**
   * Random gap center Y within safe margins (REQ-OBG-007)
   * @param {number} gapH
   * @returns {number}
   * @private
   */
  _pickGapCenterY(gapH) {
    const min = CONFIG.GAP_MARGIN + gapH / 2;
    const max = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN - gapH / 2;
    return Math.round(min + Math.random() * (max - min));
  }

  /**
   * Modifier pool without-replacement pair (REQ-DGP-008B)
   * @returns {Array<string>} [modifierId1, modifierId2]
   * @private
   */
  _pickModifierPair() {
    const pool = Object.values(ModifierId);
    const idx1 = Math.floor(Math.random() * pool.length);
    const remaining = pool.filter((_, i) => i !== idx1);
    const idx2 = Math.floor(Math.random() * remaining.length);
    return [pool[idx1], remaining[idx2]];
  }

  /**
   * Create a Single-Gap pipe.
   * REQ-OBG-004/005/007
   *
   * @param {number}          x            - Spawn x position
   * @param {DifficultyState} difficulty
   * @param {number}          currentScore - For modifier badge expressions
   * @returns {Pipe}
   */
  createSingle(x, difficulty, currentScore) {
    const rarity = this._pickRarity();
    const gapH = this._pickGapHeight(difficulty);
    const centerY = this._pickGapCenterY(gapH);
    const gap = {
      topY: centerY - gapH / 2,
      bottomY: centerY + gapH / 2,
      modifierId: null,
      modifierCollected: false,
      scored: false,
      badgeExpression: null
    };

    return Object.freeze({
      id: `pipe_${Date.now()}_${Math.random()}`,
      x,
      rarity,
      gapType: 'SINGLE',
      gaps: [gap],
      passed: false,
      driftPhase: 0
    });
  }

  /**
   * Create a Double-Gap pipe with mathematically guaranteed separation and safe zones.
   * REQ-DGP-004, REQ-DGP-008B, REQ-OBG-008
   *
   * @param {number}          x
   * @param {DifficultyState} difficulty
   * @param {number}          currentScore
   * @returns {Pipe}
   */
  createDouble(x, difficulty, currentScore) {
    const rarity = this._pickRarity();
    const [modId1, modId2] = this._pickModifierPair();

    const upperH = this._pickGapHeight(difficulty);
    const lowerH = this._pickGapHeight(difficulty);

    const minUpperCY = CONFIG.GAP_MARGIN + upperH / 2;
    const maxLowerCY = CONFIG.CANVAS_HEIGHT - CONFIG.HUD_HEIGHT - CONFIG.GAP_MARGIN - lowerH / 2;

    const maxUpperCY = maxLowerCY - CONFIG.MIN_GAP_SEPARATION;

    // Fallback to single gap if constraints are impossible to satisfy
    if (minUpperCY > maxUpperCY) {
      return this.createSingle(x, difficulty, currentScore);
    }

    // Pick upper center inside the restricted range
    const upperCenterY = Math.round(minUpperCY + Math.random() * (maxUpperCY - minUpperCY));

    // Pick lower center ensuring MIN_GAP_SEPARATION
    const minLowerCY = upperCenterY + CONFIG.MIN_GAP_SEPARATION;
    const lowerCenterY = Math.round(minLowerCY + Math.random() * (maxLowerCY - minLowerCY));

    const upperGap = {
      topY: upperCenterY - upperH / 2,
      bottomY: upperCenterY + upperH / 2,
      modifierId: modId1,
      modifierCollected: false,
      scored: false,
      badgeExpression: buildBadgeExpression(modId1, currentScore, rarity.basePoints, CONFIG.MODIFIER_MIN_BONUS)
    };

    const lowerGap = {
      topY: lowerCenterY - lowerH / 2,
      bottomY: lowerCenterY + lowerH / 2,
      modifierId: modId2,
      modifierCollected: false,
      scored: false,
      badgeExpression: buildBadgeExpression(modId2, currentScore, rarity.basePoints, CONFIG.MODIFIER_MIN_BONUS)
    };

    return Object.freeze({
      id: `dpipe_${Date.now()}_${Math.random()}`,
      x,
      rarity,
      gapType: 'DOUBLE',
      gaps: [upperGap, lowerGap],
      passed: false,
      driftPhase: Math.random() * Math.PI * 2
    });
  }
}
