/**
 * Tests for BayesFormulaPanel — Bayes' rule formula generation.
 *
 * Tests the formatForFormula helper and the formula LaTeX generation logic
 * against known scenario values.
 */

import { describe, it, expect } from 'vitest';
import { computeRegionA } from '../../computation/computeRegionA';

// We test the formula output indirectly by verifying the format function
// and the LaTeX string assembly against known Region A values.

/**
 * Reproduce formatForFormula locally for unit testing.
 * (The function is not exported from the component, so we replicate it here.)
 */
function formatForFormula(value: number): string {
  const rounded2 = Math.round(value * 100) / 100;
  if (Math.abs(value - rounded2) < 1e-9) {
    return rounded2.toFixed(2);
  }
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

/**
 * Build the expected formula LaTeX string from Region A values,
 * replicating the component's logic for test verification.
 */
function buildExpectedFormulaLatex(regionA: {
  inputBaseRate: number;
  inputSensitivity: number;
  totalTestPositiveRate: number;
  posterior: number | null;
}): string {
  const { inputBaseRate, inputSensitivity, totalTestPositiveRate, posterior } = regionA;

  if (posterior === null || totalTestPositiveRate === 0) {
    return String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = \frac{${formatForFormula(inputSensitivity)} \times ${formatForFormula(inputBaseRate)}}{0} \;\text{— undefined}`;
  }

  const sens = formatForFormula(inputSensitivity);
  const base = formatForFormula(inputBaseRate);
  const marginal = formatForFormula(totalTestPositiveRate);
  const post = formatForFormula(posterior);
  const numerator = inputSensitivity * inputBaseRate;
  const num = formatForFormula(numerator);

  return String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = \frac{${sens} \times ${base}}{${marginal}} = \frac{${num}}{${marginal}} \approx ${post}`;
}

describe('formatForFormula', () => {
  it('formats exact 2dp values with 2 decimal places', () => {
    expect(formatForFormula(0.01)).toBe('0.01');
    expect(formatForFormula(0.90)).toBe('0.90');
    expect(formatForFormula(0.25)).toBe('0.25');
    expect(formatForFormula(1.00)).toBe('1.00');
    expect(formatForFormula(0.00)).toBe('0.00');
    expect(formatForFormula(0.50)).toBe('0.50');
  });

  it('formats non-exact values with 3 decimal places', () => {
    expect(formatForFormula(0.098)).toBe('0.098');
    expect(formatForFormula(0.092)).toBe('0.092');
    expect(formatForFormula(0.009)).toBe('0.009');
    expect(formatForFormula(0.225)).toBe('0.225');
  });

  it('rounds posterior values to 3 decimal places', () => {
    // 9/98 ≈ 0.09183673...
    expect(formatForFormula(9 / 98)).toBe('0.092');
    // 75/100 = 0.75 — exact 2dp
    expect(formatForFormula(75 / 100)).toBe('0.75');
  });
});

describe('Bayes formula LaTeX — mammography reference', () => {
  const regionA = computeRegionA({
    n: 1000,
    baseRate: 0.01,
    sensitivity: 0.90,
    fpr: 0.09,
  });

  it('produces correct formula string', () => {
    const latex = buildExpectedFormulaLatex(regionA);
    // General form present
    expect(latex).toContain(String.raw`P(D \mid T^+)`);
    expect(latex).toContain(String.raw`P(T^+ \mid D) \cdot P(D)`);
    expect(latex).toContain(String.raw`P(T^+)`);
    // Substituted values
    expect(latex).toContain('0.90');
    expect(latex).toContain('0.01');
    expect(latex).toContain('0.098');
    // Numerator product
    expect(latex).toContain('0.009');
    // Posterior
    expect(latex).toContain('0.092');
  });

  it('uses \\approx for the posterior', () => {
    const latex = buildExpectedFormulaLatex(regionA);
    expect(latex).toContain(String.raw`\approx 0.092`);
  });
});

describe('Bayes formula LaTeX — spam filter scenario', () => {
  const regionA = computeRegionA({
    n: 200,
    baseRate: 0.25,
    sensitivity: 0.90,
    fpr: 0.10,
  });

  it('produces correct substituted values', () => {
    const latex = buildExpectedFormulaLatex(regionA);
    expect(latex).toContain('0.90');
    expect(latex).toContain('0.25');
    expect(latex).toContain('0.30');  // totalTestPositiveRate = (45+15)/200
    expect(latex).toContain('0.225'); // numerator: 0.90 * 0.25
    expect(latex).toContain('0.75');  // posterior: 45/60
  });
});

describe('Bayes formula LaTeX — degenerate case (P(T+) = 0)', () => {
  const regionA = computeRegionA({
    n: 1000,
    baseRate: 0.01,
    sensitivity: 0,
    fpr: 0,
  });

  it('shows undefined when posterior is null', () => {
    expect(regionA.posterior).toBeNull();
    expect(regionA.totalTestPositiveRate).toBe(0);

    const latex = buildExpectedFormulaLatex(regionA);
    expect(latex).toContain('undefined');
    expect(latex).toContain('{0}'); // denominator is 0
    expect(latex).not.toContain(String.raw`\approx`); // no approximate result
  });
});

describe('Bayes formula LaTeX — edge case values', () => {
  it('handles perfect sensitivity and zero FPR', () => {
    const regionA = computeRegionA({
      n: 100,
      baseRate: 0.10,
      sensitivity: 1.0,
      fpr: 0,
    });
    const latex = buildExpectedFormulaLatex(regionA);
    expect(latex).toContain('1.00'); // sensitivity
    expect(latex).toContain('0.10'); // base rate and marginal (same when FPR=0)
    expect(latex).toContain(String.raw`\approx 1.00`); // posterior = 10/10 = 1.0
  });

  it('handles high base rate', () => {
    const regionA = computeRegionA({
      n: 100,
      baseRate: 0.50,
      sensitivity: 0.80,
      fpr: 0.05,
    });
    const latex = buildExpectedFormulaLatex(regionA);
    expect(latex).toContain('0.80');
    expect(latex).toContain('0.50');
    // Posterior should be high
    expect(regionA.posterior).not.toBeNull();
    expect(regionA.posterior!).toBeGreaterThan(0.9);
  });
});
