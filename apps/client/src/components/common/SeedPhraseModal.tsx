/**
 * Seed Phrase Modal
 * Shows a wallet's seed phrase with a QR code for scanning on mobile devices.
 */

import QRCode from 'react-qr-code';
import CopyButton from './CopyButton';
import { Modal } from '../ui/Modal';

interface SeedPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedPhrase: string;
  walletName: string;
}

export default function SeedPhraseModal({ isOpen, onClose, seedPhrase, walletName }: SeedPhraseModalProps) {
  if (!isOpen) return null;

  return (
    <Modal title="Seed phrase" onClose={onClose}>
      <p className="m-0 text-body">
        <span className="text-ink-muted">Wallet</span> <span className="font-semibold">{walletName}</span>
      </p>
      <div className="flex items-start gap-2">
        <p className="m-0 flex-1 rounded-field bg-base-200 px-3 py-2 font-mono text-data">{seedPhrase}</p>
        <CopyButton text={seedPhrase} label="Copy seed phrase" className="flex-none" />
      </div>
      <figure className="m-0 flex flex-col items-center gap-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <QRCode value={seedPhrase} size={256} />
        </div>
        <figcaption className="text-caption text-ink-muted">
          Scan with your mobile device to copy the seed phrase.
        </figcaption>
      </figure>
    </Modal>
  );
}
