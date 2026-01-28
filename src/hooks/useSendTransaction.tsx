import { useState } from 'react';
import { SendTransaction } from '@hathor/wallet-lib';
import { useAppDispatch } from '../store/hooks';
import { addTransaction } from '../store/slices/transactionHistorySlice';
import { useToast } from './useToast';
import { NETWORK_CONFIG } from '../constants/network';
import type { WalletInfo } from '../types/walletStore';

export interface TransactionMetadata {
	fromWallet: WalletInfo;  // Only required: needed to create the actual tx
	fromWalletId: string;
  toAddress: string;
  amount: number;
  tokenUid: string;
  tokenSymbol: string;
}

/**
 * Custom hook for sending transactions with built-in loading state,
 * error handling, transaction history tracking, and toast notifications.
 */
export function useSendTransaction() {
  const dispatch = useAppDispatch();
  const { success, error: showError } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sends a transaction using the provided template and metadata.
   *
   * @param template - Transaction template created by TransactionTemplateBuilder
   * @param metadata - Transaction metadata for tracking and display
   * @param pinCode - PIN code for signing the transaction
   * @returns Promise that resolves when transaction is sent successfully
   */
  const sendTransaction = async (
    template: unknown,
    metadata: TransactionMetadata,
    pinCode: string
  ): Promise<{ hash: string } | undefined> => {
    const { fromWallet, toAddress, amount, tokenUid, tokenSymbol, fromWalletId } = metadata;

    if (!fromWallet || !fromWallet.instance) {
      throw new Error('Wallet not found or not ready');
    }

    setIsSending(true);
    setError(null);

    try {
      const hWallet = fromWallet.instance;

      // Build and sign the transaction
      const tx = await hWallet.buildTxTemplate(template, {
        signTx: true,
        pinCode
      });

      // Send the transaction
      const sendTx = new SendTransaction({ storage: hWallet.storage, transaction: tx });
      await sendTx.runFromMining();

      // Track transaction in history
      if (tx.hash) {
				// TODO: Simplify this, as not all transactions will have these metadata fields
        dispatch(
          addTransaction({
            hash: tx.hash,
            timestamp: Date.now(),
            fromWalletId,
            toAddress,
            amount,
            tokenUid,
            tokenSymbol,
            network: fromWallet.metadata.network,
            status: 'confirmed'
          })
        );
      }

      // Get explorer URL for the network (use the actual wallet's network)
      const explorerUrl = NETWORK_CONFIG[fromWallet.metadata.network].explorerUrl;
      const txUrl = `${explorerUrl}transaction/${tx.hash}`;

      // Show toast with a link and longer duration (20s)
      success('Transaction sent successfully! View on explorer:', {
        duration: 20000,
        link: { url: txUrl, label: 'link' },
      });

      return tx.hash ? { hash: tx.hash } : undefined;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Transaction error:', err);
      throw err; // Re-throw so caller can handle if needed
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendTransaction,
    isSending,
    error,
    clearError: () => setError(null)
  };
}
