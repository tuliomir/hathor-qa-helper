/**
 * RPC Fee Deposit Card Component
 *
 * Card for testing fee-based token deposit via RPC call
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import DryRunCheckbox from '../common/DryRunCheckbox';
import TransactionResponseDisplay from '../common/TransactionResponseDisplay';
import { RpcRequestPreview } from './RpcRequestPreview';
import { safeStringify } from '../../utils/betHelpers';
import TxStatus from '../common/TxStatus.tsx'
import { useAppSelector } from '../../store/hooks.ts'
import { extractErrorMessage } from '../../utils/errorUtils';

export interface RpcFeeDepositCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  isDryRun?: boolean;
  ncId: string;
  setNcId: (value: string) => void;
  latestInitializedNcId: string | null;
  feeToken: string;
  setFeeToken: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  changeAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  contractPaysFees: boolean;
  setContractPaysFees: (value: boolean) => void;
  htrWithdrawAmount: string;
  setHtrWithdrawAmount: (value: string) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  feeTokens?: { uid: string; symbol: string; name?: string }[];
  feeTokensLoading?: boolean;
  walletInstance?: { getBalance: (uid: string) => Promise<Array<{ balance?: { unlocked?: bigint } }>> } | null;
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcFeeDepositCard: React.FC<RpcFeeDepositCardProps> = ({
  onExecute,
  isDryRun = false,
  ncId,
  setNcId,
  latestInitializedNcId,
  feeToken,
  setFeeToken,
  amount,
  setAmount,
  changeAddress,
  addressIndex,
  setAddressIndex,
  contractPaysFees,
  setContractPaysFees,
  htrWithdrawAmount,
  setHtrWithdrawAmount,
  pushTx,
  setPushTx,
  feeTokens = [],
  feeTokensLoading = false,
  walletInstance = null,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [intermediatesExpanded, setIntermediatesExpanded] = useState(true);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const { showToast } = useToast();
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId ?? undefined);

  // Live request building
  const [liveRequest, setLiveRequest] = useState<{ method: string; params: unknown } | null>(null);

  // Load persisted data from Redux when component mounts or when initial data changes
  useEffect(() => {
    if (initialRequest) {
      setRequestInfo(initialRequest);

    }
    if (initialResponse) {
      setResult(initialResponse);
      setExpanded(true);
    }
    if (initialError) {
      setError(initialError);
      setExpanded(true);
    }
  }, [initialRequest, initialResponse, initialError]);

  // Live request building - recalculate on every input change
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0;

    const depositAction = {
      type: 'deposit',
      token: feeToken || '<fee_token>',
      amount: amountNum || '<amount>',
      changeAddress: changeAddress || '<change_address>',
    };

    const actions: unknown[] = [];

    if (contractPaysFees) {
      const htrAmount = parseFloat(htrWithdrawAmount) || 0;
      actions.push({
        type: 'withdrawal',
        token: '00',
        amount: htrAmount || '<htr_amount>',
        address: changeAddress || '<address>',
      });
    }

    actions.push(depositAction);

    const invokeParams: Record<string, unknown> = {
      network: 'testnet',
      nc_id: ncId || '<nc_id>',
      method: 'noop',
      actions,
      args: [],
      push_tx: pushTx,
    };

    if (contractPaysFees) {
      invokeParams.contract_pays_fees = true;
    }

    const requestParams = {
      method: 'htr_sendNanoContractTx',
      params: invokeParams,
    };

    setLiveRequest(requestParams);
  }, [ncId, feeToken, amount, changeAddress, pushTx, contractPaysFees, htrWithdrawAmount]);

  const handleSelectLatestNcId = () => {
    if (!latestInitializedNcId) {
      showToast('No nano contract has been initialized yet. Please initialize one first.', 'error');
      return;
    }
    setNcId(latestInitializedNcId);
    showToast('Nano Contract ID selected successfully', 'success');
  };

  const handleExecute = async () => {
    // Validate ncId is provided
    if (!ncId || ncId.trim() === '') {
      showToast('Please provide a Nano Contract ID', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute();

      // Store request and response separately
      setRequestInfo(request as { method: string; params: unknown });
      setResult(response);

      setExpanded(true);

      console.log(`[RPC Request] Fee Deposit`, request);
      console.log(`[RPC Success] Fee Deposit`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Fee token deposited successfully',
        'success'
      );
    } catch (err: unknown) {
      console.error('Error in handleExecute:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      setExpanded(true);

      // Capture request params from error if available
      if (err && typeof err === 'object' && 'requestParams' in err) {
        setRequestInfo(err.requestParams as { method: string; params: unknown });
  
      }

      console.error(`[RPC Error] Fee Deposit`, {
        message: errorMessage,
        error: err,
        requestParams: err && typeof err === 'object' && 'requestParams' in err ? err.requestParams : undefined,
      });

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result !== null || error !== null;

  // Render raw JSON view
  const renderRawJson = (data: unknown) => {
    return (
      <div className="border border-gray-300 rounded p-3 overflow-auto max-h-96 bg-gray-50 text-left">
        <pre className="text-sm font-mono whitespace-pre-wrap break-words m-0 text-left">
          {safeStringify(data, 2)}
        </pre>
      </div>
    );
  };

  // Main render function for results
  const renderResult = () => {
    if (!result) return null;

    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

      // If showing raw, always use raw renderer
      if (showRawResponse) {
        return renderRawJson(parsedResult);
      }

      // Use the TransactionResponseDisplay component for formatted view
      return (
        <TransactionResponseDisplay
          response={parsedResult}
          network="TESTNET"
          showNcFields={true}
          hashLabel="Transaction Hash"
        />
      );
    } catch {
      return (
        <div className="border border-gray-300 rounded p-3 overflow-auto max-h-64">
          <pre className="text-sm font-mono">{String(result)}</pre>
        </div>
      );
    }
  };

  return (
    <>
      {/* Input Fields Card */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Deposit Fee Token</h3>
            <p className="text-sm text-muted mt-1">
              Deposit a fee-based token into the fee nano contract
            </p>
          </div>
          {isDryRun && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              DRY RUN
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Nano Contract ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nano Contract ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ncId}
                onChange={(e) => setNcId(e.target.value)}
                placeholder="Enter nano contract ID"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleSelectLatestNcId}
                className="btn-secondary px-4 flex items-center gap-2"
                title="Select latest initialized nano contract"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Select
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              The nano contract ID to deposit into. Click "Select" to use the latest initialized contract.
            </p>
          </div>

          {/* Fee Token */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Fee Token</label>
            {feeTokensLoading ? (
              <div className="input flex items-center gap-2 text-muted">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading fee tokens...
              </div>
            ) : feeTokens && feeTokens.length > 0 ? (
              <div className="relative">
                <select
                  value={feeToken}
                  onChange={(e) => setFeeToken(e.target.value)}
                  className="input cursor-pointer appearance-none pr-10"
                >
                  {feeTokens.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      {t.symbol ? `${t.symbol} (${t.uid})` : t.uid}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              // Fallback to text input if fee tokens not provided
              <input
                type="text"
                value={feeToken}
                onChange={(e) => setFeeToken(e.target.value)}
                placeholder="Enter fee token ID"
                className="input"
              />
            )}
            <p className="text-xs text-muted mt-1">
              Fee token to deposit into the nano contract
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="E.g., 10"
                className="input flex-1"
              />
              {walletInstance && feeToken && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const bal = await walletInstance.getBalance(feeToken);
                      const unlocked = bal?.[0]?.balance?.unlocked ?? 0n;
                      setAmount(unlocked.toString());
                    } catch (err) {
                      console.error('Failed to get token balance:', err);
                    }
                  }}
                  className="btn-secondary px-3 whitespace-nowrap text-sm"
                  title="Fill with full token balance"
                >
                  Max
                </button>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              Amount to deposit (in token's smallest unit)
            </p>
          </div>

          {/* Address Index */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Change Address Index</label>
            <input
              type="number"
              value={addressIndex}
              onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Index of the address to use for change output
            </p>
          </div>

          {/* Contract Pays Fees */}
          <div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contractPaysFees}
                onChange={(e) => setContractPaysFees(e.target.checked)}
                className="checkbox checkbox-primary"
                id="contractPaysFees"
              />
              <label htmlFor="contractPaysFees" className="text-sm cursor-pointer">
                Contract Pays Fees
              </label>
            </div>
            <p className="text-xs text-muted mt-1">
              When enabled, the contract will pay transaction fees via an HTR withdrawal
            </p>
          </div>

          {/* HTR Withdraw Amount (only shown when contract pays fees) */}
          {contractPaysFees && (
            <div>
              <label className="block text-sm font-medium mb-1.5">HTR Withdraw Amount</label>
              <input
                type="number"
                value={htrWithdrawAmount}
                onChange={(e) => setHtrWithdrawAmount(e.target.value)}
                placeholder="E.g., 1"
                className="input"
              />
              <p className="text-xs text-muted mt-1">
                Amount of HTR to withdraw from the contract to pay for transaction fees
              </p>
            </div>
          )}

          {/* Push TX Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pushTx}
              onChange={(e) => setPushTx(e.target.checked)}
              className="checkbox checkbox-primary"
              id="pushTxFeeDeposit"
            />
            <label htmlFor="pushTxFeeDeposit" className="text-sm cursor-pointer">
              Push Transaction
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <DryRunCheckbox />
          <button onClick={handleExecute} disabled={loading} className="btn-primary">
            {loading ? 'Depositing...' : 'Deposit Fee Token'}
          </button>
        </div>
      </div>

      {/* Transaction Hash Display (if available) */}
      {(result as { response?: { hash?: string } })?.response?.hash && (
        <div className="card-primary mb-7.5">
          <div className="bg-green-50 border border-green-300 rounded p-4">
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Fee token deposited successfully</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted font-medium">Transaction Hash</span>
                <div className="flex items-center gap-1">
                  <CopyButton text={(result as { response: { hash: string } }).response.hash} label="Copy TX hash" />
                  <TxStatus hash={(result as { response: { hash: string } }).response.hash} walletId={testWalletId} />
                  <ExplorerLink hash={(result as { response: { hash: string } }).response.hash} />
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded p-2 font-mono text-sm break-all">
                {(result as { response: { hash: string } }).response.hash}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intermediates Section */}
      <div className="card-primary mb-7.5">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIntermediatesExpanded(!intermediatesExpanded)}
            className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
          >
            <span>{intermediatesExpanded ? '▼' : '▶'}</span>
            Intermediate Calculations
          </button>
        </div>

        {intermediatesExpanded && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
            <p className="text-sm text-yellow-800 mb-3">
              These values are calculated automatically from your inputs and will be used in the request.
            </p>
            <div className="space-y-3">
              {/* Derived Address */}
              <div className="bg-white border border-yellow-200 rounded overflow-hidden">
                <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-yellow-800">
                      Change Address (from index {addressIndex})
                    </span>
                    {changeAddress && (
                      <CopyButton text={changeAddress} label="Copy" />
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {changeAddress ? (
                    <span className="text-sm font-mono text-yellow-900 break-all">
                      {changeAddress}
                    </span>
                  ) : (
                    <span className="text-sm text-muted italic">
                      Deriving address from wallet...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Request Section */}
      <RpcRequestPreview liveRequest={liveRequest} sentRequest={requestInfo} />

      {/* Response Section */}
      {hasResult && (
        <div className="card-primary mb-7.5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-base font-bold text-primary hover:text-primary-dark flex items-center gap-2"
            >
              <span>{expanded ? '▼' : '▶'}</span>
              {error ? 'Error Details' : 'Response'}
            </button>
            <div className="flex items-center gap-2">
              {(result && !error) ? (
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  {showRawResponse ? 'Show Formatted' : 'Show Raw'}
                </button>
              ) : null}
              <CopyButton
                text={result ? safeStringify(result, 2) as string : error || ''}
                label="Copy response"
              />
            </div>
          </div>

          {expanded && (
            <div className="relative">
              {isDryRun && result === null ? (
                <div className="bg-purple-50 border border-purple-300 rounded p-4">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    <span className="text-sm font-medium">Dry Run Mode</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    The request was generated but not sent to the RPC server. Check the Request
                    section above to see the parameters that would be sent.
                  </p>
                </div>
              ) : (
                <>
                  {error ? (
                    <div className="flex items-start gap-2 p-4 bg-red-50 border border-danger rounded">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-danger flex-shrink-0 mt-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-red-900 break-words">{error}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-success">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">Success</span>
                      </div>
                      {renderResult()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
