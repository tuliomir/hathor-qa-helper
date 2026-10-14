/**
 * DataTable — thin wrapper over daisyUI `table`: 36px rows, base-200 header
 * (sticky inside scroll areas), no zebra, built-in empty/loading/error
 * states. Below 768px rows render as stacked label/value pairs.
 */

import React from 'react';
import { StatusChip } from './StatusChip';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export type ColumnType = 'text' | 'identifier' | 'amount' | 'status' | 'actions';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  type?: ColumnType;
  /** Custom cell. Without it the cell shows `value(row)`. */
  render?: (row: T, index: number) => React.ReactNode;
  value?: (row: T) => string | number | null | undefined;
  className?: string;
  /** Hide the label in the stacked (mobile) layout. */
  hideLabelWhenStacked?: boolean;
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  getRowKey: (row: T, index: number) => string;
  caption?: string;
  loading?: boolean;
  /** Shown instead of rows. */
  error?: { message: string; detail?: string | null; onRetry?: () => void } | null;
  empty?: React.ReactNode;
  /** Extra classes per row, e.g. the shielded edge. */
  rowClassName?: (row: T) => string;
  /** Max height before the body scrolls (header stays sticky). */
  maxHeight?: string;
  className?: string;
}

const CELL_TYPE: Record<ColumnType, string> = {
  text: '',
  identifier: 'font-mono text-data whitespace-nowrap',
  amount: 'text-right font-mono text-data tabular-nums whitespace-nowrap',
  status: 'whitespace-nowrap',
  actions: 'text-right whitespace-nowrap',
};

function cellContent<T>(col: DataTableColumn<T>, row: T, index: number): React.ReactNode {
  if (col.render) return col.render(row, index);
  const v = col.value?.(row);
  if (v === null || v === undefined || v === '') return null;
  if (col.type === 'status') return <StatusChip status={String(v)} />;
  return String(v);
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  loading = false,
  error = null,
  empty = 'Nothing to show yet.',
  rowClassName,
  maxHeight,
  className = '',
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState message={error.message} detail={error.detail} onRetry={error.onRetry} />;
  }
  if (!loading && rows.length === 0) {
    return <EmptyState>{empty}</EmptyState>;
  }

  const skeletonRows = Array.from({ length: 3 }, (_, i) => i);

  return (
    <div className={className}>
      {/* Table layout from 768px */}
      <div className="hidden overflow-x-auto md:block" style={maxHeight ? { maxHeight } : undefined}>
        <table className="table table-sm w-full text-body">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-[1] bg-base-200">
            <tr className="border-b border-base-300">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`h-8 bg-base-200 text-caption font-semibold text-ink-muted ${
                    col.type === 'amount' || col.type === 'actions' ? 'text-right' : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? skeletonRows.map((i) => (
                  <tr key={`skeleton-${i}`} className="h-9 border-b border-base-300">
                    {columns.map((col) => (
                      <td key={col.key}>
                        <span className="skeleton block h-4 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr
                    key={getRowKey(row, i)}
                    className={`h-9 border-b border-base-300 last:border-b-0 ${rowClassName?.(row) ?? ''}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`${CELL_TYPE[col.type ?? 'text']} ${col.className ?? ''}`}>
                        {cellContent(col, row, i)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Stacked layout below 768px */}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden" aria-label={caption}>
        {loading
          ? skeletonRows.map((i) => <li key={`skeleton-${i}`} className="skeleton h-16 rounded-box" />)
          : rows.map((row, i) => (
              <li
                key={getRowKey(row, i)}
                className={`flex flex-col gap-1 rounded-box border border-base-300 bg-base-100 p-3 ${rowClassName?.(row) ?? ''}`}
              >
                {columns.map((col) => {
                  const content = cellContent(col, row, i);
                  if (content === null) return null;
                  return (
                    <div key={col.key} className="flex min-w-0 items-baseline gap-3">
                      {!col.hideLabelWhenStacked && (
                        <span className="w-24 flex-none text-caption text-ink-muted">{col.header}</span>
                      )}
                      <span
                        className={`min-w-0 ${col.type === 'identifier' || col.type === 'amount' ? 'font-mono text-data' : ''}`}
                      >
                        {content}
                      </span>
                    </div>
                  );
                })}
              </li>
            ))}
      </ul>
    </div>
  );
}

export default DataTable;
