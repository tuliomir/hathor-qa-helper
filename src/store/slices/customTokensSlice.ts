import { createSlice } from '@reduxjs/toolkit';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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

// Export actions when they are added
// export const {} = customTokensSlice.actions;

export default customTokensSlice.reducer;
