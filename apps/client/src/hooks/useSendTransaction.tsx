import { useState } from 'react';
import { SendTransaction } from '@hathor/wallet-lib';
import { useAppDispatch } from '../store/hooks';
import { addTransaction } from '../store/slices/transactionHistorySlice';
import { useToast } from './useToast';
import { NETWORK_CONFIG, type NetworkKey } from '../constants/network';
import type { WalletInfo } from '../types/walletStore';
import { applyNetworkServices } from '../services/networkServices';
import { qaServerClient } from '../services/qaServerClient';
import type { SendRequest } from '@qa-helper/shared/serverApi';

export interface TransactionMetadata {
  fromWallet: WalletInfo; // Only required: needed to create the actual tx
  fromWalletId: string;
  toAddress: string;
  amount: number;
  tokenUid: string;
  tokenSymbol: string;
}

/**
 * Custom hook for sending transactions with built-in loading state,
 * error handling, transaction history tracking, and toast notifications.
 * `sendTransaction` signs a template in the browser; `sendShielded` sends
 * through the wallet's signer on the QA server, which can create shielded
 * outputs (`knowledge/shielded-qa-stages.md`).
 */
export function useSendTransaction() {
  const dispatch = useAppDispatch();
  const { success, error: showError } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** History entry and explorer toast for a sent transaction. */
  const recordSent = (hash: string, metadata: Omit<TransactionMetadata, 'fromWallet'> & { network: NetworkKey }) => {
    const { fromWalletId, toAddress, amount, tokenUid, tokenSymbol, network } = metadata;
    // TODO: Simplify this, as not all transactions will have these metadata fields
    dispatch(
      addTransaction({
        hash,
        timestamp: Date.now(),
        fromWalletId,
        toAddress,
        amount,
        tokenUid,
        tokenSymbol,
        network,
        status: 'confirmed',
      })
    );
    const txUrl = `${NETWORK_CONFIG[network].explorerUrl}transaction/${hash}`;
    // Show toast with a link and longer duration (20s)
    success('Transaction sent successfully! View on explorer:', {
      duration: 20000,
      link: { url: txUrl, label: 'link' },
    });
  };

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
    const { fromWallet } = metadata;

    if (!fromWallet || !fromWallet.instance) {
      throw new Error('Wallet not found or not ready');
    }

    setIsSending(true);
    setError(null);

    try {
      const hWallet = fromWallet.instance;
      applyNetworkServices(fromWallet.metadata.network);

      // Build and sign the transaction
      const tx = await hWallet.buildTxTemplate(template as Parameters<typeof hWallet.buildTxTemplate>[0], {
        signTx: true,
        pinCode,
      });

      // Send the transaction
      const sendTx = new SendTransaction({ storage: hWallet.storage, transaction: tx });
      await sendTx.runFromMining();

      if (tx.hash) recordSent(tx.hash, { ...metadata, network: fromWallet.metadata.network });
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

  /**
   * Sends through the signer session of `metadata.fromWallet` (see
   * `signerForWallet`); the server builds, proves and mines the tx.
   */
  const sendShielded = async (
    sessionId: string,
    request: SendRequest,
    metadata: TransactionMetadata
  ): Promise<{ hash: string }> => {
    setIsSending(true);
    setError(null);
    try {
      const { txId } = await qaServerClient.send(sessionId, request);
      recordSent(txId, { ...metadata, network: metadata.fromWallet.metadata.network });
      return { hash: txId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendTransaction,
    sendShielded,
    isSending,
    error,
    clearError: () => setError(null),
  };
}
