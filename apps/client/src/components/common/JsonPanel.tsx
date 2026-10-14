/**
 * JsonPanel — request/response viewer: title, state tag, optional
 * Formatted/Raw switch, copy and collapse. JSON is mono with theme syntax
 * colours; BigInts print as plain digits.
 */

import React, { useId, useState } from 'react';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';
import CopyButton from './CopyButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { safeStringify } from '../../utils/betHelpers';

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** Syntax-coloured JSON text. */
export function JsonHighlight({ json }: { json: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(JSON_TOKEN_RE.source, 'g');
  let match = re.exec(json);
  while (match !== null) {
    if (match.index > lastIndex) parts.push(json.slice(lastIndex, match.index));
    const [full, key, str, bool, nil, num] = match;
    if (key !== undefined) {
      parts.push(
        <span key={match.index} className="text-primary">
          {key}
        </span>
      );
      parts.push(full.slice(key.length));
    } else {
      const cls =
        str !== undefined
          ? 'text-success'
          : bool !== undefined
            ? 'text-warning-ink'
            : nil !== undefined
              ? 'text-ink-muted'
              : num !== undefined
                ? 'text-info'
                : '';
      parts.push(
        <span key={match.index} className={cls}>
          {full}
        </span>
      );
    }
    lastIndex = match.index + full.length;
    match = re.exec(json);
  }
  if (lastIndex < json.length) parts.push(json.slice(lastIndex));
  return <>{parts}</>;
}

function toJsonText(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return safeStringify(JSON.parse(value), 2);
    } catch {
      return value;
    }
  }
  return (safeStringify(value, 2) as string | undefined) ?? String(value);
}

export interface JsonPanelProps {
  title: React.ReactNode;
  /** State tag: "Preview", "Sent 14:02:11", "Dry run". */
  tag?: React.ReactNode;
  tagTone?: 'neutral' | 'dry-run';
  value: unknown;
  /** Enables the Formatted/Raw switch. */
  formatted?: React.ReactNode;
  defaultView?: 'formatted' | 'raw';
  caption?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  copyLabel?: string;
  className?: string;
}

export function JsonPanel({
  title,
  tag,
  tagTone = 'neutral',
  value,
  formatted,
  defaultView = 'formatted',
  caption,
  collapsible = true,
  defaultCollapsed = false,
  copyLabel,
  className = '',
}: JsonPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [view, setView] = useState<'formatted' | 'raw'>(formatted ? defaultView : 'raw');
  const bodyId = useId();
  const json = toJsonText(value);
  const showFormatted = formatted !== undefined && view === 'formatted';

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {collapsible ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-field text-body font-semibold hover:text-primary"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <MdExpandMore aria-hidden="true" /> : <MdExpandLess aria-hidden="true" />}
            {title}
          </button>
        ) : (
          <span className="text-body font-semibold">{title}</span>
        )}
        {tag && (
          <span
            className={`inline-flex h-5 items-center rounded-selector px-1.5 text-caption font-semibold ${
              tagTone === 'dry-run'
                ? 'border border-dashed border-field-border text-base-content'
                : 'bg-base-200 text-ink-muted'
            }`}
          >
            {tag}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {formatted !== undefined && !collapsed && (
            <SegmentedControl
              size="sm"
              aria-label={`${typeof title === 'string' ? title : 'Response'} view`}
              value={view}
              onChange={setView}
              options={[
                { value: 'formatted', label: 'Formatted' },
                { value: 'raw', label: 'Raw' },
              ]}
            />
          )}
          <CopyButton
            text={json}
            label={copyLabel ?? `Copy ${typeof title === 'string' ? title.toLowerCase() : 'JSON'}`}
          />
        </div>
      </div>
      {!collapsed && (
        <div id={bodyId} className="flex min-w-0 flex-col gap-2">
          {caption && <p className="m-0 text-caption text-ink-muted">{caption}</p>}
          {showFormatted ? (
            formatted
          ) : (
            <pre className="m-0 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-field bg-base-200 p-3 text-left font-mono text-data">
              <JsonHighlight json={json} />
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default JsonPanel;
