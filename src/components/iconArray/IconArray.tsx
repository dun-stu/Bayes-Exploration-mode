/**
 * Icon Array component — renders N icons in a hierarchically partitioned grid
 * with compound first-level labels and construction state support.
 *
 * Subtask 2.1: core grid and colouring.
 * Subtask 2.2: compound label system, construction state colouring, display mode.
 * Subtask 2.3: second grouping layout (by-test-result), dual positions, grouping state switching.
 * Subtask 4.1: regrouping animation — GSAP position interpolation with label crossfade.
 *
 * Both by-condition and by-test-result layouts are computed upfront. Each icon
 * stores positions from both layouts. The groupingState prop selects which set
 * to render. When animateTransitions is true, grouping state changes trigger
 * GSAP-animated transitions; otherwise, positions snap instantly.
 */

import { useMemo, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
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

// ===== Animation Constants =====

/** Duration of the regrouping animation in seconds. */
const REGROUP_DURATION = 0.7;

/** Easing for icon position interpolation. */
const REGROUP_EASE = 'power2.inOut';

// ===== Props =====

interface IconArrayProps {
  regionA: DataPackageRegionA;
  regionB: DataPackageRegionB;
  width: number;
  height: number;
  constructionState?: IconArrayConstructionState;
  groupingState?: GroupingState;
  displayMode?: DisplayMode;
  /** When true, grouping state changes trigger GSAP animation instead of instant snap. */
  animateTransitions?: boolean;
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

// ===== Label Overlap Avoidance =====

const LABEL_PADDING_H = 4;
const LABEL_PADDING_V = 2;
const LABEL_BG_OPACITY = 0.75;

function computeR2YOffset(
  r1Bounds: RegionBounds | null,
  r2Bounds: RegionBounds | null,
  region1Content: CompoundLabelContent | null,
  fontSize: number,
): number {
  if (!r1Bounds || !r2Bounds || !region1Content) return 0;

  const lineHeight = fontSize * 1.3;
  const compositionFontSize = fontSize * 0.85;
  const r1LabelHeight = region1Content.compositionLine
    ? lineHeight + compositionFontSize * 1.3 + LABEL_PADDING_V * 2
    : lineHeight + LABEL_PADDING_V * 2;

  const yOverlap = Math.abs(r1Bounds.minY - r2Bounds.minY) < r1LabelHeight;
  const xOverlap = r1Bounds.maxX > r2Bounds.minX || r2Bounds.maxX > r1Bounds.minX;

  if (yOverlap && xOverlap) {
    return r1LabelHeight + 2;
  }
  return 0;
}

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
  animateTransitions = false,
}: IconArrayProps) {
  const isByCondition = groupingState === GroupingState.GroupedByCondition;

  // ── Refs for GSAP animation ──
  const iconRefsMap = useRef<Map<number, SVGRectElement>>(new Map());
  const conditionLabelsRef = useRef<SVGGElement>(null);
  const testResultLabelsRef = useRef<SVGGElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const prevGroupingRef = useRef<GroupingState>(groupingState);

  // ── Compute both layouts upfront ──
  const dualLayout: DualLayoutResult = useMemo(
    () => computeDualLayout(regionA, width, height),
    [regionA, width, height],
  );

  // ── Label content for BOTH grouping states (needed for crossfade) ──
  const modeLabels = useMemo(
    () => displayMode === DisplayMode.Frequency ? regionB.frequency : regionB.probability,
    [regionB, displayMode],
  );

  const conditionLabelContent = useMemo(
    () => buildLabelContent(modeLabels.byCondition, constructionState),
    [modeLabels, constructionState],
  );

  const testResultLabelContent = useMemo(
    () => buildByTestResultLabelContent(modeLabels.byTestResult, constructionState),
    [modeLabels, constructionState],
  );

  // ── Region positions for BOTH grouping states (for label bounds) ──
  const regionPositions = useMemo(() => {
    const condR1: Array<{ x: number; y: number }> = [];
    const condR2: Array<{ x: number; y: number }> = [];
    const testR1: Array<{ x: number; y: number }> = [];
    const testR2: Array<{ x: number; y: number }> = [];

    for (const icon of dualLayout.icons) {
      if (BY_CONDITION_R1_GROUPS.has(icon.group)) {
        condR1.push(icon.byCondition);
      } else {
        condR2.push(icon.byCondition);
      }
      if (BY_TEST_RESULT_R1_GROUPS.has(icon.group)) {
        testR1.push(icon.byTestResult);
      } else {
        testR2.push(icon.byTestResult);
      }
    }

    return { condR1, condR2, testR1, testR2 };
  }, [dualLayout.icons]);

  // ── Regrouping animation ──
  //
  // Uses useLayoutEffect so DOM positions are set before the browser paints.
  // When groupingState changes and animateTransitions is true:
  //   1. React has already rendered icons at the TARGET positions.
  //   2. We immediately set DOM positions back to SOURCE positions (pre-paint).
  //   3. GSAP animates from source to target via a single progress tween
  //      (batch-updates all icon positions per frame for performance at N=1000).
  //   4. Labels crossfade: source labels fade out, then target labels fade in.
  //
  // If the user toggles mid-animation, the animation is killed and the new
  // transition starts from the previous state's positions (simple and correct
  // for a two-state toggle).
  useLayoutEffect(() => {
    const prevGrouping = prevGroupingRef.current;
    prevGroupingRef.current = groupingState;

    if (prevGrouping === groupingState) return;

    // Kill any existing animation
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    if (!animateTransitions) return;

    // Determine source and target position keys
    const sourceKey: 'byCondition' | 'byTestResult' =
      prevGrouping === GroupingState.GroupedByCondition ? 'byCondition' : 'byTestResult';
    const targetKey: 'byCondition' | 'byTestResult' =
      groupingState === GroupingState.GroupedByCondition ? 'byCondition' : 'byTestResult';
    const sourceIsCondition = prevGrouping === GroupingState.GroupedByCondition;

    // Set all icons to source positions before the browser paints
    const icons = dualLayout.icons;
    for (let i = 0; i < icons.length; i++) {
      const el = iconRefsMap.current.get(icons[i].index);
      if (!el) continue;
      const s = icons[i][sourceKey];
      el.setAttribute('x', String(s.x));
      el.setAttribute('y', String(s.y));
    }

    // Set label opacities to source state
    if (conditionLabelsRef.current) {
      gsap.set(conditionLabelsRef.current, { opacity: sourceIsCondition ? 1 : 0 });
    }
    if (testResultLabelsRef.current) {
      gsap.set(testResultLabelsRef.current, { opacity: sourceIsCondition ? 0 : 1 });
    }

    // Build the animation timeline
    const progress = { value: 0 };
    const tl = gsap.timeline();

    // Icon position animation — single progress tween with batch DOM updates.
    // This is more performant than 1000 individual GSAP tweens: one tween
    // drives the interpolation, and onUpdate batch-sets all attributes.
    tl.to(progress, {
      value: 1,
      duration: REGROUP_DURATION,
      ease: REGROUP_EASE,
      onUpdate() {
        const p = progress.value;
        for (let i = 0; i < icons.length; i++) {
          const el = iconRefsMap.current.get(icons[i].index);
          if (!el) continue;
          const s = icons[i][sourceKey];
          const t = icons[i][targetKey];
          el.setAttribute('x', String(s.x + (t.x - s.x) * p));
          el.setAttribute('y', String(s.y + (t.y - s.y) * p));
        }
      },
    }, 0);

    // Label crossfade — source labels fade out early, target labels fade in late.
    // The overlap creates a brief period where both are partially visible,
    // matching the spec's "icons begin moving, partway through the old labels
    // start fading, icons arrive at target positions, new labels fade in."
    const fadeOutEl = sourceIsCondition
      ? conditionLabelsRef.current
      : testResultLabelsRef.current;
    const fadeInEl = sourceIsCondition
      ? testResultLabelsRef.current
      : conditionLabelsRef.current;

    if (fadeOutEl) {
      tl.to(fadeOutEl, {
        opacity: 0,
        duration: REGROUP_DURATION * 0.4,
        ease: 'power1.out',
      }, 0);
    }
    if (fadeInEl) {
      tl.fromTo(fadeInEl,
        { opacity: 0 },
        { opacity: 1, duration: REGROUP_DURATION * 0.4, ease: 'power1.in' },
        REGROUP_DURATION * 0.6,
      );
    }

    timelineRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [groupingState, animateTransitions, dualLayout]);

  // ── Early exit ──
  if (dualLayout.icons.length === 0) return null;

  const { icons, iconSize } = dualLayout;
  const radius = cornerRadius(iconSize);
  const fontSize = labelFontSize(iconSize);
  const fontWeight = labelFontWeight(iconSize);

  // ── Compute bounds for both grouping states' labels ──
  const condR1Bounds = computeRegionBounds(regionPositions.condR1, iconSize);
  const condR2Bounds = computeRegionBounds(regionPositions.condR2, iconSize);
  const testR1Bounds = computeRegionBounds(regionPositions.testR1, iconSize);
  const testR2Bounds = computeRegionBounds(regionPositions.testR2, iconSize);

  const condR2YOffset = computeR2YOffset(condR1Bounds, condR2Bounds, conditionLabelContent.region1, fontSize);
  const testR2YOffset = computeR2YOffset(testR1Bounds, testR2Bounds, testResultLabelContent.region1, fontSize);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Icon array showing ${regionA.n} icons`}
    >
      {/* Icons — React renders at the current groupingState's positions.
          During animation, useLayoutEffect overrides these positions via GSAP
          before the browser paints. */}
      {icons.map((icon: DualLayoutIcon) => {
        const pos = isByCondition ? icon.byCondition : icon.byTestResult;
        return (
          <rect
            key={icon.index}
            ref={(el) => {
              if (el) iconRefsMap.current.set(icon.index, el);
            }}
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

      {/* By-condition labels — visible when grouped by condition,
          hidden (opacity 0) when grouped by test result.
          GSAP animates opacity during regrouping transitions. */}
      <g
        ref={conditionLabelsRef}
        style={{ opacity: isByCondition ? 1 : 0 }}
      >
        {conditionLabelContent.region1 && condR1Bounds && (
          <CompoundLabel
            content={conditionLabelContent.region1}
            bounds={condR1Bounds}
            fontSize={fontSize}
            fontWeight={fontWeight}
            containerWidth={width}
            yOffset={0}
          />
        )}
        {conditionLabelContent.region2 && condR2Bounds && (
          <CompoundLabel
            content={conditionLabelContent.region2}
            bounds={condR2Bounds}
            fontSize={fontSize}
            fontWeight={fontWeight}
            containerWidth={width}
            yOffset={condR2YOffset}
          />
        )}
      </g>

      {/* By-test-result labels — visible when grouped by test result,
          hidden (opacity 0) when grouped by condition.
          GSAP animates opacity during regrouping transitions. */}
      <g
        ref={testResultLabelsRef}
        style={{ opacity: isByCondition ? 0 : 1 }}
      >
        {testResultLabelContent.region1 && testR1Bounds && (
          <CompoundLabel
            content={testResultLabelContent.region1}
            bounds={testR1Bounds}
            fontSize={fontSize}
            fontWeight={fontWeight}
            containerWidth={width}
            yOffset={0}
          />
        )}
        {testResultLabelContent.region2 && testR2Bounds && (
          <CompoundLabel
            content={testResultLabelContent.region2}
            bounds={testR2Bounds}
            fontSize={fontSize}
            fontWeight={fontWeight}
            containerWidth={width}
            yOffset={testR2YOffset}
          />
        )}
      </g>
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
