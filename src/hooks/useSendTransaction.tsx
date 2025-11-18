import { useState } from 'react';
import { SendTransaction } from '@hathor/wallet-lib';
import { useAppDispatch } from '../store/hooks';
import { addTransaction } from '../store/slices/transactionHistorySlice';
import { useToast } from './useToast';
import { NETWORK_CONFIG, DEFAULT_NETWORK } from '../constants/network';
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
    template: any,
    metadata: TransactionMetadata,
    pinCode: string
  ): Promise<void> => {
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

      // Get explorer URL for the network
      const explorerUrl = NETWORK_CONFIG[DEFAULT_NETWORK].explorerUrl;
      const txUrl = `${explorerUrl}transaction/${tx.hash}`;

      // Show toast with a link and longer duration (20s)
      success(
        (
          <span>
            Transaction sent successfully! View on explorer (
            <a href={txUrl} target="_blank" rel="noreferrer" className="underline text-primary">
              link
            </a>
            )
          </span>
        ),
        { duration: 20000 }
      );
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
