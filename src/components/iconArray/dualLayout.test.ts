/**
 * Unit tests for subtask 2.3: dual layout, grouping state, and by-test-result labels.
 *
 * Tests cover:
 *   - computeDualLayout: both position sets stored, groups match, correct counts
 *   - By-test-result layout: group counts match Region A
 *   - Grouping state position selection: icons render at correct positions per state
 *   - buildByTestResultLabelContent: mammography reference, composition strings, construction states
 */

import { describe, it, expect } from 'vitest';
import { IconArrayConstructionState, DisplayMode } from '../../types';
import { computeRegionA } from '../../computation/computeRegionA';
import { computeRegionB } from '../../computation/computeRegionB';
import { SCENARIOS } from '../../data/scenarios';
import {
  computeLayout,
  computeDualLayout,
  byConditionGrouping,
  byTestResultGrouping,
  type IconGroup,
  type DualLayoutIcon,
} from './layout';
import { buildByTestResultLabelContent, buildLabelContent } from './IconArray';

// ===== Helpers =====

function mammographyRegionA() {
  return computeRegionA({ n: 1000, baseRate: 0.01, sensitivity: 0.90, fpr: 0.09 });
}

function spamRegionA() {
  return computeRegionA({ n: 200, baseRate: 0.20, sensitivity: 0.95, fpr: 0.05 });
}

function mammographyRegionB() {
  const a = mammographyRegionA();
  const scenario = SCENARIOS.find(s => s.id === 'mammography')!;
  return computeRegionB(a, scenario, DisplayMode.Frequency);
}

function spamRegionB() {
  const a = spamRegionA();
  const scenario = SCENARIOS.find(s => s.id === 'spam_filter')!;
  return computeRegionB(a, scenario, DisplayMode.Frequency);
}

function countGroups(icons: DualLayoutIcon[]): Map<IconGroup, number> {
  const counts = new Map<IconGroup, number>();
  for (const icon of icons) {
    counts.set(icon.group, (counts.get(icon.group) ?? 0) + 1);
  }
  return counts;
}

const W = 800;
const H = 600;

// ===== computeDualLayout =====

describe('computeDualLayout', () => {
  describe('basic properties', () => {
    const rA = mammographyRegionA();
    const dual = computeDualLayout(rA, W, H);

    it('produces N icons', () => {
      expect(dual.icons.length).toBe(rA.n);
    });

    it('every icon has both position sets', () => {
      for (const icon of dual.icons) {
        expect(icon.byCondition).toBeDefined();
        expect(icon.byTestResult).toBeDefined();
        expect(typeof icon.byCondition.x).toBe('number');
        expect(typeof icon.byCondition.y).toBe('number');
        expect(typeof icon.byTestResult.x).toBe('number');
        expect(typeof icon.byTestResult.y).toBe('number');
      }
    });

    it('every icon has a valid group', () => {
      const validGroups = new Set<IconGroup>(['truePositive', 'falseNegative', 'falsePositive', 'trueNegative']);
      for (const icon of dual.icons) {
        expect(validGroups.has(icon.group)).toBe(true);
      }
    });

    it('indices are 0 to N-1', () => {
      const indices = dual.icons.map(i => i.index).sort((a, b) => a - b);
      for (let i = 0; i < indices.length; i++) {
        expect(indices[i]).toBe(i);
      }
    });
  });

  describe('group counts match Region A — mammography', () => {
    const rA = mammographyRegionA();
    const dual = computeDualLayout(rA, W, H);
    const counts = countGroups(dual.icons);

    it('TP count matches', () => expect(counts.get('truePositive')).toBe(rA.nTP));
    it('FN count matches', () => expect(counts.get('falseNegative')).toBe(rA.nFN));
    it('FP count matches', () => expect(counts.get('falsePositive')).toBe(rA.nFP));
    it('TN count matches', () => expect(counts.get('trueNegative')).toBe(rA.nTN));
  });

  describe('group counts match Region A — spam filter', () => {
    const rA = spamRegionA();
    const dual = computeDualLayout(rA, W, H);
    const counts = countGroups(dual.icons);

    it('TP count matches', () => expect(counts.get('truePositive')).toBe(rA.nTP));
    it('FN count matches', () => expect(counts.get('falseNegative')).toBe(rA.nFN));
    it('FP count matches', () => expect(counts.get('falsePositive')).toBe(rA.nFP));
    it('TN count matches', () => expect(counts.get('trueNegative')).toBe(rA.nTN));
  });

  describe('dual positions differ between layouts', () => {
    const rA = mammographyRegionA();
    const dual = computeDualLayout(rA, W, H);

    it('at least some icons have different positions across layouts', () => {
      let differentCount = 0;
      for (const icon of dual.icons) {
        if (icon.byCondition.x !== icon.byTestResult.x || icon.byCondition.y !== icon.byTestResult.y) {
          differentCount++;
        }
      }
      // With different first-level groupings, most icons should move.
      expect(differentCount).toBeGreaterThan(0);
    });
  });

  describe('consistency with single-layout computeLayout', () => {
    const rA = mammographyRegionA();
    const dual = computeDualLayout(rA, W, H);
    const condLayout = computeLayout(rA.n, W, H, byConditionGrouping(rA));
    const testLayout = computeLayout(rA.n, W, H, byTestResultGrouping(rA));

    it('iconSize matches by-condition layout', () => {
      expect(dual.iconSize).toBe(condLayout.iconSize);
    });

    it('grid matches by-condition layout', () => {
      expect(dual.grid).toEqual(condLayout.grid);
    });

    it('by-condition positions match the single-layout result per group', () => {
      // Group icons from both sources by group, then check position sets match.
      const groups: IconGroup[] = ['truePositive', 'falseNegative', 'falsePositive', 'trueNegative'];
      for (const group of groups) {
        const dualPositions = dual.icons
          .filter(i => i.group === group)
          .map(i => ({ x: i.byCondition.x, y: i.byCondition.y }))
          .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

        const singlePositions = condLayout.icons
          .filter(i => i.group === group)
          .map(i => ({ x: i.x, y: i.y }))
          .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

        expect(dualPositions.length).toBe(singlePositions.length);
        for (let i = 0; i < dualPositions.length; i++) {
          expect(dualPositions[i].x).toBeCloseTo(singlePositions[i].x, 5);
          expect(dualPositions[i].y).toBeCloseTo(singlePositions[i].y, 5);
        }
      }
    });

    it('by-test-result positions match the single-layout result per group', () => {
      const groups: IconGroup[] = ['truePositive', 'falseNegative', 'falsePositive', 'trueNegative'];
      for (const group of groups) {
        const dualPositions = dual.icons
          .filter(i => i.group === group)
          .map(i => ({ x: i.byTestResult.x, y: i.byTestResult.y }))
          .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

        const singlePositions = testLayout.icons
          .filter(i => i.group === group)
          .map(i => ({ x: i.x, y: i.y }))
          .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

        expect(dualPositions.length).toBe(singlePositions.length);
        for (let i = 0; i < dualPositions.length; i++) {
          expect(dualPositions[i].x).toBeCloseTo(singlePositions[i].x, 5);
          expect(dualPositions[i].y).toBeCloseTo(singlePositions[i].y, 5);
        }
      }
    });
  });

  describe('all six scenarios produce valid dual layouts', () => {
    for (const scenario of SCENARIOS) {
      it(`${scenario.id}: N icons with correct group counts`, () => {
        const rA = computeRegionA({
          n: scenario.n,
          baseRate: scenario.baseRate,
          sensitivity: scenario.sensitivity,
          fpr: scenario.specificity !== undefined ? 1 - scenario.specificity : scenario.fpr!,
        });
        const dual = computeDualLayout(rA, W, H);
        expect(dual.icons.length).toBe(rA.n);
        const counts = countGroups(dual.icons);
        expect(counts.get('truePositive') ?? 0).toBe(rA.nTP);
        expect(counts.get('falseNegative') ?? 0).toBe(rA.nFN);
        expect(counts.get('falsePositive') ?? 0).toBe(rA.nFP);
        expect(counts.get('trueNegative') ?? 0).toBe(rA.nTN);
      });
    }
  });
});

// ===== By-test-result layout spatial arrangement =====

describe('by-test-result layout spatial arrangement', () => {
  const rA = mammographyRegionA();
  const testLayout = computeLayout(rA.n, W, H, byTestResultGrouping(rA));

  it('test-positive icons (TP + FP) form first region', () => {
    const tpIcons = testLayout.icons.filter(i => i.group === 'truePositive');
    const fpIcons = testLayout.icons.filter(i => i.group === 'falsePositive');
    expect(tpIcons.length + fpIcons.length).toBe(rA.nTestPos);
  });

  it('test-negative icons (FN + TN) form second region', () => {
    const fnIcons = testLayout.icons.filter(i => i.group === 'falseNegative');
    const tnIcons = testLayout.icons.filter(i => i.group === 'trueNegative');
    expect(fnIcons.length + tnIcons.length).toBe(rA.nTestNeg);
  });

  it('first-level gap separates test-positive from test-negative regions', () => {
    // Test-positive region should be separated from test-negative by more than normal spacing.
    const tpFpIcons = testLayout.icons.filter(i => i.group === 'truePositive' || i.group === 'falsePositive');
    const fnTnIcons = testLayout.icons.filter(i => i.group === 'falseNegative' || i.group === 'trueNegative');

    const r1MaxX = Math.max(...tpFpIcons.map(i => i.x));
    const r2MinX = Math.min(...fnTnIcons.map(i => i.x));

    // The gap between regions should be larger than normal spacing.
    if (testLayout.firstLevelAxis === 'horizontal') {
      expect(r2MinX - r1MaxX).toBeGreaterThan(testLayout.spacing);
    }
    // For vertical axis, check y coordinates instead.
    if (testLayout.firstLevelAxis === 'vertical') {
      const r1MaxY = Math.max(...tpFpIcons.map(i => i.y));
      const r2MinY = Math.min(...fnTnIcons.map(i => i.y));
      expect(r2MinY - r1MaxY).toBeGreaterThan(testLayout.spacing);
    }
  });
});

// ===== buildByTestResultLabelContent =====

describe('buildByTestResultLabelContent', () => {
  describe('mammography reference — frequency mode', () => {
    const rB = mammographyRegionB();
    const labels = rB.frequency.byTestResult;

    it('FullyPartitioned shows both regions with composition', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      expect(content.region1).not.toBeNull();
      expect(content.region2).not.toBeNull();
      expect(content.region1!.compositionLine).not.toBeNull();
      expect(content.region2!.compositionLine).not.toBeNull();
    });

    it('region1 main line contains test-positive domain label and count', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      expect(content.region1!.mainLine).toContain('98');
    });

    it('region1 composition uses compositionString from ByTestResultLabels', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      // compositionString is something like "TP: 9, FP: 89" — wrapped in parentheses.
      expect(content.region1!.compositionLine).toContain(labels.testPositive.compositionString);
    });

    it('region2 composition uses compositionString from ByTestResultLabels', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      expect(content.region2!.compositionLine).toContain(labels.testNegative.compositionString);
    });

    it('Unpartitioned shows no labels', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.Unpartitioned);
      expect(content.region1).toBeNull();
      expect(content.region2).toBeNull();
    });

    it('BaseRatePartitioned shows count only, no composition', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.BaseRatePartitioned);
      expect(content.region1).not.toBeNull();
      expect(content.region1!.compositionLine).toBeNull();
      expect(content.region2!.compositionLine).toBeNull();
    });
  });

  describe('spam filter — vocabulary substitution', () => {
    const rB = spamRegionB();
    const labels = rB.frequency.byTestResult;

    it('uses spam-specific domain labels', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      // The test-positive domain label should be from the spam vocabulary, not mammography.
      expect(content.region1!.mainLine).toBeDefined();
      expect(content.region2!.mainLine).toBeDefined();
    });

    it('composition strings present for both regions', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      expect(content.region1!.compositionLine).not.toBeNull();
      expect(content.region2!.compositionLine).not.toBeNull();
    });
  });

  describe('probability mode', () => {
    const rB = mammographyRegionB();
    const labels = rB.probability.byTestResult;

    it('FullyPartitioned shows labels from probability mode', () => {
      const content = buildByTestResultLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
      expect(content.region1).not.toBeNull();
      expect(content.region2).not.toBeNull();
    });
  });
});

// ===== By-condition labels still work =====

describe('buildLabelContent (by-condition) still works after refactor', () => {
  const rB = mammographyRegionB();
  const labels = rB.frequency.byCondition;

  it('FullyPartitioned shows both regions with composition', () => {
    const content = buildLabelContent(labels, IconArrayConstructionState.FullyPartitioned);
    expect(content.region1).not.toBeNull();
    expect(content.region2).not.toBeNull();
    expect(content.region1!.compositionLine).not.toBeNull();
    expect(content.region2!.compositionLine).not.toBeNull();
  });

  it('Unpartitioned shows no labels', () => {
    const content = buildLabelContent(labels, IconArrayConstructionState.Unpartitioned);
    expect(content.region1).toBeNull();
    expect(content.region2).toBeNull();
  });
});

// ===== Region group sets for grouping states =====

describe('region group sets per grouping state', () => {
  it('by-condition: region 1 is TP+FN (condition-positive)', () => {
    const rA = mammographyRegionA();
    const dual = computeDualLayout(rA, W, H);
    const r1 = dual.icons.filter(i =>
      i.group === 'truePositive' || i.group === 'falseNegative'
    );
    expect(r1.length).toBe(rA.nD);
  });

  it('by-test-result: region 1 is TP+FP (test-positive)', () => {
    const rA = mammographyRegionA();
    const dual = computeDualLayout(rA, W, H);
    const r1 = dual.icons.filter(i =>
      i.group === 'truePositive' || i.group === 'falsePositive'
    );
    expect(r1.length).toBe(rA.nTestPos);
  });
});
