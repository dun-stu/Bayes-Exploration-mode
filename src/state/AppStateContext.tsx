/**
 * App-level state context — distributes parameter state and data package to all children.
 *
 * The data package is derived state computed via useMemo from the current parameters.
 * Region A is computed by the real computation pipeline.
 * Region B (text) and Region C (metadata) are stubs until subtasks 1.2 and 1.3.
 */

import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import { DisplayMode } from '../types';
import type { DataPackage } from '../types';
import {
  type ParameterState,
  type ParameterAction,
  INITIAL_PARAMETER_STATE,
  parameterReducer,
} from './parameterState';
import { computeRegionA } from '../computation/computeRegionA';

// ===== Context Types =====

interface AppStateContextValue {
  parameters: ParameterState;
  dispatch: React.Dispatch<ParameterAction>;
  dataPackage: DataPackage;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ===== Data Package Construction =====
// Region A uses the real computation pipeline. Region B and C are stubs until subtasks 1.2 and 1.3.

function createStubDataPackage(params: ParameterState): DataPackage {
  const stubGroupLabel = {
    domainLabel: '',
    structuralLabel: '',
    countDisplay: '',
  };

  const stubByCondition = {
    population: stubGroupLabel,
    conditionPositive: {
      group: stubGroupLabel,
      truePositive: stubGroupLabel,
      falseNegative: stubGroupLabel,
    },
    conditionNegative: {
      group: stubGroupLabel,
      falsePositive: stubGroupLabel,
      trueNegative: stubGroupLabel,
    },
  };

  const stubByTestResult = {
    population: stubGroupLabel,
    testPositive: {
      group: stubGroupLabel,
      compositionString: '',
      truePositive: stubGroupLabel,
      falsePositive: stubGroupLabel,
    },
    testNegative: {
      group: stubGroupLabel,
      compositionString: '',
      falseNegative: stubGroupLabel,
      trueNegative: stubGroupLabel,
    },
  };

  const stubTreeNodes = {
    root: '',
    conditionPositive: '',
    conditionNegative: '',
    truePositive: '',
    falseNegative: '',
    falsePositive: '',
    trueNegative: '',
  };

  const stubTreeBranches = {
    baseRatePositive: '',
    baseRateNegative: '',
    sensitivity: '',
    falseNegativeRate: '',
    falsePositiveRate: '',
    trueNegativeRate: '',
  };

  const stubDisplayModeLabels = {
    byCondition: stubByCondition,
    byTestResult: stubByTestResult,
    treeNodes: stubTreeNodes,
    treeBranches: stubTreeBranches,
    crossBranchCombination: { sumLabel: '', posteriorLabel: '' },
    questionText: '',
    problemStatementText: '',
    parameterDisplayStrings: {
      baseRate: '',
      sensitivity: '',
      fpr: '',
      totalTestPositiveRate: '',
      posterior: '',
    },
  };

  // Region A — computed by the real pipeline
  const regionA = computeRegionA({
    n: params.n,
    baseRate: params.baseRate,
    sensitivity: params.sensitivity,
    fpr: params.fpr,
  });

  return {
    regionA,
    regionB: {
      frequency: stubDisplayModeLabels,
      probability: stubDisplayModeLabels,
      activeDisplayMode: params.displayMode,
    },
    regionC: {
      scenarioId: params.scenarioId ?? 'custom',
      scenarioName: params.scenarioId ? '' : 'Custom',
      domain: '',
    },
  };
}

// ===== Provider =====

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [parameters, dispatch] = useReducer(parameterReducer, INITIAL_PARAMETER_STATE);

  // Data package derived from parameters.
  // Region A: real computation pipeline. Region B/C: stubs until subtasks 1.2/1.3.
  const dataPackage = useMemo(
    () => createStubDataPackage(parameters),
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
