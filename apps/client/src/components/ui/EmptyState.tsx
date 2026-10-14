/**
 * EmptyState — one sentence saying what will appear here and how to make
 * it appear, plus an optional action. Left-aligned and muted.
 */

import React from 'react';

export interface EmptyStateProps {
  children: React.ReactNode;
  action?: { label: string; onClick: () => void } | React.ReactNode;
  className?: string;
}

function isActionObject(a: EmptyStateProps['action']): a is { label: string; onClick: () => void } {
  return !!a && typeof a === 'object' && 'label' in a && 'onClick' in a;
}

export function EmptyState({ children, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-start gap-2 text-left text-body text-ink-muted ${className}`}>
      <p className="m-0">{children}</p>
      {isActionObject(action) ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      ) : (
        action
      )}
    </div>
  );
}

export default EmptyState;
