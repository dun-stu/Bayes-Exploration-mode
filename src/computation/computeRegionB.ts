/**
 * Template System — Pure function from (Region A + scenario vocabulary) → Region B.
 *
 * Generates all textual outputs for all display modes and grouping states.
 * Ten output types:
 *   1. Problem statement text (frequency + probability)
 *   2. Question text (frequency + probability)
 *   3. Parameter display strings (Y2 format + probability notation)
 *   4. Derived result display strings
 *   5. Icon array compound labels (2 grouping × 2 display = 4 sets)
 *   6. Tree node labels
 *   7. Tree branch labels
 *   8. Cross-branch combination labels
 *   9. Degenerate state messages
 *  10. Glossary entries
 *
 * Domain vocabulary comes from the scenario; structural and Bayesian vocabulary is constant.
 * Both display modes' label sets are generated upfront so format-switching is a pure
 * view-layer operation.
 */

import type {
  DataPackageRegionA,
  DataPackageRegionB,
  DisplayModeLabels,
  ByConditionLabels,
  ByTestResultLabels,
  TreeNodeLabels,
  TreeBranchLabels,
  CrossBranchCombinationLabels,
  GroupLabel,
} from '../types';
import { DisplayMode } from '../types';
import type { ScenarioDefinition } from '../types';
import { DEFAULT_VOCABULARY } from '../types/scenario';

// ===== Vocabulary Resolution =====

/** Resolved vocabulary — all fields guaranteed present (defaults applied). */
interface ResolvedVocabulary {
  populationName: string;
  conditionName: string;
  conditionNegativeName: string;
  testName: string;
  testPositiveName: string;
  testNegativeName: string;
  sensitivityDomainName: string;
  fprDomainName: string;
  populationSingular: string;
  conditionNameSingular: string;
  testPositiveNameSingular: string;
  relativePronoun: string;
  testAction: string;
  baseRateDomainName: string;
}

function resolveVocabulary(scenario: ScenarioDefinition | null): ResolvedVocabulary {
  if (!scenario) {
    return {
      ...DEFAULT_VOCABULARY,
      sensitivityDomainName: 'Sensitivity',
      fprDomainName: 'False positive rate',
    };
  }
  return {
    populationName: scenario.populationName,
    conditionName: scenario.conditionName,
    conditionNegativeName: scenario.conditionNegativeName,
    testName: scenario.testName,
    testPositiveName: scenario.testPositiveName,
    testNegativeName: scenario.testNegativeName,
    sensitivityDomainName: scenario.sensitivityDomainName ?? 'Sensitivity',
    fprDomainName: scenario.fprDomainName ?? 'False positive rate',
    populationSingular: scenario.populationSingular,
    conditionNameSingular: scenario.conditionNameSingular,
    testPositiveNameSingular: scenario.testPositiveNameSingular,
    relativePronoun: scenario.relativePronoun,
    testAction: scenario.testAction,
    baseRateDomainName: scenario.baseRateDomainName,
  };
}

// ===== Number Formatting Helpers =====

/** Format an integer with comma separators (e.g. 1000 → "1,000"). */
function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format a rate as a percentage string (e.g. 0.092 → "9.2%"). */
function formatPercent(rate: number): string {
  const pct = rate * 100;
  // Remove unnecessary trailing zeros but keep at least one decimal for values like 9.0%
  const formatted = Number(pct.toFixed(1));
  return `${formatted}%`;
}

/** Format a rate as a clean percentage for display (no unnecessary decimals for whole numbers). */
function formatPercentClean(rate: number): string {
  const pct = rate * 100;
  // If it's effectively a whole number, show without decimal
  if (Math.abs(pct - Math.round(pct)) < 0.001) {
    return `${Math.round(pct)}%`;
  }
  return `${Number(pct.toFixed(1))}%`;
}

/** Format a decimal for probability mode (e.g. 0.01 → "0.01", 0.009 → "0.009", 0.901 → "0.901"). */
function formatDecimal(value: number): string {
  // Use enough precision to distinguish values without excessive trailing digits.
  // Strategy: at least 2 significant digits after the decimal point, and enough
  // decimal places to show the value isn't rounded to something coarser.
  if (value === 0) return '0';
  if (value === 1) return '1';

  const absVal = Math.abs(value);

  // Determine decimal places needed:
  // - Values ≥ 0.1: use 3 decimal places to distinguish e.g. 0.901 from 0.90
  // - Values ≥ 0.01: use 3 decimal places (e.g. 0.009, 0.089)
  // - Values < 0.01: use 4 decimal places (e.g. 0.0005)
  let decimals: number;
  if (absVal >= 0.01) {
    decimals = 3;
  } else {
    decimals = 4;
  }

  const result = value.toFixed(decimals);
  // Remove trailing zeros but keep at least 2 decimal characters for readability
  const parts = result.split('.');
  if (parts.length === 2) {
    let dec = parts[1];
    while (dec.length > 2 && dec.endsWith('0')) {
      dec = dec.slice(0, -1);
    }
    return `${parts[0]}.${dec}`;
  }
  return result;
}

// ===== Output Generators =====

// --- Output 1: Problem Statement Text ---

function generateProblemStatementFrequency(a: DataPackageRegionA, v: ResolvedVocabulary): string {
  const n = formatCount(a.n);
  const nD = formatCount(a.nD);
  const nNotD = formatCount(a.nNotD);
  const nTP = formatCount(a.nTP);
  const nFP = formatCount(a.nFP);

  return (
    `Imagine ${n} ${v.populationName} ${v.testAction}. ` +
    `Of these ${n}, ${nD} ${v.conditionName}. ` +
    `Of the ${nD} ${v.relativePronoun} ${v.conditionName}, ${nTP} ${v.testPositiveName}. ` +
    `Of the ${nNotD} ${v.relativePronoun} ${v.conditionNegativeName}, ${nFP} ${v.testPositiveName}.`
  );
}

function generateProblemStatementProbability(a: DataPackageRegionA, v: ResolvedVocabulary): string {
  const baseRatePct = formatPercentClean(a.inputBaseRate);
  const sensPct = formatPercentClean(a.inputSensitivity);
  const fprPct = formatPercentClean(a.inputFPR);

  return (
    `The ${v.baseRateDomainName} is ${baseRatePct}. ` +
    `${capitalise(v.testName)} has a ${v.sensitivityDomainName.toLowerCase()} of ${sensPct} ` +
    `and a ${v.fprDomainName.toLowerCase()} of ${fprPct}.`
  );
}

// --- Output 2: Question Text ---

function generateQuestionFrequency(v: ResolvedVocabulary): string {
  return `Of all those ${v.relativePronoun} ${v.testPositiveName}, how many actually ${v.conditionName}?`;
}

function generateQuestionProbability(v: ResolvedVocabulary): string {
  const nlQuestion = `What is the probability that ${v.populationSingular} ${v.relativePronoun} ${v.testPositiveNameSingular} ${v.conditionNameSingular}?`;
  const notation = String.raw`P(D \mid T^+) = ?`;
  return `${nlQuestion}\n${notation}`;
}

// --- Output 3: Parameter Display Strings ---

function generateParamDisplayFrequency(a: DataPackageRegionA, v: ResolvedVocabulary) {
  const baseRatePct = formatPercentClean(a.inputBaseRate);
  const sensPct = formatPercentClean(a.inputSensitivity);
  const fprPct = formatPercentClean(a.inputFPR);
  const specPct = formatPercentClean(1 - a.inputFPR);
  const ttprPct = formatPercent(a.totalTestPositiveRate);

  const baseRate = `Base rate (prior): ${baseRatePct} — ${formatCount(a.nD)} out of ${formatCount(a.n)} ${v.conditionName}`;
  const sensitivity = `${v.sensitivityDomainName} (likelihood): ${sensPct} — ${formatCount(a.nTP)} out of ${formatCount(a.nD)} detected`;
  const fpr = `FPR: ${fprPct} — ${formatCount(a.nFP)} out of ${formatCount(a.nNotD)} false positives (Specificity: ${specPct})`;

  const totalTestPositiveRate =
    `Total test-positive rate (marginal likelihood): ${ttprPct} — ${formatCount(a.nTestPos)} out of ${formatCount(a.n)} ${v.testPositiveName}`;

  let posterior: string;
  if (a.posterior !== null) {
    const posteriorPct = formatPercent(a.posterior);
    posterior = `Posterior: ${posteriorPct} — ${formatCount(a.nTP)} out of ${formatCount(a.nTestPos)}`;
  } else {
    posterior = `No ${v.populationName} ${v.testPositiveName} with these parameters — the posterior is undefined.`;
  }

  return { baseRate, sensitivity, fpr, totalTestPositiveRate, posterior };
}

function generateParamDisplayProbability(a: DataPackageRegionA, v: ResolvedVocabulary) {
  const brDec = formatDecimal(a.inputBaseRate);
  const sensDec = formatDecimal(a.inputSensitivity);
  const fprDec = formatDecimal(a.inputFPR);
  const specPct = formatPercentClean(1 - a.inputFPR);

  // Extract the short domain term from baseRateDomainName for the parenthetical
  // e.g. "prevalence of the disease" → "prevalence", "spam rate" → "spam rate"
  // For the probability mode, we use a short form for the parenthetical.
  const domainBaseRateTerm = extractShortDomainTerm(v.baseRateDomainName);

  const baseRate = String.raw`P(D) = ${brDec}` + ` — Prior (${domainBaseRateTerm})`;
  const sensitivity = String.raw`P(T^+ \mid D) = ${sensDec}` + ` — Likelihood (${v.sensitivityDomainName.toLowerCase()})`;
  const fpr = String.raw`P(T^+ \mid \neg D) = ${fprDec}` + ` — False positive rate (specificity: ${specPct})`;

  let totalTestPositiveRate: string;
  let posterior: string;

  const ttprDec = formatDecimal(a.totalTestPositiveRate);
  totalTestPositiveRate = String.raw`P(T^+) \approx ${ttprDec}` + ` — Marginal likelihood`;

  if (a.posterior !== null) {
    const postDec = formatDecimal(a.posterior);
    posterior = String.raw`P(D \mid T^+) \approx ${postDec}` + ` — Posterior`;
  } else {
    posterior = String.raw`P(T^+) = 0` + String.raw` — no positive tests. P(D \mid T^+) is undefined.`;
  }

  return { baseRate, sensitivity, fpr, totalTestPositiveRate, posterior };
}

// --- Output 5: Icon Array Compound Labels ---

function generateByConditionLabelsFrequency(a: DataPackageRegionA, v: ResolvedVocabulary): ByConditionLabels {
  return {
    population: {
      domainLabel: capitalise(v.populationName),
      structuralLabel: 'Population',
      countDisplay: formatCount(a.n),
    },
    conditionPositive: {
      group: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'Condition-positive',
        countDisplay: `${formatCount(a.nD)} (TP: ${formatCount(a.nTP)}, FN: ${formatCount(a.nFN)})`,
        bayesianTerm: 'Prior',
      },
      truePositive: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'TP',
        countDisplay: formatCount(a.nTP),
      },
      falseNegative: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'FN',
        countDisplay: formatCount(a.nFN),
      },
    },
    conditionNegative: {
      group: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'Condition-negative',
        countDisplay: `${formatCount(a.nNotD)} (FP: ${formatCount(a.nFP)}, TN: ${formatCount(a.nTN)})`,
      },
      falsePositive: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'FP',
        countDisplay: formatCount(a.nFP),
      },
      trueNegative: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'TN',
        countDisplay: formatCount(a.nTN),
      },
    },
  };
}

function generateByConditionLabelsProbability(a: DataPackageRegionA, v: ResolvedVocabulary): ByConditionLabels {
  const pctD = formatPercent(a.nD / a.n);
  const pctNotD = formatPercent(a.nNotD / a.n);
  const pctTP = formatPercent(a.nTP / a.n);
  const pctFN = formatPercent(a.nFN / a.n);
  const pctFP = formatPercent(a.nFP / a.n);
  const pctTN = formatPercent(a.nTN / a.n);

  return {
    population: {
      domainLabel: capitalise(v.populationName),
      structuralLabel: 'Population',
      countDisplay: '100%',
    },
    conditionPositive: {
      group: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'Condition-positive',
        countDisplay: `${pctD} (TP: ${pctTP}, FN: ${pctFN})`,
        bayesianTerm: 'Prior',
      },
      truePositive: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'TP',
        countDisplay: pctTP,
      },
      falseNegative: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'FN',
        countDisplay: pctFN,
      },
    },
    conditionNegative: {
      group: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'Condition-negative',
        countDisplay: `${pctNotD} (FP: ${pctFP}, TN: ${pctTN})`,
      },
      falsePositive: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'FP',
        countDisplay: pctFP,
      },
      trueNegative: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'TN',
        countDisplay: pctTN,
      },
    },
  };
}

function generateByTestResultLabelsFrequency(a: DataPackageRegionA, v: ResolvedVocabulary): ByTestResultLabels {
  return {
    population: {
      domainLabel: capitalise(v.populationName),
      structuralLabel: 'Population',
      countDisplay: formatCount(a.n),
    },
    testPositive: {
      group: {
        domainLabel: capitalise(v.testPositiveName),
        structuralLabel: 'Test-positive',
        countDisplay: `${formatCount(a.nTestPos)} (TP: ${formatCount(a.nTP)}, FP: ${formatCount(a.nFP)})`,
        bayesianTerm: 'Marginal likelihood',
      },
      compositionString: `TP: ${formatCount(a.nTP)}, FP: ${formatCount(a.nFP)}`,
      truePositive: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'TP',
        countDisplay: formatCount(a.nTP),
      },
      falsePositive: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'FP',
        countDisplay: formatCount(a.nFP),
      },
    },
    testNegative: {
      group: {
        domainLabel: capitalise(v.testNegativeName),
        structuralLabel: 'Test-negative',
        countDisplay: `${formatCount(a.nTestNeg)} (FN: ${formatCount(a.nFN)}, TN: ${formatCount(a.nTN)})`,
      },
      compositionString: `FN: ${formatCount(a.nFN)}, TN: ${formatCount(a.nTN)}`,
      falseNegative: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'FN',
        countDisplay: formatCount(a.nFN),
      },
      trueNegative: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'TN',
        countDisplay: formatCount(a.nTN),
      },
    },
  };
}

function generateByTestResultLabelsProbability(a: DataPackageRegionA, v: ResolvedVocabulary): ByTestResultLabels {
  const pctTestPos = formatPercent(a.nTestPos / a.n);
  const pctTestNeg = formatPercent(a.nTestNeg / a.n);
  const pctTP = formatPercent(a.nTP / a.n);
  const pctFN = formatPercent(a.nFN / a.n);
  const pctFP = formatPercent(a.nFP / a.n);
  const pctTN = formatPercent(a.nTN / a.n);

  return {
    population: {
      domainLabel: capitalise(v.populationName),
      structuralLabel: 'Population',
      countDisplay: '100%',
    },
    testPositive: {
      group: {
        domainLabel: capitalise(v.testPositiveName),
        structuralLabel: 'Test-positive',
        countDisplay: `${pctTestPos} (TP: ${pctTP}, FP: ${pctFP})`,
        bayesianTerm: 'Marginal likelihood',
      },
      compositionString: `TP: ${pctTP}, FP: ${pctFP}`,
      truePositive: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'TP',
        countDisplay: pctTP,
      },
      falsePositive: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'FP',
        countDisplay: pctFP,
      },
    },
    testNegative: {
      group: {
        domainLabel: capitalise(v.testNegativeName),
        structuralLabel: 'Test-negative',
        countDisplay: `${pctTestNeg} (FN: ${pctFN}, TN: ${pctTN})`,
      },
      compositionString: `FN: ${pctFN}, TN: ${pctTN}`,
      falseNegative: {
        domainLabel: capitalise(v.conditionName),
        structuralLabel: 'FN',
        countDisplay: pctFN,
      },
      trueNegative: {
        domainLabel: capitalise(v.conditionNegativeName),
        structuralLabel: 'TN',
        countDisplay: pctTN,
      },
    },
  };
}

// --- Output 6: Tree Node Labels ---

function generateTreeNodeLabelsFrequency(a: DataPackageRegionA): TreeNodeLabels {
  return {
    root: formatCount(a.n),
    conditionPositive: formatCount(a.nD),
    conditionNegative: formatCount(a.nNotD),
    truePositive: formatCount(a.nTP),
    falseNegative: formatCount(a.nFN),
    falsePositive: formatCount(a.nFP),
    trueNegative: formatCount(a.nTN),
  };
}

function generateTreeNodeLabelsProbability(a: DataPackageRegionA): TreeNodeLabels {
  const brDec = formatDecimal(a.inputBaseRate);
  const notBrDec = formatDecimal(1 - a.inputBaseRate);

  return {
    root: '1',
    conditionPositive: String.raw`P(D) = ${brDec}`,
    conditionNegative: String.raw`P(\neg D) = ${notBrDec}`,
    truePositive: String.raw`P(D \cap T^+) = ${formatDecimal(a.jointProbDAndTestPos)}`,
    falseNegative: String.raw`P(D \cap T^-) = ${formatDecimal(a.jointProbDAndTestNeg)}`,
    falsePositive: String.raw`P(\neg D \cap T^+) = ${formatDecimal(a.jointProbNotDAndTestPos)}`,
    trueNegative: String.raw`P(\neg D \cap T^-) = ${formatDecimal(a.jointProbNotDAndTestNeg)}`,
  };
}

// --- Output 7: Tree Branch Labels ---

function generateTreeBranchLabelsFrequency(a: DataPackageRegionA, v: ResolvedVocabulary): TreeBranchLabels {
  // Frequency mode uses EFFECTIVE rates (derived from integer counts)
  const effBaseRate = a.nD / a.n;
  const effNotBaseRate = a.nNotD / a.n;
  const effSens = a.effectiveSensitivity;
  const effFNR = a.nD > 0 ? a.nFN / a.nD : 0;
  const effFPR = a.effectiveFPR;
  const effTNR = a.effectiveSpecificity;

  return {
    baseRatePositive: `Base rate: ${formatPercentClean(effBaseRate)}`,
    baseRateNegative: `(1 − Base rate): ${formatPercentClean(effNotBaseRate)}`,
    sensitivity: `${v.sensitivityDomainName}: ${formatPercentClean(effSens)}`,
    falseNegativeRate: `(1 − ${v.sensitivityDomainName}): ${formatPercentClean(effFNR)}`,
    falsePositiveRate: `FPR: ${formatPercentClean(effFPR)}`,
    trueNegativeRate: `(1 − FPR): ${formatPercentClean(effTNR)}`,
  };
}

function generateTreeBranchLabelsProbability(a: DataPackageRegionA): TreeBranchLabels {
  // Probability mode uses INPUT rates as decimals (the formal conditional probabilities)
  const brDec = formatDecimal(a.inputBaseRate);
  const notBrDec = formatDecimal(1 - a.inputBaseRate);
  const sensDec = formatDecimal(a.inputSensitivity);
  const fnrDec = formatDecimal(1 - a.inputSensitivity);
  const fprDec = formatDecimal(a.inputFPR);
  const tnrDec = formatDecimal(1 - a.inputFPR);

  return {
    baseRatePositive: String.raw`P(D) = ${brDec}`,
    baseRateNegative: String.raw`P(\neg D) = ${notBrDec}`,
    sensitivity: String.raw`P(T^+ \mid D) = ${sensDec}`,
    falseNegativeRate: String.raw`P(T^- \mid D) = ${fnrDec}`,
    falsePositiveRate: String.raw`P(T^+ \mid \neg D) = ${fprDec}`,
    trueNegativeRate: String.raw`P(T^- \mid \neg D) = ${tnrDec}`,
  };
}

// --- Output 8: Cross-Branch Combination Labels ---

function generateCrossBranchFrequency(a: DataPackageRegionA, v: ResolvedVocabulary): CrossBranchCombinationLabels {
  if (a.posterior === null) {
    return {
      sumLabel: `No ${v.populationName} ${v.testPositiveName} with these parameters`,
      posteriorLabel: 'The posterior is undefined.',
    };
  }

  const sumLabel = `${capitalise(v.testPositiveName)}: ${formatCount(a.nTP)} + ${formatCount(a.nFP)} = ${formatCount(a.nTestPos)}`;
  const posteriorPct = formatPercent(a.posterior);
  const posteriorLabel = `${formatCount(a.nTP)} out of ${formatCount(a.nTestPos)} ≈ ${posteriorPct}`;

  return { sumLabel, posteriorLabel };
}

function generateCrossBranchProbability(a: DataPackageRegionA): CrossBranchCombinationLabels {
  if (a.posterior === null) {
    return {
      sumLabel: String.raw`P(T^+) = 0`,
      posteriorLabel: String.raw`P(D \mid T^+) is undefined.`,
    };
  }

  const jointTP = formatDecimal(a.jointProbDAndTestPos);
  const jointFP = formatDecimal(a.jointProbNotDAndTestPos);
  const marginal = formatDecimal(a.totalTestPositiveRate);
  const postDec = formatDecimal(a.posterior);

  const sumLabel = String.raw`P(T^+) = P(D \cap T^+) + P(\neg D \cap T^+) = ${jointTP} + ${jointFP} = ${marginal}`;
  const posteriorLabel = String.raw`P(D \mid T^+) = P(D \cap T^+) / P(T^+) = ${jointTP} / ${marginal} \approx ${postDec}`;

  return { sumLabel, posteriorLabel };
}

// --- Output 9: Degenerate State Messages ---

export interface DegenerateMessages {
  nTestPosZeroFrequency: string;
  nTestPosZeroProbability: string;
  zeroFromRounding: string;
  smallND: string;
}

function generateDegenerateMessages(a: DataPackageRegionA, v: ResolvedVocabulary): DegenerateMessages {
  return {
    nTestPosZeroFrequency: `No ${v.populationName} ${v.testPositiveName} with these parameters — the posterior is undefined.`,
    nTestPosZeroProbability: String.raw`P(T^+) = 0` + String.raw` — no positive tests. P(D \mid T^+) is undefined.`,
    zeroFromRounding: `At this population size, the ${v.sensitivityDomainName.toLowerCase()} doesn't produce any detected cases. Try a larger population for more detail.`,
    smallND: 'The affected group is very small at this population size — try a larger N for more detail.',
  };
}

// --- Output 10: Glossary Entries ---

export interface GlossaryEntry {
  structuralTerm: string;
  domainTerm: string;
  bayesianTerm: string;
  bridgingDefinition: string;
}

function generateGlossaryEntries(a: DataPackageRegionA, v: ResolvedVocabulary): GlossaryEntry[] {
  const specPct = formatPercentClean(a.effectiveSpecificity);

  const entries: GlossaryEntry[] = [
    {
      structuralTerm: 'Base rate',
      domainTerm: capitalise(v.baseRateDomainName),
      bayesianTerm: 'Prior',
      bridgingDefinition: 'How common the condition is before seeing any test result.',
    },
    {
      structuralTerm: 'Sensitivity',
      domainTerm: v.sensitivityDomainName,
      bayesianTerm: 'Likelihood',
      bridgingDefinition: 'The probability of this test result given the condition. Not the probability of the condition given the test result.',
    },
    {
      structuralTerm: 'FPR',
      domainTerm: v.fprDomainName,
      bayesianTerm: '',
      bridgingDefinition: `The rate at which ${v.populationName} without the condition incorrectly ${v.testPositiveName}.`,
    },
    {
      structuralTerm: 'Total test-positive rate',
      domainTerm: '',
      bayesianTerm: 'Marginal likelihood',
      bridgingDefinition: 'The total probability of this test result, whether the condition is present or not.',
    },
    {
      structuralTerm: 'Posterior',
      domainTerm: '',
      bayesianTerm: 'Posterior',
      bridgingDefinition: 'The updated probability after seeing the test result.',
    },
  ];

  // Specificity note (always available — derived from FPR)
  entries.push({
    structuralTerm: 'Specificity',
    domainTerm: '',
    bayesianTerm: '',
    bridgingDefinition: `Specificity (${specPct}) = 1 − FPR. The probability of a negative test given no disease.`,
  });

  return entries;
}

// ===== Utility =====

/** Capitalise first letter of a string. */
function capitalise(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Extract a short domain term from baseRateDomainName for probability-mode parenthetical.
 * "prevalence of the disease" → "prevalence"
 * "spam rate" → "spam rate"
 * "defect rate" → "defect rate"
 */
function extractShortDomainTerm(baseRateDomainName: string): string {
  // If the name starts with "prevalence of", extract just "prevalence"
  if (baseRateDomainName.toLowerCase().startsWith('prevalence of')) {
    return 'prevalence';
  }
  return baseRateDomainName.toLowerCase();
}

// ===== Main Function =====

/**
 * Compute Region B of the data package — all textual outputs for both display modes.
 *
 * Pure function: (Region A + scenario vocabulary) → Region B.
 * Deterministic, no side effects, no state.
 */
export function computeRegionB(
  regionA: DataPackageRegionA,
  vocabulary: ScenarioDefinition | null,
  activeDisplayMode: DisplayMode = DisplayMode.Frequency,
): DataPackageRegionB {
  const v = resolveVocabulary(vocabulary);

  // Generate frequency mode labels
  const frequency: DisplayModeLabels = {
    byCondition: generateByConditionLabelsFrequency(regionA, v),
    byTestResult: generateByTestResultLabelsFrequency(regionA, v),
    treeNodes: generateTreeNodeLabelsFrequency(regionA),
    treeBranches: generateTreeBranchLabelsFrequency(regionA, v),
    crossBranchCombination: generateCrossBranchFrequency(regionA, v),
    questionText: generateQuestionFrequency(v),
    problemStatementText: generateProblemStatementFrequency(regionA, v),
    parameterDisplayStrings: generateParamDisplayFrequency(regionA, v),
  };

  // Generate probability mode labels
  const probability: DisplayModeLabels = {
    byCondition: generateByConditionLabelsProbability(regionA, v),
    byTestResult: generateByTestResultLabelsProbability(regionA, v),
    treeNodes: generateTreeNodeLabelsProbability(regionA),
    treeBranches: generateTreeBranchLabelsProbability(regionA),
    crossBranchCombination: generateCrossBranchProbability(regionA),
    questionText: generateQuestionProbability(v),
    problemStatementText: generateProblemStatementProbability(regionA, v),
    parameterDisplayStrings: generateParamDisplayProbability(regionA, v),
  };

  return {
    frequency,
    probability,
    activeDisplayMode,
  };
}

// Export helpers for testing and reuse
export { generateDegenerateMessages, generateGlossaryEntries, resolveVocabulary };
export type { ResolvedVocabulary };
