/**
 * App-level state context — distributes parameter state and data package to all children.
 *
 * The data package is derived state computed via useMemo from the current parameters.
 * Region A is computed by the real computation pipeline.
 * Region B is computed by the template system.
 * Region C (metadata) is a stub until subtask 1.3.
 */

import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import type { DataPackage } from '../types';
import {
  type ParameterState,
  type ParameterAction,
  INITIAL_PARAMETER_STATE,
  parameterReducer,
} from './parameterState';
import { computeRegionA } from '../computation/computeRegionA';
import { computeRegionB } from '../computation/computeRegionB';

// ===== Context Types =====

interface AppStateContextValue {
  parameters: ParameterState;
  dispatch: React.Dispatch<ParameterAction>;
  dataPackage: DataPackage;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ===== Data Package Construction =====
// Region A: real computation pipeline. Region B: real template system.
// Region C (metadata): stub until subtask 1.3 populates scenario data.

function createDataPackage(params: ParameterState): DataPackage {
  // Region A — computed by the computation pipeline
  const regionA = computeRegionA({
    n: params.n,
    baseRate: params.baseRate,
    sensitivity: params.sensitivity,
    fpr: params.fpr,
  });

  // Region B — computed by the template system
  const regionB = computeRegionB(regionA, params.scenarioVocabulary, params.displayMode);

  // Region C — metadata (stub until scenario data is populated in 1.3)
  const regionC = {
    scenarioId: params.scenarioId ?? 'custom',
    scenarioName: params.scenarioVocabulary?.name ?? 'Custom',
    domain: params.scenarioVocabulary?.domain ?? '',
    description: params.scenarioVocabulary?.description,
  };

  return { regionA, regionB, regionC };
}

// ===== Provider =====

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [parameters, dispatch] = useReducer(parameterReducer, INITIAL_PARAMETER_STATE);

  // Data package derived from parameters.
  // Region A: computation pipeline. Region B: template system. Region C: metadata.
  const dataPackage = useMemo(
    () => createDataPackage(parameters),
    [parameters],
  );

  const value = useMemo(
    () => ({ parameters, dispatch, dataPackage }),
    [parameters, dataPackage],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// ===== Hook =====

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
