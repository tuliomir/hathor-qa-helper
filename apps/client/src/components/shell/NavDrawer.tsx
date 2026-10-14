/**
 * NavDrawer
 *
 * Navigation drawer below 1024px. A modal dialog sliding in from the left;
 * Escape or the backdrop closes it and focus returns to the menu button.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export default function NavDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[55] lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 w-[min(320px,88vw)] flex flex-col bg-base-200 shadow-float"
      >
        <div className="flex items-center justify-between h-12 px-3 bg-base-100 border-b border-base-300 flex-none">
          <span className="text-body-lg font-bold">QA Helper</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-grid place-items-center w-8 h-8 rounded-field text-ink-muted hover:bg-base-200"
          >
            <FiX aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
