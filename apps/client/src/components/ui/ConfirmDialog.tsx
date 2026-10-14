/**
 * ConfirmDialog — replaces `window.confirm`. A native <dialog> opened with
 * showModal(), which traps focus and closes on Esc; focus returns to the
 * element that opened it.
 */

import React, { useEffect, useId, useRef, useState } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** A verb: "Remove wallet", "Force stop". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** When set, the user must type this exact text before confirming. */
  typeToConfirm?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  typeToConfirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [typed, setTyped] = useState('');
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setTyped('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [open]);

  const blocked = typeToConfirm !== undefined && typed !== typeToConfirm;

  return (
    <dialog
      ref={ref}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="modal-box max-w-md rounded-box border border-base-300 p-5 text-left shadow-float">
        <h2 id={titleId} className="m-0 text-title">
          {title}
        </h2>
        {body && (
          <div id={bodyId} className="mt-2 text-body text-base-content">
            {body}
          </div>
        )}
        {typeToConfirm !== undefined && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-body font-medium">
              Type <span className="font-mono text-data">{typeToConfirm}</span> to confirm
            </label>
            <input
              id={inputId}
              className="input w-full font-mono text-data"
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel} autoFocus={tone === 'danger'}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-error' : 'btn-primary'}`}
            disabled={blocked}
            onClick={onConfirm}
            autoFocus={tone !== 'danger' && typeToConfirm === undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel} aria-hidden="true" />
    </dialog>
  );
}

export default ConfirmDialog;
