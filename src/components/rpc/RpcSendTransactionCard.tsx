/**
 * RPC Send Transaction Card
 *
 * Card component for testing htr_sendTransaction RPC method
 */

import React, { useEffect, useState } from 'react';
import CopyButton from '../common/CopyButton';
import { useToast } from '../../hooks/useToast';
import DryRunCheckbox from '../common/DryRunCheckbox';
import SendToRawEditorButton from '../common/SendToRawEditorButton';
import TransactionResponseDisplay from '../common/TransactionResponseDisplay';
import type { SendTransactionOutput } from '../../store/slices/sendTransactionSlice';
import type { NetworkType } from '../../constants/network';
import Select from '../common/Select';
// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import type HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';

interface Token {
  uid: string;
  name: string;
  symbol: string;
}

export interface RpcSendTransactionCardProps {
  onExecute: (outputs: SendTransactionOutput[], pushTx: boolean) => Promise<{ request: unknown; response: unknown }>;
  disabled?: boolean;
  isDryRun?: boolean;
  network: NetworkType;
  testWallet?: HathorWallet | null;
  fundingWallet?: HathorWallet | null;
  availableTokens: Token[];
  isLoadingTokens: boolean;
  initialRequest?: { method: string; params: unknown } | null;
  initialResponse?: unknown | null;
  initialError?: string | null;
  initialFormData?: {
    pushTx: boolean;
    outputs: SendTransactionOutput[];
  };
}

export const RpcSendTransactionCard: React.FC<RpcSendTransactionCardProps> = ({
  onExecute,
  disabled = false,
  isDryRun = false,
  network,
  testWallet = null,
  fundingWallet = null,
  availableTokens,
  isLoadingTokens,
  initialRequest = null,
  initialResponse = null,
  initialError = null,
  initialFormData,
}) => {
  const { showToast } = useToast();

  // Component state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(initialResponse);
  const [error, setError] = useState<string | null>(initialError);
  const [requestInfo, setRequestInfo] = useState<{ method: string; params: unknown } | null>(initialRequest);
  const [expanded, setExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);

  // Form state
  const [pushTx, setPushTx] = useState(initialFormData?.pushTx ?? false);
  const [outputs, setOutputs] = useState<SendTransactionOutput[]>(
    initialFormData?.outputs?.map(o => ({
      address: o.address,
      value: o.value,
      token: o.token || '00'
    })) ?? [{ address: '', value: '', token: '00' }]
  );

  // Sync with initial values from Redux
  useEffect(() => {
    if (initialRequest) {
      setRequestInfo(initialRequest);
      setRequestExpanded(true);
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

  // Add output
  const handleAddOutput = () => {
    if (outputs.length >= 255) {
      showToast('Maximum 255 outputs allowed', 'error');
      return;
    }
    setOutputs([...outputs, { address: '', value: '', token: '00' }]);
  };

  // Remove output
  const handleRemoveOutput = (index: number) => {
    if (outputs.length === 1) {
      showToast('At least one output is required', 'error');
      return;
    }
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  // Update output
  const handleOutputChange = (index: number, field: 'address' | 'value' | 'token', value: string) => {
    const newOutputs = [...outputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setOutputs(newOutputs);
  };

  // Populate address from test wallet
  const handleSelectAddress0 = async (index: number) => {
    if (!testWallet) {
      showToast('Test wallet not available', 'error');
      return;
    }

    try {
      const address = await testWallet.getAddressAtIndex(0);
      const newOutputs = [...outputs];
      newOutputs[index] = { ...newOutputs[index], address };
      setOutputs(newOutputs);
      showToast('Address populated', 'success');
    } catch (error) {
      console.error('Failed to get address:', error);
      showToast('Failed to get address from wallet', 'error');
    }
  };

  // Populate address from funding wallet
  const handleSelectExternalAddr = async (index: number) => {
    if (!fundingWallet) {
      showToast('Funding wallet not available', 'error');
      return;
    }

    try {
      const address = await fundingWallet.getAddressAtIndex(0);
      const newOutputs = [...outputs];
      newOutputs[index] = { ...newOutputs[index], address };
      setOutputs(newOutputs);
      showToast('External address populated', 'success');
    } catch (error) {
      console.error('Failed to get external address:', error);
      showToast('Failed to get address from funding wallet', 'error');
    }
  };

  const handleExecute = async () => {
    // Validation
    if (outputs.some(o => !o.address || !o.value)) {
      showToast('All outputs must have an address and value', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);

    try {
      const { request, response } = await onExecute(outputs, pushTx);

      // Store request and response separately
      setRequestInfo(request as { method: string; params: unknown });
      setResult(response);
      setRequestExpanded(true);
      setExpanded(true);

      showToast(
        isDryRun ? 'Request generated (not sent to RPC)' : 'Transaction sent successfully',
        'success'
      );
    } catch (err: unknown) {
      const errorMessage = (err instanceof Error ? err.message : null) || 'An error occurred';
      setError(errorMessage);
      setExpanded(true);

      // Capture request params from error if available
      if (err && typeof err === 'object' && 'requestParams' in err) {
        setRequestInfo(err.requestParams as { method: string; params: unknown });
        setRequestExpanded(true);
      }

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result !== null || error !== null;

  // Safe stringify helper for BigInt
  const safeStringify = (obj: unknown, spaces = 0): string => {
    return JSON.stringify(
      obj,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      spaces
    );
  };


  return (
    <div className="card-primary mb-7.5">
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold m-0">Send Transaction</h3>
              {isDryRun && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
                  DRY RUN
                </span>
              )}
            </div>
            <p className="text-sm text-muted m-0">Send a transaction with one or more outputs</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 pt-2">
          {/* Push Transaction Toggle */}
          <div className="space-y-2 bg-gray-50 rounded p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pushTx}
                onChange={(e) => setPushTx(e.target.checked)}
                className="checkbox"
                id="push-tx-checkbox"
              />
              <label htmlFor="push-tx-checkbox" className="text-sm cursor-pointer">
                Push transaction to network
              </label>
            </div>
            <p className="text-xs text-muted m-0">
              {pushTx
                ? 'Transaction will be broadcast to the network and fully processed'
                : 'Returns only the transaction hex without broadcasting'}
            </p>
          </div>

          {/* Outputs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                Outputs ({outputs.length}/255)
              </label>
              <button
                onClick={handleAddOutput}
                disabled={outputs.length >= 255}
                className="btn-secondary py-1.5 px-3 text-sm"
              >
                + Add Output
              </button>
            </div>
            <div className="space-y-3">
              {outputs.map((output, index) => (
                <div key={index} className="bg-gray-50 rounded p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Output {index + 1}</span>
                    {outputs.length > 1 && (
                      <button
                        onClick={() => handleRemoveOutput(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <input
                        value={output.address}
                        onChange={(e) => handleOutputChange(index, 'address', e.target.value)}
                        placeholder="Address (base58)"
                        className="input w-full"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAddress0(index)}
                          disabled={!testWallet}
                          className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap flex-1"
                          title="Populate with address 0 from test wallet"
                        >
                          Use Addr0
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectExternalAddr(index)}
                          disabled={!fundingWallet}
                          className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap flex-1"
                          title="Populate with address 0 from funding wallet"
                        >
                          Use external addr
                        </button>
                      </div>
                    </div>
                    <input
                      value={output.value}
                      onChange={(e) => handleOutputChange(index, 'value', e.target.value)}
                      placeholder="Amount (in tokens)"
                      className="input"
                      type="number"
                    />
                    <div>
                      <label className="block mb-1 text-xs font-medium text-muted">Token:</label>
                      <Select
                        value={output.token}
                        onChange={(e) => handleOutputChange(index, 'token', e.target.value)}
                        disabled={isLoadingTokens || availableTokens.length === 0}
                      >
                        {isLoadingTokens ? (
                          <option>Loading tokens...</option>
                        ) : availableTokens.length === 0 ? (
                          <option>No tokens available</option>
                        ) : (
                          availableTokens.map((token) => (
                            <option key={token.uid} value={token.uid}>
                              {token.symbol} - {token.name}
                            </option>
                          ))
                        )}
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Execute Button */}
        <div className="flex items-center gap-4 justify-end">
          <DryRunCheckbox />
          <button
            onClick={handleExecute}
            disabled={loading || disabled}
            className="btn-primary"
          >
            {loading ? 'Sending...' : 'Send Transaction'}
          </button>
        </div>

        {/* Request Section (Blue-themed) */}
        {requestInfo && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setRequestExpanded(!requestExpanded)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
              >
                {requestExpanded ? '▼' : '▶'} Request
              </button>
              <div className="flex items-center gap-3">
                <SendToRawEditorButton requestJson={safeStringify(requestInfo, 2)} />
                <CopyButton text={safeStringify(requestInfo, 2)} label="Copy request" />
              </div>
            </div>

            {requestExpanded && (
              <div className="bg-blue-50 border border-blue-300 rounded p-4">
                <div className="space-y-2">
                  <div className="bg-white border border-blue-200 rounded overflow-hidden">
                    <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                      <span className="text-sm font-semibold text-blue-800">method</span>
                    </div>
                    <div className="px-3 py-2">
                      <span className="text-sm font-mono text-blue-900">{requestInfo.method}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 rounded overflow-hidden">
                    <div className="bg-blue-100 px-3 py-2 border-b border-blue-200">
                      <span className="text-sm font-semibold text-blue-800">params</span>
                    </div>
                    <div className="px-3 py-2 max-h-64 overflow-y-auto">
                      <pre className="text-sm font-mono text-blue-900 text-left">
                        {safeStringify(requestInfo.params, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Response Section */}
        {hasResult && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpanded(!expanded)}
                className={`text-sm font-medium flex items-center ${
                  error ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                }`}
              >
                {expanded ? '▼' : '▶'} {error ? 'Error Details' : 'Response'}
              </button>
              {!error && result ? (
                <CopyButton text={safeStringify(result, 2)} label="Copy response" />
              ) : null}
            </div>

            {expanded && (
              <div className={error ? 'bg-red-50 border border-red-300 rounded p-4' : 'bg-green-50 border border-green-300 rounded p-4'}>
                {error ? (
                  <div className="text-sm text-red-900 break-words">{error}</div>
                ) : result ? (
                  <TransactionResponseDisplay
                    response={result}
                    network={network}
                  />
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
