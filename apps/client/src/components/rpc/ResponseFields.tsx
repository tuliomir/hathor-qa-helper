/**
 * ResponseFields — label/value rows for the formatted view of small RPC
 * responses (wallet information, address, signature).
 */

import React from 'react';

export interface ResponseField {
  label: string;
  value: React.ReactNode;
}

export function ResponseFields({ fields }: { fields: ResponseField[] }) {
  return (
    <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)]">
      {fields.map((f) => (
        <React.Fragment key={f.label}>
          <dt className="text-caption text-ink-muted sm:text-body">{f.label}</dt>
          <dd className="m-0 min-w-0">{f.value ?? <span className="text-ink-muted">Not returned</span>}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default ResponseFields;
