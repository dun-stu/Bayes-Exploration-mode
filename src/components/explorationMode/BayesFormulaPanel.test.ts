/**
 * Tests for BayesFormulaPanel — Bayes' rule formula generation.
 *
 * Tests the formatForFormula helper and the single-line three-zone formula
 * against known scenario values.
 *
 * Formula zones:
 *   1. General symbolic form (normal): P(D|T⁺) = P(T⁺|D)·P(D)/P(T⁺) =
 *   2. Numerical substitution (grey/small): sens × base / marginal =
 *   3. Joint/marginal + result (normal): P(D∩T⁺)/P(T⁺) = joint/marginal ≈ post
 */

import { describe, it, expect } from 'vitest';
import { computeRegionA } from '../../computation/computeRegionA';
import { formatForFormula } from './BayesFormulaPanel';

/**
 * Build expected main formula LaTeX (single line, three zones).
 */
function buildExpectedMainLatex(regionA: {
  inputBaseRate: number;
  inputSensitivity: number;
  totalTestPositiveRate: number;
  posterior: number | null;
  jointProbDAndTestPos: number;
}): string {
  const { inputBaseRate, inputSensitivity, totalTestPositiveRate, posterior, jointProbDAndTestPos } = regionA;
  const jointTP = formatForFormula(jointProbDAndTestPos);
  const sens = formatForFormula(inputSensitivity);
  const base = formatForFormula(inputBaseRate);

  if (posterior === null || totalTestPositiveRate === 0) {
    return String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = {\small\color{#919191}{\frac{${sens} \times ${base}}{0} =}} \;\frac{P(D \cap T^+)}{P(T^+)} = \frac{${jointTP}}{0} \;\text{— undefined}`;
  }

  const marginal = formatForFormula(totalTestPositiveRate);
  const post = formatForFormula(posterior);
  return String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = {\small\color{#919191}{\frac{${sens} \times ${base}}{${marginal}} =}} \;\frac{P(D \cap T^+)}{P(T^+)} = \frac{\htmlClass{formula-tooltip-joint}{${jointTP}}}{\htmlClass{formula-tooltip-marginal}{${marginal}}} \approx ${post}`;
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
    expect(formatForFormula(9 / 98)).toBe('0.092');
    expect(formatForFormula(75 / 100)).toBe('0.75');
  });
});

describe('Bayes formula — mammography reference', () => {
  const regionA = computeRegionA({
    n: 1000,
    baseRate: 0.01,
    sensitivity: 0.90,
    fpr: 0.09,
  });

  it('formula contains full general symbolic form (zone 1)', () => {
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain(String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)}`);
  });

  it('formula contains grey numerical substitution (zone 2)', () => {
    const main = buildExpectedMainLatex(regionA);
    // Grey section: \small\color{#919191}{\frac{sens × base}{marginal} =}
    expect(main).toContain('\\small\\color{#919191}');
    expect(main).toContain('0.90');
    expect(main).toContain('0.01');
    expect(main).toContain('0.098');
  });

  it('formula names joint probability and shows result (zone 3)', () => {
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain(String.raw`\frac{P(D \cap T^+)}{P(T^+)}`);
    expect(main).toContain(String.raw`\frac{\htmlClass{formula-tooltip-joint}{0.009}}{\htmlClass{formula-tooltip-marginal}{0.098}}`);
    expect(main).toContain(String.raw`\approx 0.092`);
  });

  it('formula does not contain a bridging annotation line', () => {
    const main = buildExpectedMainLatex(regionA);
    expect(main).not.toContain('\\text{where');
    expect(main).not.toContain('\\text{, \\; and');
  });
});

describe('Bayes formula — spam filter scenario', () => {
  const regionA = computeRegionA({
    n: 200,
    baseRate: 0.25,
    sensitivity: 0.90,
    fpr: 0.10,
  });

  it('formula has correct substituted values in grey zone', () => {
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain('0.90');  // sensitivity
    expect(main).toContain('0.25');  // base rate
    expect(main).toContain('0.30');  // marginal: 60/200
  });

  it('formula has correct joint and posterior in zone 3', () => {
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain('0.225'); // joint: 45/200
    expect(main).toContain('0.75');  // posterior: 45/60
  });
});

describe('Bayes formula — degenerate case (P(T+) = 0)', () => {
  const regionA = computeRegionA({
    n: 1000,
    baseRate: 0.01,
    sensitivity: 0,
    fpr: 0,
  });

  it('formula shows undefined with denominator 0', () => {
    expect(regionA.posterior).toBeNull();
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain('undefined');
    expect(main).toContain('{0}');
    expect(main).not.toContain(String.raw`\approx`);
  });

  it('degenerate formula still shows general symbolic form', () => {
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain(String.raw`P(T^+ \mid D) \cdot P(D)`);
  });
});

describe('Bayes formula — edge cases', () => {
  it('handles perfect sensitivity and zero FPR', () => {
    const regionA = computeRegionA({
      n: 100,
      baseRate: 0.10,
      sensitivity: 1.0,
      fpr: 0,
    });
    const main = buildExpectedMainLatex(regionA);
    expect(main).toContain(String.raw`\approx 1.00`); // posterior = 10/10 = 1.0
    expect(main).toContain('1.00'); // sensitivity
    expect(main).toContain('0.10'); // base rate
  });

  it('handles high base rate', () => {
    const regionA = computeRegionA({
      n: 100,
      baseRate: 0.50,
      sensitivity: 0.80,
      fpr: 0.05,
    });
    const main = buildExpectedMainLatex(regionA);
    expect(regionA.posterior).not.toBeNull();
    expect(regionA.posterior!).toBeGreaterThan(0.9);
    expect(main).toContain(String.raw`P(D \cap T^+)`);
    expect(main).toContain(String.raw`P(T^+ \mid D) \cdot P(D)`);
  });
});
