/**
 * Shared enums for the Bayesian reasoning tool.
 *
 * Construction states and grouping states are orthogonal dimensions —
 * a component's visual state is the combination of (construction state × grouping state).
 */

/** Icon array construction stages, mirroring the Bayesian reasoning process. */
export enum IconArrayConstructionState {
  /** All icons grey/neutral. Starting state before any partition. */
  Unpartitioned = 'unpartitioned',
  /** Two spatial regions with warm (condition-positive) and cool (condition-negative) colour families. */
  BaseRatePartitioned = 'base-rate-partitioned',
  /** Warm region subdivided: TP (darker) and FN (lighter). Cool region remains single colour. */
  ConditionPositiveSubpartitioned = 'condition-positive-subpartitioned',
  /** Both regions sub-partitioned. All four groups (TP, FN, FP, TN) visually distinct. */
  FullyPartitioned = 'fully-partitioned',
}

/** Frequency tree construction stages, mirroring the Bayesian reasoning process. */
export enum TreeConstructionState {
  /** Single node showing N. */
  RootOnly = 'root-only',
  /** Root with two children (N_D, N_¬D) and base rate branch labels. */
  FirstBranch = 'first-branch',
  /** N_D node has TP/FN children with sensitivity branches; N_¬D has no children yet. */
  ConditionPositiveSecondBranch = 'condition-positive-second-branch',
  /** All four leaf nodes visible. Both second-level branches complete. */
  FullyBranched = 'fully-branched',
}

/** Icon array spatial grouping — orthogonal to construction state. */
export enum GroupingState {
  /** Icons grouped by condition (condition-positive vs. condition-negative). */
  GroupedByCondition = 'grouped-by-condition',
  /** Icons grouped by test result (test-positive vs. test-negative). */
  GroupedByTestResult = 'grouped-by-test-result',
}

/** Frequency tree cross-branch combination visibility — orthogonal to construction state. */
export enum TreeCombinationState {
  /** Cross-branch combination (bracket connecting TP and FP) not shown. */
  CombinationHidden = 'combination-hidden',
  /** Cross-branch combination shown with sum and posterior labels. */
  CombinationShown = 'combination-shown',
}

/** Display mode controlling which label set is active. */
export enum DisplayMode {
  /** Natural frequency labels (counts, "9 out of 98"). */
  Frequency = 'frequency',
  /** Probability notation labels (P(D|T+) ≈ 0.092). */
  Probability = 'probability',
}
