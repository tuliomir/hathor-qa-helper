/**
 * Hook to preserve scroll position when navigating between stages
 *
 * This hook tracks the scroll position of the stage content area and:
 * 1. Saves scroll position when navigating away from a stage
 * 2. Restores scroll position when returning to a previously visited stage
 * 3. Starts at position 0 for first visit to any stage
 *
 * Usage:
 * ```tsx
 * const scrollRef = useScrollPreservation();
 * return <div ref={scrollRef} className="overflow-y-auto">...</div>;
 * ```
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { saveScrollPosition } from '../store/slices/stageSlice';
import type { StageId } from '../types/stage';

export function useScrollPreservation() {
  const dispatch = useAppDispatch();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentStage = useAppSelector((state) => state.stage.currentStage);
  const previousStageRef = useRef<StageId>(currentStage);

  // Get saved scroll position for current stage (default to 0 if not visited before)
  const savedPosition = useAppSelector(
    (state) => state.stage.scrollPositions[currentStage] ?? 0
  );

  // Save previous stage's scroll position when stage changes
  useEffect(() => {
    const previousStage = previousStageRef.current;

    // If stage changed, save the scroll position of the previous stage
    if (previousStage !== currentStage && scrollContainerRef.current) {
      dispatch(saveScrollPosition({
        stageId: previousStage,
        position: scrollContainerRef.current.scrollTop,
      }));
    }

    // Update the ref to track current stage for next change
    previousStageRef.current = currentStage;
  }, [currentStage, dispatch]);

  // Restore scroll position when stage changes
  // Use useLayoutEffect to prevent visual jump (runs before browser paint)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = savedPosition;
    }
  }, [savedPosition, currentStage]);

  return scrollContainerRef;
}
