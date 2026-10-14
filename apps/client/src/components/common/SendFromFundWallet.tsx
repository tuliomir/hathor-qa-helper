/**
 * Send From Fund Wallet Component
 * Sends tokens from the funding wallet to a target address
 * Reusable across Desktop and Mobile QA workflows
 */

import { useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppSelector } from '../../store/hooks';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { WALLET_CONFIG } from '../../constants/network';
import { formatBalance } from '../../utils/balanceUtils';
import { Identifier } from './Identifier';
import { PreconditionStrip } from './PreconditionStrip';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { useRequireFundingWallet } from '../../hooks/useRequirements';

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
  const fundingRequirement = useRequireFundingWallet();
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

  if (fundingRequirement.met !== true || !fundingWallet) {
    return <PreconditionStrip requirements={[fundingRequirement]} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 flex items-start justify-between gap-4 rounded-box bg-base-200 p-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">Funding wallet</dt>
          <dd className="m-0 font-medium">{fundingWallet.metadata.friendlyName}</dd>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-caption text-ink-muted">Balance</dt>
          <dd className="m-0 font-mono text-data tabular-nums">
            {fundingWallet.balance ? `${formatBalance(fundingWallet.balance)} HTR` : 'Unknown'}
          </dd>
        </div>
      </dl>

      {showAmountInput && !fixedAmount && (
        <Field label={`Amount (${selectedToken.symbol})`} htmlFor="send-amount-input">
          <input
            id="send-amount-input"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={handleAmountChange}
            className="input w-full font-mono text-data"
            placeholder="Enter amount"
          />
        </Field>
      )}

      {fixedAmount && (
        <p className="m-0 text-body">
          Amount{' '}
          <span className="font-mono text-data font-semibold">
            {fixedAmount} {selectedToken.symbol}
          </span>
        </p>
      )}

      {targetAddress ? (
        <div className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Sending to</span>
          <Identifier value={targetAddress} kind="address" />
        </div>
      ) : (
        <p className="m-0 text-body text-ink-muted">Select an address above to send to.</p>
      )}

      {transactionError && (
        <Callout tone="error" title="The transaction failed" role="alert">
          {transactionError}
        </Callout>
      )}

      <button type="button" onClick={handleSend} disabled={!canSend || isSending} className="btn btn-primary w-full">
        {isSending && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
        {isSending ? 'Sending…' : `Send ${effectiveAmount} ${selectedToken.symbol} from the funding wallet`}
      </button>
    </div>
  );
}
