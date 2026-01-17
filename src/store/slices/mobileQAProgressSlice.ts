/**
 * Redux Toolkit Slice for Mobile QA Progress Tracking
 * Manages step completion status with localStorage persistence
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  MobileQAProgress,
  MobileQAStepStatus,
  MobileQALocation,
} from '../../types/mobileQA';

const STORAGE_KEY = 'mobile-qa-progress';

/**
 * Load progress from localStorage
 */
function loadProgressFromStorage(): MobileQAProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load mobile QA progress from localStorage:', error);
  }
  return null;
}

/**
 * Save progress to localStorage
 */
function saveProgressToStorage(progress: MobileQAProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save mobile QA progress to localStorage:', error);
  }
}

// Default initial state - will be updated when config is loaded
const defaultInitialState: MobileQAProgress = {
  sections: {},
  currentLocation: {
    sectionId: 'app-update',
    stepId: 'step-1',
  },
};

// Try to load persisted state from localStorage
const persistedState = loadProgressFromStorage();
const initialState: MobileQAProgress = persistedState || defaultInitialState;

const mobileQAProgressSlice = createSlice({
  name: 'mobileQAProgress',
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
        status: MobileQAStepStatus;
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
    setCurrentLocation: (state, action: PayloadAction<MobileQALocation>) => {
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
        sectionId: 'app-update',
        stepId: 'step-1',
      };

      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear mobile QA progress from localStorage:', error);
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
} = mobileQAProgressSlice.actions;

export default mobileQAProgressSlice.reducer;

// Selectors
export const selectCurrentLocation = (state: { mobileQAProgress: MobileQAProgress }) =>
  state.mobileQAProgress.currentLocation;

export const selectStepStatus = (
  state: { mobileQAProgress: MobileQAProgress },
  sectionId: string,
  stepId: string
): MobileQAStepStatus => {
  return state.mobileQAProgress.sections[sectionId]?.steps[stepId]?.status || 'pending';
};

export const selectSectionProgress = (
  state: { mobileQAProgress: MobileQAProgress },
  sectionId: string
) => {
  return state.mobileQAProgress.sections[sectionId] || { steps: {} };
};

export const selectCompletedStepsCount = (
  state: { mobileQAProgress: MobileQAProgress },
  sectionId: string
): number => {
  const section = state.mobileQAProgress.sections[sectionId];
  if (!section) return 0;

  return Object.values(section.steps).filter((step) => step.status === 'completed').length;
};

export const selectTotalCompletedSteps = (
  state: { mobileQAProgress: MobileQAProgress }
): number => {
  let total = 0;
  for (const section of Object.values(state.mobileQAProgress.sections)) {
    total += Object.values(section.steps).filter((step) => step.status === 'completed').length;
  }
  return total;
};
