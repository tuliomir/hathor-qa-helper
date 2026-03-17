/**
 * RPC Fee Initialize Card Component
 *
 * Card for testing fee NC initialization via RPC call
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import { ExplorerLink } from '../common/ExplorerLink';
import DryRunCheckbox from '../common/DryRunCheckbox';
import TransactionResponseDisplay from '../common/TransactionResponseDisplay';
import { RpcRequestPreview } from './RpcRequestPreview';
import { safeStringify } from '../../utils/betHelpers';
import { NETWORK_CONFIG } from '../../constants/network';
import TxStatus from '../common/TxStatus.tsx'
import { useAppSelector } from '../../store/hooks.ts'
import { extractErrorMessage } from '../../utils/errorUtils';

export interface RpcFeeInitializeCardProps {
  onExecute: () => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  blueprintId: string;
  setBlueprintId: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  changeAddress: string;
  addressIndex: number;
  setAddressIndex: (value: number) => void;
  pushTx: boolean;
  setPushTx: (value: boolean) => void;
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
}

export const RpcFeeInitializeCard: React.FC<RpcFeeInitializeCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  blueprintId,
  setBlueprintId,
  amount,
  setAmount,
  changeAddress,
  addressIndex,
  setAddressIndex,
  pushTx,
  setPushTx,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
	const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId ?? undefined);
  const { showToast } = useToast();

  // Live request building - calculate request on every input change
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
    const invokeParams = {
      network: 'testnet',
      method: 'initialize',
      blueprint_id: blueprintId || '<blueprint_id>',
      actions: [
        {
          type: 'deposit',
          token: '00',
          amount: amount || '10',
          changeAddress: changeAddress || '<change_address>',
        },
      ],
      args: [],
      push_tx: pushTx,
      nc_id: null,
    };

    const requestParams = {
      method: 'htr_sendNanoContractTx',
      params: invokeParams,
    };

    setLiveRequest(requestParams);
  }, [blueprintId, amount, changeAddress, pushTx]);

  const handleExecute = async () => {
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

      console.log(`[RPC Request] Initialize Fee`, request);
      console.log(`[RPC Success] Initialize Fee`, response);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Fee initialized successfully',
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

      console.error(`[RPC Error] Initialize Fee`, {
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
          {safeStringify(data, 2) as string}
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
          hashLabel="Nano Contract ID"
          hashExplorerPage="nc_detail"
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
            <h3 className="text-lg font-bold">Initialize Fee</h3>
            <p className="text-sm text-muted mt-1">
              Initialize a new fee nano contract with an HTR deposit
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
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              DRY RUN
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Blueprint ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Blueprint ID</label>
            <div className="relative">
              <input
                type="text"
                value={blueprintId}
                onChange={(e) => setBlueprintId(e.target.value)}
                placeholder="Enter blueprint ID"
                className="input pr-10"
              />
              {blueprintId && (
                <a
                  href={`${NETWORK_CONFIG.TESTNET.explorerUrl}blueprint/detail/${blueprintId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary transition-colors"
                  title="View blueprint in explorer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              The blueprint ID for the fee nano contract
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              HTR amount to deposit for initialization
            </p>
          </div>

          {/* Address Index */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Address Index</label>
            <input
              type="number"
              value={addressIndex}
              onChange={(e) => setAddressIndex(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0"
              className="input"
            />
            <p className="text-xs text-muted mt-1">
              Index of the address to use as the change address
            </p>
          </div>

          {/* Push TX Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pushTx}
              onChange={(e) => setPushTx(e.target.checked)}
              className="checkbox checkbox-primary"
              id="feePushTx"
            />
            <label htmlFor="feePushTx" className="text-sm cursor-pointer">
              Push Transaction
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <DryRunCheckbox />
          <button onClick={handleExecute} disabled={loading || disabled} className="btn-primary">
            {loading ? 'Initializing...' : 'Initialize Fee'}
          </button>
        </div>
      </div>

      {/* NC ID Display (if available) */}
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
              <span className="font-medium">Fee initialized successfully</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted font-medium">Nano Contract ID</span>
                <div className="flex items-center gap-1">
                  <CopyButton text={(result as { response: { hash: string } }).response.hash} label="Copy NC ID" />
                  <TxStatus hash={(result as { response: { hash: string } }).response.hash} walletId={testWalletId} />
                  <ExplorerLink hash={(result as { response: { hash: string } }).response.hash} />
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded p-2 font-mono text-xs break-all">
                {(result as { response: { hash: string } }).response.hash}
              </div>
            </div>
          </div>
        </div>
      )}

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
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
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

                      {/* Nano Contract ID Display */}
                      {(() => {
                        try {
                          const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                          const hash = parsedResult?.response?.hash;

                          if (hash) {
                            return (
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
                                  <span className="font-medium">Nano Contract Created</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-muted font-medium">Nano Contract ID (Hash)</span>
                                    <div className="flex items-center gap-1">
                                      <CopyButton text={hash} label="Copy ID" />
                                      <TxStatus hash={hash} walletId={testWalletId} />
                                      <ExplorerLink hash={hash} specificPage="nc_detail" />
                                    </div>
                                  </div>
                                  <div className="bg-white border border-green-200 rounded p-2 font-mono text-sm break-all">
                                    {hash}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        } catch {
                          // Ignore parsing errors
                        }
                        return null;
                      })()}

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
