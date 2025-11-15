/**
 * Redux Toolkit Slice for Stage Management
 * Manages the currently active QA stage
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StageId } from '../../types/stage';

interface StageState {
  currentStage: StageId;
}

const initialState: StageState = {
  currentStage: 'wallet-initialization',
};

const stageSlice = createSlice({
  name: 'stage',
  initialState,
  reducers: {
    setCurrentStage: (state, action: PayloadAction<StageId>) => {
      state.currentStage = action.payload;
    },
  },
});

export const { setCurrentStage } = stageSlice.actions;

export default stageSlice.reducer;