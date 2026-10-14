/**
 * ErrorState — what failed in one plain sentence, the raw error in mono
 * (selectable), and Retry when retrying makes sense.
 */

import React from 'react';
import { MdErrorOutline, MdRefresh } from 'react-icons/md';

export interface ErrorStateProps {
  message: React.ReactNode;
  /** The underlying error, quoted verbatim. */
  detail?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ message, detail, onRetry, retryLabel = 'Retry', className = '' }: ErrorStateProps) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-2 text-left ${className}`}>
      <p className="m-0 flex items-center gap-1.5 text-body font-medium text-error">
        <MdErrorOutline className="h-4 w-4 flex-none" aria-hidden="true" />
        {message}
      </p>
      {detail && (
        <pre className="m-0 max-h-48 w-full overflow-auto whitespace-pre-wrap break-words rounded-field bg-base-200 p-2 font-mono text-data-sm select-text">
          {detail}
        </pre>
      )}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <MdRefresh aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
