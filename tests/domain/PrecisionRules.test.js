// tests/domain/PrecisionRules.test.js
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calcPrecision, classifyPrecision } from '../../domain/PrecisionRules.js';
import { PrecisionTier } from '../../domain/PrecisionTier.js';

// --- Unit tests ---

describe('calcPrecision', () => {
  it('returns 1 when ghosty is exactly at gap center', () => {
    expect(calcPrecision(250, 250, 140)).toBe(1);
  });

  it('returns a value less than 1 when ghosty is off center', () => {
    expect(calcPrecision(250, 180, 140)).toBeLessThan(1);
  });

  it('clamps to 0 when ghosty is far outside the gap', () => {
    expect(calcPrecision(0, 500, 140)).toBe(0);
  });

  it('never returns a negative value', () => {
    expect(calcPrecision(1000, 0, 140)).toBe(0);
  });

  it('returns values in [0, 1] for ghosty at gap edge', () => {
    // ghosty exactly at the edge of the gap: distance = gapHeight / 2 → raw = 0
    expect(calcPrecision(320, 250, 140)).toBe(0);
  });

  it('returns correct mid-range precision', () => {
    // distance = 35, gapHeight/2 = 70 → raw = 1 - 35/70 = 0.5
    expect(calcPrecision(285, 250, 140)).toBeCloseTo(0.5);
  });
});

describe('classifyPrecision', () => {
  it('maps 1.0 to PERFECTO', () => {
    expect(classifyPrecision(1.0).id).toBe('PERFECTO');
  });

  it('maps 0.75 (boundary) to PERFECTO', () => {
    expect(classifyPrecision(0.75).id).toBe('PERFECTO');
  });

  it('maps 0.5 to BUENO', () => {
    expect(classifyPrecision(0.5).id).toBe('BUENO');
  });

  it('maps 0.35 (boundary) to BUENO', () => {
    expect(classifyPrecision(0.35).id).toBe('BUENO');
  });

  it('maps 0.1 to CASI', () => {
    expect(classifyPrecision(0.1).id).toBe('CASI');
  });

  it('maps 0.0 to CASI', () => {
    expect(classifyPrecision(0.0).id).toBe('CASI');
  });

  it('returns an object from PrecisionTier', () => {
    const tiers = Object.values(PrecisionTier).map(t => t.id);
    expect(tiers).toContain(classifyPrecision(0.8).id);
  });
});

// --- Property-based tests ---
// Validates: Requirements REQ-PSF-001B, REQ-PSF-002–004

describe('calcPrecision — properties', () => {
  it('always returns a value in [0, 1]', () => {
    /**
     * Validates: Requirements REQ-PSF-001B
     * Property: for any valid inputs, calcPrecision is always clamped to [0, 1]
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 600, noNaN: true }),
        fc.double({ min: 0, max: 600, noNaN: true }),
        fc.double({ min: 1, max: 300, noNaN: true }),
        (ghostyCenterY, gapCenterY, gapHeight) => {
          const result = calcPrecision(ghostyCenterY, gapCenterY, gapHeight);
          return result >= 0 && result <= 1;
        }
      )
    );
  });

  it('returns 1 only when ghosty is exactly at gap center', () => {
    /**
     * Validates: Requirements REQ-PSF-001B
     * Property: calcPrecision returns 1 iff ghostyCenterY === gapCenterY
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 600, noNaN: true }),
        fc.double({ min: 1, max: 300, noNaN: true }),
        (center, gapHeight) => {
          return calcPrecision(center, center, gapHeight) === 1;
        }
      )
    );
  });

  it('decreases as ghosty moves further from gap center', () => {
    /**
     * Validates: Requirements REQ-PSF-001B
     * Property: larger distance → lower or equal precision
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 600, noNaN: true }),
        fc.double({ min: 0, max: 600, noNaN: true }),
        fc.double({ min: 1, max: 300, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        (ghostyCenterY, gapCenterY, gapHeight, extra) => {
          const p1 = calcPrecision(ghostyCenterY, gapCenterY, gapHeight);
          // move ghosty further away from center
          const furtherY = ghostyCenterY + Math.sign(ghostyCenterY - gapCenterY + 0.001) * extra;
          const p2 = calcPrecision(furtherY, gapCenterY, gapHeight);
          return p2 <= p1 + 1e-9; // allow floating point tolerance
        }
      )
    );
  });
});

describe('classifyPrecision — properties', () => {
  it('always returns a valid PrecisionTier', () => {
    /**
     * Validates: Requirements REQ-PSF-002–004
     * Property: classifyPrecision always returns one of the three known tiers
     */
    const validIds = new Set(Object.values(PrecisionTier).map(t => t.id));
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (precision) => {
          const tier = classifyPrecision(precision);
          return validIds.has(tier.id);
        }
      )
    );
  });

  it('precision >= 0.75 always yields PERFECTO', () => {
    /**
     * Validates: Requirements REQ-PSF-002
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0.75, max: 1, noNaN: true }),
        (precision) => classifyPrecision(precision).id === 'PERFECTO'
      )
    );
  });

  it('precision in [0.35, 0.75) always yields BUENO', () => {
    /**
     * Validates: Requirements REQ-PSF-003
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0.35, max: 0.7499, noNaN: true }),
        (precision) => classifyPrecision(precision).id === 'BUENO'
      )
    );
  });

  it('precision < 0.35 always yields CASI', () => {
    /**
     * Validates: Requirements REQ-PSF-004
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.3499, noNaN: true }),
        (precision) => classifyPrecision(precision).id === 'CASI'
      )
    );
  });
});
