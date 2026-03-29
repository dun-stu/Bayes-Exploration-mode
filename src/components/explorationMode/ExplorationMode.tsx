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

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppState } from '../../state';
import { DisplayMode, GroupingState } from '../../types';
import { snapBaseRate } from '../../state/parameterState';
import { TopStrip } from './TopStrip';
import { Sidebar } from './Sidebar';
import { MainArea, type VisFormat } from './MainArea';
import { useFormatCrossFade } from './useFormatCrossFade';
import './ExplorationMode.css';

/** Duration (ms) for transient N-change notification. */
const N_CHANGE_NOTIFICATION_DURATION = 4000;

export function ExplorationMode() {
  const { parameters, dispatch, dataPackage } = useAppState();
  const [activeFormat, setActiveFormat] = useState<VisFormat>('iconArray');
  const [groupingState, setGroupingState] = useState<GroupingState>(
    GroupingState.GroupedByCondition,
  );

  // --- N-change notification (5.3) ---
  // Detect when switching N presets forces the base rate to snap to a different value.
  const [nChangeNotification, setNChangeNotification] = useState<string | null>(null);
  const nChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNChange = useCallback((newN: number) => {
    // Compute what the snapped base rate will be before dispatching
    const currentBaseRate = parameters.baseRate;
    const snappedBaseRate = snapBaseRate(currentBaseRate, newN);

    if (Math.abs(snappedBaseRate - currentBaseRate) > 1e-9) {
      // Base rate will change — show notification
      const oldPct = (currentBaseRate * 100).toFixed(1).replace(/\.0$/, '');
      const newPct = (snappedBaseRate * 100).toFixed(1).replace(/\.0$/, '');
      setNChangeNotification(
        `Base rate adjusted from ${oldPct}% to ${newPct}% at this population size.`,
      );

      // Clear any existing timer
      if (nChangeTimerRef.current) clearTimeout(nChangeTimerRef.current);
      nChangeTimerRef.current = setTimeout(() => {
        setNChangeNotification(null);
        nChangeTimerRef.current = null;
      }, N_CHANGE_NOTIFICATION_DURATION);
    } else {
      // No snap needed — clear any existing notification
      setNChangeNotification(null);
      if (nChangeTimerRef.current) {
        clearTimeout(nChangeTimerRef.current);
        nChangeTimerRef.current = null;
      }
    }

    dispatch({ type: 'SET_N', value: newN });
  }, [parameters.baseRate, dispatch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (nChangeTimerRef.current) clearTimeout(nChangeTimerRef.current);
    };
  }, []);

  // Clear N-change notification on any other parameter change
  const handleBaseRateChange = useCallback((value: number) => {
    setNChangeNotification(null);
    dispatch({ type: 'SET_PARAMETER', parameter: 'baseRate', value });
  }, [dispatch]);

  const handleSensitivityChange = useCallback((value: number) => {
    dispatch({ type: 'SET_PARAMETER', parameter: 'sensitivity', value });
  }, [dispatch]);

  const handleFprChange = useCallback((value: number) => {
    dispatch({ type: 'SET_PARAMETER', parameter: 'fpr', value });
  }, [dispatch]);

  const handleScenarioChange = useCallback((scenario: import('../../types').ScenarioDefinition) => {
    setNChangeNotification(null);
    dispatch({ type: 'SET_SCENARIO', scenario });
  }, [dispatch]);

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
        onScenarioChange={handleScenarioChange}
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
          onNChange={handleNChange}
          onBaseRateChange={handleBaseRateChange}
          onSensitivityChange={handleSensitivityChange}
          onFprChange={handleFprChange}
          contentRef={sidebarContentRef}
          nChangeNotification={nChangeNotification}
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
