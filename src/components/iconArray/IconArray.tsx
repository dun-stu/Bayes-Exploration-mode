/**
 * Icon Array component — renders N icons in a hierarchically partitioned grid
 * with compound first-level labels and construction state support.
 *
 * Subtask 2.1: core grid and colouring.
 * Subtask 2.2: compound label system, construction state colouring, display mode.
 * Subtask 2.3 (pending): second grouping layout (by-test-result).
 * Layer 4 (pending): animation (regrouping, format-switching cross-fade).
 *
 * Accepts Region A (counts), Region B (labels), construction state, display mode,
 * and container dimensions. Renders rounded-square SVG icons coloured by partition
 * group according to construction state, plus compound first-level labels from
 * the active display mode's label set.
 */

import { useMemo } from 'react';
import type {
  DataPackageRegionA,
  DataPackageRegionB,
  ByConditionLabels,
} from '../../types';
import { IconArrayConstructionState, GroupingState, DisplayMode } from '../../types';
import { ICON_COLORS } from '../../constants';
import {
  computeLayout,
  byConditionGrouping,
  type IconData,
  type LayoutResult,
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
  group: IconData['group'],
  constructionState: IconArrayConstructionState,
): string {
  switch (constructionState) {
    case IconArrayConstructionState.Unpartitioned:
      return ICON_COLORS.unpartitioned;

    case IconArrayConstructionState.BaseRatePartitioned:
      // Warm family (condition-positive) vs cool family (condition-negative).
      // No shade variation — use primary colour for entire family.
      if (group === 'truePositive' || group === 'falseNegative') {
        return ICON_COLORS.truePositive; // warm primary
      }
      return ICON_COLORS.trueNegative; // cool primary

    case IconArrayConstructionState.ConditionPositiveSubpartitioned:
      // Warm region: full shade variation (TP vs FN distinct).
      // Cool region: still uniform (no FP/TN distinction yet).
      if (group === 'truePositive') return ICON_COLORS.truePositive;
      if (group === 'falseNegative') return ICON_COLORS.falseNegative;
      return ICON_COLORS.trueNegative; // cool primary for both FP and TN

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

/**
 * Compound label font size scales continuously with icon size.
 * At high N (small icons): labels are larger and more prominent — primary info channel.
 * At moderate N (large icons): labels are smaller, secondary to the visual.
 *
 * The function maps iconSize to fontSize inversely: smaller icons → larger labels.
 * Range: ~10px at large icons (N≈100) to ~14px at small icons (N≈1000).
 */
export function labelFontSize(iconSize: number): number {
  const minFont = 10;
  const maxFont = 14;
  const smallIcon = 4;  // high N
  const largeIcon = 20; // moderate N
  // Invert: small icon → large font
  const t = Math.min(1, Math.max(0, (iconSize - smallIcon) / (largeIcon - smallIcon)));
  return maxFont - t * (maxFont - minFont);
}

/**
 * Label font weight: bolder at high N (small icons) where labels are the
 * primary information channel. Range: 500–700.
 */
export function labelFontWeight(iconSize: number): number {
  const smallIcon = 4;
  const largeIcon = 20;
  const t = Math.min(1, Math.max(0, (iconSize - smallIcon) / (largeIcon - smallIcon)));
  return Math.round(700 - t * 200); // 700 at small icon, 500 at large
}

// ===== Label Content per Construction State =====

/**
 * Determines what label text to show for each first-level region given
 * the construction state. Returns null when no label should be shown.
 */
export interface CompoundLabelContent {
  /** Main line: domain label + count, e.g. "Have the disease: 10" */
  mainLine: string;
  /** Composition line (sub-group breakdown), or null if not yet sub-partitioned. */
  compositionLine: string | null;
}

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
    // First-level only — no sub-group composition.
    // Extract just the count (the countDisplay includes the full compound string,
    // so we need to extract the count portion before the parenthetical).
    const cpCount = extractCountOnly(cpGroup.countDisplay);
    const cnCount = extractCountOnly(cnGroup.countDisplay);
    return {
      region1: { mainLine: `${cpGroup.domainLabel}: ${cpCount}`, compositionLine: null },
      region2: { mainLine: `${cnGroup.domainLabel}: ${cnCount}`, compositionLine: null },
    };
  }

  if (constructionState === IconArrayConstructionState.ConditionPositiveSubpartitioned) {
    // Condition-positive: full composition (TP, FN).
    // Condition-negative: count only (not yet sub-partitioned).
    const cnCount = extractCountOnly(cnGroup.countDisplay);
    return {
      region1: buildFullCompoundLabel(cpGroup, labels.conditionPositive.truePositive, labels.conditionPositive.falseNegative),
      region2: { mainLine: `${cnGroup.domainLabel}: ${cnCount}`, compositionLine: null },
    };
  }

  // FullyPartitioned — both regions show full composition.
  return {
    region1: buildFullCompoundLabel(cpGroup, labels.conditionPositive.truePositive, labels.conditionPositive.falseNegative),
    region2: buildFullCompoundLabel(cnGroup, labels.conditionNegative.falsePositive, labels.conditionNegative.trueNegative),
  };
}

/**
 * Extract just the count from a countDisplay that may include composition.
 * e.g. "10 (TP: 9, FN: 1)" → "10", "990" → "990"
 */
function extractCountOnly(countDisplay: string): string {
  const parenIndex = countDisplay.indexOf(' (');
  return parenIndex >= 0 ? countDisplay.substring(0, parenIndex) : countDisplay;
}

/**
 * Build a full compound label with domain label, count, and composition.
 */
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

/**
 * Compute the bounding box of a set of icons (using their top-left positions + icon size).
 */
function computeRegionBounds(icons: IconData[], iconSize: number): RegionBounds | null {
  if (icons.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const icon of icons) {
    if (icon.x < minX) minX = icon.x;
    if (icon.y < minY) minY = icon.y;
    if (icon.x + iconSize > maxX) maxX = icon.x + iconSize;
    if (icon.y + iconSize > maxY) maxY = icon.y + iconSize;
  }
  return { minX, minY, maxX, maxY };
}

// ===== Label Padding =====

const LABEL_PADDING_H = 4;
const LABEL_PADDING_V = 2;
const LABEL_BG_OPACITY = 0.75;

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
  // Compute layout — memoised on data and dimensions.
  const layout: LayoutResult = useMemo(() => {
    const grouping = byConditionGrouping(regionA);
    return computeLayout(regionA.n, width, height, grouping);
  }, [regionA, width, height]);

  // Get the active label set for the current display mode and grouping.
  const activeLabels: ByConditionLabels = useMemo(() => {
    const modeLabels = displayMode === DisplayMode.Frequency
      ? regionB.frequency
      : regionB.probability;
    return modeLabels.byCondition;
  }, [regionB, displayMode]);

  // Build label content based on construction state.
  const labelContent = useMemo(
    () => buildLabelContent(activeLabels, constructionState),
    [activeLabels, constructionState],
  );

  // Partition icons into region 1 (condition-positive) and region 2 (condition-negative)
  // for label positioning.
  const { region1Icons, region2Icons } = useMemo(() => {
    const r1: IconData[] = [];
    const r2: IconData[] = [];
    const r1Groups = new Set(['truePositive', 'falseNegative']);
    for (const icon of layout.icons) {
      if (r1Groups.has(icon.group)) {
        r1.push(icon);
      } else {
        r2.push(icon);
      }
    }
    return { region1Icons: r1, region2Icons: r2 };
  }, [layout.icons]);

  if (layout.icons.length === 0) return null;

  const { icons, iconSize } = layout;
  const radius = cornerRadius(iconSize);
  const fontSize = labelFontSize(iconSize);
  const fontWeight = labelFontWeight(iconSize);

  // Compute region bounding boxes for label positioning.
  const r1Bounds = computeRegionBounds(region1Icons, iconSize);
  const r2Bounds = computeRegionBounds(region2Icons, iconSize);

  // Compute label height for overlap avoidance.
  const lineHeight = fontSize * 1.3;
  const compositionFontSize = fontSize * 0.85;
  const r1LabelHeight = labelContent.region1
    ? (labelContent.region1.compositionLine
        ? lineHeight + compositionFontSize * 1.3 + LABEL_PADDING_V * 2
        : lineHeight + LABEL_PADDING_V * 2)
    : 0;

  // If both regions start at similar y positions (within one label height),
  // offset the second label below the first to avoid overlap.
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
      {/* Icons */}
      {icons.map((icon: IconData) => (
        <rect
          key={icon.index}
          x={icon.x}
          y={icon.y}
          width={iconSize}
          height={iconSize}
          rx={radius}
          ry={radius}
          fill={resolveIconColour(icon.group, constructionState)}
        />
      ))}

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

/**
 * Renders a compound label overlaying the top of its region with
 * a semi-transparent background for readability.
 *
 * Positioned at the top-left of the region bounding box, overlaying the icons.
 * At high N (dense icons), labels are the primary information channel.
 */
function CompoundLabel({ content, bounds, fontSize, fontWeight, containerWidth, yOffset }: CompoundLabelProps) {
  const lineHeight = fontSize * 1.3;
  const compositionFontSize = fontSize * 0.85;
  const totalHeight = content.compositionLine
    ? lineHeight + compositionFontSize * 1.3 + LABEL_PADDING_V * 2
    : lineHeight + LABEL_PADDING_V * 2;

  // Position: overlaying the top-left of the region, with optional offset for overlap avoidance.
  const x = bounds.minX;
  const y = bounds.minY + yOffset;

  // Estimate text width for background rect (rough: 0.55em per char).
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
      {/* Semi-transparent background */}
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
      {/* Main line */}
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
      {/* Composition line */}
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
