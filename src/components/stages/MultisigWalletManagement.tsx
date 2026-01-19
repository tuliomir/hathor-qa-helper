/**
 * MultiSig Wallet Management Stage
 *
 * Allows QA testers to:
 * 1. Initialize and manage multisig participant wallets
 * 2. Send HTR transactions requiring multiple signatures with manual signer selection
 */

import { useState } from 'react';
import { MdCheckCircle, MdError, MdPending, MdPlayArrow, MdRefresh, MdStop } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
	assembleAndSendTransaction,
	collectSignature,
	createMultisigTransaction,
	multisigWalletInstancesMap,
	refreshParticipantBalance,
	resetTransaction,
	selectParticipants,
	selectReadyParticipants,
	selectTransaction,
	startMultisigParticipant,
	stopMultisigParticipant,
	toggleSigner,
} from '../../store/slices/multisigSlice';
import { MULTISIG_CONFIG, MULTISIG_MIN_SIGNATURES } from '../../constants/multisig';
import { formatBalance } from '../../utils/balanceUtils';
import CopyButton from '../common/CopyButton';
import { NETWORK_CONFIG } from '../../constants/network';

export default function MultisigWalletManagement() {
  const dispatch = useAppDispatch();

  // Redux state
  const participants = useAppSelector(selectParticipants);
  const readyParticipants = useAppSelector(selectReadyParticipants);
  const transaction = useAppSelector(selectTransaction);
  const network = useAppSelector((state) => state.multisig.network);

  // Local form state
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [signingParticipantId, setSigningParticipantId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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
      // Convert amount to smallest unit (multiply by 100 for 2 decimal places)
      const amountInSmallestUnit = Math.floor(parseFloat(amount) * 100).toString();

      await dispatch(
        createMultisigTransaction({
          fromParticipantId: readyParticipant.id,
          destination: destination.trim(),
          amount: amountInSmallestUnit,
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

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-success';
      case 'error':
        return 'text-danger';
      case 'connecting':
      case 'syncing':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'connecting':
      case 'syncing':
        return 'bg-yellow-50';
      default:
        return '';
    }
  };

  const truncateAddress = (addr: string, start = 6, end = 6) => {
    if (!addr) return '';
    if (addr.length <= start + end + 3) return addr;
    return addr.slice(0, start) + '...' + addr.slice(-end);
  };

  const isSignerSelected = (participantId: string) =>
    transaction.selectedSigners.includes(participantId);

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
    transaction.step === 'signing' &&
    transaction.collectedSignatures.length >= MULTISIG_MIN_SIGNATURES;

  const explorerUrl = NETWORK_CONFIG[network]?.explorerUrl || '';

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">MultiSig Wallet Management</h1>
      <p className="text-muted mb-7.5">
        Manage multisig participant wallets (2-of-5 configuration) and send transactions requiring
        multiple signatures.
      </p>

      {/* Configuration Info */}
      <div className="card-primary mb-7.5 bg-blue-50 border border-info">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-info flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-bold text-blue-900 m-0">MultiSig Configuration</p>
            <p className="text-sm text-blue-800 mt-1 mb-0">
              This is a <strong>{MULTISIG_MIN_SIGNATURES}-of-{MULTISIG_CONFIG.seeds.length}</strong>{' '}
              multisig wallet. At least {MULTISIG_MIN_SIGNATURES} participants must sign each
              transaction.
            </p>
          </div>
        </div>
      </div>

      {/* Section A: Participant Wallets Table */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Participant Wallets ({participants.length})</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow-sm">
            <thead>
              <tr className="table-header">
                <th className="p-3 text-center font-bold w-12">Sign</th>
                <th className="p-3 text-left font-bold">Name</th>
                <th className="p-3 text-left font-bold">Status</th>
                <th className="p-3 text-left font-bold">First Address</th>
                <th className="p-3 text-right font-bold">Balance</th>
                <th className="p-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr
                  key={participant.id}
                  className={`table-row ${getRowBackgroundColor(participant.status)}`}
                >
                  {/* Sign Checkbox */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSignerSelected(participant.id)}
                      onChange={() => handleToggleSigner(participant.id)}
                      disabled={participant.status !== 'ready'}
                      className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      title={
                        participant.status !== 'ready'
                          ? 'Start the wallet to enable signing'
                          : 'Select to sign transactions'
                      }
                    />
                  </td>

                  {/* Name */}
                  <td className="p-3">
                    <strong>{participant.friendlyName}</strong>
                    <span className="text-xs text-muted ml-2">
                      (Seed #{participant.seedIndex + 1})
                    </span>
                  </td>

                  {/* Status */}
                  <td className={`p-3 ${getStatusColor(participant.status)} font-bold text-sm`}>
                    <div className="flex items-center gap-2">
                      {participant.status === 'ready' && <MdCheckCircle />}
                      {participant.status === 'error' && <MdError />}
                      {(participant.status === 'connecting' ||
                        participant.status === 'syncing') && (
                        <MdPending className="animate-spin" />
                      )}
                      {participant.status}
                    </div>
                    {participant.error && (
                      <div className="text-xs text-danger mt-1">{participant.error}</div>
                    )}
                  </td>

                  {/* First Address */}
                  <td className="p-3">
                    {participant.firstAddress ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {truncateAddress(participant.firstAddress)}
                        </span>
                        <CopyButton
                          text={participant.firstAddress}
                          label={`Copy address for ${participant.friendlyName}`}
                          className="text-muted"
                        />
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>

                  {/* Balance */}
                  <td className="p-3 text-right font-mono">
                    {participant.status === 'ready' ? (
                      <span className="text-success">{formatBalance(participant.balance)} HTR</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex gap-1.5 justify-center">
                      {participant.status === 'idle' || participant.status === 'error' ? (
                        <button
                          onClick={() => handleStartParticipant(participant.id)}
                          title="Start"
                          className="btn-primary btn-square text-xs p-2"
                        >
                          <MdPlayArrow />
                        </button>
                      ) : participant.status === 'ready' ? (
                        <>
                          <button
                            onClick={() => handleRefreshBalance(participant.id)}
                            title="Refresh Balance"
                            className="btn-secondary btn-square text-xs p-2"
                          >
                            <MdRefresh />
                          </button>
                          <button
                            onClick={() => handleStopParticipant(participant.id)}
                            title="Stop"
                            className="btn btn-square text-xs p-2 bg-black text-white hover:bg-gray-800"
                          >
                            <MdStop />
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="btn-secondary btn-square text-xs cursor-not-allowed opacity-60 p-2"
                        >
                          <MdPending className="animate-spin" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Start/Stop All Buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              participants
                .filter((p) => p.status === 'idle')
                .forEach((p) => handleStartParticipant(p.id));
            }}
            disabled={participants.every((p) => p.status !== 'idle')}
            className="btn-primary text-sm"
          >
            Start All Idle
          </button>
          <button
            onClick={() => {
              participants
                .filter((p) => p.status === 'ready')
                .forEach((p) => handleStopParticipant(p.id));
            }}
            disabled={participants.every((p) => p.status !== 'ready')}
            className="btn-secondary text-sm"
          >
            Stop All Ready
          </button>
        </div>
      </div>

      {/* Section B: Send Transaction Panel */}
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-4">Send MultiSig Transaction</h2>

        {/* Prerequisites Check */}
        {readyParticipants.length < MULTISIG_MIN_SIGNATURES && (
          <div className="mb-4 p-3 bg-yellow-50 border border-warning rounded-lg">
            <p className="text-warning text-sm m-0">
              <strong>Note:</strong> At least {MULTISIG_MIN_SIGNATURES} participant wallets must be
              started before sending transactions. Currently{' '}
              {readyParticipants.length} ready.
            </p>
          </div>
        )}

        {/* Transaction Form */}
        <div className="mb-4">
          <label className="block mb-1.5 font-bold">Destination Address:</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination address..."
            disabled={transaction.step !== 'idle'}
            className="input font-mono"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 font-bold">Amount (HTR):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            disabled={transaction.step !== 'idle'}
            className="input"
          />
        </div>

        {/* Selected Signers Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="font-bold mb-2">
            Selected Signers: {transaction.selectedSigners.length} /{' '}
            {MULTISIG_MIN_SIGNATURES} required
          </div>
          {transaction.selectedSigners.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {transaction.selectedSigners.map((signerId) => {
                const signer = participants.find((p) => p.id === signerId);
                const hasSigned = hasSignedTransaction(signerId);
                return (
                  <span
                    key={signerId}
                    className={`px-2 py-1 rounded text-xs ${
                      hasSigned ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {signer?.friendlyName || signerId}
                    {hasSigned && ' (signed)'}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-sm m-0">
              Select participants from the table above to sign the transaction.
            </p>
          )}
        </div>

        {/* Create Transaction Button */}
        {transaction.step === 'idle' && (
          <button
            onClick={handleCreateTransaction}
            disabled={!canCreateTransaction || isCreating}
            className={`w-full btn text-base font-bold mb-4 ${
              canCreateTransaction && !isCreating ? 'btn-primary' : 'btn-secondary cursor-not-allowed'
            }`}
          >
            {isCreating ? 'Creating Transaction...' : 'Create Transaction'}
          </button>
        )}

        {/* Transaction Hex Display */}
        {transaction.txHex && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">Transaction Hex:</span>
              <CopyButton text={transaction.txHex} label="Copy transaction hex" />
            </div>
            <div className="font-mono text-xs break-all max-h-20 overflow-y-auto">
              {transaction.txHex}
            </div>
          </div>
        )}

        {/* Signature Collection */}
        {transaction.step === 'signing' && (
          <div className="mb-4">
            <h3 className="font-bold mb-3">
              Collect Signatures ({transaction.collectedSignatures.length} /{' '}
              {MULTISIG_MIN_SIGNATURES} required)
            </h3>
            <div className="space-y-2">
              {transaction.selectedSigners.map((signerId) => {
                const signer = participants.find((p) => p.id === signerId);
                const hasSigned = hasSignedTransaction(signerId);
                const isSigning = signingParticipantId === signerId;
                const isReady = signer?.status === 'ready';

                return (
                  <div
                    key={signerId}
                    className="flex items-center justify-between p-2 bg-white border rounded"
                  >
                    <span className="font-medium">{signer?.friendlyName || signerId}</span>
                    {hasSigned ? (
                      <span className="text-success flex items-center gap-1">
                        <MdCheckCircle /> Signed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCollectSignature(signerId)}
                        disabled={!isReady || isSigning || !canCollectSignatures}
                        className={`btn text-xs ${
                          isReady && !isSigning && canCollectSignatures
                            ? 'btn-primary'
                            : 'btn-secondary cursor-not-allowed'
                        }`}
                      >
                        {isSigning ? 'Signing...' : 'Sign'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assemble & Send Button */}
        {transaction.step === 'signing' && (
          <button
            onClick={handleAssembleAndSend}
            disabled={!canAssembleAndSend || isSending}
            className={`w-full btn text-base font-bold mb-4 ${
              canAssembleAndSend && !isSending ? 'btn-success' : 'btn-secondary cursor-not-allowed'
            }`}
          >
            {isSending
              ? 'Assembling & Sending...'
              : `Assemble & Send (${transaction.collectedSignatures.length}/${MULTISIG_MIN_SIGNATURES} signatures)`}
          </button>
        )}

        {/* Transaction Result */}
        {transaction.step === 'complete' && transaction.result && (
          <div className="mb-4 p-4 bg-green-50 border border-success rounded-lg">
            <div className="flex items-start gap-3">
              <MdCheckCircle className="text-success text-2xl flex-shrink-0" />
              <div>
                <p className="font-bold text-green-900 m-0">Transaction Sent Successfully!</p>
                <div className="mt-2">
                  <span className="text-sm text-green-800">Transaction Hash:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs break-all">{transaction.result.hash}</span>
                    <CopyButton text={transaction.result.hash} label="Copy transaction hash" />
                  </div>
                  {explorerUrl && (
                    <a
                      href={`${explorerUrl}transaction/${transaction.result.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-info hover:underline mt-2 inline-block"
                    >
                      View in Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Error */}
        {transaction.step === 'error' && transaction.error && (
          <div className="mb-4 p-4 bg-red-50 border border-danger rounded-lg">
            <div className="flex items-start gap-3">
              <MdError className="text-danger text-2xl flex-shrink-0" />
              <div>
                <p className="font-bold text-red-900 m-0">Transaction Failed</p>
                <p className="text-sm text-red-800 mt-1 mb-0">{transaction.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {(transaction.step === 'complete' ||
          transaction.step === 'error' ||
          transaction.step === 'signing') && (
          <button onClick={handleResetTransaction} className="btn-secondary w-full text-sm">
            Reset / New Transaction
          </button>
        )}
      </div>

      {/* Debug Info (Development) */}
      {import.meta.env.DEV && (
        <details className="mt-7.5">
          <summary className="cursor-pointer text-muted text-sm">Debug Info</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded font-mono text-xs">
            <p>Wallet Instances: {multisigWalletInstancesMap.size}</p>
            <p>Transaction Step: {transaction.step}</p>
            <p>Selected Signers: {transaction.selectedSigners.join(', ') || 'none'}</p>
            <p>Collected Signatures: {transaction.collectedSignatures.length}</p>
          </div>
        </details>
      )}
    </div>
  );
}
