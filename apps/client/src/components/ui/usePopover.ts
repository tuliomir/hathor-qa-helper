/**
 * Open/close state for a popover anchored to a trigger button.
 * Closes on Escape (returning focus to the trigger) and on outside clicks.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function usePopover<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, close]);

  return { open, setOpen, toggle, close, triggerRef, panelRef };
}

const MENU_ITEM_SELECTOR = '[role="menuitem"],[role="menuitemradio"]';

/** Arrow-key navigation between the menu items inside a role="menu" panel. */
export function handleMenuKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)).filter(
    (item) => !item.hasAttribute('disabled')
  );
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next: number | null = null;
  if (event.key === 'ArrowDown') next = (index + 1) % items.length;
  if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = items.length - 1;
  if (next === null) return;
  event.preventDefault();
  items[next].focus();
}

/** Focus the first menu item of a panel (call when a menu opens). */
export function focusFirstMenuItem(panel: HTMLElement | null) {
  const first =
    panel?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]') ??
    panel?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR);
  first?.focus();
}

export const POPOVER_PANEL_CLASS =
  'absolute z-50 mt-1 bg-base-100 text-base-content border border-base-300 rounded-box shadow-float p-1.5';

export const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 h-8 px-2 rounded-field text-left text-body hover:bg-base-200 focus-visible:bg-base-200 no-underline text-base-content';
