import { useRef, useState, useEffect } from 'react';
import { AppStateProvider, useAppState } from './state';
import { SCENARIOS } from './data/scenarios';
import { IconArray } from './components/iconArray';
import { IconArrayConstructionState, DisplayMode } from './types';

/**
 * Temporary demo layout for subtasks 2.1–2.2 — icon array verification.
 * Provides scenario selection, N control, construction state selector,
 * and display mode toggle. Will be replaced by exploration mode layout in Layer 3.
 */
function IconArrayDemo() {
  const { parameters, dispatch, dataPackage } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [constructionState, setConstructionState] = useState(IconArrayConstructionState.FullyPartitioned);
  const [displayMode, setDisplayMode] = useState(DisplayMode.Frequency);

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
      {/* Controls */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
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
          State:{' '}
          <select
            value={constructionState}
            onChange={(e) => setConstructionState(e.target.value as IconArrayConstructionState)}
          >
            <option value={IconArrayConstructionState.Unpartitioned}>Unpartitioned</option>
            <option value={IconArrayConstructionState.BaseRatePartitioned}>Base Rate</option>
            <option value={IconArrayConstructionState.ConditionPositiveSubpartitioned}>Cond+ Sub</option>
            <option value={IconArrayConstructionState.FullyPartitioned}>Fully Partitioned</option>
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

        <span style={{ fontSize: 13, color: '#616161' }}>
          N_D={dataPackage.regionA.nD}, TP={dataPackage.regionA.nTP},
          FN={dataPackage.regionA.nFN}, FP={dataPackage.regionA.nFP},
          TN={dataPackage.regionA.nTN}
        </span>
      </div>

      {/* Icon array container — fills remaining space */}
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
          <IconArray
            regionA={dataPackage.regionA}
            regionB={dataPackage.regionB}
            width={containerSize.width}
            height={containerSize.height}
            constructionState={constructionState}
            displayMode={displayMode}
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <IconArrayDemo />
    </AppStateProvider>
  );
}

export default App;
