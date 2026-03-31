/**
 * BayesFormulaPanel — live-substituted Bayes' rule formula reference.
 *
 * Shows the general form of Bayes' theorem with current parameter values:
 *
 *   P(D | T⁺) = P(T⁺ | D) · P(D) / P(T⁺) = sens × baseRate / marginal ≈ posterior
 *
 * All values come from Region A of the data package. The formula updates live
 * as parameters change (automatic — the data package recomputes on every change).
 *
 * Pedagogical role: bridging, not teaching. This is a reference element showing
 * how the quantities the user has already explored map to the formal expression.
 * Visually subordinate to the main visualisation.
 */

import { useMemo } from 'react';
import type { DataPackageRegionA } from '../../types';
import { KaTeXInline } from './KaTeXInline';

interface BayesFormulaPanelProps {
  regionA: DataPackageRegionA;
}

/**
 * Format a decimal value for formula display.
 * Exact-to-2dp values (0.01, 0.90) show 2dp; everything else shows 3dp.
 * Consistent with the existing formatDecimal convention in the template system.
 */
function formatForFormula(value: number): string {
  const rounded2 = Math.round(value * 100) / 100;
  if (Math.abs(value - rounded2) < 1e-9) {
    return rounded2.toFixed(2);
  }
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

export function BayesFormulaPanel({ regionA }: BayesFormulaPanelProps) {
  const formulaLatex = useMemo(() => {
    const { inputBaseRate, inputSensitivity, totalTestPositiveRate, posterior } = regionA;

    // Degenerate case: P(T+) = 0 → posterior is undefined
    if (posterior === null || totalTestPositiveRate === 0) {
      return String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = \frac{${formatForFormula(inputSensitivity)} \times ${formatForFormula(inputBaseRate)}}{0} \;\text{— undefined}`;
    }

    const sens = formatForFormula(inputSensitivity);
    const base = formatForFormula(inputBaseRate);
    const marginal = formatForFormula(totalTestPositiveRate);
    const post = formatForFormula(posterior);

    // Compute the numerator product for the substituted form
    const numerator = inputSensitivity * inputBaseRate;
    const num = formatForFormula(numerator);

    return String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = \frac{${sens} \times ${base}}{${marginal}} = \frac{${num}}{${marginal}} \approx ${post}`;
  }, [regionA]);

  return (
    <div className="bayes-formula-panel">
      <div className="bayes-formula-panel__label">Bayes' Rule</div>
      <div className="bayes-formula-panel__formula">
        <KaTeXInline latex={formulaLatex} className="bayes-formula-panel__katex" />
      </div>
    </div>
  );
}
