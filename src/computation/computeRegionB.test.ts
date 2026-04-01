/**
 * Tests for the template system (computeRegionB).
 *
 * Covers:
 *   - Mammography reference scenario (all outputs verified against spec examples)
 *   - Non-medical scenario (vocabulary substitution)
 *   - Degenerate case (N_T+ = 0)
 *   - Probability-mode LaTeX well-formedness
 *   - Glossary entries
 */

import { describe, it, expect } from 'vitest';
import { computeRegionA } from './computeRegionA';
import {
  computeRegionB,
  generateDegenerateMessages,
  generateGlossaryEntries,
  resolveVocabulary,
} from './computeRegionB';
import type { ScenarioDefinition } from '../types';
import { DisplayMode } from '../types';

// ===== Test Fixtures =====

/** Mammography reference scenario: N=1000, base rate=1%, sensitivity=90%, FPR=9% */
const mammoRegionA = computeRegionA({
  n: 1000,
  baseRate: 0.01,
  sensitivity: 0.90,
  fpr: 0.09,
});

const mammoVocabulary: ScenarioDefinition = {
  baseRate: 0.01,
  sensitivity: 0.90,
  fpr: 0.09,
  n: 1000,
  populationName: 'people',
  conditionName: 'have the disease',
  conditionNegativeName: 'do not have the disease',
  testName: 'the test',
  testPositiveName: 'test positive',
  testNegativeName: 'test negative',
  populationSingular: 'a person',
  conditionNameSingular: 'has the disease',
  testPositiveNameSingular: 'tests positive',
  relativePronoun: 'who',
  testAction: 'are tested',
  baseRateDomainName: 'prevalence of the disease',
  id: 'mammography',
  name: 'Mammography Screening',
  domain: 'medical',
};

/** Spam filtering scenario for vocabulary substitution testing */
const spamVocabulary: ScenarioDefinition = {
  baseRate: 0.25,
  sensitivity: 0.90,
  fpr: 0.10,
  n: 200,
  populationName: 'emails',
  conditionName: 'are spam',
  conditionNegativeName: 'are not spam',
  testName: 'the spam filter',
  testPositiveName: 'are flagged',
  testNegativeName: 'reach the inbox',
  sensitivityDomainName: 'Detection rate',
  fprDomainName: 'False positive rate',
  conditionSymbol: 'S',
  testSymbol: 'F',
  populationSingular: 'an email',
  conditionNameSingular: 'is spam',
  testPositiveNameSingular: 'is flagged',
  relativePronoun: 'that',
  testAction: 'arrive',
  baseRateDomainName: 'spam rate',
  id: 'spam',
  name: 'Spam Filtering',
  domain: 'technology',
};

const spamRegionA = computeRegionA({
  n: 200,
  baseRate: 0.25,
  sensitivity: 0.90,
  fpr: 0.10,
});

// ===== Mammography Reference Tests =====

describe('computeRegionB — Mammography Reference Scenario', () => {
  const regionB = computeRegionB(mammoRegionA, mammoVocabulary);

  // --- Output 1: Problem Statement ---

  describe('Output 1: Problem Statement', () => {
    it('frequency version matches spec example', () => {
      expect(regionB.frequency.problemStatementText).toBe(
        'Imagine 1,000 people are tested. Of these 1,000, 10 have the disease. ' +
        'Of the 10 who have the disease, 9 test positive. ' +
        'Of the 990 who do not have the disease, 89 test positive.'
      );
    });

    it('probability version matches spec example', () => {
      expect(regionB.probability.problemStatementText).toBe(
        'The prevalence of the disease is 1%. ' +
        'The test has a sensitivity of 90% and a false positive rate of 9%.'
      );
    });
  });

  // --- Output 2: Question Text ---

  describe('Output 2: Question Text', () => {
    it('frequency version matches spec', () => {
      expect(regionB.frequency.questionText).toBe(
        'Of all those who test positive, how many actually have the disease?'
      );
    });

    it('probability version has natural language primary and notation secondary', () => {
      const lines = regionB.probability.questionText.split('\n');
      expect(lines[0]).toBe(
        'What is the probability that a person who tests positive has the disease?'
      );
      expect(lines[1]).toContain('P(D');
      expect(lines[1]).toContain('T^+');
      expect(lines[1]).toContain('= \\,?');
    });
  });

  // --- Output 3: Parameter Display Strings ---

  describe('Output 3: Parameter Display Strings', () => {
    it('frequency base rate matches spec Y2 format', () => {
      expect(regionB.frequency.parameterDisplayStrings.baseRate).toBe(
        'Base rate (prior): 1% — 10 out of 1,000 have the disease'
      );
    });

    it('frequency sensitivity matches spec Y2 format', () => {
      expect(regionB.frequency.parameterDisplayStrings.sensitivity).toBe(
        'Sensitivity (likelihood): 90% — 9 out of 10 detected'
      );
    });

    it('frequency FPR matches spec Y2 format', () => {
      expect(regionB.frequency.parameterDisplayStrings.fpr).toBe(
        'FPR: 9% — 89 out of 990 false positives (Specificity: 91%)'
      );
    });

    it('frequency total test-positive rate includes marginal likelihood label', () => {
      const s = regionB.frequency.parameterDisplayStrings.totalTestPositiveRate;
      expect(s).toContain('Total test-positive rate (marginal likelihood)');
      expect(s).toContain('98 out of 1,000');
      expect(s).toContain('test positive');
    });

    it('frequency posterior shows count fraction', () => {
      const s = regionB.frequency.parameterDisplayStrings.posterior;
      expect(s).toContain('Posterior');
      expect(s).toContain('9 out of 98');
    });

    it('probability base rate uses LaTeX notation', () => {
      const s = regionB.probability.parameterDisplayStrings.baseRate;
      expect(s).toContain('P(D) = 0.01');
      expect(s).toContain('Prior');
      expect(s).toContain('prevalence');
    });

    it('probability sensitivity uses LaTeX notation', () => {
      const s = regionB.probability.parameterDisplayStrings.sensitivity;
      expect(s).toContain('P(T^+');
      expect(s).toContain('D)');
      expect(s).toContain('0.90');
      expect(s).toContain('Likelihood');
    });

    it('probability FPR uses LaTeX notation with specificity', () => {
      const s = regionB.probability.parameterDisplayStrings.fpr;
      expect(s).toContain('P(T^+');
      expect(s).toContain('\\neg D)');
      expect(s).toContain('0.09');
      expect(s).toContain('specificity: 91%');
    });
  });

  // --- Output 5: Icon Array Compound Labels ---

  describe('Output 5: Icon Array Compound Labels', () => {
    it('by-condition frequency: condition-positive group label', () => {
      const lbl = regionB.frequency.byCondition.conditionPositive.group;
      expect(lbl.domainLabel).toBe('Have the disease');
      expect(lbl.countDisplay).toBe('10 (TP: 9, FN: 1)');
    });

    it('by-condition frequency: condition-negative group label', () => {
      const lbl = regionB.frequency.byCondition.conditionNegative.group;
      expect(lbl.domainLabel).toBe('Do not have the disease');
      expect(lbl.countDisplay).toBe('990 (FP: 89, TN: 901)');
    });

    it('by-test-result frequency: test-positive group label', () => {
      const lbl = regionB.frequency.byTestResult.testPositive.group;
      expect(lbl.domainLabel).toBe('Test positive');
      expect(lbl.countDisplay).toBe('98 (TP: 9, FP: 89)');
    });

    it('by-test-result frequency: test-negative group label', () => {
      const lbl = regionB.frequency.byTestResult.testNegative.group;
      expect(lbl.domainLabel).toBe('Test negative');
      expect(lbl.countDisplay).toBe('902 (FN: 1, TN: 901)');
    });

    it('by-condition probability uses percentage format', () => {
      const lbl = regionB.probability.byCondition.conditionPositive.group;
      expect(lbl.countDisplay).toBe('1% (TP: 0.9%, FN: 0.1%)');
    });

    it('by-test-result probability uses percentage format', () => {
      const lbl = regionB.probability.byTestResult.testPositive.group;
      expect(lbl.countDisplay).toBe('9.8% (TP: 0.9%, FP: 8.9%)');
    });

    it('composition string in by-test-result frequency', () => {
      expect(regionB.frequency.byTestResult.testPositive.compositionString).toBe('TP: 9, FP: 89');
      expect(regionB.frequency.byTestResult.testNegative.compositionString).toBe('FN: 1, TN: 901');
    });
  });

  // --- Output 6: Tree Node Labels ---

  describe('Output 6: Tree Node Labels', () => {
    it('frequency nodes show counts', () => {
      const nodes = regionB.frequency.treeNodes;
      expect(nodes.root).toBe('1,000');
      expect(nodes.conditionPositive).toBe('10');
      expect(nodes.conditionNegative).toBe('990');
      expect(nodes.truePositive).toBe('9');
      expect(nodes.falseNegative).toBe('1');
      expect(nodes.falsePositive).toBe('89');
      expect(nodes.trueNegative).toBe('901');
    });

    it('probability root is "1"', () => {
      expect(regionB.probability.treeNodes.root).toBe('1');
    });

    it('probability first-level nodes use P(D) notation', () => {
      expect(regionB.probability.treeNodes.conditionPositive).toContain('P(D) = 0.01');
      expect(regionB.probability.treeNodes.conditionNegative).toContain('P(\\neg D) = 0.99');
    });

    it('probability leaf nodes show joint probabilities', () => {
      expect(regionB.probability.treeNodes.truePositive).toContain('P(D \\cap T^+) = 0.009');
      expect(regionB.probability.treeNodes.falseNegative).toContain('P(D \\cap T^-) = 0.001');
      expect(regionB.probability.treeNodes.falsePositive).toContain('P(\\neg D \\cap T^+) = 0.089');
      expect(regionB.probability.treeNodes.trueNegative).toContain('P(\\neg D \\cap T^-) = 0.901');
    });
  });

  // --- Output 7: Tree Branch Labels ---

  describe('Output 7: Tree Branch Labels', () => {
    it('frequency branches show effective rates', () => {
      const br = regionB.frequency.treeBranches;
      expect(br.baseRatePositive).toBe('Base rate: 1%');
      expect(br.baseRateNegative).toBe('(1 − Base rate): 99%');
      expect(br.sensitivity).toBe('Sensitivity: 90%');
      expect(br.falseNegativeRate).toBe('(1 − Sensitivity): 10%');
      // FPR effective: 89/990 ≈ 9.0%
      expect(br.falsePositiveRate).toContain('FPR:');
      expect(br.trueNegativeRate).toContain('(1 − FPR):');
    });

    it('probability branches use input rates with LaTeX notation', () => {
      const br = regionB.probability.treeBranches;
      expect(br.baseRatePositive).toContain('P(D) = 0.01');
      expect(br.baseRateNegative).toContain('P(\\neg D) = 0.99');
      expect(br.sensitivity).toContain('P(T^+ \\mid D) = 0.90');
      expect(br.falseNegativeRate).toContain('P(T^- \\mid D) = 0.10');
      expect(br.falsePositiveRate).toContain('P(T^+ \\mid \\neg D) = 0.09');
      expect(br.trueNegativeRate).toContain('P(T^- \\mid \\neg D) = 0.91');
    });
  });

  // --- Output 8: Cross-Branch Combination Labels ---

  describe('Output 8: Cross-Branch Combination Labels', () => {
    it('frequency sum shows count arithmetic', () => {
      const cbc = regionB.frequency.crossBranchCombination;
      expect(cbc.sumLabel).toBe('Test positive: 9 + 89 = 98');
    });

    it('frequency posterior shows count fraction', () => {
      const cbc = regionB.frequency.crossBranchCombination;
      expect(cbc.posteriorLabel).toContain('9 out of 98');
    });

    it('probability sum shows Bayes theorem arithmetic', () => {
      const cbc = regionB.probability.crossBranchCombination;
      expect(cbc.sumLabel).toContain('P(T^+) = P(D \\cap T^+) + P(\\neg D \\cap T^+)');
      expect(cbc.sumLabel).toContain('0.009 + 0.089 = 0.098');
    });

    it('probability posterior shows Bayes theorem division with stacked fractions', () => {
      const cbc = regionB.probability.crossBranchCombination;
      expect(cbc.posteriorLabel).toContain('\\tfrac{P(D \\cap T^+)}{P(T^+)}');
      expect(cbc.posteriorLabel).toContain('\\tfrac{0.009}{0.098}');
    });
  });
});

// ===== Spam Scenario — Vocabulary Substitution =====

describe('computeRegionB — Spam Scenario (vocabulary substitution)', () => {
  const regionB = computeRegionB(spamRegionA, spamVocabulary);

  it('frequency problem statement uses spam vocabulary', () => {
    const ps = regionB.frequency.problemStatementText;
    expect(ps).toContain('emails arrive');
    expect(ps).toContain('are spam');
    expect(ps).toContain('are flagged');
    expect(ps).toContain('are not spam');
  });

  it('probability problem statement uses domain terms', () => {
    const ps = regionB.probability.problemStatementText;
    expect(ps).toContain('spam rate');
    expect(ps).toContain('detection rate');
    expect(ps).toContain('false positive rate');
  });

  it('frequency question uses "that" relative pronoun', () => {
    expect(regionB.frequency.questionText).toContain('that are flagged');
  });

  it('probability question uses singular forms', () => {
    const q = regionB.probability.questionText;
    expect(q).toContain('an email');
    expect(q).toContain('is flagged');
    expect(q).toContain('is spam');
  });

  it('icon array labels use spam vocabulary', () => {
    const lbl = regionB.frequency.byCondition.conditionPositive.group;
    expect(lbl.domainLabel).toBe('Are spam');
  });

  it('tree branch labels use Detection rate in frequency mode', () => {
    expect(regionB.frequency.treeBranches.sensitivity).toContain('Detection rate:');
  });

  it('frequency parameter display uses Detection rate label', () => {
    expect(regionB.frequency.parameterDisplayStrings.sensitivity).toContain('Detection rate (likelihood)');
  });
});

// ===== Default Vocabulary (no scenario loaded) =====

describe('computeRegionB — Default vocabulary (null scenario)', () => {
  const defaultRegionA = computeRegionA({
    n: 1000,
    baseRate: 0.05,
    sensitivity: 0.80,
    fpr: 0.05,
  });
  const regionB = computeRegionB(defaultRegionA, null);

  it('frequency problem statement uses generic fallback terms', () => {
    const ps = regionB.frequency.problemStatementText;
    expect(ps).toContain('people are tested');
    expect(ps).toContain('have the condition');
    expect(ps).toContain('test positive');
  });

  it('frequency question uses "who" pronoun', () => {
    expect(regionB.frequency.questionText).toContain('who test positive');
  });

  it('probability question uses generic singular', () => {
    expect(regionB.probability.questionText).toContain('a person');
    expect(regionB.probability.questionText).toContain('has the condition');
  });
});

// ===== Degenerate Case: N_T+ = 0 =====

describe('computeRegionB — Degenerate case (N_T+ = 0)', () => {
  // Sensitivity = 0% and FPR = 0% → nobody tests positive
  const degenerateA = computeRegionA({
    n: 1000,
    baseRate: 0.01,
    sensitivity: 0,
    fpr: 0,
  });
  const regionB = computeRegionB(degenerateA, mammoVocabulary);

  it('posterior is null in Region A', () => {
    expect(degenerateA.posterior).toBeNull();
    expect(degenerateA.nTestPos).toBe(0);
  });

  it('frequency posterior shows degenerate message', () => {
    expect(regionB.frequency.parameterDisplayStrings.posterior).toContain(
      'No people test positive with these parameters'
    );
    expect(regionB.frequency.parameterDisplayStrings.posterior).toContain('undefined');
  });

  it('probability posterior shows P(T+) = 0 message', () => {
    expect(regionB.probability.parameterDisplayStrings.posterior).toContain('P(T^+) = 0');
    expect(regionB.probability.parameterDisplayStrings.posterior).toContain('undefined');
  });

  it('cross-branch combination handles degenerate case', () => {
    expect(regionB.frequency.crossBranchCombination.posteriorLabel).toContain('undefined');
    expect(regionB.probability.crossBranchCombination.sumLabel).toContain('P(T^+) = 0');
  });
});

// ===== Degenerate State Messages =====

describe('generateDegenerateMessages', () => {
  const v = resolveVocabulary(mammoVocabulary);
  const msgs = generateDegenerateMessages(mammoRegionA, v);

  it('N_T+ = 0 frequency message uses population_name', () => {
    expect(msgs.nTestPosZeroFrequency).toBe(
      'No people test positive with these parameters — the posterior is undefined.'
    );
  });

  it('N_T+ = 0 probability message uses notation', () => {
    expect(msgs.nTestPosZeroProbability).toContain('P(T^+) = 0');
    expect(msgs.nTestPosZeroProbability).toContain('Posterior is undefined');
  });

  it('zero-from-rounding message uses sensitivityDomainName', () => {
    expect(msgs.zeroFromRounding).toContain('sensitivity');
    expect(msgs.zeroFromRounding).toContain('larger population');
  });

  it('small N_D message is generic', () => {
    expect(msgs.smallND).toContain('very small');
    expect(msgs.smallND).toContain('larger N');
  });

  it('spam scenario uses domain-specific terms', () => {
    const spamV = resolveVocabulary(spamVocabulary);
    const spamMsgs = generateDegenerateMessages(spamRegionA, spamV);
    expect(spamMsgs.nTestPosZeroFrequency).toContain('No emails are flagged');
    expect(spamMsgs.zeroFromRounding).toContain('detection rate');
  });
});

// ===== Glossary Entries =====

describe('generateGlossaryEntries', () => {
  const v = resolveVocabulary(mammoVocabulary);
  const entries = generateGlossaryEntries(mammoRegionA, v);

  it('produces 6 entries (5 core + specificity)', () => {
    expect(entries.length).toBe(6);
  });

  it('base rate entry has correct terms', () => {
    const entry = entries.find(e => e.structuralTerm === 'Base rate')!;
    expect(entry.bayesianTerm).toBe('Prior');
    expect(entry.domainTerm).toBe('Prevalence of the disease');
    expect(entry.bridgingDefinition).toContain('before seeing any test result');
  });

  it('sensitivity entry has inverse fallacy warning', () => {
    const entry = entries.find(e => e.structuralTerm === 'Sensitivity')!;
    expect(entry.bayesianTerm).toBe('Likelihood');
    expect(entry.bridgingDefinition).toContain('given the condition');
    expect(entry.bridgingDefinition).toContain('Not the probability of the condition given the test result');
  });

  it('FPR entry has no Bayesian term', () => {
    const entry = entries.find(e => e.structuralTerm === 'FPR')!;
    expect(entry.bayesianTerm).toBe('');
  });

  it('total test-positive rate entry has correct Bayesian term', () => {
    const entry = entries.find(e => e.structuralTerm === 'Total test-positive rate')!;
    expect(entry.bayesianTerm).toBe('Marginal likelihood');
    expect(entry.domainTerm).toBe('');
  });

  it('specificity entry has derived definition', () => {
    const entry = entries.find(e => e.structuralTerm === 'Specificity')!;
    expect(entry.bridgingDefinition).toContain('1 − FPR');
  });
});

// ===== LaTeX Well-Formedness =====

describe('LaTeX well-formedness', () => {
  const regionB = computeRegionB(mammoRegionA, mammoVocabulary);

  it('probability tree node labels contain valid LaTeX', () => {
    const nodes = regionB.probability.treeNodes;
    // Check that backslashes are literal (not double-escaped)
    expect(nodes.conditionPositive).toContain('P(D)');
    expect(nodes.conditionNegative).toContain('\\neg');
    expect(nodes.truePositive).toContain('\\cap');
  });

  it('probability branch labels contain valid LaTeX conditional notation', () => {
    const br = regionB.probability.treeBranches;
    expect(br.sensitivity).toContain('\\mid');
    expect(br.falsePositiveRate).toContain('\\neg D');
  });

  it('probability cross-branch labels contain valid LaTeX Bayes theorem', () => {
    const cbc = regionB.probability.crossBranchCombination;
    expect(cbc.sumLabel).toContain('\\cap');
    expect(cbc.posteriorLabel).toContain('\\mid');
    expect(cbc.posteriorLabel).toContain('\\approx');
  });

  it('question text contains LaTeX notation line', () => {
    const q = regionB.probability.questionText;
    expect(q).toContain('\\mid');
    expect(q).toContain('T^+');
  });
});

// ===== Scenario-Adapted Notation Symbols =====

describe('Scenario-adapted notation symbols', () => {
  it('mammography uses default D/T symbols', () => {
    const regionB = computeRegionB(mammoRegionA, mammoVocabulary);
    expect(regionB.notationSymbols).toEqual({ condition: 'D', test: 'T' });
    // Spot-check probability labels
    expect(regionB.probability.treeNodes.conditionPositive).toContain('P(D)');
    expect(regionB.probability.treeBranches.sensitivity).toContain('P(T^+');
    expect(regionB.probability.crossBranchCombination.posteriorLabel).toContain('P(D \\mid T^+)');
    expect(regionB.probability.questionText).toContain('P(D \\mid T^+)');
  });

  it('spam scenario uses S/F symbols throughout probability mode', () => {
    const regionB = computeRegionB(spamRegionA, spamVocabulary);
    expect(regionB.notationSymbols).toEqual({ condition: 'S', test: 'F' });

    // Question text
    expect(regionB.probability.questionText).toContain('P(S \\mid F^+)');

    // Parameter display
    const params = regionB.probability.parameterDisplayStrings;
    expect(params.baseRate).toContain('P(S)');
    expect(params.sensitivity).toContain('P(F^+ \\mid S)');
    expect(params.fpr).toContain('P(F^+ \\mid \\neg S)');
    expect(params.totalTestPositiveRate).toContain('P(F^+)');
    expect(params.posterior).toContain('P(S \\mid F^+)');

    // Tree node labels (joint probabilities)
    const nodes = regionB.probability.treeNodes;
    expect(nodes.conditionPositive).toContain('P(S)');
    expect(nodes.conditionNegative).toContain('P(\\neg S)');
    expect(nodes.truePositive).toContain('P(S \\cap F^+)');
    expect(nodes.falsePositive).toContain('P(\\neg S \\cap F^+)');

    // Tree branch labels
    const br = regionB.probability.treeBranches;
    expect(br.baseRatePositive).toContain('P(S)');
    expect(br.sensitivity).toContain('P(F^+ \\mid S)');
    expect(br.falsePositiveRate).toContain('P(F^+ \\mid \\neg S)');

    // Cross-branch combination
    const cbc = regionB.probability.crossBranchCombination;
    expect(cbc.sumLabel).toContain('P(F^+)');
    expect(cbc.sumLabel).toContain('P(S \\cap F^+)');
    expect(cbc.posteriorLabel).toContain('P(S \\mid F^+)');
  });

  it('spam scenario does NOT change frequency-mode labels', () => {
    const regionB = computeRegionB(spamRegionA, spamVocabulary);
    // Frequency mode should have no LaTeX notation — domain vocabulary only
    expect(regionB.frequency.questionText).not.toContain('P(S');
    expect(regionB.frequency.questionText).toContain('are flagged');
  });

  it('null scenario defaults to D/T', () => {
    const regionB = computeRegionB(mammoRegionA, null);
    expect(regionB.notationSymbols).toEqual({ condition: 'D', test: 'T' });
    expect(regionB.probability.treeNodes.conditionPositive).toContain('P(D)');
  });

  it('degenerate messages use scenario test symbol', () => {
    const spamV = resolveVocabulary(spamVocabulary);
    const msgs = generateDegenerateMessages(spamRegionA, spamV);
    expect(msgs.nTestPosZeroProbability).toContain('P(F^+)');
  });
});

// ===== Active Display Mode =====

describe('activeDisplayMode passthrough', () => {
  it('defaults to Frequency', () => {
    const regionB = computeRegionB(mammoRegionA, mammoVocabulary);
    expect(regionB.activeDisplayMode).toBe(DisplayMode.Frequency);
  });

  it('can be set to Probability', () => {
    const regionB = computeRegionB(mammoRegionA, mammoVocabulary, DisplayMode.Probability);
    expect(regionB.activeDisplayMode).toBe(DisplayMode.Probability);
  });
});

// ===== Edge Case: Formatting =====

describe('Number formatting', () => {
  it('comma-formats numbers >= 1000', () => {
    const regionB = computeRegionB(mammoRegionA, mammoVocabulary);
    expect(regionB.frequency.treeNodes.root).toBe('1,000');
    expect(regionB.frequency.problemStatementText).toContain('1,000');
  });

  it('does not comma-format numbers < 1000', () => {
    const regionB = computeRegionB(mammoRegionA, mammoVocabulary);
    expect(regionB.frequency.treeNodes.conditionPositive).toBe('10');
    expect(regionB.frequency.treeNodes.falsePositive).toBe('89');
  });
});
