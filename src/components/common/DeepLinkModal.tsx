/**
 * Deep Link Modal
 * Displays a QR code for WalletConnect deep links so mobile devices can scan and connect
 */

import QRCode from 'react-qr-code';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearDeepLink,
  selectDeepLinkModalOpen,
  selectDeepLinkTitle,
  selectDeepLinkToastId,
  selectDeepLinkUrl,
} from '../../store/slices/deepLinkSlice';
import { removeToast } from '../../store/slices/toastSlice';
import CopyButton from './CopyButton';

export default function DeepLinkModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectDeepLinkModalOpen);
  const deepLinkUrl = useAppSelector(selectDeepLinkUrl);
  const title = useAppSelector(selectDeepLinkTitle);
  const toastId = useAppSelector(selectDeepLinkToastId);

  if (!isOpen || !deepLinkUrl) return null;

  const handleClose = () => {
    // Remove the associated toast if it exists
    if (toastId) {
      dispatch(removeToast(toastId));
    }
    // Clear all deep link state
    dispatch(clearDeepLink());
  };

  return (
    <>
      {/* Modal - positioned on the right side to coexist with WalletConnect modal */}
      <div className="fixed top-1/2 right-4 -translate-y-1/2 z-[60] max-w-sm w-full">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary text-white rounded-t-lg">
            <h2 className="text-lg font-bold m-0">{title}</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Instructions */}
            <p className="text-xs text-muted mb-4 text-center">
              Scan with your mobile device to open Hathor Wallet
            </p>

            {/* QR Code */}
            <div className="flex flex-col items-center mb-4">
              <div className="p-3 bg-white border-2 border-gray-300 rounded">
                <QRCode value={deepLinkUrl} size={180} />
              </div>
            </div>

            {/* Deep Link URL */}
            <div>
              <div className="flex items-start gap-2">
                <div className="flex-1 p-2 bg-gray-100 rounded font-mono text-xs break-all max-h-16 overflow-y-auto">
                  {deepLinkUrl}
                </div>
                <CopyButton text={deepLinkUrl} label="Copy" className="flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm px-4 py-1"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
