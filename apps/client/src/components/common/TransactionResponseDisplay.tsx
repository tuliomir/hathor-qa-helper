/**
 * Transaction Response Display Component
 *
 * Reusable component for displaying transaction response data
 * with formatted sections for hash, metadata, inputs, outputs, etc.
 */

import React from 'react';
import { ExplorerLink } from './ExplorerLink';
import { Identifier, type IdentifierKind } from './Identifier';
import type { ExplorerPage } from '../../utils/networkHelpers';

/**
 * Helper function to safely stringify objects containing BigInt values
 */
const safeStringify = (obj: unknown, spaces = 0): string => {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), spaces);
};

export interface TransactionData {
  hash?: string;
  inputs?: Array<{
    hash: string;
    index: number;
    data?: { type: string; data: number[] };
  }>;
  outputs?: Array<{
    value: string;
    tokenData: number;
    script?: { type: string; data: number[] };
    decodedScript?: {
      address?: { base58: string };
      timelock?: number | null;
      data?: string;
    };
  }>;
  version?: number;
  weight?: number;
  nonce?: number;
  timestamp?: number;
  signalBits?: number;
  parents?: string[];
  tokens?: string[];
  nc_id?: string;
  nc_method?: string;
  nc_pubkey?: string;
}

export interface TransactionResponseDisplayProps {
  /** The transaction response data */
  response: unknown;
  /** Network type for explorer links */
  network: string;
  /** Optional: Show NC-specific fields like nc_id, nc_method */
  showNcFields?: boolean;
  /** Optional: Custom label for the hash (e.g., "Nano contract ID" vs "Transaction hash") */
  hashLabel?: string;
  /** Optional: Explorer page for the hash link (undefined = transaction, 'nc_detail', or 'token_detail') */
  hashExplorerPage?: ExplorerPage;
}

const PRE =
  'm-0 max-h-64 overflow-auto rounded-field bg-base-200 p-2 font-mono text-data-sm whitespace-pre-wrap [overflow-wrap:anywhere]';

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-box border border-base-300">
      <h4 className="m-0 border-b border-base-300 bg-base-200 px-3 py-1.5 text-caption font-semibold">{title}</h4>
      <div className="flex flex-col gap-2 px-3 py-2 text-body">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <span className="text-caption text-ink-muted">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function IdRow({
  value,
  kind,
  network,
  page,
}: {
  value: string;
  kind: IdentifierKind;
  network: string;
  page?: ExplorerPage;
}) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <Identifier value={value} kind={kind} />
      <ExplorerLink hash={value} network={network} specificPage={page} />
    </span>
  );
}

export const TransactionResponseDisplay: React.FC<TransactionResponseDisplayProps> = ({
  response,
  network,
  showNcFields = false,
  hashLabel = 'Transaction hash',
  hashExplorerPage,
}) => {
  // Render Buffer object
  const renderBuffer = (buffer: { type: string; data: number[] }) => {
    if (buffer.type !== 'Buffer' || !Array.isArray(buffer.data)) {
      return JSON.stringify(buffer);
    }
    // Show first few bytes and indicate if there are more
    const preview = buffer.data.slice(0, 20).join(', ');
    const remaining = buffer.data.length - 20;
    return `[${preview}${remaining > 0 ? `, ... (${remaining} more bytes)` : ''}]`;
  };

  // Extract the actual transaction data from response wrapper if needed
  const extractTxData = (data: unknown): TransactionData | null => {
    if (!data || typeof data !== 'object') return null;

    // Check for type: X and response object pattern
    if ('type' in data && 'response' in data) {
      const innerResponse = (data as { response?: unknown }).response;
      if (innerResponse && typeof innerResponse === 'object') {
        return innerResponse as TransactionData;
      }
    }

    // Check if it's the transaction object directly
    if ('hash' in data || 'inputs' in data || 'outputs' in data) {
      return data as TransactionData;
    }

    return null;
  };

  // Check if response is hex string (push_tx = false)
  const isHexStringResponse = (data: unknown): boolean => {
    if (typeof data === 'string') {
      return /^[0-9a-fA-F]+$/.test(data);
    }
    if (data && typeof data === 'object' && 'type' in data && 'response' in data) {
      const innerResponse = (data as { response?: unknown }).response;
      return typeof innerResponse === 'string' && /^[0-9a-fA-F]+$/.test(innerResponse);
    }
    return false;
  };

  // Check if response is transaction object
  const isTransactionResponse = (data: unknown): boolean => {
    const tx = extractTxData(data);
    return tx !== null;
  };

  // Render hex string response
  const renderHexResponse = (data: unknown): React.ReactElement => {
    const hexString = typeof data === 'string' ? data : (data as { response?: string }).response;
    return (
      <Section title="Transaction hex">
        <pre className={PRE}>{hexString}</pre>
      </Section>
    );
  };

  // Render transaction response
  const renderTransactionResponse = (data: unknown): React.ReactElement => {
    const tx = extractTxData(data);

    if (!tx) {
      return renderRawJson(data);
    }

    const hashKind: IdentifierKind =
      hashExplorerPage === 'nc_detail' ? 'nc' : hashExplorerPage === 'token_detail' ? 'token' : 'tx';

    return (
      <div className="flex flex-col gap-3 text-left">
        {tx.hash && (
          <Section title={hashLabel}>
            <IdRow value={tx.hash} kind={hashKind} network={network} page={hashExplorerPage} />
          </Section>
        )}

        {showNcFields && (tx.nc_id || tx.nc_method || tx.nc_pubkey) && (
          <Section title="Nano contract">
            {tx.nc_id && (
              <Row label="NC ID">
                <IdRow value={tx.nc_id} kind="nc" network={network} page="nc_detail" />
              </Row>
            )}
            {tx.nc_method && (
              <Row label="Method">
                <code className="font-mono text-data">{tx.nc_method}</code>
              </Row>
            )}
            {tx.nc_pubkey && (
              <Row label="Public key">
                <Identifier value={tx.nc_pubkey} kind="xpub" />
              </Row>
            )}
          </Section>
        )}

        {(tx.version !== undefined ||
          tx.weight !== undefined ||
          tx.nonce !== undefined ||
          tx.timestamp !== undefined ||
          tx.signalBits !== undefined) && (
          <Section title="Metadata">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {(
                [
                  ['Version', tx.version],
                  ['Weight', typeof tx.weight === 'number' ? tx.weight.toFixed(2) : tx.weight],
                  ['Nonce', tx.nonce],
                  [
                    'Timestamp',
                    tx.timestamp !== undefined
                      ? `${new Date(tx.timestamp * 1000).toLocaleString()} (${tx.timestamp})`
                      : undefined,
                  ],
                  ['Signal bits', tx.signalBits],
                ] as const
              )
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-caption text-ink-muted">{k}</dt>
                    <dd className="m-0 font-mono text-data tabular-nums">{v}</dd>
                  </React.Fragment>
                ))}
            </dl>
          </Section>
        )}

        {tx.inputs && tx.inputs.length > 0 && (
          <Section title={`Inputs (${tx.inputs.length})`}>
            <ol className="m-0 flex max-h-48 list-none flex-col gap-2 overflow-y-auto p-0">
              {tx.inputs.map((input, idx) => (
                <li key={idx} className="flex flex-col gap-1 border-b border-base-300 pb-2 last:border-0 last:pb-0">
                  <span className="text-caption font-semibold">Input {idx}</span>
                  <Row label="Hash">
                    <IdRow value={input.hash} kind="tx" network={network} />
                  </Row>
                  <Row label="Index">
                    <span className="font-mono text-data">{input.index}</span>
                  </Row>
                  {input.data && <pre className={PRE}>{renderBuffer(input.data)}</pre>}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {tx.outputs && tx.outputs.length > 0 && (
          <Section title={`Outputs (${tx.outputs.length})`}>
            <ol className="m-0 flex max-h-48 list-none flex-col gap-2 overflow-y-auto p-0">
              {tx.outputs.map((output, idx) => {
                const isDataOutput = output.decodedScript?.data !== undefined;
                return (
                  <li key={idx} className="flex flex-col gap-1 border-b border-base-300 pb-2 last:border-0 last:pb-0">
                    <span className="flex items-center gap-2 text-caption font-semibold">
                      Output {idx}
                      {isDataOutput && (
                        <span className="rounded-selector bg-base-200 px-1.5 font-normal text-ink-muted">Data</span>
                      )}
                    </span>
                    <Row label="Value">
                      <span className="font-mono text-data tabular-nums">{output.value}</span>
                    </Row>
                    <Row label="Token data">
                      <span className="font-mono text-data">{output.tokenData}</span>
                    </Row>
                    {output.decodedScript?.address?.base58 && (
                      <Row label="Address">
                        <Identifier value={output.decodedScript.address.base58} kind="address" />
                      </Row>
                    )}
                    {output.decodedScript?.data !== undefined && <pre className={PRE}>{output.decodedScript.data}</pre>}
                    {output.decodedScript?.timelock !== undefined && output.decodedScript.timelock !== null && (
                      <Row label="Timelock">
                        <span className="font-mono text-data">{output.decodedScript.timelock}</span>
                      </Row>
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>
        )}

        {tx.parents && tx.parents.length > 0 && (
          <Section title={`Parents (${tx.parents.length})`}>
            {tx.parents.map((parent) => (
              <IdRow key={parent} value={parent} kind="tx" network={network} />
            ))}
          </Section>
        )}

        {tx.tokens && tx.tokens.length > 0 && (
          <Section title={`Tokens (${tx.tokens.length})`}>
            {tx.tokens.map((token) => (
              <IdRow key={token} value={token} kind="token" network={network} page="token_detail" />
            ))}
          </Section>
        )}

        {/* Full TX JSON is accessible via the parent's Formatted/Raw toggle */}
      </div>
    );
  };

  // Render raw JSON
  const renderRawJson = (data: unknown): React.ReactElement => <pre className={PRE}>{safeStringify(data, 2)}</pre>;

  // Determine which renderer to use
  if (isHexStringResponse(response)) {
    return renderHexResponse(response);
  }

  if (isTransactionResponse(response)) {
    return renderTransactionResponse(response);
  }

  return renderRawJson(response);
};

export default TransactionResponseDisplay;
