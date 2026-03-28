/**
 * useFormatCrossFade — coordinates a cross-fade animation when the display mode
 * (frequency ↔ probability) switches.
 *
 * The cross-fade operates on three content areas (the three persistent visibility
 * layers): top strip text, sidebar parameters, and visualisation labels. Spatial
 * structure remains completely static — only text content transitions.
 *
 * Animation strategy:
 *   1. User clicks the display mode toggle.
 *   2. Phase 1 (fade out): all three content areas fade to opacity 0.
 *   3. At the midpoint, the actual displayMode state change is dispatched,
 *      so React renders the new content while opacity is 0 (invisible).
 *   4. Phase 2 (fade in): all three content areas fade from opacity 0 to 1.
 *
 * This gives the user a brief perceptual moment of transition — enough to register
 * the change — followed by the new state to examine. Duration is 300ms total
 * (150ms out + 150ms in), within the spec's 200–400ms range.
 *
 * Uses GSAP for consistency with the project's animation library (regrouping
 * animation uses GSAP). A simple opacity tween is lightweight.
 */

import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { DisplayMode } from '../../types';

/** Duration of each half of the cross-fade (fade-out, fade-in) in seconds. */
const CROSSFADE_HALF_DURATION = 0.15;

/** Easing for the cross-fade — gentle sine for smooth opacity change. */
const CROSSFADE_EASE = 'sine.inOut';

interface UseFormatCrossFadeOptions {
  /** The current display mode (to skip no-op transitions). */
  currentMode: DisplayMode;
  /** The actual dispatch function to change displayMode in the reducer. */
  dispatchModeChange: (mode: DisplayMode) => void;
}

interface UseFormatCrossFadeReturn {
  /** Refs to attach to the three content areas that should cross-fade. */
  topStripContentRef: React.RefObject<HTMLDivElement | null>;
  sidebarContentRef: React.RefObject<HTMLDivElement | null>;
  visContentRef: React.RefObject<HTMLDivElement | null>;

  /**
   * Call this instead of dispatching SET_DISPLAY_MODE directly.
   * It triggers the cross-fade animation and dispatches the mode change
   * at the midpoint.
   */
  handleDisplayModeChange: (newMode: DisplayMode) => void;

  /** Whether a cross-fade is currently in progress. */
  isTransitioning: React.RefObject<boolean>;
}

export function useFormatCrossFade({
  currentMode,
  dispatchModeChange,
}: UseFormatCrossFadeOptions): UseFormatCrossFadeReturn {
  const topStripContentRef = useRef<HTMLDivElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const visContentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isTransitioning = useRef(false);

  const handleDisplayModeChange = useCallback((newMode: DisplayMode) => {
    // Skip if clicking the already-active mode
    if (newMode === currentMode && !timelineRef.current) return;

    // Kill any in-progress cross-fade
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    // If same mode (clicked during animation), just restore opacity and dispatch
    if (newMode === currentMode) {
      const targets = [
        topStripContentRef.current,
        sidebarContentRef.current,
        visContentRef.current,
      ].filter(Boolean);
      gsap.set(targets, { opacity: 1 });
      isTransitioning.current = false;
      dispatchModeChange(newMode);
      return;
    }

    // Collect the target elements (only those that exist in the DOM)
    const targets = [
      topStripContentRef.current,
      sidebarContentRef.current,
      visContentRef.current,
    ].filter(Boolean);

    if (targets.length === 0) {
      // No refs attached — fall back to instant switch
      dispatchModeChange(newMode);
      return;
    }

    isTransitioning.current = true;

    const tl = gsap.timeline({
      onComplete() {
        isTransitioning.current = false;
        timelineRef.current = null;
      },
    });

    // Phase 1: fade out current content
    tl.to(targets, {
      opacity: 0,
      duration: CROSSFADE_HALF_DURATION,
      ease: CROSSFADE_EASE,
      onComplete() {
        // At the midpoint (content invisible), dispatch the state change.
        // React will re-render with new labels while opacity is 0.
        dispatchModeChange(newMode);
      },
    });

    // Phase 2: fade in new content
    tl.to(targets, {
      opacity: 1,
      duration: CROSSFADE_HALF_DURATION,
      ease: CROSSFADE_EASE,
    });

    timelineRef.current = tl;
  }, [currentMode, dispatchModeChange]);

  return {
    topStripContentRef,
    sidebarContentRef,
    visContentRef,
    handleDisplayModeChange,
    isTransitioning,
  };
}
