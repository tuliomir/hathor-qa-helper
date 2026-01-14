/**
 * Configuration String Modal
 * Reusable modal for displaying token configuration strings with QR code
 */

import QRCode from 'react-qr-code';
import { tokensUtils } from '@hathor/wallet-lib';
import CopyButton from './CopyButton';

interface ConfigurationStringModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenUid: string;
  tokenName: string;
  tokenSymbol: string;
}

export default function ConfigurationStringModal({
  isOpen,
  onClose,
  tokenUid,
  tokenName,
  tokenSymbol,
}: ConfigurationStringModalProps) {
  if (!isOpen) return null;

  const configString = tokensUtils.getConfigurationString(tokenUid, tokenName, tokenSymbol);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold m-0">Configuration String</h2>
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
            {/* Token Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted mb-1">Symbol:</p>
                  <p className="font-bold m-0">{tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-sm text-muted mb-1">Name:</p>
                  <p className="font-bold m-0">{tokenName}</p>
                </div>
              </div>
            </div>

            {/* Configuration String */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">Configuration String</h3>
              <div className="flex items-start gap-2">
                <div className="flex-1 p-3 bg-gray-100 rounded font-mono text-xs break-all">
                  {configString}
                </div>
                <CopyButton text={configString} label="Copy" className="flex-shrink-0" />
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold mb-3">QR Code</h3>
              <div className="p-4 bg-white border-2 border-gray-300 rounded">
                <QRCode value={configString} size={200} />
              </div>
            </div>
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
