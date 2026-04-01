/**
 * Data Package — the interface contract between Part 2 (computation/templates)
 * and all display consumers (Part 1 visualisation, Part 3 layout).
 *
 * Three-region architecture:
 *   Region A — Mode-independent numerical data (counts, rates, posterior)
 *   Region B — Mode-dependent textual data (labels for both display modes, both grouping states)
 *   Region C — Metadata (scenario identification)
 *
 * The data package is a complete description: no consumer needs to derive or compute
 * anything from it. Format-switching and regrouping are pure view-layer operations
 * (swap to the alternative label set; no new data needed).
 */

import { DisplayMode } from './enums';

// ===== REGION A — Mode-Independent Numerical Data =====

export interface DataPackageRegionA {
  // Population
  n: number;

  // First-level partition (exact, no rounding)
  nD: number;                          // Condition-positive count
  nNotD: number;                       // Condition-negative count

  // Second-level partition (rounded to integers)
  nTP: number;                         // True positives
  nFN: number;                         // False negatives
  nFP: number;                         // False positives
  nTN: number;                         // True negatives

  // Regrouped counts (derived from second-level, no additional rounding)
  nTestPos: number;                    // N_T+ = nTP + nFP
  nTestNeg: number;                    // N_T- = nFN + nTN

  // Input rates (preserved from user input / scenario definition)
  inputBaseRate: number;               // Decimal, e.g. 0.01
  inputSensitivity: number;            // Decimal
  inputFPR: number;                    // Decimal

  // Effective rates (derived from integer counts — may differ from input due to rounding)
  effectiveSensitivity: number;        // nTP / nD
  effectiveFPR: number;                // nFP / nNotD
  effectiveSpecificity: number;        // nTN / nNotD = 1 - effectiveFPR
  totalTestPositiveRate: number;       // nTestPos / n

  // Joint probabilities (for probability-mode tree leaf node labels)
  jointProbDAndTestPos: number;        // nTP / n — P(D ∩ T+)
  jointProbDAndTestNeg: number;        // nFN / n — P(D ∩ T-)
  jointProbNotDAndTestPos: number;     // nFP / n — P(¬D ∩ T+)
  jointProbNotDAndTestNeg: number;     // nTN / n — P(¬D ∩ T-)

  // Posterior
  posterior: number | null;            // nTP / nTestPos as decimal; null if nTestPos === 0
}

// ===== REGION B — Mode-Dependent Textual Data =====

/** A label for a single group in the partition hierarchy. */
export interface GroupLabel {
  domainLabel: string;                 // e.g. "have the disease", "are spam"
  structuralLabel: string;             // e.g. "True Positives", "Condition-Positive"
  countDisplay: string;                // e.g. "9", "10 out of 1,000"
  bayesianTerm?: string;               // e.g. "Prior", "Likelihood" (where applicable)
}

/** Labels for the by-condition grouping (condition-positive / condition-negative hierarchy). */
export interface ByConditionLabels {
  population: GroupLabel;
  conditionPositive: {
    group: GroupLabel;
    truePositive: GroupLabel;
    falseNegative: GroupLabel;
  };
  conditionNegative: {
    group: GroupLabel;
    falsePositive: GroupLabel;
    trueNegative: GroupLabel;
  };
}

/** Labels for the by-test-result grouping (test-positive / test-negative hierarchy). */
export interface ByTestResultLabels {
  population: GroupLabel;
  testPositive: {
    group: GroupLabel;
    compositionString: string;         // e.g. "TP: 9, FP: 89"
    truePositive: GroupLabel;
    falsePositive: GroupLabel;
  };
  testNegative: {
    group: GroupLabel;
    compositionString: string;
    falseNegative: GroupLabel;
    trueNegative: GroupLabel;
  };
}

/** Labels for tree node display content. */
export interface TreeNodeLabels {
  root: string;                        // "1,000" or "N = 1000"
  conditionPositive: string;           // "10" or "P(D) = 0.01"
  conditionNegative: string;
  truePositive: string;
  falseNegative: string;
  falsePositive: string;
  trueNegative: string;
}

/** Labels for tree branch annotations. */
export interface TreeBranchLabels {
  baseRatePositive: string;            // "Base rate: 1%" or "P(D) = 0.01"
  baseRateNegative: string;            // "99%" or "P(¬D) = 0.99"
  sensitivity: string;                 // "Sensitivity: 90%" or "P(T+|D) = 0.90"
  falseNegativeRate: string;           // "10%" or "P(T-|D) = 0.10"
  falsePositiveRate: string;           // "FPR: 9%" or "P(T+|¬D) = 0.09"
  trueNegativeRate: string;            // "91%" or "P(T-|¬D) = 0.91"
}

/** Labels for the cross-branch combination element (bracket beneath TP and FP nodes). */
export interface CrossBranchCombinationLabels {
  sumLabel: string;                    // "Test positive: 9 + 89 = 98" or "P(T+) ≈ 0.098"
  posteriorLabel: string;              // "9 out of 98 ≈ 9.2%" or "P(D|T+) ≈ 0.092"
}

/** Complete label set for one display mode. */
export interface DisplayModeLabels {
  // Icon array labels — both grouping states
  byCondition: ByConditionLabels;
  byTestResult: ByTestResultLabels;

  // Frequency tree labels
  treeNodes: TreeNodeLabels;
  treeBranches: TreeBranchLabels;
  crossBranchCombination: CrossBranchCombinationLabels;

  // Part 3 text content
  questionText: string;
  problemStatementText: string;
  parameterDisplayStrings: {
    baseRate: string;
    sensitivity: string;
    fpr: string;
    totalTestPositiveRate: string;
    posterior: string;
  };
}

/** Resolved mathematical notation symbols for probability-mode LaTeX. */
export interface NotationSymbols {
  /** Condition variable symbol, e.g. 'D', 'S'. */
  condition: string;
  /** Test variable symbol, e.g. 'T', 'F', 'I'. */
  test: string;
}

export interface DataPackageRegionB {
  frequency: DisplayModeLabels;
  probability: DisplayModeLabels;
  activeDisplayMode: DisplayMode;
  /** Resolved notation symbols for this scenario (defaults applied). */
  notationSymbols: NotationSymbols;
}

// ===== REGION C — Metadata =====

export interface DataPackageRegionC {
  scenarioId: string;
  scenarioName: string;
  domain: string;                      // "medical", "technology", "manufacturing", "workplace"
  description?: string;
}

// ===== COMPLETE DATA PACKAGE =====

export interface DataPackage {
  regionA: DataPackageRegionA;
  regionB: DataPackageRegionB;
  regionC: DataPackageRegionC;
}
