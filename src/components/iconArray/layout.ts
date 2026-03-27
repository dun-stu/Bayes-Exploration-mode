/**
 * Icon array spatial layout algorithm — alternating-axis hierarchical subdivision.
 *
 * Pure function: counts + container dimensions → icon positions with group assignments.
 * Reusable for both by-condition and by-test-result layouts (subtask 2.3 will call
 * with different grouping parameters).
 *
 * Algorithm:
 *   1. Determine axis assignment (first-level split along container's shorter dimension)
 *   2. Compute cell pitch, grid dimensions, icon size, spacing — all fitted to container
 *   3. Place N icons into grid cells (row-major order)
 *   4. First-level partition: assign icons to region 1 or 2 based on grid position
 *   5. Second-level partition: row-major fill within each region
 *   6. Pixel positions with extra gap at first-level boundary and centring
 */

import type { DataPackageRegionA } from '../../types';

// ===== Types =====

export type IconGroup = 'truePositive' | 'falseNegative' | 'falsePositive' | 'trueNegative';

export interface IconData {
  /** Stable identity — index from 0 to N-1. */
  index: number;
  /** Which of the four partition groups this icon belongs to. */
  group: IconGroup;
  /** Grid row (0-indexed from top). */
  row: number;
  /** Grid column (0-indexed from left). */
  col: number;
  /** Pixel x position (top-left of icon). */
  x: number;
  /** Pixel y position (top-left of icon). */
  y: number;
}

/** Position set for one layout (used in DualLayoutIcon). */
export interface IconPosition {
  row: number;
  col: number;
  x: number;
  y: number;
}

/**
 * An icon with positions from both grouping layouts.
 * The group and index are stable across layouts — only position changes.
 * Layer 4 will interpolate between byCondition and byTestResult positions.
 */
export interface DualLayoutIcon {
  /** Stable identity — index from 0 to N-1 (assigned by group ordinal). */
  index: number;
  /** Which of the four partition groups this icon belongs to. */
  group: IconGroup;
  /** Position in the by-condition layout. */
  byCondition: IconPosition;
  /** Position in the by-test-result layout. */
  byTestResult: IconPosition;
}

export interface DualLayoutResult {
  icons: DualLayoutIcon[];
  /** Shared grid dimensions (both layouts use the same grid). */
  grid: GridDimensions;
  iconSize: number;
  spacing: number;
  firstLevelGap: number;
  firstLevelAxis: 'horizontal' | 'vertical';
}

export interface GridDimensions {
  rows: number;
  cols: number;
}

export interface LayoutResult {
  icons: IconData[];
  grid: GridDimensions;
  iconSize: number;
  spacing: number;
  firstLevelGap: number;
  /** Whether the first-level split is along columns (horizontal) or rows (vertical). */
  firstLevelAxis: 'horizontal' | 'vertical';
}

/** Grouping parameters — what counts go where at each partition level. */
export interface GroupingParams {
  /** Count in the first (left/top) region. */
  firstRegionCount: number;
  /** Within first region: count of the primary sub-group (filled first, row-major). */
  firstRegionPrimaryCount: number;
  /** Within second region: count of the primary sub-group (filled first, row-major). */
  secondRegionPrimaryCount: number;
  /** Group identifiers: [firstPrimary, firstSecondary, secondPrimary, secondSecondary]. */
  groups: [IconGroup, IconGroup, IconGroup, IconGroup];
}

// ===== Grouping Parameter Builders =====

export function byConditionGrouping(regionA: DataPackageRegionA): GroupingParams {
  return {
    firstRegionCount: regionA.nD,
    firstRegionPrimaryCount: regionA.nTP,
    secondRegionPrimaryCount: regionA.nFP,
    groups: ['truePositive', 'falseNegative', 'falsePositive', 'trueNegative'],
  };
}

export function byTestResultGrouping(regionA: DataPackageRegionA): GroupingParams {
  return {
    firstRegionCount: regionA.nTestPos,
    firstRegionPrimaryCount: regionA.nTP,
    secondRegionPrimaryCount: regionA.nFN,
    groups: ['truePositive', 'falsePositive', 'falseNegative', 'trueNegative'],
  };
}

// ===== Spacing Calculation =====

function spacingRatio(iconSize: number): number {
  const minRatio = 0.05;
  const maxRatio = 0.20;
  const smallSize = 4;
  const largeSize = 20;
  const t = Math.min(1, Math.max(0, (iconSize - smallSize) / (largeSize - smallSize)));
  return minRatio + t * (maxRatio - minRatio);
}

export function computeSpacing(iconSize: number): number {
  return iconSize * spacingRatio(iconSize);
}

// ===== Grid Dimension Calculation =====

/**
 * Compute grid rows and columns that fit within the container while
 * minimising empty cells and matching the container aspect ratio.
 */
export function computeGridDimensions(
  n: number,
  availWidth: number,
  availHeight: number,
): GridDimensions {
  if (n <= 0 || availWidth <= 0 || availHeight <= 0) {
    return { rows: 0, cols: 0 };
  }

  // Target: cols/rows ≈ availWidth/availHeight, and rows*cols >= n,
  // with rows*cols as close to n as possible.
  const aspectRatio = availWidth / availHeight;

  // From rows*cols = n and cols/rows = aspectRatio:
  // cols = sqrt(n * aspectRatio), rows = sqrt(n / aspectRatio)
  const idealCols = Math.sqrt(n * aspectRatio);
  const idealRows = Math.sqrt(n / aspectRatio);

  // Try floor and ceil combinations, pick the one with least waste.
  const candidates: GridDimensions[] = [];
  for (const cols of [Math.floor(idealCols), Math.ceil(idealCols)]) {
    if (cols < 1) continue;
    const rows = Math.ceil(n / cols);
    if (rows >= 1) candidates.push({ rows, cols });
  }
  for (const rows of [Math.floor(idealRows), Math.ceil(idealRows)]) {
    if (rows < 1) continue;
    const cols = Math.ceil(n / rows);
    if (cols >= 1) candidates.push({ rows, cols });
  }

  // Score: minimise empty cells, then prefer better aspect ratio match.
  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const empty = c.rows * c.cols - n;
    if (empty < 0) continue; // not enough cells
    const ratio = c.cols / c.rows;
    const ratioError = Math.abs(Math.log(ratio / aspectRatio));
    const score = empty * 10 + ratioError;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
}

// ===== Axis Assignment =====

export function chooseFirstLevelAxis(width: number, height: number): 'horizontal' | 'vertical' {
  return width >= height ? 'horizontal' : 'vertical';
}

// ===== Core Layout Algorithm =====

export function computeLayout(
  n: number,
  width: number,
  height: number,
  grouping: GroupingParams,
): LayoutResult {
  const emptyResult: LayoutResult = {
    icons: [],
    grid: { rows: 0, cols: 0 },
    iconSize: 0,
    spacing: 0,
    firstLevelGap: 0,
    firstLevelAxis: 'horizontal',
  };
  if (n <= 0 || width <= 0 || height <= 0) return emptyResult;

  const axis = chooseFirstLevelAxis(width, height);

  // --- Step 1: Estimate first-level gap and reserve space ---
  const roughPitch = Math.sqrt((width * height) / n);
  const roughIcon = roughPitch / 1.1;
  const roughSpacing = computeSpacing(roughIcon);
  const firstLevelGapExtra = roughSpacing * 2.5;

  const availW = axis === 'horizontal' ? width - firstLevelGapExtra : width;
  const availH = axis === 'vertical' ? height - firstLevelGapExtra : height;

  // --- Step 2: Grid dimensions ---
  const grid = computeGridDimensions(n, availW, availH);
  if (grid.rows === 0 || grid.cols === 0) return emptyResult;

  // --- Step 3: Cell pitch, icon size, spacing ---
  const pitch = Math.min(availW / grid.cols, availH / grid.rows);
  let iconSize = pitch / 1.15;
  for (let i = 0; i < 3; i++) {
    iconSize = pitch / (1 + spacingRatio(iconSize));
  }
  iconSize = Math.max(1, iconSize);
  const spacing = pitch - iconSize;
  const firstLevelGap = spacing + firstLevelGapExtra;

  // --- Step 4: Place icons in grid cells (row-major) ---
  interface Cell { row: number; col: number }
  const allCells: Cell[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      allCells.push({ row, col });
    }
  }
  // Only use first N cells.
  const usedCells = allCells.slice(0, n);

  // --- Step 5: Partition into regions ---
  // For horizontal axis: region 1 is the leftmost columns.
  // We need exactly firstRegionCount icons in region 1.
  //
  // The cross-axis length (number of icons per full line) depends on the axis:
  //   horizontal → rows per column (but the last column may be incomplete)
  //   vertical → cols per row (but the last row may be incomplete)
  //
  // We compute how many full lines of the cross-axis region 1 needs,
  // then handle the jagged edge.
  //
  // Key insight: count the actual occupied cells per line, not the theoretical grid size.

  // Build a map: for each line along the primary axis, how many cells are occupied?
  const cellsPerLine: number[] = [];
  if (axis === 'horizontal') {
    // Primary axis = columns. For each column, count occupied cells.
    for (let col = 0; col < grid.cols; col++) {
      cellsPerLine.push(usedCells.filter(c => c.col === col).length);
    }
  } else {
    // Primary axis = rows. For each row, count occupied cells.
    for (let row = 0; row < grid.rows; row++) {
      cellsPerLine.push(usedCells.filter(c => c.row === row).length);
    }
  }

  // Accumulate lines until we reach firstRegionCount.
  let r1Accumulated = 0;
  let r1FullLines = 0;
  let r1Remainder = 0;

  for (let i = 0; i < cellsPerLine.length; i++) {
    if (r1Accumulated + cellsPerLine[i] <= grouping.firstRegionCount) {
      r1Accumulated += cellsPerLine[i];
      r1FullLines++;
    } else {
      r1Remainder = grouping.firstRegionCount - r1Accumulated;
      break;
    }
  }

  // Classify each used cell into region 1 or 2.
  const region1Cells: Cell[] = [];
  const region2Cells: Cell[] = [];

  for (const cell of usedCells) {
    const lineIndex = axis === 'horizontal' ? cell.col : cell.row;
    const crossIndex = axis === 'horizontal' ? cell.row : cell.col;

    const inR1 = lineIndex < r1FullLines ||
      (lineIndex === r1FullLines && r1Remainder > 0 && crossIndex < r1Remainder);

    if (inR1) {
      region1Cells.push(cell);
    } else {
      region2Cells.push(cell);
    }
  }

  // Sort each region row-major for the second-level fill.
  region1Cells.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  region2Cells.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

  // --- Step 6: Assign groups (second-level partition via row-major fill) ---
  const [g1Primary, g1Secondary, g2Primary, g2Secondary] = grouping.groups;
  const icons: IconData[] = [];
  const region2Indices = new Set<number>();
  let globalIndex = 0;

  for (let i = 0; i < region1Cells.length; i++) {
    const cell = region1Cells[i];
    icons.push({
      index: globalIndex++,
      group: i < grouping.firstRegionPrimaryCount ? g1Primary : g1Secondary,
      row: cell.row, col: cell.col,
      x: 0, y: 0,
    });
  }

  for (let i = 0; i < region2Cells.length; i++) {
    const cell = region2Cells[i];
    const idx = globalIndex++;
    region2Indices.add(idx);
    icons.push({
      index: idx,
      group: i < grouping.secondRegionPrimaryCount ? g2Primary : g2Secondary,
      row: cell.row, col: cell.col,
      x: 0, y: 0,
    });
  }

  // --- Step 7: Pixel positions ---
  // Gap offset is applied based on region membership, not grid position.
  // This ensures the gap separates R1 from R2 even at the jagged boundary,
  // where a single grid line may contain icons from both regions.
  const gridPixelW = grid.cols * pitch + (axis === 'horizontal' ? firstLevelGapExtra : 0);
  const gridPixelH = grid.rows * pitch + (axis === 'vertical' ? firstLevelGapExtra : 0);
  const offsetX = Math.max(0, (width - gridPixelW) / 2);
  const offsetY = Math.max(0, (height - gridPixelH) / 2);

  for (const icon of icons) {
    const gapShift = region2Indices.has(icon.index) ? firstLevelGapExtra : 0;
    if (axis === 'horizontal') {
      icon.x = offsetX + icon.col * pitch + gapShift;
      icon.y = offsetY + icon.row * pitch;
    } else {
      icon.x = offsetX + icon.col * pitch;
      icon.y = offsetY + icon.row * pitch + gapShift;
    }
  }

  return {
    icons,
    grid,
    iconSize,
    spacing,
    firstLevelGap,
    firstLevelAxis: axis,
  };
}

// ===== Dual Layout (both grouping states computed upfront) =====

/**
 * Compute both by-condition and by-test-result layouts, then merge into
 * DualLayoutIcon[] where each icon has positions from both layouts.
 *
 * Icons are matched across layouts by group + ordinal within group.
 * This produces consistent pairing for animation: the k-th TP icon in the
 * by-condition layout maps to the k-th TP icon in the by-test-result layout.
 */
export function computeDualLayout(
  regionA: DataPackageRegionA,
  width: number,
  height: number,
): DualLayoutResult {
  const byCondLayout = computeLayout(regionA.n, width, height, byConditionGrouping(regionA));
  const byTestLayout = computeLayout(regionA.n, width, height, byTestResultGrouping(regionA));

  // Group icons by their group identifier for pairing.
  const byCondByGroup = groupIconsByGroup(byCondLayout.icons);
  const byTestByGroup = groupIconsByGroup(byTestLayout.icons);

  // Merge: pair by group + ordinal within group.
  const dualIcons: DualLayoutIcon[] = [];
  let index = 0;
  const groups: IconGroup[] = ['truePositive', 'falseNegative', 'falsePositive', 'trueNegative'];

  for (const group of groups) {
    const condIcons = byCondByGroup.get(group) ?? [];
    const testIcons = byTestByGroup.get(group) ?? [];
    // Counts must match — same data, same N.
    for (let i = 0; i < condIcons.length; i++) {
      dualIcons.push({
        index: index++,
        group,
        byCondition: {
          row: condIcons[i].row,
          col: condIcons[i].col,
          x: condIcons[i].x,
          y: condIcons[i].y,
        },
        byTestResult: {
          row: testIcons[i].row,
          col: testIcons[i].col,
          x: testIcons[i].x,
          y: testIcons[i].y,
        },
      });
    }
  }

  return {
    icons: dualIcons,
    grid: byCondLayout.grid,
    iconSize: byCondLayout.iconSize,
    spacing: byCondLayout.spacing,
    firstLevelGap: byCondLayout.firstLevelGap,
    firstLevelAxis: byCondLayout.firstLevelAxis,
  };
}

function groupIconsByGroup(icons: IconData[]): Map<IconGroup, IconData[]> {
  const map = new Map<IconGroup, IconData[]>();
  for (const icon of icons) {
    const list = map.get(icon.group);
    if (list) {
      list.push(icon);
    } else {
      map.set(icon.group, [icon]);
    }
  }
  return map;
}
