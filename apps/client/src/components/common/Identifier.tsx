/**
 * Identifier — the one way to show a hash, address, token UID, NC id or
 * xpub: mono, middle-truncated, with copy. Clicking the value opens a
 * popover with the full value grouped (8 for hex, 4 for addresses).
 * Shielded addresses get the shield glyph and an accent prefix.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { MdShield } from 'react-icons/md';
import CopyButton from './CopyButton';
import { groupChars, truncateMiddle } from '../../utils/truncate';
import { useAddressTag } from '../../hooks/useAddressTag';

export type IdentifierKind = 'tx' | 'token' | 'nc' | 'address' | 'shielded-address' | 'xpub';

export interface IdentifierProps {
  value: string;
  kind: IdentifierKind;
  truncate?: 'middle' | 'none';
  head?: number;
  tail?: number;
  /** Explicit tag; `false` disables the automatic wallet tag for addresses. */
  walletTag?: string | false;
  copy?: boolean;
  className?: string;
}

const SHIELDED_ADDRESS_LENGTH = 97;
const HEX_KINDS: IdentifierKind[] = ['tx', 'token', 'nc'];

export function Identifier({
  value,
  kind,
  truncate = 'middle',
  head,
  tail,
  walletTag,
  copy = true,
  className = '',
}: IdentifierProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const autoTag = useAddressTag(kind === 'address' || kind === 'shielded-address' ? value : null);
  const tag = walletTag === false ? null : (walletTag ?? autoTag);

  const shielded = kind === 'shielded-address' || (kind === 'address' && value.length === SHIELDED_ADDRESS_LENGTH);
  const hex = HEX_KINDS.includes(kind);
  const h = head ?? (hex ? 8 : 6);
  const t = tail ?? (hex ? 8 : 6);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const prefix = shielded ? value.slice(0, 2) : '';
  const rest = shielded ? value.slice(2) : value;
  const shown = truncate === 'middle' ? truncateMiddle(rest, h, t) : rest;
  const truncated = shown !== rest;

  const display = (
    <>
      {prefix && <b className="font-bold text-accent">{prefix}</b>}
      {truncate === 'none'
        ? groupChars(rest, hex ? 8 : 4, { asArray: true }).map((block, i) => (
            <span key={i}>
              {i > 0 ? ' ' : ''}
              {block}
            </span>
          ))
        : shown}
    </>
  );

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex min-w-0 max-w-full items-center gap-1 align-middle ${className}`}
    >
      {shielded && <MdShield className="h-3.5 w-3.5 flex-none text-accent" aria-label="Shielded" />}
      {truncated ? (
        <button
          type="button"
          className="min-w-0 cursor-pointer whitespace-nowrap rounded-field font-mono text-data hover:bg-base-200"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`${value} (show full value)`}
          title={value}
          onClick={() => setOpen((o) => !o)}
        >
          {display}
        </button>
      ) : (
        <span
          className={`min-w-0 font-mono text-data ${truncate === 'none' ? 'break-normal [overflow-wrap:normal]' : 'whitespace-nowrap'}`}
        >
          {display}
        </span>
      )}
      {copy && <CopyButton text={value} label={`Copy ${kindLabel(kind)}`} />}
      {tag && (
        <span className="whitespace-nowrap rounded-selector bg-base-200 px-1.5 text-caption text-ink-muted">{tag}</span>
      )}
      {open && (
        <span
          id={popoverId}
          role="dialog"
          aria-label="Full value"
          className="absolute left-0 top-full z-30 mt-1 flex w-max max-w-[min(32rem,90vw)] items-start gap-2 rounded-box border border-base-300 bg-base-100 p-3 shadow-float"
        >
          <span className="font-mono text-data leading-6">
            {prefix && <b className="font-bold text-accent">{prefix}</b>}
            {groupChars(rest, hex ? 8 : 4, { asArray: true }).map((block, i) => (
              <span key={i}>
                {i > 0 || prefix ? ' ' : ''}
                {block}
              </span>
            ))}
          </span>
          <CopyButton text={value} label={`Copy ${kindLabel(kind)}`} />
        </span>
      )}
    </span>
  );
}

function kindLabel(kind: IdentifierKind): string {
  switch (kind) {
    case 'tx':
      return 'transaction hash';
    case 'token':
      return 'token UID';
    case 'nc':
      return 'nano contract ID';
    case 'xpub':
      return 'xpub';
    default:
      return 'address';
  }
}

export default Identifier;
