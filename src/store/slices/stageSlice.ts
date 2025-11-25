/**
 * Redux Toolkit Slice for Stage Management
 * Manages the currently active QA stage
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StageId } from '../../types/stage';

interface StageState {
  currentStage: StageId;
  scrollPositions: Record<StageId, number>;
}

const initialState: StageState = {
  currentStage: 'wallet-initialization',
  scrollPositions: {},
};

const stageSlice = createSlice({
  name: 'stage',
  initialState,
  reducers: {
    setCurrentStage: (state, action: PayloadAction<StageId>) => {
      state.currentStage = action.payload;
    },
    saveScrollPosition: (state, action: PayloadAction<{ stageId: StageId; position: number }>) => {
      state.scrollPositions[action.payload.stageId] = action.payload.position;
    },
  },
});

export const { setCurrentStage, saveScrollPosition } = stageSlice.actions;

export default stageSlice.reducer;