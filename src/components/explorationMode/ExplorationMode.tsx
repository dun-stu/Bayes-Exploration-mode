/**
 * ExplorationMode — the assembled exploration mode layout.
 *
 * Three-layer persistent visibility model realised as:
 *   Top strip (question layer) — problem framing, scenario, display mode
 *   Sidebar (parameter layer) — N selector, sliders, derived results
 *   Main area (visualisation layer) — format selector + visualisation
 *
 * All parameter state flows through AppStateContext.
 * The data package (Region A numerical, Region B textual) is derived state.
 *
 * View-layer state (activeFormat, groupingState) is local — these are
 * presentation concerns, not problem-definition concerns.
 *
 * Format-switching (frequency ↔ probability) triggers a coordinated cross-fade
 * across all three layers, orchestrated by the useFormatCrossFade hook (4.3).
 */

import { useState, useCallback } from 'react';
import { useAppState } from '../../state';
import { DisplayMode, GroupingState } from '../../types';
import { TopStrip } from './TopStrip';
import { Sidebar } from './Sidebar';
import { MainArea, type VisFormat } from './MainArea';
import { useFormatCrossFade } from './useFormatCrossFade';
import './ExplorationMode.css';

export function ExplorationMode() {
  const { parameters, dispatch, dataPackage } = useAppState();
  const [activeFormat, setActiveFormat] = useState<VisFormat>('iconArray');
  const [groupingState, setGroupingState] = useState<GroupingState>(
    GroupingState.GroupedByCondition,
  );

  // Format-switching cross-fade (4.3): intercepts display mode changes
  // and coordinates a fade-out → state change → fade-in across all three layers.
  const dispatchModeChange = useCallback(
    (mode: DisplayMode) => dispatch({ type: 'SET_DISPLAY_MODE', mode }),
    [dispatch],
  );

  const {
    topStripContentRef,
    sidebarContentRef,
    visContentRef,
    handleDisplayModeChange,
  } = useFormatCrossFade({
    currentMode: parameters.displayMode,
    dispatchModeChange,
  });

  // Select the active display mode's label set from Region B
  const activeLabels = parameters.displayMode === DisplayMode.Frequency
    ? dataPackage.regionB.frequency
    : dataPackage.regionB.probability;

  return (
    <div className="exploration-mode">
      {/* Top strip — problem context (Group 1) */}
      <TopStrip
        scenarioId={parameters.scenarioId}
        displayMode={parameters.displayMode}
        labels={activeLabels}
        onScenarioChange={(scenario) =>
          dispatch({ type: 'SET_SCENARIO', scenario })
        }
        onDisplayModeChange={handleDisplayModeChange}
        contentRef={topStripContentRef}
      />

      {/* Content area — sidebar + main */}
      <div className="content-area">
        {/* Sidebar — parameter controls (Group 2) */}
        <Sidebar
          n={parameters.n}
          baseRate={parameters.baseRate}
          sensitivity={parameters.sensitivity}
          fpr={parameters.fpr}
          displayMode={parameters.displayMode}
          regionA={dataPackage.regionA}
          labels={activeLabels}
          onNChange={(value) =>
            dispatch({ type: 'SET_N', value })
          }
          onBaseRateChange={(value) =>
            dispatch({ type: 'SET_PARAMETER', parameter: 'baseRate', value })
          }
          onSensitivityChange={(value) =>
            dispatch({ type: 'SET_PARAMETER', parameter: 'sensitivity', value })
          }
          onFprChange={(value) =>
            dispatch({ type: 'SET_PARAMETER', parameter: 'fpr', value })
          }
          contentRef={sidebarContentRef}
        />

        {/* Main area — visualisation (Group 3) */}
        <MainArea
          activeFormat={activeFormat}
          onFormatChange={setActiveFormat}
          regionA={dataPackage.regionA}
          regionB={dataPackage.regionB}
          displayMode={parameters.displayMode}
          groupingState={groupingState}
          onGroupingChange={setGroupingState}
          contentRef={visContentRef}
        />
      </div>
    </div>
  );
}
