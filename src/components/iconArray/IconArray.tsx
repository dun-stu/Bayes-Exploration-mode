/**
 * Icon Array component — renders N icons in a hierarchically partitioned grid.
 *
 * Subtask 2.1: core grid and colouring. Renders the fully-partitioned,
 * grouped-by-condition state. Labels (2.2), construction states (2.2),
 * second grouping layout (2.3), and animation (Layer 4) come later.
 *
 * Accepts a data package (Region A) and container dimensions. Computes the
 * spatial layout via alternating-axis hierarchical subdivision and renders
 * rounded-square SVG icons coloured by partition group.
 */

import { useMemo } from 'react';
import type { DataPackageRegionA } from '../../types';
import { IconArrayConstructionState, GroupingState } from '../../types';
import { ICON_COLORS } from '../../constants';
import { computeLayout, byConditionGrouping, type IconData, type LayoutResult } from './layout';

// ===== Props =====

interface IconArrayProps {
  regionA: DataPackageRegionA;
  width: number;
  height: number;
  /** Construction state — only FullyPartitioned is rendered in 2.1. */
  constructionState?: IconArrayConstructionState;
  /** Grouping state — only GroupedByCondition is rendered in 2.1. */
  groupingState?: GroupingState;
}

// ===== Colour Mapping =====

const GROUP_COLOURS: Record<string, string> = {
  truePositive: ICON_COLORS.truePositive,
  falseNegative: ICON_COLORS.falseNegative,
  falsePositive: ICON_COLORS.falsePositive,
  trueNegative: ICON_COLORS.trueNegative,
};

// ===== Corner Radius Scaling =====

/**
 * Corner radius scales with icon size: more rounding at moderate N (discrete objects),
 * less at high N (density). Range: ~25% of icon size at large icons, ~10% at small.
 */
function cornerRadius(iconSize: number): number {
  const minRatio = 0.10;
  const maxRatio = 0.25;
  const smallSize = 4;
  const largeSize = 20;
  const t = Math.min(1, Math.max(0, (iconSize - smallSize) / (largeSize - smallSize)));
  return iconSize * (minRatio + t * (maxRatio - minRatio));
}

// ===== Component =====

export function IconArray({
  regionA,
  width,
  height,
  constructionState = IconArrayConstructionState.FullyPartitioned,
  groupingState = GroupingState.GroupedByCondition,
}: IconArrayProps) {
  // Compute layout — memoised on data and dimensions.
  const layout: LayoutResult = useMemo(() => {
    const grouping = byConditionGrouping(regionA);
    return computeLayout(regionA.n, width, height, grouping);
  }, [regionA, width, height]);

  if (layout.icons.length === 0) return null;

  const { icons, iconSize } = layout;
  const radius = cornerRadius(iconSize);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Icon array showing ${regionA.n} icons partitioned into four groups`}
    >
      {icons.map((icon: IconData) => (
        <rect
          key={icon.index}
          x={icon.x}
          y={icon.y}
          width={iconSize}
          height={iconSize}
          rx={radius}
          ry={radius}
          fill={GROUP_COLOURS[icon.group]}
        />
      ))}
    </svg>
  );
}
