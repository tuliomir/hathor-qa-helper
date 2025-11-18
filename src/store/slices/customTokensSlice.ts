import { createSlice } from '@reduxjs/toolkit';

interface CustomTokensState {
  // Add any state you need here later
}

const initialState: CustomTokensState = {
  // Initialize state here
};

const customTokensSlice = createSlice({
  name: 'customTokens',
  initialState,
  reducers: {
    // Add reducers as needed
  },
});

export const {} = customTokensSlice.actions;

export default customTokensSlice.reducer;
