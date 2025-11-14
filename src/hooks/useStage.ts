/**
 * Hook to access the current stage
 */

import { useContext } from 'react';
import { StageContext, type StageContextValue } from '../contexts/StageContext';

export function useStage(): StageContextValue {
  const context = useContext(StageContext);
  if (!context) {
    throw new Error('useStage must be used within a StageProvider');
  }
  return context;
}
