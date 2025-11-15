/**
 * Hook to access the current stage (now using Redux)
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentStage as setCurrentStageAction } from '../store/slices/stageSlice';
import type { StageId } from '../types/stage';

export interface StageContextValue {
  currentStage: StageId;
  setCurrentStage: (stageId: StageId) => void;
}

export function useStage(): StageContextValue {
  const dispatch = useAppDispatch();
  const currentStage = useAppSelector((state) => state.stage.currentStage);

  const setCurrentStage = useCallback(
    (stageId: StageId) => {
      dispatch(setCurrentStageAction(stageId));
    },
    [dispatch]
  );

  return {
    currentStage,
    setCurrentStage,
  };
}
