/**
 * Colour scheme — hierarchical warm/cool families for the partition hierarchy.
 *
 * Design principles (from Plan & Status doc):
 *   - Blue-orange axis avoids red-green confusion (deuteranopia/protanopia safe, ~8% of males)
 *   - Warm family = condition-positive group; cool family = condition-negative group
 *   - Shade variation within each family distinguishes second-level partition (test results)
 *   - Luminance contrast within families ensures distinguishability under colour-vision deficiency
 *   - Grey neutral is clearly distinct from both families
 *   - Same colour = same group across icon array and frequency tree
 *
 * Palette sourced from ColorBrewer (diverging orange-blue) and Okabe-Ito colour-blind-safe palette,
 * adjusted for the specific luminance contrast requirements of shade variation within families.
 */

// ===== Core Partition Colours =====

export const COLORS = {
  /** Condition-positive group (warm / orange family). */
  conditionPositive: {
    /** True Positives — darker warm. Prominent, "correctly identified" emphasis. */
    primary: '#E66100',     // Strong orange (Okabe-Ito orange, slightly deepened)
    /** False Negatives — lighter warm. Same family, clearly lighter. */
    secondary: '#F5B041',   // Light amber/gold — luminance contrast with primary
  },

  /** Condition-negative group (cool / blue family). */
  conditionNegative: {
    /** True Negatives — darker cool. */
    primary: '#1A5276',     // Deep blue (darker end of ColorBrewer blues)
    /** False Positives — lighter cool. */
    secondary: '#5DADE2',   // Medium-light blue — luminance contrast with primary
  },

  /** Unpartitioned / neutral state — before any partition applied. */
  neutral: '#9E9E9E',       // Medium grey, clearly distinct from both families

  /** Tree branch colour — neutral, not encoding group identity. */
  branch: '#616161',        // Dark grey

  /** UI background. */
  background: '#FAFAFA',    // Near-white

  /** Text on light backgrounds. */
  text: {
    primary: '#212121',
    secondary: '#616161',
  },
} as const;

// ===== Tree Node Colour Mapping =====
// Leaf nodes use the four partition colours (same as icon array).
// First-level (parent) nodes use blended midpoint shades between their two
// children's colours, so the user can visually distinguish P(D) (parent —
// all people with the condition) from P(D ∩ T⁺) (TP leaf — only those who
// also test positive). Preserves warm/cool family identity while making the
// parent–leaf distinction clear.

export const TREE_NODE_COLORS = {
  root: COLORS.neutral,
  conditionPositive: '#ED8A30',   // Mid-warm: between #E66100 (TP) and #F5B041 (FN)
  conditionNegative: '#3B80AC',   // Mid-cool: between #1A5276 (TN) and #5DADE2 (FP)
  truePositive: COLORS.conditionPositive.primary,
  falseNegative: COLORS.conditionPositive.secondary,
  falsePositive: COLORS.conditionNegative.secondary,
  trueNegative: COLORS.conditionNegative.primary,
} as const;

// ===== Icon Colour Mapping =====
// Maps each of the four partition groups to their colour.

export const ICON_COLORS = {
  truePositive: COLORS.conditionPositive.primary,
  falseNegative: COLORS.conditionPositive.secondary,
  falsePositive: COLORS.conditionNegative.secondary,
  trueNegative: COLORS.conditionNegative.primary,
  unpartitioned: COLORS.neutral,
} as const;

// ===== Type Helpers =====

export type PartitionGroup = keyof typeof ICON_COLORS;
