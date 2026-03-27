/**
 * Tests for the frequency tree layout engine.
 *
 * Covers: node positioning, branch geometry, scaling, construction state visibility,
 * bracket layout, and proportional relationships.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTreeLayout,
  isNodeVisible,
  isBranchVisible,
  getVisibleNodes,
  getVisibleBranches,
  type TreeNodeId,
  type TreeBranchId,
} from './layout';
import { TreeConstructionState } from '../../types';

// ===== Layout computation =====

describe('computeTreeLayout', () => {
  const layout = computeTreeLayout(1000, 700);

  it('produces all 7 nodes', () => {
    expect(layout.nodes.size).toBe(7);
    const expectedIds: TreeNodeId[] = [
      'root', 'conditionPositive', 'conditionNegative',
      'truePositive', 'falseNegative', 'falsePositive', 'trueNegative',
    ];
    for (const id of expectedIds) {
      expect(layout.nodes.has(id)).toBe(true);
    }
  });

  it('produces all 6 branches', () => {
    expect(layout.branches.length).toBe(6);
    const expectedIds: TreeBranchId[] = [
      'baseRatePositive', 'baseRateNegative',
      'sensitivity', 'falseNegativeRate',
      'falsePositiveRate', 'trueNegativeRate',
    ];
    const branchIds = layout.branches.map(b => b.id);
    for (const id of expectedIds) {
      expect(branchIds).toContain(id);
    }
  });

  it('root is centred horizontally', () => {
    const root = layout.nodes.get('root')!;
    expect(root.cx).toBeCloseTo(500, 0);
  });

  it('root is above first-level nodes', () => {
    const root = layout.nodes.get('root')!;
    const cp = layout.nodes.get('conditionPositive')!;
    const cn = layout.nodes.get('conditionNegative')!;
    expect(root.cy).toBeLessThan(cp.cy);
    expect(root.cy).toBeLessThan(cn.cy);
  });

  it('first-level nodes are above leaf nodes', () => {
    const cp = layout.nodes.get('conditionPositive')!;
    const tp = layout.nodes.get('truePositive')!;
    expect(cp.cy).toBeLessThan(tp.cy);
  });

  it('conditionPositive is left of conditionNegative', () => {
    const cp = layout.nodes.get('conditionPositive')!;
    const cn = layout.nodes.get('conditionNegative')!;
    expect(cp.cx).toBeLessThan(cn.cx);
  });

  it('leaf nodes are ordered left to right: TP, FN, FP, TN', () => {
    const tp = layout.nodes.get('truePositive')!;
    const fn = layout.nodes.get('falseNegative')!;
    const fp = layout.nodes.get('falsePositive')!;
    const tn = layout.nodes.get('trueNegative')!;
    expect(tp.cx).toBeLessThan(fn.cx);
    expect(fn.cx).toBeLessThan(fp.cx);
    expect(fp.cx).toBeLessThan(tn.cx);
  });

  it('all nodes have positive dimensions', () => {
    for (const node of layout.nodes.values()) {
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  it('all nodes are within container bounds', () => {
    for (const node of layout.nodes.values()) {
      const left = node.cx - node.width / 2;
      const right = node.cx + node.width / 2;
      const top = node.cy - node.height / 2;
      const bottom = node.cy + node.height / 2;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(1000);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(700);
    }
  });

  it('branches connect parent bottom to child top', () => {
    for (const branch of layout.branches) {
      // y1 should be above y2 (parent above child)
      expect(branch.y1).toBeLessThan(branch.y2);
    }
  });

  it('branch labels are between parent and child y', () => {
    for (const branch of layout.branches) {
      expect(branch.labelY).toBeGreaterThan(branch.y1);
      expect(branch.labelY).toBeLessThan(branch.y2);
    }
  });

  it('bracket is below leaf nodes', () => {
    const tp = layout.nodes.get('truePositive')!;
    const fpNode = layout.nodes.get('falsePositive')!;
    const lowestLeafBottom = Math.max(
      tp.cy + tp.height / 2,
      fpNode.cy + fpNode.height / 2,
    );
    expect(layout.bracket.topY).toBeGreaterThan(lowestLeafBottom);
  });

  it('bracket spans from TP to FP horizontally', () => {
    const tp = layout.nodes.get('truePositive')!;
    const fpNode = layout.nodes.get('falsePositive')!;
    expect(layout.bracket.leftX).toBeCloseTo(tp.cx, 0);
    expect(layout.bracket.rightX).toBeCloseTo(fpNode.cx, 0);
  });

  it('bracket label x is centred between TP and FP', () => {
    const tp = layout.nodes.get('truePositive')!;
    const fpNode = layout.nodes.get('falsePositive')!;
    expect(layout.bracket.labelX).toBeCloseTo((tp.cx + fpNode.cx) / 2, 0);
  });

  it('sum label is above posterior label', () => {
    expect(layout.bracket.sumLabelY).toBeLessThan(layout.bracket.posteriorLabelY);
  });

  it('font sizes are positive', () => {
    expect(layout.nodeFontSize).toBeGreaterThan(0);
    expect(layout.branchFontSize).toBeGreaterThan(0);
    expect(layout.bracketFontSize).toBeGreaterThan(0);
  });
});

describe('computeTreeLayout — scaling', () => {
  it('scales proportionally with container size', () => {
    const small = computeTreeLayout(500, 350);
    const large = computeTreeLayout(1000, 700);
    // Node sizes should be roughly proportional.
    const smallRoot = small.nodes.get('root')!;
    const largeRoot = large.nodes.get('root')!;
    const sizeRatio = largeRoot.width / smallRoot.width;
    expect(sizeRatio).toBeCloseTo(2, 0.3);
  });

  it('handles very small containers gracefully (min scale)', () => {
    const tiny = computeTreeLayout(200, 140);
    expect(tiny.nodeFontSize).toBeGreaterThanOrEqual(8);
    for (const node of tiny.nodes.values()) {
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  it('handles wide containers (constrained by height)', () => {
    const wide = computeTreeLayout(2000, 700);
    const normal = computeTreeLayout(1000, 700);
    // Height-constrained: scale should be similar since height is same.
    const wideRoot = wide.nodes.get('root')!;
    const normalRoot = normal.nodes.get('root')!;
    expect(wideRoot.width).toBeCloseTo(normalRoot.width, 0);
  });

  it('handles tall containers (constrained by width)', () => {
    const tall = computeTreeLayout(500, 1400);
    const normal = computeTreeLayout(500, 350);
    // Width-constrained: scale should be same since width is same.
    const tallRoot = tall.nodes.get('root')!;
    const normalRoot = normal.nodes.get('root')!;
    expect(tallRoot.width).toBeCloseTo(normalRoot.width, 0);
  });
});

// ===== Construction state visibility =====

describe('construction state visibility', () => {
  describe('RootOnly', () => {
    const state = TreeConstructionState.RootOnly;

    it('shows only root node', () => {
      const visible = getVisibleNodes(state);
      expect(visible.size).toBe(1);
      expect(visible.has('root')).toBe(true);
    });

    it('shows no branches', () => {
      const visible = getVisibleBranches(state);
      expect(visible.size).toBe(0);
    });
  });

  describe('FirstBranch', () => {
    const state = TreeConstructionState.FirstBranch;

    it('shows root + two first-level nodes', () => {
      const visible = getVisibleNodes(state);
      expect(visible.size).toBe(3);
      expect(visible.has('root')).toBe(true);
      expect(visible.has('conditionPositive')).toBe(true);
      expect(visible.has('conditionNegative')).toBe(true);
    });

    it('shows two base rate branches', () => {
      const visible = getVisibleBranches(state);
      expect(visible.size).toBe(2);
      expect(visible.has('baseRatePositive')).toBe(true);
      expect(visible.has('baseRateNegative')).toBe(true);
    });

    it('does not show leaf nodes', () => {
      expect(isNodeVisible('truePositive', state)).toBe(false);
      expect(isNodeVisible('falseNegative', state)).toBe(false);
      expect(isNodeVisible('falsePositive', state)).toBe(false);
      expect(isNodeVisible('trueNegative', state)).toBe(false);
    });
  });

  describe('ConditionPositiveSecondBranch', () => {
    const state = TreeConstructionState.ConditionPositiveSecondBranch;

    it('shows 5 nodes (root + first-level + TP + FN)', () => {
      const visible = getVisibleNodes(state);
      expect(visible.size).toBe(5);
      expect(visible.has('truePositive')).toBe(true);
      expect(visible.has('falseNegative')).toBe(true);
    });

    it('does not show condition-negative leaf nodes', () => {
      expect(isNodeVisible('falsePositive', state)).toBe(false);
      expect(isNodeVisible('trueNegative', state)).toBe(false);
    });

    it('shows 4 branches (base rate + sensitivity + FNR)', () => {
      const visible = getVisibleBranches(state);
      expect(visible.size).toBe(4);
      expect(visible.has('sensitivity')).toBe(true);
      expect(visible.has('falseNegativeRate')).toBe(true);
      expect(visible.has('falsePositiveRate')).toBe(false);
      expect(visible.has('trueNegativeRate')).toBe(false);
    });
  });

  describe('FullyBranched', () => {
    const state = TreeConstructionState.FullyBranched;

    it('shows all 7 nodes', () => {
      const visible = getVisibleNodes(state);
      expect(visible.size).toBe(7);
    });

    it('shows all 6 branches', () => {
      const visible = getVisibleBranches(state);
      expect(visible.size).toBe(6);
    });
  });

  describe('isNodeVisible / isBranchVisible individual checks', () => {
    it('root is always visible', () => {
      for (const state of Object.values(TreeConstructionState)) {
        expect(isNodeVisible('root', state)).toBe(true);
      }
    });

    it('truePositive is only visible from ConditionPositiveSecondBranch onward', () => {
      expect(isNodeVisible('truePositive', TreeConstructionState.RootOnly)).toBe(false);
      expect(isNodeVisible('truePositive', TreeConstructionState.FirstBranch)).toBe(false);
      expect(isNodeVisible('truePositive', TreeConstructionState.ConditionPositiveSecondBranch)).toBe(true);
      expect(isNodeVisible('truePositive', TreeConstructionState.FullyBranched)).toBe(true);
    });

    it('falsePositive is only visible at FullyBranched', () => {
      expect(isNodeVisible('falsePositive', TreeConstructionState.RootOnly)).toBe(false);
      expect(isNodeVisible('falsePositive', TreeConstructionState.FirstBranch)).toBe(false);
      expect(isNodeVisible('falsePositive', TreeConstructionState.ConditionPositiveSecondBranch)).toBe(false);
      expect(isNodeVisible('falsePositive', TreeConstructionState.FullyBranched)).toBe(true);
    });

    it('sensitivity branch visible from ConditionPositiveSecondBranch onward', () => {
      expect(isBranchVisible('sensitivity', TreeConstructionState.RootOnly)).toBe(false);
      expect(isBranchVisible('sensitivity', TreeConstructionState.FirstBranch)).toBe(false);
      expect(isBranchVisible('sensitivity', TreeConstructionState.ConditionPositiveSecondBranch)).toBe(true);
      expect(isBranchVisible('sensitivity', TreeConstructionState.FullyBranched)).toBe(true);
    });
  });
});

// ===== Node-level structural properties =====

describe('node hierarchy', () => {
  const layout = computeTreeLayout(800, 560);

  it('TP and FN are below conditionPositive', () => {
    const cp = layout.nodes.get('conditionPositive')!;
    const tp = layout.nodes.get('truePositive')!;
    const fn = layout.nodes.get('falseNegative')!;
    expect(tp.cy).toBeGreaterThan(cp.cy);
    expect(fn.cy).toBeGreaterThan(cp.cy);
  });

  it('FP and TN are below conditionNegative', () => {
    const cn = layout.nodes.get('conditionNegative')!;
    const fp = layout.nodes.get('falsePositive')!;
    const tn = layout.nodes.get('trueNegative')!;
    expect(fp.cy).toBeGreaterThan(cn.cy);
    expect(tn.cy).toBeGreaterThan(cn.cy);
  });

  it('TP and FN are horizontally around conditionPositive', () => {
    const cp = layout.nodes.get('conditionPositive')!;
    const tp = layout.nodes.get('truePositive')!;
    const fn = layout.nodes.get('falseNegative')!;
    expect(tp.cx).toBeLessThan(cp.cx);
    expect(fn.cx).toBeGreaterThan(cp.cx);
  });

  it('FP and TN are horizontally around conditionNegative', () => {
    const cn = layout.nodes.get('conditionNegative')!;
    const fp = layout.nodes.get('falsePositive')!;
    const tn = layout.nodes.get('trueNegative')!;
    expect(fp.cx).toBeLessThan(cn.cx);
    expect(tn.cx).toBeGreaterThan(cn.cx);
  });
});

describe('branch connectivity', () => {
  const layout = computeTreeLayout(1000, 700);

  it('base rate branches originate from root cx', () => {
    const root = layout.nodes.get('root')!;
    const brPos = layout.branches.find(b => b.id === 'baseRatePositive')!;
    const brNeg = layout.branches.find(b => b.id === 'baseRateNegative')!;
    expect(brPos.x1).toBeCloseTo(root.cx, 0);
    expect(brNeg.x1).toBeCloseTo(root.cx, 0);
  });

  it('base rate branches terminate at first-level nodes cx', () => {
    const cp = layout.nodes.get('conditionPositive')!;
    const cn = layout.nodes.get('conditionNegative')!;
    const brPos = layout.branches.find(b => b.id === 'baseRatePositive')!;
    const brNeg = layout.branches.find(b => b.id === 'baseRateNegative')!;
    expect(brPos.x2).toBeCloseTo(cp.cx, 0);
    expect(brNeg.x2).toBeCloseTo(cn.cx, 0);
  });

  it('sensitivity branch connects conditionPositive to truePositive', () => {
    const cp = layout.nodes.get('conditionPositive')!;
    const tp = layout.nodes.get('truePositive')!;
    const sens = layout.branches.find(b => b.id === 'sensitivity')!;
    expect(sens.x1).toBeCloseTo(cp.cx, 0);
    expect(sens.x2).toBeCloseTo(tp.cx, 0);
  });

  it('FPR branch connects conditionNegative to falsePositive', () => {
    const cn = layout.nodes.get('conditionNegative')!;
    const fp = layout.nodes.get('falsePositive')!;
    const fprBranch = layout.branches.find(b => b.id === 'falsePositiveRate')!;
    expect(fprBranch.x1).toBeCloseTo(cn.cx, 0);
    expect(fprBranch.x2).toBeCloseTo(fp.cx, 0);
  });
});

describe('branch label sides', () => {
  const layout = computeTreeLayout(1000, 700);

  it('left branches have left-side labels, right branches have right-side labels', () => {
    const branchSides: Record<string, 'left' | 'right'> = {
      baseRatePositive: 'left',
      baseRateNegative: 'right',
      sensitivity: 'left',
      falseNegativeRate: 'right',
      falsePositiveRate: 'left',
      trueNegativeRate: 'right',
    };
    for (const branch of layout.branches) {
      expect(branch.labelSide).toBe(branchSides[branch.id]);
    }
  });
});
