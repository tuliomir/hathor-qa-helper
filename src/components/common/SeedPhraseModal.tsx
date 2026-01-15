/**
 * Seed Phrase Modal
 * Reusable modal for displaying seed phrase with QR code for easy scanning on mobile devices
 */

import QRCode from 'react-qr-code';
import CopyButton from './CopyButton';

interface SeedPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedPhrase: string;
  walletName: string;
}

export default function SeedPhraseModal({
  isOpen,
  onClose,
  seedPhrase,
  walletName,
}: SeedPhraseModalProps) {
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
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold m-0">Seed Phrase</h2>
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
            {/* Wallet Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <p className="text-sm text-muted mb-1">Wallet Name:</p>
              <p className="font-bold m-0">{walletName}</p>
            </div>

            {/* Seed Phrase */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">Seed Phrase (24 words)</h3>
              <div className="flex items-start gap-2">
                <div className="flex-1 p-3 bg-gray-100 rounded font-mono text-sm break-words">
                  {seedPhrase}
                </div>
                <CopyButton text={seedPhrase} label="Copy seed phrase" className="flex-shrink-0" />
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold mb-3">QR Code</h3>
              <p className="text-sm text-muted mb-4 text-center">
                Scan this QR code with your mobile device to quickly copy the seed phrase
              </p>
              <div className="p-4 bg-white border-2 border-gray-300 rounded">
                <QRCode value={seedPhrase} size={256} />
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
