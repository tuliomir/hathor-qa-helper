/**
 * All Configuration Strings Modal
 * Displays all token configuration strings for copying to the Desktop app
 */

import { useMemo } from 'react';
import { getConfigurationString } from '../../utils/tokenConfigString';
import CopyButton from './CopyButton';
import { Modal } from '../ui/Modal';
import { Callout } from '../ui/Callout';
import { EmptyState } from '../ui/EmptyState';
import type { Token } from '../../store/slices/tokensSlice';

interface AllConfigStringsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: Token[];
  walletName: string;
}

export default function AllConfigStringsModal({ isOpen, onClose, tokens, walletName }: AllConfigStringsModalProps) {
  // Generate all configuration strings, separated by double line breaks
  const allConfigStrings = useMemo(() => {
    return tokens.map((token) => getConfigurationString(token.uid, token.name, token.symbol)).join('\n\n');
  }, [tokens]);

  if (!isOpen) return null;

  return (
    <Modal title={`Configuration strings for ${walletName}`} onClose={onClose} size="max-w-3xl">
      {tokens.length === 0 ? (
        <EmptyState>No custom tokens in this wallet.</EmptyState>
      ) : (
        <>
          <Callout tone="info">
            Paste these configuration strings into the Hathor Desktop Wallet to register all tokens.
          </Callout>
          <div className="flex items-start gap-2">
            <pre className="m-0 max-h-96 flex-1 overflow-y-auto rounded-field bg-base-200 px-3 py-2 font-mono text-data whitespace-pre-wrap [overflow-wrap:anywhere]">
              {allConfigStrings}
            </pre>
            <CopyButton text={allConfigStrings} label="Copy all configuration strings" className="flex-none" />
          </div>
          <section className="flex flex-col gap-2" aria-labelledby="all-config-tokens">
            <h3 id="all-config-tokens" className="m-0 text-body font-semibold">
              Included tokens <span className="font-mono text-ink-muted">({tokens.length})</span>
            </h3>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {tokens.map((token) => (
                <li key={token.uid} className="flex min-w-0 items-center gap-2 rounded-field bg-base-200 px-2 py-1.5">
                  <span className="font-semibold">{token.symbol}</span>
                  <span className="truncate text-ink-muted">{token.name}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Modal>
  );
}
