/**
 * Modal — daisyUI `modal` shown while mounted: title row with a close
 * button, scrolling body, footer with Close. Escape and the backdrop close
 * it. For yes/no questions use ConfirmDialog.
 */

import React, { useId } from 'react';
import { MdClose } from 'react-icons/md';

export interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  /** Tailwind max-width class for the box. */
  size?: 'max-w-md' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-6xl';
  /** Extra footer actions, left of Close. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Modal({ title, onClose, size = 'max-w-2xl', footer, children }: ModalProps) {
  const titleId = useId();
  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className={`modal-box flex max-h-[90vh] w-full ${size} flex-col rounded-box border border-base-300 p-0 text-left shadow-float`}
      >
        <header className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
          <h2 id={titleId} className="m-0 text-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square ml-auto"
            aria-label="Close"
            autoFocus
          >
            <MdClose aria-hidden="true" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-base-300 px-5 py-3">
          {footer}
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </footer>
      </div>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

export default Modal;
