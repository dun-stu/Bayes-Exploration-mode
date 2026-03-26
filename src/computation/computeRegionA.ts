/**
 * Computation Pipeline — Pure function from raw parameters to Region A of the data package.
 *
 * Seven-step pipeline:
 *   1. First-level partition (exact, no rounding)
 *   2. Second-level partition (rounded)
 *   3. Regrouped counts (derived)
 *   4. Posterior (derived)
 *   5. Effective rates (derived from integer counts)
 *   6. Joint probabilities (for probability-mode tree leaf nodes)
 *   7. Raw input rates preserved
 *
 * The base rate uses N-relative steps guaranteeing integer N_D at the first level.
 * Sensitivity and FPR use fine 1% steps with standard rounding at the second level.
 * All partition constraints (sums, non-negativity, integrality) are satisfied by construction.
 *
 * The posterior is computed from the rounded integer counts, NOT from Bayes' theorem
 * applied to the raw input rates. This is a principled decision: the integer counts
 * ARE the natural frequencies, and the posterior from those counts IS the natural
 * frequency answer.
 */

import type { DataPackageRegionA } from '../types';

export interface ComputationInputs {
  n: number;
  baseRate: number;
  sensitivity: number;
  fpr: number;
}

/**
 * Standard rounding: round(x) = floor(x + 0.5).
 * Round half up — simple and predictable for pedagogical display.
 */
function standardRound(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Compute Region A of the data package from raw parameters.
 *
 * @param inputs - N (integer), baseRate (decimal), sensitivity (decimal), fpr (decimal)
 * @returns Complete DataPackageRegionA with all counts, rates, and derived quantities
 */
export function computeRegionA(inputs: ComputationInputs): DataPackageRegionA {
  const { n, baseRate, sensitivity, fpr } = inputs;

  // Step 1 — First-level partition (exact, no rounding)
  // N-relative base rate steps guarantee integer N_D.
  // Use standardRound defensively for floating-point arithmetic edge cases.
  const nD = standardRound(n * baseRate);
  const nNotD = n - nD;

  // Step 2 — Second-level partition (rounded)
  const nTP = standardRound(nD * sensitivity);
  const nFN = nD - nTP;
  const nFP = standardRound(nNotD * fpr);
  const nTN = nNotD - nFP;

  // Step 3 — Regrouped counts (derived, no rounding)
  const nTestPos = nTP + nFP;
  const nTestNeg = nFN + nTN;

  // Step 4 — Posterior (derived from integer counts)
  const posterior = nTestPos > 0 ? nTP / nTestPos : null;

  // Step 5 — Effective rates (derived from integer counts)
  // nD and nNotD cannot be 0 simultaneously (base rate range: 1/N to (N-1)/N),
  // but we handle defensively.
  const effectiveSensitivity = nD > 0 ? nTP / nD : 0;
  const effectiveFPR = nNotD > 0 ? nFP / nNotD : 0;
  const effectiveSpecificity = nNotD > 0 ? nTN / nNotD : 0;
  const totalTestPositiveRate = nTestPos / n;

  // Step 6 — Joint probabilities (count-derived, for probability-mode tree leaf nodes)
  const jointProbDAndTestPos = nTP / n;
  const jointProbDAndTestNeg = nFN / n;
  const jointProbNotDAndTestPos = nFP / n;
  const jointProbNotDAndTestNeg = nTN / n;

  // Step 7 — Raw input rates preserved (for Y2 parameter panel display)
  return {
    n,
    nD,
    nNotD,
    nTP,
    nFN,
    nFP,
    nTN,
    nTestPos,
    nTestNeg,
    inputBaseRate: baseRate,
    inputSensitivity: sensitivity,
    inputFPR: fpr,
    effectiveSensitivity,
    effectiveFPR,
    effectiveSpecificity,
    totalTestPositiveRate,
    jointProbDAndTestPos,
    jointProbDAndTestNeg,
    jointProbNotDAndTestPos,
    jointProbNotDAndTestNeg,
    posterior,
  };
}
