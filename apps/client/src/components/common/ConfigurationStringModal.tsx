/**
 * Configuration String Modal
 * Shows a token's configuration string with a QR code.
 */

import QRCode from 'react-qr-code';
import { getConfigurationString } from '../../utils/tokenConfigString';
import CopyButton from './CopyButton';
import { Modal } from '../ui/Modal';

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

  const configString = getConfigurationString(tokenUid, tokenName, tokenSymbol);

  return (
    <Modal title="Configuration string" onClose={onClose}>
      <dl className="m-0 grid grid-cols-2 gap-3 rounded-box bg-base-200 p-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">Symbol</dt>
          <dd className="m-0 font-semibold">{tokenSymbol}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">Name</dt>
          <dd className="m-0 font-semibold">{tokenName}</dd>
        </div>
      </dl>
      <div className="flex items-start gap-2">
        <code className="block flex-1 rounded-field bg-base-200 px-3 py-2 font-mono text-data [overflow-wrap:anywhere]">
          {configString}
        </code>
        <CopyButton text={configString} label="Copy configuration string" className="flex-none" />
      </div>
      <div className="flex justify-center">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <QRCode value={configString} size={200} />
        </div>
      </div>
    </Modal>
  );
}
