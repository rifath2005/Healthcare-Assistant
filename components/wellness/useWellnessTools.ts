"use client";

import { useState, useCallback } from "react";

export interface WellnessToolsController {
  showBreathing: boolean;
  showGrounding: boolean;
  openBreathing: () => void;
  openGrounding: () => void;
  closeBreathing: () => void;
  closeGrounding: () => void;
  closeAll: () => void;
}

/**
 * Shared hook extracting breathing and grounding tools logic cleanly
 * so both the sidebar and main workspace can control them without code duplication.
 */
export function useWellnessTools(): WellnessToolsController {
  const [showBreathing, setShowBreathing] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);

  const openBreathing = useCallback(() => {
    setShowGrounding(false);
    setShowBreathing(true);
  }, []);

  const openGrounding = useCallback(() => {
    setShowBreathing(false);
    setShowGrounding(true);
  }, []);

  const closeBreathing = useCallback(() => {
    setShowBreathing(false);
  }, []);

  const closeGrounding = useCallback(() => {
    setShowGrounding(false);
  }, []);

  const closeAll = useCallback(() => {
    setShowBreathing(false);
    setShowGrounding(false);
  }, []);

  return {
    showBreathing,
    showGrounding,
    openBreathing,
    openGrounding,
    closeBreathing,
    closeGrounding,
    closeAll,
  };
}
