/**
 * Unit tests for the icon array layout algorithm.
 *
 * Tests cover: grid dimension calculation, axis assignment, group assignment
 * correctness (count matching), contiguity of regions, jagged-edge handling,
 * and pixel position ordering.
 */

import { describe, it, expect } from 'vitest';
import {
  computeGridDimensions,
  computeSpacing,
  chooseFirstLevelAxis,
  computeLayout,
  byConditionGrouping,
  byTestResultGrouping,
  type IconGroup,
} from './layout';
import { computeRegionA } from '../../computation/computeRegionA';

// ===== Helper: compute regionA for a given parameter set =====
function regionA(n: number, baseRate: number, sensitivity: number, fpr: number) {
  return computeRegionA({ n, baseRate, sensitivity, fpr });
}

// ===== Grid Dimension Calculation =====

describe('computeGridDimensions', () => {
  it('returns 0x0 for zero N', () => {
    expect(computeGridDimensions(0, 800, 600)).toEqual({ rows: 0, cols: 0 });
  });

  it('returns 0x0 for zero dimensions', () => {
    expect(computeGridDimensions(100, 0, 600)).toEqual({ rows: 0, cols: 0 });
  });

  it('produces enough cells for N=100 in a square container', () => {
    const grid = computeGridDimensions(100, 500, 500);
    expect(grid.rows * grid.cols).toBeGreaterThanOrEqual(100);
  });

  it('produces enough cells for N=1000 in a wide container', () => {
    const grid = computeGridDimensions(1000, 800, 600);
    expect(grid.rows * grid.cols).toBeGreaterThanOrEqual(1000);
  });

  it('grid aspect ratio roughly matches container aspect ratio', () => {
    const grid = computeGridDimensions(100, 800, 400);
    // Container is 2:1, so cols/rows should be roughly 2:1.
    const gridRatio = grid.cols / grid.rows;
    expect(gridRatio).toBeGreaterThan(1); // wider than tall
  });

  it('minimises empty cells for N=100 square', () => {
    const grid = computeGridDimensions(100, 500, 500);
    const emptyCells = grid.rows * grid.cols - 100;
    expect(emptyCells).toBeLessThan(grid.cols); // at most one partial row
  });
});

// ===== Spacing =====

describe('computeSpacing', () => {
  it('larger icons get relatively more spacing', () => {
    const spacingLarge = computeSpacing(20) / 20;
    const spacingSmall = computeSpacing(4) / 4;
    expect(spacingLarge).toBeGreaterThan(spacingSmall);
  });

  it('spacing is always positive for positive icon sizes', () => {
    expect(computeSpacing(1)).toBeGreaterThan(0);
    expect(computeSpacing(50)).toBeGreaterThan(0);
  });
});

// ===== Axis Assignment =====

describe('chooseFirstLevelAxis', () => {
  it('wide container → horizontal', () => {
    expect(chooseFirstLevelAxis(800, 600)).toBe('horizontal');
  });

  it('tall container → vertical', () => {
    expect(chooseFirstLevelAxis(400, 800)).toBe('vertical');
  });

  it('square container → horizontal (tie-break)', () => {
    expect(chooseFirstLevelAxis(500, 500)).toBe('horizontal');
  });
});

// ===== Core Layout — Group Count Correctness =====

describe('computeLayout — group counts', () => {
  it('mammography (N=1000, nD=10): correct group counts', () => {
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, 800, 600, byConditionGrouping(rA));

    const counts = countGroups(layout.icons.map(i => i.group));
    expect(counts.truePositive).toBe(rA.nTP);   // 9
    expect(counts.falseNegative).toBe(rA.nFN);   // 1
    expect(counts.falsePositive).toBe(rA.nFP);   // 89
    expect(counts.trueNegative).toBe(rA.nTN);    // 901
    expect(layout.icons.length).toBe(1000);
  });

  it('moderate scenario (N=100, nD=20): correct group counts', () => {
    const rA = regionA(100, 0.20, 0.80, 0.10);
    const layout = computeLayout(100, 600, 600, byConditionGrouping(rA));

    const counts = countGroups(layout.icons.map(i => i.group));
    expect(counts.truePositive).toBe(rA.nTP);
    expect(counts.falseNegative).toBe(rA.nFN);
    expect(counts.falsePositive).toBe(rA.nFP);
    expect(counts.trueNegative).toBe(rA.nTN);
    expect(layout.icons.length).toBe(100);
  });

  it('N=200, base rate 5%: correct group counts', () => {
    const rA = regionA(200, 0.05, 0.90, 0.05);
    const layout = computeLayout(200, 800, 500, byConditionGrouping(rA));

    const counts = countGroups(layout.icons.map(i => i.group));
    expect(counts.truePositive).toBe(rA.nTP);
    expect(counts.falseNegative).toBe(rA.nFN);
    expect(counts.falsePositive).toBe(rA.nFP);
    expect(counts.trueNegative).toBe(rA.nTN);
  });

  it('by-test-result grouping: correct group counts', () => {
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, 800, 600, byTestResultGrouping(rA));

    const counts = countGroups(layout.icons.map(i => i.group));
    expect(counts.truePositive).toBe(rA.nTP);
    expect(counts.falseNegative).toBe(rA.nFN);
    expect(counts.falsePositive).toBe(rA.nFP);
    expect(counts.trueNegative).toBe(rA.nTN);
  });

  it('all six scenarios produce correct group counts', () => {
    const scenarios = [
      { n: 1000, br: 0.01, sens: 0.90, fpr: 0.09 }, // mammography
      { n: 500, br: 0.04, sens: 0.70, fpr: 0.03 },   // covid antigen
      { n: 1000, br: 0.005, sens: 0.999, fpr: 0.002 }, // blood donation
      { n: 200, br: 0.10, sens: 0.95, fpr: 0.05 },   // spam filter
      { n: 500, br: 0.02, sens: 0.85, fpr: 0.03 },   // factory inspection
      { n: 200, br: 0.05, sens: 0.80, fpr: 0.10 },   // drug screening
    ];

    for (const s of scenarios) {
      const rA = regionA(s.n, s.br, s.sens, s.fpr);
      const layout = computeLayout(s.n, 800, 600, byConditionGrouping(rA));
      const counts = countGroups(layout.icons.map(i => i.group));
      expect(counts.truePositive).toBe(rA.nTP);
      expect(counts.falseNegative).toBe(rA.nFN);
      expect(counts.falsePositive).toBe(rA.nFP);
      expect(counts.trueNegative).toBe(rA.nTN);
      expect(layout.icons.length).toBe(s.n);
    }
  });
});

// ===== Layout Properties =====

describe('computeLayout — spatial properties', () => {
  it('all icons have unique indices 0 to N-1', () => {
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, 800, 600, byConditionGrouping(rA));

    const indices = layout.icons.map(i => i.index).sort((a, b) => a - b);
    expect(indices).toEqual(Array.from({ length: 1000 }, (_, i) => i));
  });

  it('icon size is positive', () => {
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, 800, 600, byConditionGrouping(rA));
    expect(layout.iconSize).toBeGreaterThan(0);
  });

  it('all icon positions are within container bounds', () => {
    const w = 800, h = 600;
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, w, h, byConditionGrouping(rA));

    for (const icon of layout.icons) {
      expect(icon.x).toBeGreaterThanOrEqual(0);
      expect(icon.y).toBeGreaterThanOrEqual(0);
      expect(icon.x + layout.iconSize).toBeLessThanOrEqual(w + 1); // small tolerance
      expect(icon.y + layout.iconSize).toBeLessThanOrEqual(h + 1);
    }
  });

  it('first-level gap is larger than normal spacing', () => {
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, 800, 600, byConditionGrouping(rA));
    expect(layout.firstLevelGap).toBeGreaterThan(layout.spacing);
  });

  it('wide container produces horizontal axis', () => {
    const rA = regionA(100, 0.20, 0.80, 0.10);
    const layout = computeLayout(100, 800, 400, byConditionGrouping(rA));
    expect(layout.firstLevelAxis).toBe('horizontal');
  });

  it('tall container produces vertical axis', () => {
    const rA = regionA(100, 0.20, 0.80, 0.10);
    const layout = computeLayout(100, 400, 800, byConditionGrouping(rA));
    expect(layout.firstLevelAxis).toBe('vertical');
  });
});

// ===== Region Contiguity =====

describe('computeLayout — region contiguity', () => {
  it('each group forms a contiguous region (mammography)', () => {
    const rA = regionA(1000, 0.01, 0.90, 0.09);
    const layout = computeLayout(1000, 800, 600, byConditionGrouping(rA));
    expectContiguousGroups(layout.icons, layout.grid.rows, layout.grid.cols);
  });

  it('each group forms a contiguous region (moderate N)', () => {
    const rA = regionA(100, 0.20, 0.80, 0.10);
    const layout = computeLayout(100, 600, 600, byConditionGrouping(rA));
    expectContiguousGroups(layout.icons, layout.grid.rows, layout.grid.cols);
  });
});

// ===== Helpers =====

function countGroups(groups: IconGroup[]): Record<IconGroup, number> {
  const counts: Record<IconGroup, number> = {
    truePositive: 0,
    falseNegative: 0,
    falsePositive: 0,
    trueNegative: 0,
  };
  for (const g of groups) counts[g]++;
  return counts;
}

/**
 * Check that each group forms a single contiguous region using flood fill.
 * "Contiguous" means connected through shared grid edges (4-connectivity).
 */
function expectContiguousGroups(icons: Array<{ row: number; col: number; group: IconGroup }>, rows: number, cols: number) {
  // Build a grid map.
  const grid: (IconGroup | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const icon of icons) {
    grid[icon.row][icon.col] = icon.group;
  }

  // For each group, find all cells and check they form one connected component.
  const groups: IconGroup[] = ['truePositive', 'falseNegative', 'falsePositive', 'trueNegative'];

  for (const group of groups) {
    const cellsOfGroup: Array<[number, number]> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === group) cellsOfGroup.push([r, c]);
      }
    }

    if (cellsOfGroup.length === 0) continue;

    // Flood fill from the first cell.
    const visited = new Set<string>();
    const queue: Array<[number, number]> = [cellsOfGroup[0]];
    visited.add(`${cellsOfGroup[0][0]},${cellsOfGroup[0][1]}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key) && grid[nr][nc] === group) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    expect(visited.size).toBe(
      cellsOfGroup.length,
      // Template literal removed to avoid type issues — the test name + group is sufficient context.
    );
  }
}
