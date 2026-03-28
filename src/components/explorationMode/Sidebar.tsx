/**
 * Sidebar — Parameter controls (Group 2).
 *
 * Contains the N selector, three parameter sliders (base rate, sensitivity, FPR),
 * and derived results display (total test-positive rate, posterior).
 * The top-to-bottom flow mirrors the parameter dependency chain:
 * N → base rate → sensitivity/FPR → derived results.
 *
 * Controls update live during drag. Display strings come from Region B
 * (the template system pre-formats everything).
 */

import { DisplayMode } from '../../types';
import type { DataPackageRegionA, DisplayModeLabels } from '../../types';
import { KaTeXInline } from './KaTeXInline';

const N_PRESETS = [100, 200, 500, 1000] as const;

interface SidebarProps {
  n: number;
  baseRate: number;
  sensitivity: number;
  fpr: number;
  displayMode: DisplayMode;
  regionA: DataPackageRegionA;
  labels: DisplayModeLabels;
  onNChange: (n: number) => void;
  onBaseRateChange: (value: number) => void;
  onSensitivityChange: (value: number) => void;
  onFprChange: (value: number) => void;
  /** Ref for the cross-fade animation target (parameter labels + derived results). */
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Parse a frequency-mode parameter display string.
 * Format: "Label (Bayesian): rate% — count description"
 * Splits into { label, rate, description }.
 */
function parseFrequencyParam(str: string): { label: string; rate: string; description: string } {
  const colonIdx = str.indexOf(': ');
  if (colonIdx === -1) return { label: str, rate: '', description: '' };

  const label = str.slice(0, colonIdx);
  const rest = str.slice(colonIdx + 2);

  const dashIdx = rest.indexOf(' — ');
  if (dashIdx === -1) return { label, rate: rest, description: '' };

  return {
    label,
    rate: rest.slice(0, dashIdx),
    description: rest.slice(dashIdx + 3),
  };
}

/**
 * Parse a probability-mode parameter display string.
 * Format: "P(D) = 0.01 — Prior (prevalence)"
 * Splits into { notation, description }.
 */
function parseProbabilityParam(str: string): { notation: string; description: string } {
  const dashIdx = str.indexOf(' — ');
  if (dashIdx === -1) return { notation: str, description: '' };
  return {
    notation: str.slice(0, dashIdx),
    description: str.slice(dashIdx + 3),
  };
}

/**
 * Parse a derived result display string.
 * Frequency: "Total test-positive rate (marginal likelihood): 9.8% — 98 out of 1,000 test positive"
 *   → { label, valueStr: "9.8% — 98 out of 1,000 test positive" }
 * Probability: "P(T^+) ≈ 0.098 — Marginal likelihood"
 *   → { notation: "P(T^+) ≈ 0.098", description: "Marginal likelihood" }
 */
function parseDerivedResult(str: string, isProbability: boolean): {
  label?: string;
  notation?: string;
  valueStr: string;
} {
  if (isProbability) {
    const dashIdx = str.indexOf(' — ');
    if (dashIdx !== -1) {
      return {
        notation: str.slice(0, dashIdx),
        valueStr: str.slice(dashIdx + 3),
      };
    }
    return { notation: str, valueStr: '' };
  }

  // Frequency mode: "Label: rate — count"
  const colonIdx = str.indexOf(': ');
  if (colonIdx === -1) return { valueStr: str };

  const label = str.slice(0, colonIdx);
  const valueStr = str.slice(colonIdx + 2);
  return { label, valueStr };
}

export function Sidebar({
  n,
  baseRate,
  sensitivity,
  fpr,
  displayMode,
  labels,
  onNChange,
  onBaseRateChange,
  onSensitivityChange,
  onFprChange,
  contentRef,
}: SidebarProps) {
  const isProbability = displayMode === DisplayMode.Probability;
  const params = labels.parameterDisplayStrings;

  // Base rate slider: step = 1/N, range = [1/N, (N-1)/N]
  const baseRateStep = 1 / n;
  const baseRateMin = baseRateStep;
  const baseRateMax = 1 - baseRateStep;

  return (
    <div className="sidebar">
      {/* Cross-fade animation target — wraps all parameter content.
          The N selector doesn't change between modes, but fading the
          entire sidebar content together looks more cohesive than
          selectively fading individual parameter labels. */}
      <div ref={contentRef} className="sidebar__content">
        {/* Section: Parameters */}
        <div className="sidebar__section-label">Parameters</div>

        {/* N Selector — segmented control */}
        <div className="n-selector">
          <div className="n-selector__label">Population size (N)</div>
          <div className="n-selector__buttons">
            {N_PRESETS.map(preset => (
              <button
                key={preset}
                className={n === preset ? 'active' : ''}
                onClick={() => onNChange(preset)}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Base Rate Slider */}
        <ParameterSlider
          displayString={params.baseRate}
          isProbability={isProbability}
          min={baseRateMin}
          max={baseRateMax}
          step={baseRateStep}
          value={baseRate}
          onChange={onBaseRateChange}
        />

        {/* Sensitivity Slider */}
        <ParameterSlider
          displayString={params.sensitivity}
          isProbability={isProbability}
          min={0}
          max={1}
          step={0.01}
          value={sensitivity}
          onChange={onSensitivityChange}
        />

        {/* FPR Slider */}
        <ParameterSlider
          displayString={params.fpr}
          isProbability={isProbability}
          min={0}
          max={1}
          step={0.01}
          value={fpr}
          onChange={onFprChange}
        />

        {/* Derived Results — visually distinguished from input controls */}
        <div className="derived-results">
          <div className="sidebar__section-label">Results</div>

          <DerivedResult
            displayString={params.totalTestPositiveRate}
            isProbability={isProbability}
            variant="default"
          />

          <DerivedResult
            displayString={params.posterior}
            isProbability={isProbability}
            variant="posterior"
          />
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function ParameterSlider({
  displayString,
  isProbability,
  min,
  max,
  step,
  value,
  onChange,
}: {
  displayString: string;
  isProbability: boolean;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  if (isProbability) {
    const parsed = parseProbabilityParam(displayString);
    return (
      <div className="param-slider">
        <div className="param-slider__header">
          <span className="param-slider__name">
            <KaTeXInline latex={parsed.notation} />
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="param-slider__description">{parsed.description}</div>
      </div>
    );
  }

  const parsed = parseFrequencyParam(displayString);
  return (
    <div className="param-slider">
      <div className="param-slider__header">
        <span className="param-slider__name">{parsed.label}</span>
        <span className="param-slider__value">{parsed.rate}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="param-slider__description">{parsed.description}</div>
    </div>
  );
}

function DerivedResult({
  displayString,
  isProbability,
  variant,
}: {
  displayString: string;
  isProbability: boolean;
  variant: 'default' | 'posterior';
}) {
  const parsed = parseDerivedResult(displayString, isProbability);
  const className = `derived-result${variant === 'posterior' ? ' derived-result--posterior' : ''}`;

  if (isProbability) {
    return (
      <div className={className}>
        <div className="derived-result__value">
          <KaTeXInline latex={parsed.notation ?? ''} />
        </div>
        {parsed.valueStr && (
          <div className="derived-result__label">{parsed.valueStr}</div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {parsed.label && (
        <div className="derived-result__label">{parsed.label}</div>
      )}
      <div className="derived-result__value">{parsed.valueStr}</div>
    </div>
  );
}
