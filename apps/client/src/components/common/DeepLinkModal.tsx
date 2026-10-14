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
import { MdClose } from 'react-icons/md';
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

  // A side panel, not a blocking modal: it sits next to the WalletConnect modal.
  return (
    <div
      className="fixed right-4 top-1/2 z-[60] w-full max-w-sm -translate-y-1/2"
      role="dialog"
      aria-labelledby="deep-link-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div className="flex max-h-[90vh] flex-col overflow-y-auto rounded-box border border-base-300 bg-base-100 text-left shadow-float">
        <header className="flex items-center gap-2 border-b border-base-300 px-4 py-3">
          <h2 id="deep-link-modal-title" className="m-0 text-title-sm">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-square ml-auto"
            aria-label="Close"
          >
            <MdClose aria-hidden="true" />
          </button>
        </header>
        <div className="flex flex-col items-center gap-3 p-4">
          <p className="m-0 text-caption text-ink-muted">Scan with your mobile device to open Hathor Wallet.</p>
          <div className="rounded-box border border-base-300 bg-base-100 p-3">
            <QRCode value={deepLinkUrl} size={180} />
          </div>
          <div className="flex w-full items-start gap-2">
            <code className="block max-h-16 flex-1 overflow-y-auto rounded-field bg-base-200 px-2 py-1.5 font-mono text-data-sm [overflow-wrap:anywhere]">
              {deepLinkUrl}
            </code>
            <CopyButton text={deepLinkUrl} label="Copy deep link" className="flex-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
