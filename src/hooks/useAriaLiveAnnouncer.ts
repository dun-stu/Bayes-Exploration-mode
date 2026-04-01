/**
 * useAriaLiveAnnouncer — manages a visually hidden aria-live region
 * that announces state changes to screen readers.
 *
 * Supports two announcement modes:
 *   - Immediate: for discrete state changes (scenario, N, display mode, grouping)
 *   - Debounced: for continuous slider changes (base rate, sensitivity, FPR)
 *
 * The debounced mode waits for the user to stop dragging (~500ms) before
 * announcing the final value, avoiding overwhelming the screen reader with
 * rapid intermediate values during a slider drag.
 */

import { useState, useRef, useCallback } from 'react';

/** Debounce delay for slider-driven announcements (ms). */
const SLIDER_DEBOUNCE_MS = 500;

interface AriaLiveAnnouncer {
  /** The current announcement text. Bind this to the aria-live element's content. */
  announcement: string;
  /** Announce immediately (for discrete state changes). */
  announce: (message: string) => void;
  /** Announce after a debounce delay (for continuous slider changes). */
  announceDebounced: (message: string) => void;
}

export function useAriaLiveAnnouncer(): AriaLiveAnnouncer {
  const [announcement, setAnnouncement] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    // Clear any pending debounced announcement
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // Toggle to empty first to ensure the screen reader re-announces
    // even if the message text is the same structure with different values
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const announceDebounced = useCallback((message: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setAnnouncement('');
      requestAnimationFrame(() => setAnnouncement(message));
      debounceTimerRef.current = null;
    }, SLIDER_DEBOUNCE_MS);
  }, []);

  return { announcement, announce, announceDebounced };
}
