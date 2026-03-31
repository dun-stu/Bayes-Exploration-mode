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
 *
 * Edge case handling (5.3): contextual notes for degenerate states
 * (zero-from-rounding, small N_D) and transient N-change notification.
 */

import { DisplayMode } from '../../types';
import type { DataPackageRegionA, DisplayModeLabels } from '../../types';
import { KaTeXInline } from './KaTeXInline';

const N_PRESETS = [100, 200, 500, 1000] as const;

/** Threshold for "small N_D" contextual note. */
const SMALL_ND_THRESHOLD = 3;

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
  /** Notification message when N-change snaps the base rate. Set by parent, cleared after timeout. */
  nChangeNotification?: string | null;
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
  regionA,
  labels,
  onNChange,
  onBaseRateChange,
  onSensitivityChange,
  onFprChange,
  contentRef,
  nChangeNotification,
}: SidebarProps) {
  const isProbability = displayMode === DisplayMode.Probability;
  const params = labels.parameterDisplayStrings;

  // Base rate slider: step = 1/N, range = [1/N, (N-1)/N]
  const baseRateStep = 1 / n;
  const baseRateMin = baseRateStep;
  const baseRateMax = 1 - baseRateStep;

  // --- Edge case detection (5.3) ---

  // Zero-from-rounding: non-zero input rate produced zero count
  const sensitivityZeroFromRounding = sensitivity > 0 && regionA.nTP === 0 && regionA.nD > 0;
  const fprZeroFromRounding = fpr > 0 && regionA.nFP === 0 && regionA.nNotD > 0;

  // Small N_D: affected group is very small
  const smallND = regionA.nD <= SMALL_ND_THRESHOLD && regionA.nD > 0;

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
          {/* Transient N-change notification */}
          {nChangeNotification && (
            <div className="contextual-note contextual-note--transient">
              {nChangeNotification}
            </div>
          )}
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
          contextualNote={
            smallND
              ? 'The affected group is very small at this population size \u2014 try a larger N for more detail.'
              : undefined
          }
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
          contextualNote={
            sensitivityZeroFromRounding
              ? 'At this population size, the sensitivity doesn\u2019t produce any detected cases. Try a larger population for more detail.'
              : undefined
          }
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
          contextualNote={
            fprZeroFromRounding
              ? 'At this population size, the false positive rate doesn\u2019t produce any false positives. Try a larger population for more detail.'
              : undefined
          }
        />

        {/* Derived Results — visually distinguished from input controls */}
        <div className="derived-results">
          <div className="sidebar__section-label">Results</div>

          <DerivedResult
            displayString={params.totalTestPositiveRate}
            isProbability={isProbability}
            variant="marginal"
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
  contextualNote,
}: {
  displayString: string;
  isProbability: boolean;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  contextualNote?: string;
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
        {contextualNote && (
          <div className="contextual-note">{contextualNote}</div>
        )}
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
      {contextualNote && (
        <div className="contextual-note">{contextualNote}</div>
      )}
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
  variant: 'marginal' | 'posterior';
}) {
  const parsed = parseDerivedResult(displayString, isProbability);
  const className = `derived-result derived-result--${variant}`;

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
