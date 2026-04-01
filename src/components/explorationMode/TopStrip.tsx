/**
 * TopStrip — Problem context controls (Group 1).
 *
 * Contains the scenario selector, display mode toggle, question text,
 * and problem statement. These are "framing" elements that set the context
 * for what the user sees below.
 */

import { DisplayMode } from '../../types';
import type { ScenarioDefinition, DisplayModeLabels, NotationSymbols } from '../../types';
import { SCENARIOS } from '../../data/scenarios';
import { KaTeXInline } from './KaTeXInline';

/** Detect whether a string contains LaTeX markup (backslash commands or ^ / _). */
function containsLatex(str: string): boolean {
  return /\\[a-zA-Z]|[\\^_{}]/.test(str);
}

interface TopStripProps {
  scenarioId: string | null;
  displayMode: DisplayMode;
  labels: DisplayModeLabels;
  notationSymbols: NotationSymbols;
  onScenarioChange: (scenario: ScenarioDefinition) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  /** Ref for the cross-fade animation target (question + problem statement). */
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export function TopStrip({
  scenarioId,
  displayMode,
  labels,
  notationSymbols,
  onScenarioChange,
  onDisplayModeChange,
  contentRef,
}: TopStripProps) {
  return (
    <div className="top-strip">
      <div className="top-strip__controls">
        {/* Scenario Selector */}
        <div className="top-strip__scenario-selector">
          <label htmlFor="scenario-select">Scenario</label>
          <select
            id="scenario-select"
            value={scenarioId ?? ''}
            onChange={(e) => {
              const scenario = SCENARIOS.find(s => s.id === e.target.value);
              if (scenario) onScenarioChange(scenario);
            }}
          >
            <option value="" disabled>Select scenario...</option>
            {SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Display Mode Toggle — broadest-scope control */}
        <div className="top-strip__display-mode">
          <button
            className={displayMode === DisplayMode.Frequency ? 'active' : ''}
            onClick={() => onDisplayModeChange(DisplayMode.Frequency)}
          >
            Frequency
          </button>
          <button
            className={displayMode === DisplayMode.Probability ? 'active' : ''}
            onClick={() => onDisplayModeChange(DisplayMode.Probability)}
          >
            Probability
          </button>
        </div>
      </div>

      {/* Content area — question + problem statement. Cross-fade target:
          only this text transitions; the controls above stay fully visible. */}
      <div ref={contentRef} className="top-strip__content">
        {/* Question — the most important framing element.
            Probability mode has two lines (natural language + KaTeX notation);
            frequency mode has one. A height-reserving spacer in frequency mode
            keeps the top strip height constant across modes, preventing layout
            shift during the format-switching cross-fade. */}
        <div className="top-strip__question">
          {labels.questionText.split('\n').map((line, i) => (
            <div key={i}>
              {containsLatex(line) ? <KaTeXInline latex={line} /> : line}
            </div>
          ))}
          {/* Reserve height for the KaTeX notation line when in frequency mode */}
          {displayMode === DisplayMode.Frequency && (
            <div className="top-strip__question-spacer" aria-hidden="true">
              <KaTeXInline latex={String.raw`P(${notationSymbols.condition} \mid ${notationSymbols.test}^+) = \,?`} />
            </div>
          )}
        </div>

        {/* Problem Statement */}
        <div className="top-strip__problem-statement">
          {labels.problemStatementText}
        </div>
      </div>
    </div>
  );
}
