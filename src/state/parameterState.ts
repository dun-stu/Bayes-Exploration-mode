/**
 * Parameter state management — useReducer with typed actions.
 *
 * Parameter state is the source of truth for the current problem configuration.
 * The data package is derived state, computed via useMemo from these parameters.
 * This reducer lives at the app level (context provider) so Parts 1, 2, and 3 can access it.
 */

import { DisplayMode } from '../types';
import type { ScenarioDefinition } from '../types';

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

export const INITIAL_PARAMETER_STATE: ParameterState = {
  n: 1000,
  baseRate: 0.01,
  sensitivity: 0.90,
  fpr: 0.09,
  scenarioId: null,
  scenarioVocabulary: null,
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

    case 'SET_N':
      return { ...state, n: action.value };

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
