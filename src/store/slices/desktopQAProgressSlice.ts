/**
 * Redux Toolkit Slice for Desktop QA Progress Tracking
 * Manages step completion status with localStorage persistence
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DesktopQALocation, DesktopQAProgress, DesktopQAStepStatus, } from '../../types/desktopQA';

const STORAGE_KEY = 'desktop-qa-progress';

/**
 * Load progress from localStorage
 */
function loadProgressFromStorage(): DesktopQAProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load desktop QA progress from localStorage:', error);
  }
  return null;
}

/**
 * Save progress to localStorage
 */
function saveProgressToStorage(progress: DesktopQAProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save desktop QA progress to localStorage:', error);
  }
}

// Default initial state - starts at wallet-update section
const defaultInitialState: DesktopQAProgress = {
  sections: {},
  currentLocation: {
    sectionId: 'wallet-update',
    stepId: 'step-1',
  },
};

// Try to load persisted state from localStorage
const persistedState = loadProgressFromStorage();
const initialState: DesktopQAProgress = persistedState || defaultInitialState;

const desktopQAProgressSlice = createSlice({
  name: 'desktopQAProgress',
  initialState,
  reducers: {
    /**
     * Set the status of a specific step
     */
    setStepStatus: (
      state,
      action: PayloadAction<{
        sectionId: string;
        stepId: string;
        status: DesktopQAStepStatus;
      }>
    ) => {
      const { sectionId, stepId, status } = action.payload;

      // Ensure section exists
      if (!state.sections[sectionId]) {
        state.sections[sectionId] = { steps: {} };
      }

      // Update step status
      state.sections[sectionId].steps[stepId] = {
        status,
        completedAt: status === 'completed' ? Date.now() : undefined,
      };

      // Persist to localStorage
      saveProgressToStorage(state);
    },

    /**
     * Set the current location (section + step)
     */
    setCurrentLocation: (state, action: PayloadAction<DesktopQALocation>) => {
      state.currentLocation = action.payload;

      // Persist to localStorage
      saveProgressToStorage(state);
    },

    /**
     * Reset all progress
     */
    resetProgress: (state) => {
      state.sections = {};
      state.currentLocation = {
        sectionId: 'wallet-update',
        stepId: 'step-1',
      };

      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear desktop QA progress from localStorage:', error);
      }
    },

    /**
     * Initialize progress for a section (creates empty step entries if not exists)
     */
    initializeSectionProgress: (
      state,
      action: PayloadAction<{ sectionId: string; stepIds: string[] }>
    ) => {
      const { sectionId, stepIds } = action.payload;

      if (!state.sections[sectionId]) {
        state.sections[sectionId] = { steps: {} };
      }

      // Initialize steps that don't exist yet
      for (const stepId of stepIds) {
        if (!state.sections[sectionId].steps[stepId]) {
          state.sections[sectionId].steps[stepId] = { status: 'pending' };
        }
      }

      // Persist to localStorage
      saveProgressToStorage(state);
    },
  },
});

export const {
  setStepStatus,
  setCurrentLocation,
  resetProgress,
  initializeSectionProgress,
} = desktopQAProgressSlice.actions;

export default desktopQAProgressSlice.reducer;

// Selectors
export const selectCurrentLocation = (state: { desktopQAProgress: DesktopQAProgress }) =>
  state.desktopQAProgress.currentLocation;

export const selectStepStatus = (
  state: { desktopQAProgress: DesktopQAProgress },
  sectionId: string,
  stepId: string
): DesktopQAStepStatus => {
  return state.desktopQAProgress.sections[sectionId]?.steps[stepId]?.status || 'pending';
};

export const selectSectionProgress = (
  state: { desktopQAProgress: DesktopQAProgress },
  sectionId: string
) => {
  return state.desktopQAProgress.sections[sectionId] || { steps: {} };
};

export const selectCompletedStepsCount = (
  state: { desktopQAProgress: DesktopQAProgress },
  sectionId: string
): number => {
  const section = state.desktopQAProgress.sections[sectionId];
  if (!section) return 0;

  return Object.values(section.steps).filter((step) => step.status === 'completed').length;
};

export const selectTotalCompletedSteps = (
  state: { desktopQAProgress: DesktopQAProgress }
): number => {
  let total = 0;
  for (const section of Object.values(state.desktopQAProgress.sections)) {
    total += Object.values(section.steps).filter((step) => step.status === 'completed').length;
  }
  return total;
};
