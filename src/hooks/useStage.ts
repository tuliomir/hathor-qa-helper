/**
 * Hook to access the current stage (reads from URL params)
 *
 * The URL is the single source of truth for which stage is active.
 * setCurrentStage navigates to the stage's URL rather than dispatching to Redux.
 */

import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStageIdFromSlugs, getStageUrl } from '../config/stageRoutes';
import type { StageId } from '../types/stage';

export interface StageContextValue {
  currentStage: StageId;
  setCurrentStage: (stageId: StageId) => void;
}

export function useStage(): StageContextValue {
  const { groupSlug, stageSlug } = useParams<{ groupSlug: string; stageSlug: string }>();
  const navigate = useNavigate();

  const currentStage: StageId =
    (groupSlug && stageSlug && getStageIdFromSlugs(groupSlug, stageSlug)) ||
    'wallet-initialization';

  const setCurrentStage = useCallback(
    (stageId: StageId) => {
      navigate(getStageUrl(stageId));
    },
    [navigate],
  );

  return {
    currentStage,
    setCurrentStage,
  };
}
