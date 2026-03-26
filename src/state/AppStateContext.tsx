/**
 * App-level state context — distributes parameter state and data package to all children.
 *
 * The data package is derived state computed via useMemo from the current parameters.
 * Currently returns a stub; the real computation pipeline is subtask 1.1.
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

// ===== Context Types =====

interface AppStateContextValue {
  parameters: ParameterState;
  dispatch: React.Dispatch<ParameterAction>;
  dataPackage: DataPackage;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ===== Stub Data Package =====
// Placeholder until the computation pipeline (subtask 1.1) and template system (subtask 1.2) are built.

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

  return {
    regionA: {
      n: params.n,
      nD: 0,
      nNotD: 0,
      nTP: 0,
      nFN: 0,
      nFP: 0,
      nTN: 0,
      nTestPos: 0,
      nTestNeg: 0,
      inputBaseRate: params.baseRate,
      inputSensitivity: params.sensitivity,
      inputFPR: params.fpr,
      effectiveSensitivity: 0,
      effectiveFPR: 0,
      effectiveSpecificity: 0,
      totalTestPositiveRate: 0,
      jointProbDAndTestPos: 0,
      jointProbDAndTestNeg: 0,
      jointProbNotDAndTestPos: 0,
      jointProbNotDAndTestNeg: 0,
      posterior: null,
    },
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
  // Will be replaced with real computation pipeline in subtask 1.1.
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
