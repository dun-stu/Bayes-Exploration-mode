/**
 * BayesFormulaPanel — live-substituted Bayes' rule formula reference with
 * joint-probability bridging and hover tooltips.
 *
 * Single-line formula with three visual zones:
 *   P(D | T⁺) = P(T⁺|D)·P(D)/P(T⁺) = [grey/small: 0.90×0.01/0.098 =] P(D∩T⁺)/P(T⁺) = 0.009/0.098 ≈ 0.092
 *
 * The grey/small middle section shows only the numerical substituted values.
 * The symbolic forms (general and joint/marginal) remain normal size and colour.
 *
 * Hovering over the numerator 0.009 shows the TP tooltip description
 * (matching the icon array tooltip). Hovering over 0.098 shows the
 * test-positive group label (matching the icon array by-test-result label).
 *
 * All values from Region A. Updates live as parameters change.
 * Pedagogical role: bridging, not teaching. Visually subordinate.
 */

import { useMemo, useRef, useEffect, useCallback } from 'react';
import type { DataPackageRegionA, DataPackageRegionB, ScenarioDefinition } from '../../types';
import { generateTooltipDescriptions } from '../iconArray/IconArray';
import { KaTeXInline } from './KaTeXInline';

interface BayesFormulaPanelProps {
  regionA: DataPackageRegionA;
  regionB: DataPackageRegionB;
  scenarioVocabulary?: ScenarioDefinition | null;
}

/**
 * Format a decimal value for formula display.
 * Exact-to-2dp values (0.01, 0.90) show 2dp; everything else shows 3dp.
 */
export function formatForFormula(value: number): string {
  const rounded2 = Math.round(value * 100) / 100;
  if (Math.abs(value - rounded2) < 1e-9) {
    return rounded2.toFixed(2);
  }
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

/** Format as percentage for tooltips (e.g. 0.009 → "0.9%"). */
function formatAsPercent(value: number): string {
  const pct = value * 100;
  const rounded = Math.round(pct * 10) / 10;
  return rounded % 1 === 0 ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

export function BayesFormulaPanel({ regionA, regionB, scenarioVocabulary }: BayesFormulaPanelProps) {
  const { mainLatex, jointTooltip, marginalTooltip } = useMemo(() => {
    const {
      inputBaseRate, inputSensitivity, totalTestPositiveRate, posterior,
      jointProbDAndTestPos,
    } = regionA;

    const jointTP = formatForFormula(jointProbDAndTestPos);

    // Tooltip text: use scenario vocabulary for domain-adapted descriptions.
    // Numerator tooltip matches the icon array TP group tooltip.
    // Denominator tooltip uses the test-positive group label from by-test-result labels.
    const tooltipDescs = generateTooltipDescriptions(scenarioVocabulary ?? null);
    const testPosLabel = regionB.probability.byTestResult.testPositive.group.domainLabel;
    const jt = `${tooltipDescs.TP}: ${formatAsPercent(jointProbDAndTestPos)}`;
    const mt = `${testPosLabel}: ${formatAsPercent(totalTestPositiveRate)}`;

    // Degenerate case: P(T+) = 0 → posterior is undefined
    if (posterior === null || totalTestPositiveRate === 0) {
      const sens = formatForFormula(inputSensitivity);
      const base = formatForFormula(inputBaseRate);
      return {
        mainLatex: String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = {\small\color{#919191}{\frac{${sens} \times ${base}}{0} =}} \;\frac{P(D \cap T^+)}{P(T^+)} = \frac{${jointTP}}{0} \;\text{— undefined}`,
        jointTooltip: jt,
        marginalTooltip: mt,
      };
    }

    const sens = formatForFormula(inputSensitivity);
    const base = formatForFormula(inputBaseRate);
    const marginal = formatForFormula(totalTestPositiveRate);
    const post = formatForFormula(posterior);

    // Single formula: general form → [grey/small: numerical substitution] → joint/marginal → result
    const main = String.raw`P(D \mid T^+) = \frac{P(T^+ \mid D) \cdot P(D)}{P(T^+)} = {\small\color{#919191}{\frac{${sens} \times ${base}}{${marginal}} =}} \;\frac{P(D \cap T^+)}{P(T^+)} = \frac{\htmlClass{formula-tooltip-joint}{${jointTP}}}{\htmlClass{formula-tooltip-marginal}{${marginal}}} \approx ${post}`;

    return { mainLatex: main, jointTooltip: jt, marginalTooltip: mt };
  }, [regionA, regionB, scenarioVocabulary]);

  const formulaRef = useRef<HTMLDivElement>(null);

  const applyTooltips = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    const jointEl = container.querySelector('.formula-tooltip-joint');
    const marginalEl = container.querySelector('.formula-tooltip-marginal');
    if (jointEl && jointTooltip) {
      jointEl.setAttribute('title', jointTooltip);
    }
    if (marginalEl && marginalTooltip) {
      marginalEl.setAttribute('title', marginalTooltip);
    }
  }, [jointTooltip, marginalTooltip]);

  // MutationObserver catches KaTeX innerHTML updates and re-applies tooltips
  useEffect(() => {
    const node = formulaRef.current;
    if (!node) return;
    applyTooltips(node);
    const observer = new MutationObserver(() => applyTooltips(node));
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [applyTooltips]);

  return (
    <div className="bayes-formula-panel">
      <div className="bayes-formula-panel__label">Bayes' Rule</div>
      <div className="bayes-formula-panel__formula" ref={formulaRef}>
        <KaTeXInline latex={mainLatex} className="bayes-formula-panel__katex" trust />
      </div>
    </div>
  );
}
