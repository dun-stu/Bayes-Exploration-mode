/**
 * MainArea — Visualisation container (Group 3 controls + vis).
 *
 * Contains the format selector (icon array ↔ frequency tree) at the top,
 * plus a contextual regrouping toggle for the icon array,
 * and the actual visualisation component filling the remaining space.
 *
 * Both visualisation components are container-filling: they adapt to whatever
 * space is available via ResizeObserver-measured dimensions.
 */

import { useRef, useState, useEffect } from 'react';
import type { DataPackageRegionA, DataPackageRegionB } from '../../types';
import { GroupingState, DisplayMode, TreeCombinationState } from '../../types';
import { IconArray } from '../iconArray/IconArray';
import { FrequencyTree } from '../frequencyTree/FrequencyTree';

type VisFormat = 'iconArray' | 'frequencyTree';

interface MainAreaProps {
  activeFormat: VisFormat;
  onFormatChange: (format: VisFormat) => void;
  regionA: DataPackageRegionA;
  regionB: DataPackageRegionB;
  displayMode: DisplayMode;
  groupingState: GroupingState;
  onGroupingChange: (state: GroupingState) => void;
  /** Ref for the cross-fade animation target (visualisation content). */
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export function MainArea({
  activeFormat,
  onFormatChange,
  regionA,
  regionB,
  displayMode,
  groupingState,
  onGroupingChange,
  contentRef,
}: MainAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Measure the vis container via ResizeObserver.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isByCondition = groupingState === GroupingState.GroupedByCondition;

  return (
    <div className="main-area">
      {/* Toolbar with format selector + contextual controls */}
      <div className="main-area__toolbar">
        <div className="format-selector">
          <button
            className={activeFormat === 'iconArray' ? 'active' : ''}
            onClick={() => onFormatChange('iconArray')}
          >
            Icon Array
          </button>
          <button
            className={activeFormat === 'frequencyTree' ? 'active' : ''}
            onClick={() => onFormatChange('frequencyTree')}
          >
            Frequency Tree
          </button>
        </div>

        {/* Regrouping toggle — contextual, only when icon array is active */}
        {activeFormat === 'iconArray' && (
          <div className="grouping-toggle">
            <span className="grouping-toggle__label">Group by:</span>
            <button
              className={isByCondition ? 'active' : ''}
              onClick={() => onGroupingChange(GroupingState.GroupedByCondition)}
            >
              Condition
            </button>
            <button
              className={!isByCondition ? 'active' : ''}
              onClick={() => onGroupingChange(GroupingState.GroupedByTestResult)}
            >
              Test Result
            </button>
          </div>
        )}
      </div>

      {/* Visualisation container — measured via ResizeObserver.
          contentRef is the cross-fade animation target (vis labels transition). */}
      <div className="main-area__vis-container" ref={(el) => {
        // Attach both the ResizeObserver ref and the cross-fade ref to the same element.
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (contentRef) {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      }}>
        {size.width > 0 && size.height > 0 && (
          activeFormat === 'iconArray' ? (
            <IconArray
              regionA={regionA}
              regionB={regionB}
              width={size.width}
              height={size.height}
              groupingState={groupingState}
              displayMode={displayMode}
              animateTransitions
            />
          ) : (
            <FrequencyTree
              regionA={regionA}
              regionB={regionB}
              width={size.width}
              height={size.height}
              combinationState={TreeCombinationState.CombinationShown}
              displayMode={displayMode}
            />
          )
        )}
      </div>
    </div>
  );
}

export type { VisFormat };
