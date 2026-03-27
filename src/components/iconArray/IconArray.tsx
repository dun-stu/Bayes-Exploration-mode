/**
 * Icon Array component — renders N icons in a hierarchically partitioned grid
 * with compound first-level labels and construction state support.
 *
 * Subtask 2.1: core grid and colouring.
 * Subtask 2.2: compound label system, construction state colouring, display mode.
 * Subtask 2.3: second grouping layout (by-test-result), dual positions, grouping state switching.
 * Layer 4 (pending): animation (regrouping, format-switching cross-fade).
 *
 * Both by-condition and by-test-result layouts are computed upfront. Each icon
 * stores positions from both layouts; the groupingState prop selects which set
 * to render (hard snap for now — Layer 4 adds animation interpolation).
 */

import { useMemo } from 'react';
import type {
  DataPackageRegionA,
  DataPackageRegionB,
  ByConditionLabels,
  ByTestResultLabels,
} from '../../types';
import { IconArrayConstructionState, GroupingState, DisplayMode } from '../../types';
import { ICON_COLORS } from '../../constants';
import {
  computeDualLayout,
  type DualLayoutIcon,
  type DualLayoutResult,
  type IconGroup,
} from './layout';

// ===== Props =====

interface IconArrayProps {
  regionA: DataPackageRegionA;
  regionB: DataPackageRegionB;
  width: number;
  height: number;
  constructionState?: IconArrayConstructionState;
  groupingState?: GroupingState;
  displayMode?: DisplayMode;
}

// ===== Construction State → Colour Logic =====

/**
 * Resolves the fill colour for an icon based on its group and the current
 * construction state. Implements the progressive colouring sequence:
 *   Unpartitioned → all neutral
 *   BaseRatePartitioned → warm/cool families (no shade variation)
 *   ConditionPositiveSubpartitioned → warm region has TP/FN shades; cool is uniform
 *   FullyPartitioned → all four groups distinct
 */
export function resolveIconColour(
  group: IconGroup,
  constructionState: IconArrayConstructionState,
): string {
  switch (constructionState) {
    case IconArrayConstructionState.Unpartitioned:
      return ICON_COLORS.unpartitioned;

    case IconArrayConstructionState.BaseRatePartitioned:
      if (group === 'truePositive' || group === 'falseNegative') {
        return ICON_COLORS.truePositive;
      }
      return ICON_COLORS.trueNegative;

    case IconArrayConstructionState.ConditionPositiveSubpartitioned:
      if (group === 'truePositive') return ICON_COLORS.truePositive;
      if (group === 'falseNegative') return ICON_COLORS.falseNegative;
      return ICON_COLORS.trueNegative;

    case IconArrayConstructionState.FullyPartitioned:
      return ICON_COLORS[group];
  }
}

// ===== Corner Radius Scaling =====

function cornerRadius(iconSize: number): number {
  const minRatio = 0.10;
  const maxRatio = 0.25;
  const smallSize = 4;
  const largeSize = 20;
  const t = Math.min(1, Math.max(0, (iconSize - smallSize) / (largeSize - smallSize)));
  return iconSize * (minRatio + t * (maxRatio - minRatio));
}

// ===== Label Prominence Scaling =====

export function labelFontSize(iconSize: number): number {
  const minFont = 10;
  const maxFont = 14;
  const smallIcon = 4;
  const largeIcon = 20;
  const t = Math.min(1, Math.max(0, (iconSize - smallIcon) / (largeIcon - smallIcon)));
  return maxFont - t * (maxFont - minFont);
}

export function labelFontWeight(iconSize: number): number {
  const smallIcon = 4;
  const largeIcon = 20;
  const t = Math.min(1, Math.max(0, (iconSize - smallIcon) / (largeIcon - smallIcon)));
  return Math.round(700 - t * 200);
}

// ===== Label Content per Construction State =====

export interface CompoundLabelContent {
  mainLine: string;
  compositionLine: string | null;
}

/**
 * Build label content for by-condition grouping.
 */
export function buildLabelContent(
  labels: ByConditionLabels,
  constructionState: IconArrayConstructionState,
): { region1: CompoundLabelContent | null; region2: CompoundLabelContent | null } {
  if (constructionState === IconArrayConstructionState.Unpartitioned) {
    return { region1: null, region2: null };
  }

  const cpGroup = labels.conditionPositive.group;
  const cnGroup = labels.conditionNegative.group;

  if (constructionState === IconArrayConstructionState.BaseRatePartitioned) {
    const cpCount = extractCountOnly(cpGroup.countDisplay);
    const cnCount = extractCountOnly(cnGroup.countDisplay);
    return {
      region1: { mainLine: `${cpGroup.domainLabel}: ${cpCount}`, compositionLine: null },
      region2: { mainLine: `${cnGroup.domainLabel}: ${cnCount}`, compositionLine: null },
    };
  }

  if (constructionState === IconArrayConstructionState.ConditionPositiveSubpartitioned) {
    const cnCount = extractCountOnly(cnGroup.countDisplay);
    return {
      region1: buildFullCompoundLabel(cpGroup, labels.conditionPositive.truePositive, labels.conditionPositive.falseNegative),
      region2: { mainLine: `${cnGroup.domainLabel}: ${cnCount}`, compositionLine: null },
    };
  }

  return {
    region1: buildFullCompoundLabel(cpGroup, labels.conditionPositive.truePositive, labels.conditionPositive.falseNegative),
    region2: buildFullCompoundLabel(cnGroup, labels.conditionNegative.falsePositive, labels.conditionNegative.trueNegative),
  };
}

/**
 * Build label content for by-test-result grouping.
 * Uses the compositionString from ByTestResultLabels directly.
 * Construction state interaction: labels are always shown as fully-composed
 * since regrouping is only meaningful when fully partitioned.
 */
export function buildByTestResultLabelContent(
  labels: ByTestResultLabels,
  constructionState: IconArrayConstructionState,
): { region1: CompoundLabelContent | null; region2: CompoundLabelContent | null } {
  if (constructionState === IconArrayConstructionState.Unpartitioned) {
    return { region1: null, region2: null };
  }

  const tpGroup = labels.testPositive.group;
  const tnGroup = labels.testNegative.group;

  // For early construction states, show count only (no composition).
  if (constructionState === IconArrayConstructionState.BaseRatePartitioned) {
    const tpCount = extractCountOnly(tpGroup.countDisplay);
    const tnCount = extractCountOnly(tnGroup.countDisplay);
    return {
      region1: { mainLine: `${tpGroup.domainLabel}: ${tpCount}`, compositionLine: null },
      region2: { mainLine: `${tnGroup.domainLabel}: ${tnCount}`, compositionLine: null },
    };
  }

  // ConditionPositiveSubpartitioned or FullyPartitioned — show composition.
  // The compositionString is pre-formatted by the template system (e.g. "TP: 9, FP: 89").
  const tpCount = extractCountOnly(tpGroup.countDisplay);
  const tnCount = extractCountOnly(tnGroup.countDisplay);
  return {
    region1: {
      mainLine: `${tpGroup.domainLabel}: ${tpCount}`,
      compositionLine: `(${labels.testPositive.compositionString})`,
    },
    region2: {
      mainLine: `${tnGroup.domainLabel}: ${tnCount}`,
      compositionLine: `(${labels.testNegative.compositionString})`,
    },
  };
}

function extractCountOnly(countDisplay: string): string {
  const parenIndex = countDisplay.indexOf(' (');
  return parenIndex >= 0 ? countDisplay.substring(0, parenIndex) : countDisplay;
}

function buildFullCompoundLabel(
  groupLabel: { domainLabel: string; countDisplay: string },
  subGroup1: { structuralLabel: string; countDisplay: string },
  subGroup2: { structuralLabel: string; countDisplay: string },
): CompoundLabelContent {
  const count = extractCountOnly(groupLabel.countDisplay);
  return {
    mainLine: `${groupLabel.domainLabel}: ${count}`,
    compositionLine: `(${subGroup1.structuralLabel}: ${subGroup1.countDisplay}, ${subGroup2.structuralLabel}: ${subGroup2.countDisplay})`,
  };
}

// ===== Region Bounding Boxes =====

interface RegionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeRegionBounds(
  positions: Array<{ x: number; y: number }>,
  iconSize: number,
): RegionBounds | null {
  if (positions.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pos of positions) {
    if (pos.x < minX) minX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.x + iconSize > maxX) maxX = pos.x + iconSize;
    if (pos.y + iconSize > maxY) maxY = pos.y + iconSize;
  }
  return { minX, minY, maxX, maxY };
}

// ===== Label Padding =====

const LABEL_PADDING_H = 4;
const LABEL_PADDING_V = 2;
const LABEL_BG_OPACITY = 0.75;

// ===== Region group sets for each grouping state =====

const BY_CONDITION_R1_GROUPS: ReadonlySet<IconGroup> = new Set(['truePositive', 'falseNegative']);
const BY_TEST_RESULT_R1_GROUPS: ReadonlySet<IconGroup> = new Set(['truePositive', 'falsePositive']);

// ===== Component =====

export function IconArray({
  regionA,
  regionB,
  width,
  height,
  constructionState = IconArrayConstructionState.FullyPartitioned,
  groupingState = GroupingState.GroupedByCondition,
  displayMode = DisplayMode.Frequency,
}: IconArrayProps) {
  const isByCondition = groupingState === GroupingState.GroupedByCondition;

  // Compute both layouts upfront — memoised on data and dimensions.
  const dualLayout: DualLayoutResult = useMemo(
    () => computeDualLayout(regionA, width, height),
    [regionA, width, height],
  );

  // Build label content based on grouping state, display mode, and construction state.
  const labelContent = useMemo(() => {
    const modeLabels = displayMode === DisplayMode.Frequency
      ? regionB.frequency
      : regionB.probability;

    if (isByCondition) {
      return buildLabelContent(modeLabels.byCondition, constructionState);
    } else {
      return buildByTestResultLabelContent(modeLabels.byTestResult, constructionState);
    }
  }, [regionB, displayMode, isByCondition, constructionState]);

  // Partition icons into region 1 and region 2 for label positioning,
  // using positions from the current grouping state.
  const { region1Positions, region2Positions } = useMemo(() => {
    const r1Groups = isByCondition ? BY_CONDITION_R1_GROUPS : BY_TEST_RESULT_R1_GROUPS;
    const r1: Array<{ x: number; y: number }> = [];
    const r2: Array<{ x: number; y: number }> = [];
    for (const icon of dualLayout.icons) {
      const pos = isByCondition ? icon.byCondition : icon.byTestResult;
      if (r1Groups.has(icon.group)) {
        r1.push(pos);
      } else {
        r2.push(pos);
      }
    }
    return { region1Positions: r1, region2Positions: r2 };
  }, [dualLayout.icons, isByCondition]);

  if (dualLayout.icons.length === 0) return null;

  const { icons, iconSize } = dualLayout;
  const radius = cornerRadius(iconSize);
  const fontSize = labelFontSize(iconSize);
  const fontWeight = labelFontWeight(iconSize);

  // Compute region bounding boxes for label positioning.
  const r1Bounds = computeRegionBounds(region1Positions, iconSize);
  const r2Bounds = computeRegionBounds(region2Positions, iconSize);

  // Compute label height for overlap avoidance.
  const lineHeight = fontSize * 1.3;
  const compositionFontSize = fontSize * 0.85;
  const r1LabelHeight = labelContent.region1
    ? (labelContent.region1.compositionLine
        ? lineHeight + compositionFontSize * 1.3 + LABEL_PADDING_V * 2
        : lineHeight + LABEL_PADDING_V * 2)
    : 0;

  let r2YOffset = 0;
  if (r1Bounds && r2Bounds && labelContent.region1) {
    const yOverlap = Math.abs(r1Bounds.minY - r2Bounds.minY) < r1LabelHeight;
    const xOverlap = r1Bounds.maxX > r2Bounds.minX || r2Bounds.maxX > r1Bounds.minX;
    if (yOverlap && xOverlap) {
      r2YOffset = r1LabelHeight + 2;
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Icon array showing ${regionA.n} icons`}
    >
      {/* Icons — positioned from current grouping state's layout */}
      {icons.map((icon: DualLayoutIcon) => {
        const pos = isByCondition ? icon.byCondition : icon.byTestResult;
        return (
          <rect
            key={icon.index}
            x={pos.x}
            y={pos.y}
            width={iconSize}
            height={iconSize}
            rx={radius}
            ry={radius}
            fill={resolveIconColour(icon.group, constructionState)}
          />
        );
      })}

      {/* Compound labels */}
      {labelContent.region1 && r1Bounds && (
        <CompoundLabel
          content={labelContent.region1}
          bounds={r1Bounds}
          fontSize={fontSize}
          fontWeight={fontWeight}
          containerWidth={width}
          yOffset={0}
        />
      )}
      {labelContent.region2 && r2Bounds && (
        <CompoundLabel
          content={labelContent.region2}
          bounds={r2Bounds}
          fontSize={fontSize}
          fontWeight={fontWeight}
          containerWidth={width}
          yOffset={r2YOffset}
        />
      )}
    </svg>
  );
}

// ===== Compound Label Sub-component =====

interface CompoundLabelProps {
  content: CompoundLabelContent;
  bounds: RegionBounds;
  fontSize: number;
  fontWeight: number;
  containerWidth: number;
  yOffset: number;
}

function CompoundLabel({ content, bounds, fontSize, fontWeight, containerWidth, yOffset }: CompoundLabelProps) {
  const lineHeight = fontSize * 1.3;
  const compositionFontSize = fontSize * 0.85;
  const totalHeight = content.compositionLine
    ? lineHeight + compositionFontSize * 1.3 + LABEL_PADDING_V * 2
    : lineHeight + LABEL_PADDING_V * 2;

  const x = bounds.minX;
  const y = bounds.minY + yOffset;

  const mainWidth = content.mainLine.length * fontSize * 0.55;
  const compositionWidth = content.compositionLine
    ? content.compositionLine.length * compositionFontSize * 0.55
    : 0;
  const bgWidth = Math.min(
    Math.max(mainWidth, compositionWidth) + LABEL_PADDING_H * 2,
    containerWidth - x,
  );

  return (
    <g className="compound-label">
      <rect
        x={x}
        y={y}
        width={bgWidth}
        height={totalHeight}
        rx={3}
        ry={3}
        fill="white"
        fillOpacity={LABEL_BG_OPACITY}
      />
      <text
        x={x + LABEL_PADDING_H}
        y={y + LABEL_PADDING_V + fontSize}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily="system-ui, sans-serif"
        fill="#212121"
      >
        {content.mainLine}
      </text>
      {content.compositionLine && (
        <text
          x={x + LABEL_PADDING_H}
          y={y + LABEL_PADDING_V + lineHeight + compositionFontSize}
          fontSize={compositionFontSize}
          fontWeight={fontWeight - 100}
          fontFamily="system-ui, sans-serif"
          fill="#616161"
        >
          {content.compositionLine}
        </text>
      )}
    </g>
  );
}
