import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface TransactionRecord {
  hash: string;
  timestamp: number;
  fromWalletId: string;
  toAddress: string;
  amount: number;
  tokenUid: string;
  tokenSymbol: string;
  network: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface TransactionHistoryState {
  transactions: TransactionRecord[];
}

const initialState: TransactionHistoryState = {
  transactions: [],
};

const transactionHistorySlice = createSlice({
  name: 'transactionHistory',
  initialState,
  reducers: {
    addTransaction: (state, action: PayloadAction<TransactionRecord>) => {
      state.transactions.push(action.payload);
    },
    updateTransactionStatus: (
      state,
      action: PayloadAction<{ hash: string; status: TransactionRecord['status'] }>
    ) => {
      const tx = state.transactions.find((t) => t.hash === action.payload.hash);
      if (tx) {
        tx.status = action.payload.status;
      }
    },
    clearTransactionHistory: (state) => {
      state.transactions = [];
    },
  },
});

export const { addTransaction, updateTransactionStatus, clearTransactionHistory } =
  transactionHistorySlice.actions;

export default transactionHistorySlice.reducer;
