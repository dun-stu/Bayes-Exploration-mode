/**
 * Parameter state management — useReducer with typed actions.
 *
 * Parameter state is the source of truth for the current problem configuration.
 * The data package is derived state, computed via useMemo from these parameters.
 * This reducer lives at the app level (context provider) so Parts 1, 2, and 3 can access it.
 */

import { DisplayMode } from '../types';
import type { ScenarioDefinition } from '../types';
import { MAMMOGRAPHY } from '../data/scenarios';

// ===== Helpers =====

/**
 * Snap a base rate to the nearest valid step for the given N.
 * Valid steps are multiples of 1/N, clamped to [1/N, (N-1)/N].
 */
function snapBaseRate(baseRate: number, n: number): number {
  const step = 1 / n;
  const snapped = Math.round(baseRate * n) / n;
  // Clamp to valid range: at least 1 person, at most N-1
  return Math.max(step, Math.min(1 - step, snapped));
}

// ===== State Shape =====

export interface ParameterState {
  n: number;
  baseRate: number;
  sensitivity: number;
  fpr: number;
  scenarioId: string | null;
  /** Current scenario vocabulary, or null if using generic fallback. */
  scenarioVocabulary: ScenarioDefinition | null;
  displayMode: DisplayMode;
}

/** Initial state: mammography scenario in frequency mode. */
export const INITIAL_PARAMETER_STATE: ParameterState = {
  n: MAMMOGRAPHY.n,
  baseRate: MAMMOGRAPHY.baseRate,
  sensitivity: MAMMOGRAPHY.sensitivity,
  fpr: MAMMOGRAPHY.specificity !== undefined
    ? 1 - MAMMOGRAPHY.specificity
    : MAMMOGRAPHY.fpr,
  scenarioId: MAMMOGRAPHY.id,
  scenarioVocabulary: MAMMOGRAPHY,
  displayMode: DisplayMode.Frequency,
};

// ===== Actions =====

export type ParameterAction =
  | { type: 'SET_PARAMETER'; parameter: 'baseRate' | 'sensitivity' | 'fpr'; value: number }
  | { type: 'SET_N'; value: number }
  | { type: 'SET_SCENARIO'; scenario: ScenarioDefinition }
  | { type: 'SET_DISPLAY_MODE'; mode: DisplayMode };

// ===== Reducer =====

export function parameterReducer(
  state: ParameterState,
  action: ParameterAction,
): ParameterState {
  switch (action.type) {
    case 'SET_PARAMETER':
      return { ...state, [action.parameter]: action.value };

    case 'SET_N': {
      const newN = action.value;
      // Snap base rate to nearest valid step for new N
      const snappedBaseRate = snapBaseRate(state.baseRate, newN);
      return { ...state, n: newN, baseRate: snappedBaseRate };
    }

    case 'SET_SCENARIO': {
      const scenario = action.scenario;
      return {
        ...state,
        n: scenario.n,
        baseRate: scenario.baseRate,
        sensitivity: scenario.sensitivity,
        fpr: scenario.specificity !== undefined
          ? 1 - scenario.specificity
          : scenario.fpr,
        scenarioId: scenario.id,
        scenarioVocabulary: scenario,
        displayMode: state.displayMode,
      };
    }

    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.mode };

    default:
      return state;
  }
}

export { snapBaseRate };
