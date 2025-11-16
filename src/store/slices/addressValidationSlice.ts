import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AddressValidationState {
  selectedWalletId: string;
  addressIndex: number;
  amount: number;
}

const initialState: AddressValidationState = {
  selectedWalletId: '',
  addressIndex: 0,
  amount: 1,
};

const addressValidationSlice = createSlice({
  name: 'addressValidation',
  initialState,
  reducers: {
    setSelectedWalletId: (state, action: PayloadAction<string>) => {
      state.selectedWalletId = action.payload;
    },
    setAddressIndex: (state, action: PayloadAction<number>) => {
      state.addressIndex = action.payload;
    },
    setAmount: (state, action: PayloadAction<number>) => {
      state.amount = action.payload;
    },
    resetAddressValidation: (state) => {
      state.selectedWalletId = '';
      state.addressIndex = 0;
      state.amount = 1;
    },
  },
});

export const { setSelectedWalletId, setAddressIndex, resetAddressValidation, setAmount } = addressValidationSlice.actions;

export default addressValidationSlice.reducer;
