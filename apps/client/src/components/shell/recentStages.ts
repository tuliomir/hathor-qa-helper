/**
 * The last few stages visited, most recent first, for the command palette.
 */

import { useEffect } from 'react';
import { useStage } from '../../hooks/useStage';
import { pushRecentStage, stageEntry } from '../../utils/stageSearch';
import type { StageId } from '../../types/stage';

const STORAGE_KEY = 'qa-helper-recent-stages';

export function readRecentStages(): StageId[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is StageId => stageEntry(id as StageId) !== null) : [];
  } catch {
    return [];
  }
}

/** Record the current stage as the most recent one. */
export function useRecordRecentStage() {
  const { currentStage } = useStage();
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pushRecentStage(readRecentStages(), currentStage)));
    } catch {
      // Storage unavailable: no recents.
    }
  }, [currentStage]);
}
