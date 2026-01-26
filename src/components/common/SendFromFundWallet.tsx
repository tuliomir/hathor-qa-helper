/**
 * Send From Fund Wallet Component
 * Sends tokens from the funding wallet to a target address
 * Reusable across Desktop and Mobile QA workflows
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector } from '../../store/hooks';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { WALLET_CONFIG } from '../../constants/network';
import { formatBalance } from '../../utils/balanceUtils';
import Loading from './Loading';

interface SendFromFundWalletProps {
  /** Target address to send to */
  targetAddress: string | null;
  /** Initial amount (default: 10) */
  initialAmount?: number;
  /** Callback when transaction is sent successfully */
  onTransactionSent?: (txId: string) => void;
  /** Whether to show the amount input (default: true) */
  showAmountInput?: boolean;
  /** Fixed amount to send (overrides initialAmount and hides input if showAmountInput is false) */
  fixedAmount?: number;
}

export default function SendFromFundWallet({
  targetAddress,
  initialAmount = 10,
  onTransactionSent,
  showAmountInput = true,
  fixedAmount,
}: SendFromFundWalletProps) {
  const { getAllWallets } = useWalletStore();
  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const { sendTransaction, isSending, error: transactionError } = useSendTransaction();

  const [amount, setAmount] = useState(fixedAmount ?? initialAmount);

  // Get funding wallet
  const wallets = getAllWallets();
  const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');

  // Token config (HTR for now)
  const selectedToken = {
    uid: NATIVE_TOKEN_UID,
    name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
    symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setAmount(value);
    } else if (e.target.value === '') {
      setAmount(1);
    }
  };

  const handleSend = async () => {
    if (!fundingWalletId || !fundingWallet?.instance || !targetAddress) {
      return;
    }

    try {
      // Get the first address of the funding wallet for change
      const fundWalletFirstAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Build the transaction template
      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: targetAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundWalletFirstAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount: BigInt(amount),
          token: selectedToken.uid,
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}',
        })
        .build();

      // Send the transaction
      const result = await sendTransaction(
        template,
        {
          fromWalletId: fundingWalletId,
          fromWallet: fundingWallet,
          toAddress: targetAddress,
          amount,
          tokenUid: selectedToken.uid,
          tokenSymbol: selectedToken.symbol,
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );

      if (result?.hash) {
        onTransactionSent?.(result.hash);
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error('Transaction error:', err);
    }
  };

  const effectiveAmount = fixedAmount ?? amount;
  const canSend = targetAddress && fundingWallet?.instance && effectiveAmount > 0;

  if (!fundingWalletId) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-2">No funding wallet selected.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
          Go to Wallet Initialization to select a funding wallet
        </Link>
      </div>
    );
  }

  if (!fundingWallet) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 m-0 text-sm">
          <span className="inline-block animate-pulse mr-2">⏳</span>
          Funding wallet is connecting... Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading overlay */}
      {isSending && <Loading overlay message="Sending transaction..." />}

      {/* Funding Wallet Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-600 font-medium">Funding Wallet</span>
            <p className="m-0 font-medium text-blue-900">{fundingWallet.metadata.friendlyName}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-blue-600 font-medium">Balance</span>
            <p className="m-0 font-bold text-success">
              {fundingWallet.balance ? `${formatBalance(fundingWallet.balance)} HTR` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      {showAmountInput && !fixedAmount && (
        <div>
          <label htmlFor="send-amount-input" className="block mb-1.5 font-bold text-sm">
            Amount ({selectedToken.symbol})
          </label>
          <input
            id="send-amount-input"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={handleAmountChange}
            className="input w-full"
            placeholder="Enter amount"
          />
        </div>
      )}

      {/* Fixed amount display */}
      {fixedAmount && (
        <div className="text-sm">
          Amount: <span className="font-bold">{fixedAmount} {selectedToken.symbol}</span>
        </div>
      )}

      {/* Target address display */}
      {targetAddress ? (
        <div className="text-sm">
          <span className="text-muted">Sending to:</span>
          <p className="font-mono text-xs break-all m-0 mt-1 p-2 bg-gray-100 rounded">{targetAddress}</p>
        </div>
      ) : (
        <div className="text-sm text-muted">Select an address above to send to.</div>
      )}

      {/* Error */}
      {transactionError && (
        <div className="p-3 bg-red-50 border border-danger rounded">
          <p className="m-0 text-red-900 text-sm">{transactionError}</p>
        </div>
      )}

      {/* Send Button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend || isSending}
        className={`w-full btn flex items-center justify-center gap-2 ${
          canSend && !isSending ? 'btn-success' : 'btn-secondary opacity-50 cursor-not-allowed'
        }`}
      >
        {isSending ? 'Sending...' : `Send ${effectiveAmount} ${selectedToken.symbol} from Fund Wallet`}
      </button>
    </div>
  );
}
