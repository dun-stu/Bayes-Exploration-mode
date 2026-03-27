import { useRef, useState, useEffect } from 'react';
import { AppStateProvider, useAppState } from './state';
import { SCENARIOS } from './data/scenarios';
import { IconArray } from './components/iconArray';
import { FrequencyTree } from './components/frequencyTree';
import {
  IconArrayConstructionState,
  TreeConstructionState,
  TreeCombinationState,
  GroupingState,
  DisplayMode,
} from './types';

/**
 * Temporary demo layout for subtasks 2.1–2.4 — visualisation verification.
 * Provides scenario selection, N control, and component-specific controls.
 * Will be replaced by exploration mode layout in Layer 3.
 */

type VisComponent = 'iconArray' | 'frequencyTree';

function VisualisationDemo() {
  const { parameters, dispatch, dataPackage } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeComponent, setActiveComponent] = useState<VisComponent>('frequencyTree');
  const [displayMode, setDisplayMode] = useState(DisplayMode.Frequency);

  // Icon array state
  const [iaConstructionState, setIaConstructionState] = useState(IconArrayConstructionState.FullyPartitioned);
  const [groupingState, setGroupingState] = useState(GroupingState.GroupedByCondition);

  // Frequency tree state
  const [treeConstructionState, setTreeConstructionState] = useState(TreeConstructionState.FullyBranched);
  const [combinationState, setCombinationState] = useState(TreeCombinationState.CombinationShown);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Shared controls */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Scenario:{' '}
          <select
            value={parameters.scenarioId ?? ''}
            onChange={(e) => {
              const scenario = SCENARIOS.find(s => s.id === e.target.value);
              if (scenario) {
                dispatch({ type: 'SET_SCENARIO', scenario });
              }
            }}
          >
            <option value="" disabled>Select scenario</option>
            {SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.name} (N={s.n})</option>
            ))}
          </select>
        </label>

        <label>
          N:{' '}
          <select
            value={parameters.n}
            onChange={(e) => dispatch({ type: 'SET_N', value: Number(e.target.value) })}
          >
            {[100, 200, 500, 1000].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label>
          Mode:{' '}
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
          >
            <option value={DisplayMode.Frequency}>Frequency</option>
            <option value={DisplayMode.Probability}>Probability</option>
          </select>
        </label>

        <label>
          View:{' '}
          <select
            value={activeComponent}
            onChange={(e) => setActiveComponent(e.target.value as VisComponent)}
          >
            <option value="iconArray">Icon Array</option>
            <option value="frequencyTree">Frequency Tree</option>
          </select>
        </label>

        <span style={{ fontSize: 13, color: '#616161' }}>
          N_D={dataPackage.regionA.nD}, TP={dataPackage.regionA.nTP},
          FN={dataPackage.regionA.nFN}, FP={dataPackage.regionA.nFP},
          TN={dataPackage.regionA.nTN}
        </span>
      </div>

      {/* Component-specific controls */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {activeComponent === 'iconArray' && (
          <>
            <label>
              State:{' '}
              <select
                value={iaConstructionState}
                onChange={(e) => setIaConstructionState(e.target.value as IconArrayConstructionState)}
              >
                <option value={IconArrayConstructionState.Unpartitioned}>Unpartitioned</option>
                <option value={IconArrayConstructionState.BaseRatePartitioned}>Base Rate</option>
                <option value={IconArrayConstructionState.ConditionPositiveSubpartitioned}>Cond+ Sub</option>
                <option value={IconArrayConstructionState.FullyPartitioned}>Fully Partitioned</option>
              </select>
            </label>
            <label>
              Grouping:{' '}
              <select
                value={groupingState}
                onChange={(e) => setGroupingState(e.target.value as GroupingState)}
              >
                <option value={GroupingState.GroupedByCondition}>By Condition</option>
                <option value={GroupingState.GroupedByTestResult}>By Test Result</option>
              </select>
            </label>
          </>
        )}
        {activeComponent === 'frequencyTree' && (
          <>
            <label>
              Construction:{' '}
              <select
                value={treeConstructionState}
                onChange={(e) => setTreeConstructionState(e.target.value as TreeConstructionState)}
              >
                <option value={TreeConstructionState.RootOnly}>Root Only</option>
                <option value={TreeConstructionState.FirstBranch}>First Branch</option>
                <option value={TreeConstructionState.ConditionPositiveSecondBranch}>Cond+ 2nd Branch</option>
                <option value={TreeConstructionState.FullyBranched}>Fully Branched</option>
              </select>
            </label>
            <label>
              Combination:{' '}
              <select
                value={combinationState}
                onChange={(e) => setCombinationState(e.target.value as TreeCombinationState)}
              >
                <option value={TreeCombinationState.CombinationHidden}>Hidden</option>
                <option value={TreeCombinationState.CombinationShown}>Shown</option>
              </select>
            </label>
          </>
        )}
      </div>

      {/* Visualisation container — fills remaining space */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 200,
          border: '1px solid #e0e0e0',
          borderRadius: 4,
          background: '#FAFAFA',
        }}
      >
        {containerSize.width > 0 && containerSize.height > 0 && (
          activeComponent === 'iconArray' ? (
            <IconArray
              regionA={dataPackage.regionA}
              regionB={dataPackage.regionB}
              width={containerSize.width}
              height={containerSize.height}
              constructionState={iaConstructionState}
              groupingState={groupingState}
              displayMode={displayMode}
            />
          ) : (
            <FrequencyTree
              regionA={dataPackage.regionA}
              regionB={dataPackage.regionB}
              width={containerSize.width}
              height={containerSize.height}
              constructionState={treeConstructionState}
              combinationState={combinationState}
              displayMode={displayMode}
            />
          )
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <VisualisationDemo />
    </AppStateProvider>
  );
}

export default App;
