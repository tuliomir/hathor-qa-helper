/**
 * OutputEditor — the output list for send-transaction stages (RPC, Snap and
 * the shielded stages). Its value, `OutputRow[]`, maps 1:1 onto the QA
 * server's `SendOutput[]` through `toSendOutputs()` (utils/outputRows.ts);
 * amounts are base units as decimal strings, entered through AmountInput.
 */

import { MdAdd, MdClose, MdOutlineCopyAll } from 'react-icons/md';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { AddressInput, type AddressSource, type CustomAddressSource } from './AddressInput';
import { AmountInput } from './AmountInput';
import { ShieldModeSelector } from './ShieldModeSelector';
import TimelockPicker from './TimelockPicker';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { VEIL_STRIP } from '../ui/veil';
import type { NetworkKey } from '../../constants/network';
import { formatAmount } from '../../utils/amount';
import { newOutputRow, outputSummary, type OutputRow } from '../../utils/outputRows';
import { estimateShieldedFee } from '../../fees';

export interface OutputTokenOption {
  uid: string;
  symbol: string;
  name?: string;
  decimals?: number;
}

export interface OutputEditorProps {
  value: OutputRow[];
  onChange: (rows: OutputRow[]) => void;
  /** Token choices; without them the token is a free-text UID field. */
  tokens?: OutputTokenOption[];
  addressSources?: AddressSource[];
  /** Stage-specific quick-fill entries for every recipient. */
  customAddressSources?: CustomAddressSource[];
  /** Network for address validation; defaults to the active network, `null` accepts any. */
  network?: NetworkKey | null;
  allowData?: boolean;
  allowTimelock?: boolean;
  /**
   * Per-row privacy selector: `false` hides it, `true` enables it, a string
   * shows it with the shielded modes disabled for that reason.
   */
  privacy?: boolean | string;
  maxOutputs?: number;
  /** Max button source per token (base units). */
  getMax?: (token: string) => Promise<bigint | string | null>;
  /** Available balance per token (base units), for the above-balance warning. */
  balances?: Record<string, bigint | string | undefined>;
  disabled?: boolean;
}

const HTR: OutputTokenOption = { uid: '00', symbol: 'HTR', name: 'Hathor' };

export function OutputEditor({
  value: rows,
  onChange,
  tokens,
  addressSources = [],
  customAddressSources,
  network,
  allowData = true,
  allowTimelock = true,
  privacy = false,
  maxOutputs = 255,
  getMax,
  balances,
  disabled = false,
}: OutputEditorProps) {
  const summary = outputSummary(rows);
  const fee = estimateShieldedFee(rows.filter((r) => r.type === 'token'));
  const tokenFor = (uid: string): OutputTokenOption =>
    tokens?.find((t) => t.uid === uid) ?? (uid === '00' ? HTR : { uid, symbol: `${uid.slice(0, 8)}…` });
  const privacyReason = typeof privacy === 'string' ? privacy : null;

  const update = (i: number, patch: Partial<OutputRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const duplicate = (i: number) => {
    const copy: Partial<OutputRow> = { ...rows[i] };
    delete copy.id;
    onChange([...rows.slice(0, i + 1), newOutputRow(copy), ...rows.slice(i + 1)]);
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const shielded = row.type === 'token' && row.privacy !== 'TRANSPARENT';
        const token = tokenFor(row.token);
        const n = i + 1;
        return (
          <div
            key={row.id}
            className={`relative flex flex-col gap-3 rounded-box bg-base-200 p-3 ${shielded ? 'pl-4' : ''}`}
          >
            {shielded && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] rounded-l-box ${VEIL_STRIP}`} />}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Output {n}</span>
              {allowData && (
                <SegmentedControl
                  size="sm"
                  aria-label={`Output ${n} type`}
                  value={row.type}
                  disabled={disabled}
                  onChange={(type) => update(i, { type })}
                  options={[
                    { value: 'token', label: 'Token' },
                    { value: 'data', label: 'Data' },
                  ]}
                />
              )}
              <span className="ml-auto" />
              {privacy !== false && row.type === 'token' && (
                <ShieldModeSelector
                  value={row.privacy}
                  disabledReason={privacyReason}
                  onChange={(p) => update(i, { privacy: p })}
                />
              )}
              <div className="flex items-center">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  aria-label={`Duplicate output ${n}`}
                  title="Duplicate"
                  disabled={disabled || rows.length >= maxOutputs}
                  onClick={() => duplicate(i)}
                >
                  <MdOutlineCopyAll aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  aria-label={`Remove output ${n}`}
                  title={rows.length === 1 ? 'At least one output is required' : 'Remove'}
                  disabled={disabled || rows.length === 1}
                  onClick={() => remove(i)}
                >
                  <MdClose aria-hidden="true" />
                </button>
              </div>
            </div>

            {row.type === 'token' ? (
              <>
                <AddressInput
                  label="Recipient"
                  value={row.address}
                  onChange={(address) => update(i, { address })}
                  placeholder="Recipient address"
                  sources={addressSources}
                  customSources={customAddressSources}
                  accept={shielded ? 'shielded' : 'transparent'}
                  network={network}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AmountInput
                    value={row.value}
                    onChange={(v) => update(i, { value: v })}
                    token={{ uid: token.uid, symbol: token.symbol, decimals: token.decimals ?? DECIMAL_PLACES }}
                    max={getMax ? () => getMax(row.token) : undefined}
                    balance={balances?.[row.token]}
                    disabled={disabled}
                  />
                  {tokens && tokens.length > 0 ? (
                    <Field label="Token">
                      <select
                        className="select w-full"
                        value={row.token}
                        disabled={disabled}
                        onChange={(e) => update(i, { token: e.target.value })}
                      >
                        {!tokens.some((t) => t.uid === row.token) && <option value={row.token}>{row.token}</option>}
                        {tokens.map((t) => (
                          <option key={t.uid} value={t.uid}>
                            {t.symbol}
                            {t.name ? ` - ${t.name}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Token UID" hint="00 for HTR">
                      <input
                        className="input w-full font-mono text-data"
                        value={row.token}
                        disabled={disabled}
                        onChange={(e) => update(i, { token: e.target.value.trim() })}
                      />
                    </Field>
                  )}
                  {allowTimelock && (
                    <TimelockPicker
                      className="sm:col-span-2"
                      value={row.timelock}
                      onChange={(timelock) => update(i, { timelock })}
                    />
                  )}
                </div>
              </>
            ) : (
              <Field label="Data" hint={`${row.data.length} of 255 characters`}>
                <textarea
                  className="textarea w-full font-mono text-data"
                  value={row.data}
                  maxLength={255}
                  disabled={disabled}
                  placeholder="Text stored on chain"
                  onChange={(e) => update(i, { data: e.target.value })}
                />
              </Field>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || rows.length >= maxOutputs}
          onClick={() => onChange([...rows, newOutputRow()])}
        >
          <MdAdd aria-hidden="true" />
          Add output
        </button>
        <span className="text-caption text-ink-muted">
          {summary.count} of {maxOutputs} outputs
          {privacy !== false && `, ${summary.shielded} shielded`}
          {privacy !== false &&
            fee.minFee > 0n &&
            `. Shielded fee at least ${formatAmount(fee.minFee, DECIMAL_PLACES, { grouping: true })} HTR`}
          {summary.totals.length > 0 &&
            `. Totals: ${summary.totals
              .map((t) => {
                const tok = tokenFor(t.token);
                return `${formatAmount(t.value, tok.decimals ?? DECIMAL_PLACES, { grouping: true })} ${tok.symbol}`;
              })
              .join(', ')}`}
        </span>
      </div>

      {privacy !== false && fee.padding !== 'none' && (
        <Callout tone="shielded" title="One shielded output">
          A transaction needs at least two shielded outputs.{' '}
          {fee.padding === 'split'
            ? 'wallet-lib splits this one into two halves to the same address, so the recipient gets two outputs and the fee is paid twice.'
            : 'A 1-unit output cannot be split, so wallet-lib shields the HTR change as the second output.'}
        </Callout>
      )}
    </div>
  );
}

export default OutputEditor;
