/**
 * Unit tests for subtask 2.2: icon array labels and construction states.
 *
 * Tests cover:
 *   - Construction state → colour mapping (resolveIconColour)
 *   - Label content assembly from Region B (buildLabelContent)
 *   - Label visibility rules per construction state
 *   - Label font size / weight scaling (labelFontSize, labelFontWeight)
 */

import { describe, it, expect } from 'vitest';
import { IconArrayConstructionState, DisplayMode } from '../../types';
import { ICON_COLORS } from '../../constants';
import { computeRegionA } from '../../computation/computeRegionA';
import { computeRegionB } from '../../computation/computeRegionB';
import { SCENARIOS } from '../../data/scenarios';
import {
  resolveIconColour,
  buildLabelContent,
  labelFontSize,
  labelFontWeight,
} from './IconArray';

// ===== Helpers =====

function mammographyRegionA() {
  return computeRegionA({ n: 1000, baseRate: 0.01, sensitivity: 0.90, fpr: 0.09 });
}

function mammographyRegionB() {
  const a = mammographyRegionA();
  const scenario = SCENARIOS.find(s => s.id === 'mammography')!;
  return computeRegionB(a, scenario, DisplayMode.Frequency);
}

function mammographyLabelsFreq() {
  return mammographyRegionB().frequency.byCondition;
}

function mammographyLabelsProbability() {
  return mammographyRegionB().probability.byCondition;
}

// ===== Construction State → Colour Mapping =====

describe('resolveIconColour', () => {
  describe('Unpartitioned', () => {
    it('returns neutral for all groups', () => {
      const state = IconArrayConstructionState.Unpartitioned;
      expect(resolveIconColour('truePositive', state)).toBe(ICON_COLORS.unpartitioned);
      expect(resolveIconColour('falseNegative', state)).toBe(ICON_COLORS.unpartitioned);
      expect(resolveIconColour('falsePositive', state)).toBe(ICON_COLORS.unpartitioned);
      expect(resolveIconColour('trueNegative', state)).toBe(ICON_COLORS.unpartitioned);
    });
  });

  describe('BaseRatePartitioned', () => {
    const state = IconArrayConstructionState.BaseRatePartitioned;

    it('returns warm primary for condition-positive groups (no shade variation)', () => {
      expect(resolveIconColour('truePositive', state)).toBe(ICON_COLORS.truePositive);
      expect(resolveIconColour('falseNegative', state)).toBe(ICON_COLORS.truePositive);
    });

    it('returns cool primary for condition-negative groups (no shade variation)', () => {
      expect(resolveIconColour('falsePositive', state)).toBe(ICON_COLORS.trueNegative);
      expect(resolveIconColour('trueNegative', state)).toBe(ICON_COLORS.trueNegative);
    });

    it('warm and cool families are distinct from each other', () => {
      expect(resolveIconColour('truePositive', state))
        .not.toBe(resolveIconColour('trueNegative', state));
    });

    it('no shade variation within warm family', () => {
      expect(resolveIconColour('truePositive', state))
        .toBe(resolveIconColour('falseNegative', state));
    });

    it('no shade variation within cool family', () => {
      expect(resolveIconColour('falsePositive', state))
        .toBe(resolveIconColour('trueNegative', state));
    });
  });

  describe('ConditionPositiveSubpartitioned', () => {
    const state = IconArrayConstructionState.ConditionPositiveSubpartitioned;

    it('warm region has shade variation (TP ≠ FN)', () => {
      expect(resolveIconColour('truePositive', state))
        .not.toBe(resolveIconColour('falseNegative', state));
    });

    it('TP uses warm primary', () => {
      expect(resolveIconColour('truePositive', state)).toBe(ICON_COLORS.truePositive);
    });

    it('FN uses warm secondary', () => {
      expect(resolveIconColour('falseNegative', state)).toBe(ICON_COLORS.falseNegative);
    });

    it('cool region remains uniform (FP = TN colour)', () => {
      expect(resolveIconColour('falsePositive', state))
        .toBe(resolveIconColour('trueNegative', state));
    });

    it('cool region uses TN (primary cool) colour', () => {
      expect(resolveIconColour('falsePositive', state)).toBe(ICON_COLORS.trueNegative);
    });
  });

  describe('FullyPartitioned', () => {
    const state = IconArrayConstructionState.FullyPartitioned;

    it('all four groups are distinct', () => {
      const colours = [
        resolveIconColour('truePositive', state),
        resolveIconColour('falseNegative', state),
        resolveIconColour('falsePositive', state),
        resolveIconColour('trueNegative', state),
      ];
      expect(new Set(colours).size).toBe(4);
    });

    it('each group maps to its own ICON_COLORS entry', () => {
      expect(resolveIconColour('truePositive', state)).toBe(ICON_COLORS.truePositive);
      expect(resolveIconColour('falseNegative', state)).toBe(ICON_COLORS.falseNegative);
      expect(resolveIconColour('falsePositive', state)).toBe(ICON_COLORS.falsePositive);
      expect(resolveIconColour('trueNegative', state)).toBe(ICON_COLORS.trueNegative);
    });
  });

  describe('Progressive colouring sequence', () => {
    it('colour count increases monotonically through states', () => {
      const states = [
        IconArrayConstructionState.Unpartitioned,
        IconArrayConstructionState.BaseRatePartitioned,
        IconArrayConstructionState.ConditionPositiveSubpartitioned,
        IconArrayConstructionState.FullyPartitioned,
      ];
      const groups: Array<'truePositive' | 'falseNegative' | 'falsePositive' | 'trueNegative'> = [
        'truePositive', 'falseNegative', 'falsePositive', 'trueNegative',
      ];
      const distinctCounts = states.map(state => {
        const colours = groups.map(g => resolveIconColour(g, state));
        return new Set(colours).size;
      });
      // 1 (all grey) → 2 (warm/cool) → 3 (TP/FN + cool) → 4 (all distinct)
      expect(distinctCounts).toEqual([1, 2, 3, 4]);
    });
  });
});

// ===== Label Content per Construction State =====

describe('buildLabelContent', () => {
  const labels = mammographyLabelsFreq();

  describe('Unpartitioned — no labels', () => {
    it('returns null for both regions', () => {
      const result = buildLabelContent(labels, IconArrayConstructionState.Unpartitioned);
      expect(result.region1).toBeNull();
      expect(result.region2).toBeNull();
    });
  });

  describe('BaseRatePartitioned — count only, no composition', () => {
    const result = buildLabelContent(labels, IconArrayConstructionState.BaseRatePartitioned);

    it('region1 has a main line with domain label and count', () => {
      expect(result.region1).not.toBeNull();
      expect(result.region1!.mainLine).toContain('Have the disease');
      expect(result.region1!.mainLine).toContain('10');
    });

    it('region1 has no composition line', () => {
      expect(result.region1!.compositionLine).toBeNull();
    });

    it('region2 has a main line with domain label and count', () => {
      expect(result.region2).not.toBeNull();
      expect(result.region2!.mainLine).toContain('990');
    });

    it('region2 has no composition line', () => {
      expect(result.region2!.compositionLine).toBeNull();
    });
  });

  describe('ConditionPositiveSubpartitioned — partial composition', () => {
    const result = buildLabelContent(labels, IconArrayConstructionState.ConditionPositiveSubpartitioned);

    it('region1 (condition-positive) has full composition', () => {
      expect(result.region1!.compositionLine).not.toBeNull();
      expect(result.region1!.compositionLine).toContain('TP');
      expect(result.region1!.compositionLine).toContain('FN');
    });

    it('region2 (condition-negative) has no composition', () => {
      expect(result.region2!.compositionLine).toBeNull();
    });

    it('region2 main line contains the count', () => {
      expect(result.region2!.mainLine).toContain('990');
    });
  });

  describe('FullyPartitioned — both regions have composition', () => {
    const result = buildLabelContent(labels, IconArrayConstructionState.FullyPartitioned);

    it('region1 has composition with TP and FN', () => {
      expect(result.region1!.compositionLine).toContain('TP');
      expect(result.region1!.compositionLine).toContain('FN');
      expect(result.region1!.compositionLine).toContain('9');
      expect(result.region1!.compositionLine).toContain('1');
    });

    it('region2 has composition with FP and TN', () => {
      expect(result.region2!.compositionLine).toContain('FP');
      expect(result.region2!.compositionLine).toContain('TN');
      expect(result.region2!.compositionLine).toContain('89');
      expect(result.region2!.compositionLine).toContain('901');
    });

    it('region1 main line has domain label and count', () => {
      expect(result.region1!.mainLine).toContain('Have the disease');
      expect(result.region1!.mainLine).toContain('10');
    });

    it('region2 main line has domain label and count', () => {
      expect(result.region2!.mainLine).toContain('990');
    });
  });

  describe('Mammography reference — exact label strings', () => {
    const result = buildLabelContent(labels, IconArrayConstructionState.FullyPartitioned);

    it('region1 main line matches expected format', () => {
      expect(result.region1!.mainLine).toBe('Have the disease: 10');
    });

    it('region1 composition line matches expected format', () => {
      expect(result.region1!.compositionLine).toBe('(TP: 9, FN: 1)');
    });

    it('region2 main line matches expected format', () => {
      expect(result.region2!.mainLine).toBe('Do not have the disease: 990');
    });

    it('region2 composition line matches expected format', () => {
      expect(result.region2!.compositionLine).toBe('(FP: 89, TN: 901)');
    });
  });
});

// ===== Display Mode — Probability Labels =====

describe('buildLabelContent with probability mode', () => {
  const probLabels = mammographyLabelsProbability();
  const result = buildLabelContent(probLabels, IconArrayConstructionState.FullyPartitioned);

  it('renders probability-mode labels for region1', () => {
    expect(result.region1).not.toBeNull();
    expect(result.region1!.mainLine).toBeTruthy();
  });

  it('renders probability-mode labels for region2', () => {
    expect(result.region2).not.toBeNull();
    expect(result.region2!.mainLine).toBeTruthy();
  });

  it('composition line uses structural labels (TP/FN) regardless of mode', () => {
    expect(result.region1!.compositionLine).toContain('TP');
    expect(result.region1!.compositionLine).toContain('FN');
  });
});

// ===== Different Scenario — Spam Filter =====

describe('buildLabelContent with spam scenario', () => {
  it('uses spam vocabulary in labels', () => {
    const scenario = SCENARIOS.find(s => s.id === 'spam_filter')!;
    const a = computeRegionA({
      n: scenario.n,
      baseRate: scenario.baseRate,
      sensitivity: scenario.sensitivity,
      fpr: scenario.fpr,
    });
    const b = computeRegionB(a, scenario, DisplayMode.Frequency);
    const result = buildLabelContent(b.frequency.byCondition, IconArrayConstructionState.FullyPartitioned);

    expect(result.region1!.mainLine).toContain('Are spam');
    expect(result.region2!.mainLine).toContain('Are not spam');
  });
});

// ===== Label Prominence Scaling =====

describe('labelFontSize', () => {
  it('returns larger font for small icons (high N)', () => {
    const smallIconFont = labelFontSize(4);
    const largeIconFont = labelFontSize(20);
    expect(smallIconFont).toBeGreaterThan(largeIconFont);
  });

  it('stays within reasonable range', () => {
    for (const size of [2, 4, 8, 12, 16, 20, 24]) {
      const fs = labelFontSize(size);
      expect(fs).toBeGreaterThanOrEqual(10);
      expect(fs).toBeLessThanOrEqual(14);
    }
  });

  it('scales continuously (no jumps)', () => {
    let prev = labelFontSize(4);
    for (let s = 5; s <= 20; s++) {
      const cur = labelFontSize(s);
      expect(Math.abs(cur - prev)).toBeLessThan(1);
      prev = cur;
    }
  });
});

describe('labelFontWeight', () => {
  it('returns bolder weight for small icons (high N)', () => {
    expect(labelFontWeight(4)).toBeGreaterThan(labelFontWeight(20));
  });

  it('ranges from 500 to 700', () => {
    expect(labelFontWeight(20)).toBe(500);
    expect(labelFontWeight(4)).toBe(700);
  });
});
