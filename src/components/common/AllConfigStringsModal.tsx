/**
 * All Configuration Strings Modal
 * Displays all token configuration strings for copying to the Desktop app
 */

import { useMemo } from 'react';
import { getConfigurationString } from '../../utils/tokenConfigString';
import CopyButton from './CopyButton';
import type { Token } from '../../store/slices/tokensSlice';

interface AllConfigStringsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: Token[];
  walletName: string;
}

export default function AllConfigStringsModal({
  isOpen,
  onClose,
  tokens,
  walletName,
}: AllConfigStringsModalProps) {
  // Generate all configuration strings, separated by double line breaks
  const allConfigStrings = useMemo(() => {
    return tokens
      .map((token) => getConfigurationString(token.uid, token.name, token.symbol))
      .join('\n\n');
  }, [tokens]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold m-0">All Configuration Strings</h2>
              <p className="text-sm text-muted mt-1 mb-0">
                {walletName} - {tokens.length} token{tokens.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {tokens.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted m-0">No custom tokens found for this wallet.</p>
              </div>
            ) : (
              <>
                {/* Instructions */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800 m-0">
                    Copy and paste these configuration strings into the Hathor Desktop Wallet to register all tokens.
                  </p>
                </div>

                {/* All Config Strings */}
                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 p-4 bg-gray-100 rounded font-mono text-xs break-all whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {allConfigStrings}
                    </div>
                    <CopyButton
                      text={allConfigStrings}
                      label="Copy All"
                      className="flex-shrink-0"
                    />
                  </div>
                </div>

                {/* Token List Reference */}
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-muted mb-2">Included Tokens:</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {tokens.map((token) => (
                      <div key={token.uid} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="font-bold">{token.symbol}</span>
                        <span className="text-muted truncate">{token.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="btn btn-ghost px-6 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
