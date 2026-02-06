/**
 * Redux Toolkit Slice for Stage Management
 * Manages scroll positions for QA stages (stage navigation is URL-based)
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StageId } from '../../types/stage';

interface StageState {
  scrollPositions: Partial<Record<StageId, number>>;
}

const initialState: StageState = {
  scrollPositions: {},
};

const stageSlice = createSlice({
  name: 'stage',
  initialState,
  reducers: {
    saveScrollPosition: (state, action: PayloadAction<{ stageId: StageId; position: number }>) => {
      state.scrollPositions[action.payload.stageId] = action.payload.position;
    },
  },
});

export const { saveScrollPosition } = stageSlice.actions;

export default stageSlice.reducer;
