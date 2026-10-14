/**
 * Form parts shared by the bet and fee RPC cards (MethodCard children).
 */

import React from 'react';
import { MdOpenInNew } from 'react-icons/md';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { Identifier, type IdentifierKind } from '../common/Identifier';
import TransactionResponseDisplay from '../common/TransactionResponseDisplay';
import type { NetworkKey } from '../../constants/network';
import { resolveExplorerUrl } from '../../utils/networkHelpers';

export function PushTxToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-center gap-2 text-body font-medium">
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        Push transaction to the network
      </label>
      <span className="text-caption text-ink-muted">
        {checked
          ? 'The wallet broadcasts the transaction.'
          : 'The wallet returns the transaction without broadcasting it.'}
      </span>
    </div>
  );
}

export function NcIdField({
  value,
  onChange,
  latest,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Contract created by the matching Initialize stage, if any. */
  latest: string | null;
  hint: string;
}) {
  const canUseLatest = !!latest && latest !== value;
  return (
    <Field
      label="Nano contract ID"
      hint={hint}
      required
      trailing={
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={!canUseLatest}
          title={latest ? undefined : 'No contract initialized in this session yet'}
          onClick={() => latest && onChange(latest)}
        >
          Use latest
        </button>
      }
    >
      <input
        type="text"
        className="input w-full font-mono text-data"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="64-character contract ID"
        spellCheck={false}
      />
    </Field>
  );
}

export function BlueprintIdField({
  value,
  onChange,
  network,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  network: NetworkKey;
  hint: string;
}) {
  return (
    <Field
      label="Blueprint ID"
      hint={hint}
      required
      trailing={
        value ? (
          <a
            href={`${resolveExplorerUrl(network)}blueprint/detail/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary inline-flex items-center gap-1 text-caption"
          >
            Explorer
            <MdOpenInNew aria-hidden="true" />
          </a>
        ) : undefined
      }
    >
      <input
        type="text"
        className="input w-full font-mono text-data"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="64-character blueprint ID"
        spellCheck={false}
      />
    </Field>
  );
}

export function AddressIndexField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min={0}
        className="input w-full font-mono text-data sm:w-32"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      />
    </Field>
  );
}

export interface DerivedValue {
  label: string;
  value: string | number | null;
  kind?: IdentifierKind | 'text';
  /** Shown while `value` is empty. */
  pending: string;
  error?: string;
}

/** Values computed from the inputs and placed in the request. */
export function DerivedValues({ id, rows }: { id: string; rows: DerivedValue[] }) {
  return (
    <section className="flex flex-col gap-3 border-t border-base-300 pt-4" aria-labelledby={id}>
      <h3 id={id} className="m-0 text-body font-semibold">
        Derived values <span className="font-normal text-ink-muted">(computed from the inputs)</span>
      </h3>
      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)]">
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <dt className="text-caption text-ink-muted sm:text-body">{r.label}</dt>
            <dd className="m-0 mb-1 min-w-0 sm:mb-0">
              {r.error ? (
                <span className="text-body text-error">{r.error}</span>
              ) : r.value === null || r.value === '' ? (
                <span className="text-body text-ink-muted">{r.pending}</span>
              ) : !r.kind || r.kind === 'text' ? (
                <span className="break-words font-mono text-data">{r.value}</span>
              ) : (
                <Identifier value={String(r.value)} kind={r.kind} head={10} tail={10} />
              )}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}

export interface TokenOption {
  uid: string;
  symbol: string;
  name?: string;
}

export function TokenSelectField({
  label,
  hint,
  warning,
  value,
  onChange,
  tokens,
  loading = false,
  placeholder,
}: {
  label: string;
  hint: string;
  warning?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  tokens: TokenOption[];
  loading?: boolean;
  /** Empty first option, e.g. "Select a fee token". */
  placeholder?: string;
}) {
  if (loading) {
    return (
      <Field label={label} hint="Loading tokens…" wireControl={false}>
        <div className="skeleton h-9 w-full" aria-hidden="true" />
      </Field>
    );
  }
  if (tokens.length === 0) {
    return (
      <Field label={label} hint={hint} warning={warning}>
        <input
          type="text"
          className="input w-full font-mono text-data"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Token UID (00 for HTR)"
          spellCheck={false}
        />
      </Field>
    );
  }
  return (
    <Field label={label} hint={hint} warning={warning}>
      <select className="select w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {value && !tokens.some((t) => t.uid === value) && <option value={value}>{value}</option>}
        {tokens.map((t) => (
          <option key={t.uid} value={t.uid}>
            {t.symbol}
            {t.name ? ` - ${t.name}` : ''}
            {t.uid === '00' ? '' : ` (${t.uid.slice(0, 8)}…)`}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TokenUidField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <Field label="Token" hint={hint}>
      <input
        type="text"
        className="input w-full font-mono text-data"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Token UID (00 for HTR)"
        spellCheck={false}
      />
    </Field>
  );
}

/** Replaces the card when the active network has no QA blueprint. */
export function BlueprintUnavailableCallout({ kind, networkLabel }: { kind: string; networkLabel: string }) {
  return (
    <Callout tone="warning" title={`Not available on ${networkLabel}`} role="status">
      The {kind} blueprint is deployed on Testnet only. Switch the test wallet to Testnet to use this stage.
    </Callout>
  );
}

export function NanoResponse({
  response,
  network,
  creates = false,
}: {
  response: unknown;
  network: NetworkKey;
  /** The transaction creates a contract: the hash is its ID. */
  creates?: boolean;
}) {
  return (
    <TransactionResponseDisplay
      response={response}
      network={network}
      showNcFields
      hashLabel={creates ? 'Nano contract ID' : 'Transaction hash'}
      hashExplorerPage={creates ? 'nc_detail' : undefined}
    />
  );
}
