/**
 * OverflowMenu
 *
 * The top bar's "More" menu: theme toggle and outbound links.
 */

import { useEffect } from 'react';
import { FiExternalLink, FiGithub, FiMoon, FiMoreHorizontal, FiSun } from 'react-icons/fi';
import { desktopQAConfig } from '../../config/desktopQA';
import { useTheme } from './useTheme';
import { useWorkspace } from './useWorkspace';
import { focusFirstMenuItem, handleMenuKeyDown, MENU_ITEM_CLASS, POPOVER_PANEL_CLASS, usePopover } from './usePopover';

export default function OverflowMenu() {
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspace();
  const { open, toggle, close, triggerRef, panelRef } = usePopover();

  useEffect(() => {
    if (open) focusFirstMenuItem(panelRef.current);
  }, [open, panelRef]);

  const links = [
    { href: 'https://github.com/tuliomir/hathor-qa-helper', label: 'GitHub repository', icon: FiGithub },
    { href: 'https://hathor-qa-helper.pages.dev', label: 'Public deployment', icon: FiExternalLink },
    ...(workspace.id === 'desktop'
      ? [{ href: desktopQAConfig.sourceUrl, label: 'Original desktop QA doc', icon: FiExternalLink }]
      : []),
  ];

  return (
    <div className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More"
        onClick={toggle}
        className="inline-grid place-items-center w-8 h-8 rounded-field text-ink-muted hover:bg-base-200"
      >
        <FiMoreHorizontal aria-hidden="true" size={18} />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="More"
          onKeyDown={handleMenuKeyDown}
          className={`${POPOVER_PANEL_CLASS} top-full right-0 w-60`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              toggleTheme();
              close(true);
            }}
            className={MENU_ITEM_CLASS}
          >
            {theme === 'bench' ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}
            {theme === 'bench' ? 'Dark theme' : 'Light theme'}
          </button>
          <div className="my-1 border-t border-base-300" role="separator" />
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              role="menuitem"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close()}
              className={MENU_ITEM_CLASS}
            >
              <Icon aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
