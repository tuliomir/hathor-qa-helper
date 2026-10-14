/**
 * Panel — the one container for stage content: a base-100 box with a
 * hairline border. Stack panels in a `flex flex-col gap-4` parent; never
 * nest panels (use `variant="inset"` for sub-areas such as output rows).
 */

import React, { useId } from 'react';

export interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned in the header row. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'inset';
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}

export function Panel({
  title,
  description,
  actions,
  footer,
  variant = 'default',
  className = '',
  bodyClassName = '',
  children,
}: PanelProps) {
  const titleId = useId();
  const hasHeader = title !== undefined || actions !== undefined;

  if (variant === 'inset') {
    return (
      <div className={`relative flex flex-col gap-3 rounded-box bg-base-200 p-3 ${className}`}>
        {hasHeader && (
          <div className="flex flex-wrap items-center gap-2">
            {title !== undefined && <span className="font-semibold">{title}</span>}
            {actions !== undefined && <div className="ml-auto flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <section
      className={`min-w-0 rounded-box border border-base-300 bg-base-100 ${className}`}
      aria-labelledby={title !== undefined ? titleId : undefined}
    >
      {hasHeader && (
        <header className="flex flex-wrap items-center gap-2 border-b border-base-300 px-4 py-2.5 xl:px-5">
          <div className="min-w-0">
            {title !== undefined && (
              <h2 id={titleId} className="m-0 text-title-sm">
                {title}
              </h2>
            )}
            {description !== undefined && <p className="m-0 text-body text-ink-muted">{description}</p>}
          </div>
          {actions !== undefined && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`flex flex-col gap-3 p-4 xl:p-5 ${bodyClassName}`}>
        {!hasHeader && description !== undefined && <p className="m-0 text-body text-ink-muted">{description}</p>}
        {children}
      </div>
      {footer !== undefined && (
        <footer className="flex flex-wrap items-center gap-3 border-t border-base-300 px-4 py-3 xl:px-5">
          {footer}
        </footer>
      )}
    </section>
  );
}

export default Panel;
