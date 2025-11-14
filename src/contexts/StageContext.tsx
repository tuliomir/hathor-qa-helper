/**
 * Stage Context
 * Manages the currently active QA stage
 */

import { createContext, useState, useCallback } from 'react';
import type { StageId } from '../types/stage';

export interface StageContextValue {
  currentStage: StageId;
  setCurrentStage: (stageId: StageId) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const StageContext = createContext<StageContextValue | null>(null);

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [currentStage, setCurrentStageState] = useState<StageId>('wallet-initialization');

  const setCurrentStage = useCallback((stageId: StageId) => {
    setCurrentStageState(stageId);
  }, []);

  const value: StageContextValue = {
    currentStage,
    setCurrentStage,
  };

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}
