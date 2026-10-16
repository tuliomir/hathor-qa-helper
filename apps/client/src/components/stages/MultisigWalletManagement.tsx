/**
 * MultiSig Wallet Management Stage
 *
 * Allows QA testers to:
 * 1. Initialize and manage multisig participant wallets
 * 2. Send HTR transactions requiring multiple signatures with manual signer selection
 */

import { useEffect, useMemo, useState } from 'react';
import { MdPlayArrow, MdQrCode, MdRefresh, MdSend, MdStop, MdSwapVert } from 'react-icons/md';
import { AddressQr } from '../common/AddressQr';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  assembleAndSendTransaction,
  collectSignature,
  createMultisigTransaction,
  multisigWalletInstancesMap,
  refreshParticipantBalance,
  resetTransaction,
  selectMultisigNetwork,
  selectParticipants,
  selectReadyParticipants,
  selectTransaction,
  setNetwork,
  startMultisigParticipant,
  stopMultisigParticipant,
  toggleSigner,
} from '../../store/slices/multisigSlice';
import { MULTISIG_CONFIG, MULTISIG_MIN_SIGNATURES } from '../../constants/multisig';
import { formatBalance } from '../../utils/balanceUtils';
import CopyButton from '../common/CopyButton';
import NetworkChip from '../common/NetworkChip';
import { Identifier } from '../common/Identifier';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { StageHeader } from '../common/StageHeader';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { AmountInput } from '../common/AmountInput';
import { StatusChip } from '../ui/StatusChip';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { NETWORK_CONFIG, nextNetwork } from '../../constants/network';
import { useWalletStore } from '../../hooks/useWalletStore';

export default function MultisigWalletManagement() {
  const dispatch = useAppDispatch();
  const { getWallet } = useWalletStore();

  // Redux state
  const participants = useAppSelector(selectParticipants);
  const readyParticipants = useAppSelector(selectReadyParticipants);
  const transaction = useAppSelector(selectTransaction);
  const network = useAppSelector(selectMultisigNetwork);

  // Get funding and test wallet info for quick address fill
  const fundingWalletId = useAppSelector((state) => state.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((state) => state.walletSelection.testWalletId);
  const fundingWallet = fundingWalletId ? getWallet(fundingWalletId) : null;
  const testWallet = testWalletId ? getWallet(testWalletId) : null;

  // Local form state
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [signingParticipantId, setSigningParticipantId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [qrAddress, setQrAddress] = useState<string | null>(null);

  // Max balance across all ready multisig wallets (they share the same addresses,
  // so the largest value is the most up-to-date). Base units; '' when none.
  const maxBalance = useMemo(() => {
    let maxRaw = 0n;
    for (const p of readyParticipants) {
      if (p.balance) {
        try {
          const val = BigInt(p.balance);
          if (val > maxRaw) maxRaw = val;
        } catch {
          /* skip invalid */
        }
      }
    }
    return maxRaw === 0n ? '' : maxRaw.toString();
  }, [readyParticipants]);

  // Auto-fill amount with the full balance when wallets become ready
  useEffect(() => {
    if (maxBalance && !amount && transaction.step === 'idle') {
      setAmount(maxBalance);
    }
  }, [maxBalance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleStartParticipant = async (participantId: string) => {
    try {
      await dispatch(startMultisigParticipant(participantId)).unwrap();
    } catch (error) {
      console.error('Failed to start participant:', error);
    }
  };

  const handleStopParticipant = async (participantId: string) => {
    try {
      await dispatch(stopMultisigParticipant(participantId)).unwrap();
    } catch (error) {
      console.error('Failed to stop participant:', error);
    }
  };

  const handleRefreshBalance = async (participantId: string) => {
    try {
      await dispatch(refreshParticipantBalance(participantId)).unwrap();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  const handleToggleSigner = (participantId: string) => {
    dispatch(toggleSigner(participantId));
  };

  const handleCreateTransaction = async () => {
    if (!destination.trim() || !amount.trim()) {
      return;
    }

    // Find a ready participant to use for creating the transaction
    const readyParticipant = readyParticipants[0];
    if (!readyParticipant) {
      return;
    }

    setIsCreating(true);
    try {
      await dispatch(
        createMultisigTransaction({
          fromParticipantId: readyParticipant.id,
          destination: destination.trim(),
          amount,
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCollectSignature = async (participantId: string) => {
    if (!transaction.txHex) return;

    setSigningParticipantId(participantId);
    try {
      await dispatch(
        collectSignature({
          participantId,
          txHex: transaction.txHex,
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to collect signature:', error);
    } finally {
      setSigningParticipantId(null);
    }
  };

  const handleAssembleAndSend = async () => {
    if (!transaction.txHex || transaction.collectedSignatures.length < MULTISIG_MIN_SIGNATURES) {
      return;
    }

    // Find a ready participant to use for sending
    const readyParticipant = readyParticipants[0];
    if (!readyParticipant) {
      return;
    }

    setIsSending(true);
    try {
      await dispatch(
        assembleAndSendTransaction({
          participantId: readyParticipant.id,
          txHex: transaction.txHex,
          signatures: transaction.collectedSignatures.map((s) => s.signature),
        })
      ).unwrap();

      // Refresh all balances after successful send
      for (const p of readyParticipants) {
        dispatch(refreshParticipantBalance(p.id));
      }
    } catch (error) {
      console.error('Failed to assemble and send:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetTransaction = () => {
    dispatch(resetTransaction());
    setDestination('');
    setAmount('');
  };

  const handleNetworkSwitch = async () => {
    const newNetwork = nextNetwork(network);

    // Stop all running wallets first
    const runningParticipants = participants.filter(
      (p) => p.status === 'ready' || p.status === 'connecting' || p.status === 'syncing'
    );
    for (const p of runningParticipants) {
      try {
        await dispatch(stopMultisigParticipant(p.id)).unwrap();
      } catch (error) {
        console.error(`Failed to stop participant ${p.id}:`, error);
      }
    }

    // Reset any ongoing transaction
    dispatch(resetTransaction());
    setDestination('');
    setAmount('');

    // Switch network
    dispatch(setNetwork(newNetwork));
  };

  const isSignerSelected = (participantId: string) => transaction.selectedSigners.includes(participantId);

  const hasSignedTransaction = (participantId: string) =>
    transaction.collectedSignatures.some((s) => s.participantId === participantId);

  const canCreateTransaction =
    destination.trim() &&
    amount.trim() &&
    readyParticipants.length >= MULTISIG_MIN_SIGNATURES &&
    transaction.step === 'idle';

  const canCollectSignatures =
    transaction.step === 'signing' &&
    transaction.txHex &&
    transaction.selectedSigners.length >= MULTISIG_MIN_SIGNATURES;

  const canAssembleAndSend =
    transaction.step === 'signing' && transaction.collectedSignatures.length >= MULTISIG_MIN_SIGNATURES;

  type Participant = (typeof participants)[number];
  const spinner = <span className="loading loading-spinner loading-sm" aria-hidden="true" />;
  const nextLabel = NETWORK_CONFIG[nextNetwork(network)].label;

  const participantColumns: DataTableColumn<Participant>[] = [
    {
      key: 'sign',
      header: 'Sign',
      className: 'w-12',
      render: (participant) => (
        <input
          type="checkbox"
          checked={isSignerSelected(participant.id)}
          onChange={() => handleToggleSigner(participant.id)}
          disabled={participant.status !== 'ready'}
          className="checkbox checkbox-primary checkbox-sm"
          aria-label={`Sign with ${participant.friendlyName}`}
          title={participant.status !== 'ready' ? 'Start the wallet to enable signing' : 'Select to sign transactions'}
        />
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (participant) => (
        <span className="whitespace-nowrap">
          <span className="font-semibold">{participant.friendlyName}</span>{' '}
          <span className="text-caption text-ink-muted">(seed #{participant.seedIndex + 1})</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (participant) => (
        <span className="flex flex-col items-start gap-0.5">
          <StatusChip status={participant.status} />
          {participant.error && <span className="text-caption text-error">{participant.error}</span>}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'First address',
      type: 'identifier',
      render: (participant) =>
        participant.firstAddress ? (
          <span className="inline-flex items-center gap-1">
            <Identifier value={participant.firstAddress} kind="address" walletTag={false} />
            <button
              type="button"
              onClick={() => setQrAddress(participant.firstAddress!)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-field text-ink-muted hover:bg-base-200 hover:text-base-content"
              title={`Show QR code for ${participant.friendlyName}`}
              aria-label={`Show QR code for ${participant.friendlyName}`}
            >
              <MdQrCode aria-hidden="true" />
            </button>
          </span>
        ) : null,
    },
    {
      key: 'balance',
      header: 'Balance',
      type: 'amount',
      render: (participant) =>
        participant.status === 'ready' ? (
          <>
            {formatBalance(participant.balance)} <span className="font-sans text-ink-muted">HTR</span>
          </>
        ) : null,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (participant) => (
        <span className="inline-flex items-center justify-end gap-1">
          {participant.status === 'idle' || participant.status === 'error' ? (
            <button
              type="button"
              onClick={() => handleStartParticipant(participant.id)}
              title="Start"
              aria-label={`Start ${participant.friendlyName}`}
              className="btn btn-primary btn-xs btn-square"
            >
              <MdPlayArrow aria-hidden="true" />
            </button>
          ) : participant.status === 'ready' ? (
            <>
              <button
                type="button"
                onClick={() => handleRefreshBalance(participant.id)}
                title="Refresh balance"
                aria-label={`Refresh balance of ${participant.friendlyName}`}
                className="btn btn-ghost btn-xs btn-square"
              >
                <MdRefresh aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleStopParticipant(participant.id)}
                title="Stop"
                aria-label={`Stop ${participant.friendlyName}`}
                className="btn btn-secondary btn-xs btn-square"
              >
                <MdStop aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" disabled className="btn btn-secondary btn-xs btn-square" aria-label="Starting">
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="multisig-wallet-management"
        description={`Manage multisig participant wallets (${MULTISIG_MIN_SIGNATURES}-of-${MULTISIG_CONFIG.seeds.length}) and send transactions that need several signatures.`}
      />

      <Callout
        tone="info"
        title="Multisig configuration"
        action={
          <span className="flex flex-wrap items-center gap-2">
            <NetworkChip network={network} size="sm" />
            <button type="button" onClick={handleNetworkSwitch} className="btn btn-secondary btn-xs">
              <MdSwapVert aria-hidden="true" />
              Switch to {nextLabel}
            </button>
          </span>
        }
      >
        This is a{' '}
        <strong>
          {MULTISIG_MIN_SIGNATURES}-of-{MULTISIG_CONFIG.seeds.length}
        </strong>{' '}
        multisig wallet. At least {MULTISIG_MIN_SIGNATURES} participants must sign each transaction.
      </Callout>

      <Panel
        title={`Participant wallets (${participants.length})`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                participants.filter((p) => p.status === 'idle').forEach((p) => handleStartParticipant(p.id));
              }}
              disabled={participants.every((p) => p.status !== 'idle')}
              className="btn btn-primary btn-sm"
            >
              Start all idle
            </button>
            <button
              type="button"
              onClick={() => {
                participants.filter((p) => p.status === 'ready').forEach((p) => handleStopParticipant(p.id));
              }}
              disabled={participants.every((p) => p.status !== 'ready')}
              className="btn btn-secondary btn-sm"
            >
              Stop all ready
            </button>
          </>
        }
      >
        <DataTable
          caption="Participant wallets"
          columns={participantColumns}
          rows={participants}
          getRowKey={(p) => p.id}
          empty="No participant wallets configured."
        />
      </Panel>

      <Panel title="Send multisig transaction">
        {readyParticipants.length < MULTISIG_MIN_SIGNATURES && (
          <Callout tone="warning">
            Start at least {MULTISIG_MIN_SIGNATURES} participant wallets before sending. Currently{' '}
            {readyParticipants.length} ready.
          </Callout>
        )}

        <Field
          label="Destination address"
          htmlFor="multisig-destination"
          trailing={
            transaction.step === 'idle' &&
            (fundingWallet?.firstAddress || testWallet?.firstAddress) && (
              <>
                {fundingWallet?.firstAddress && (
                  <button
                    type="button"
                    onClick={() => setDestination(fundingWallet.firstAddress!)}
                    className="btn btn-secondary btn-xs"
                    title={fundingWallet.firstAddress}
                  >
                    Funding addr 0
                  </button>
                )}
                {testWallet?.firstAddress && (
                  <button
                    type="button"
                    onClick={() => setDestination(testWallet.firstAddress!)}
                    className="btn btn-secondary btn-xs"
                    title={testWallet.firstAddress}
                  >
                    Test addr 0
                  </button>
                )}
              </>
            )
          }
        >
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination address"
            disabled={transaction.step !== 'idle'}
            className="input w-full font-mono text-data"
          />
        </Field>

        <AmountInput
          id="multisig-amount"
          value={amount}
          onChange={setAmount}
          max={maxBalance && transaction.step === 'idle' ? maxBalance : undefined}
          balance={maxBalance || null}
          disabled={transaction.step !== 'idle'}
          className="max-w-xs"
        />

        <section className="flex flex-col gap-2 border-t border-base-300 pt-3">
          <h3 className="m-0 text-body font-semibold">
            Selected signers: {transaction.selectedSigners.length} / {MULTISIG_MIN_SIGNATURES} required
          </h3>
          {transaction.selectedSigners.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {transaction.selectedSigners.map((signerId) => {
                const signer = participants.find((p) => p.id === signerId);
                const hasSigned = hasSignedTransaction(signerId);
                return (
                  <StatusChip
                    key={signerId}
                    status={hasSigned ? 'signed' : 'selected'}
                    tone={hasSigned ? 'success' : 'info'}
                    label={`${signer?.friendlyName || signerId}${hasSigned ? ' (signed)' : ''}`}
                  />
                );
              })}
            </div>
          ) : (
            <p className="m-0 text-body text-ink-muted">Select participants in the table above to sign.</p>
          )}
        </section>

        {transaction.step === 'idle' && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!canCreateTransaction && (
              <span className="text-caption text-ink-muted">
                Enter a destination and amount, with {MULTISIG_MIN_SIGNATURES} participants ready
              </span>
            )}
            <button
              type="button"
              onClick={handleCreateTransaction}
              disabled={!canCreateTransaction || isCreating}
              className="btn btn-primary"
            >
              {isCreating && spinner}
              {isCreating ? 'Creating transaction' : 'Create transaction'}
            </button>
          </div>
        )}

        {transaction.txHex && (
          <section className="flex flex-col gap-2 border-t border-base-300 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-body font-semibold">Transaction hex</h3>
              <CopyButton text={transaction.txHex} label="Copy transaction hex" />
            </div>
            <pre className="m-0 max-h-20 overflow-y-auto whitespace-pre-wrap rounded-field bg-base-200 p-2 font-mono text-data-sm [overflow-wrap:anywhere]">
              {transaction.txHex}
            </pre>
          </section>
        )}

        {transaction.step === 'signing' && (
          <section className="flex flex-col gap-2 border-t border-base-300 pt-3">
            <h3 className="m-0 text-body font-semibold">
              Collect signatures ({transaction.collectedSignatures.length} / {MULTISIG_MIN_SIGNATURES} required)
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {transaction.selectedSigners.map((signerId) => {
                const signer = participants.find((p) => p.id === signerId);
                const hasSigned = hasSignedTransaction(signerId);
                const isSigning = signingParticipantId === signerId;
                const isReady = signer?.status === 'ready';

                return (
                  <li key={signerId}>
                    <Panel variant="inset" className="!flex-row items-center justify-between">
                      <span className="font-medium">{signer?.friendlyName || signerId}</span>
                      {hasSigned ? (
                        <StatusChip status="signed" tone="success" label="Signed" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCollectSignature(signerId)}
                          disabled={!isReady || isSigning || !canCollectSignatures}
                          className="btn btn-primary btn-sm"
                        >
                          {isSigning && spinner}
                          {isSigning ? 'Signing' : 'Sign'}
                        </button>
                      )}
                    </Panel>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAssembleAndSend}
                disabled={!canAssembleAndSend || isSending}
                className="btn btn-primary"
              >
                {isSending ? spinner : <MdSend aria-hidden="true" />}
                {isSending
                  ? 'Assembling and sending'
                  : `Assemble and send (${transaction.collectedSignatures.length}/${MULTISIG_MIN_SIGNATURES} signatures)`}
              </button>
            </div>
          </section>
        )}

        {transaction.step === 'complete' && transaction.result && (
          <Callout tone="success" title="Transaction sent">
            <TxIdDisplay hash={transaction.result.hash} network={network} />
          </Callout>
        )}

        {transaction.step === 'error' && transaction.error && (
          <Callout tone="error" title="Transaction failed">
            {transaction.error}
          </Callout>
        )}

        {(transaction.step === 'complete' || transaction.step === 'error' || transaction.step === 'signing') && (
          <div className="flex justify-end">
            <button type="button" onClick={handleResetTransaction} className="btn btn-ghost btn-sm">
              Reset / new transaction
            </button>
          </div>
        )}
      </Panel>

      {import.meta.env.DEV && (
        <details className="text-body">
          <summary className="cursor-pointer text-ink-muted">Debug info</summary>
          <div className="mt-2 rounded-field bg-base-200 p-3 font-mono text-data-sm">
            <p className="m-0">Wallet instances: {multisigWalletInstancesMap.size}</p>
            <p className="m-0">Transaction step: {transaction.step}</p>
            <p className="m-0">Selected signers: {transaction.selectedSigners.join(', ') || 'none'}</p>
            <p className="m-0">Collected signatures: {transaction.collectedSignatures.length}</p>
          </div>
        </details>
      )}

      {qrAddress && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="multisig-qr-title">
          <div className="modal-box flex max-w-xs flex-col items-start gap-3 rounded-box border border-base-300 p-5 shadow-float">
            <h3 id="multisig-qr-title" className="m-0 text-title">
              Wallet address
            </h3>
            <AddressQr address={qrAddress} size={180} />
            <div className="flex w-full justify-end">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQrAddress(null)}>
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setQrAddress(null)} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
