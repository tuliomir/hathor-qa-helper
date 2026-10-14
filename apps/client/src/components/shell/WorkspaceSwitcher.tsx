/**
 * WorkspaceSwitcher
 *
 * Menu button next to the brand: Tools, Mobile walkthrough, Desktop
 * walkthrough. Shows walkthrough progress next to the workspace name.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import { WORKSPACES, useWorkspace } from './useWorkspace';
import {
  focusFirstMenuItem,
  handleMenuKeyDown,
  MENU_ITEM_CLASS,
  POPOVER_PANEL_CLASS,
  usePopover,
} from '../ui/usePopover';

export function WorkspaceProgress({ className = '' }: { className?: string }) {
  const { progress } = useWorkspace();
  if (!progress) return null;
  return (
    <span className={`text-caption text-ink-muted whitespace-nowrap ${className}`}>
      <span className="font-mono">{progress.done}</span> of <span className="font-mono">{progress.total}</span> steps
    </span>
  );
}

/** Plain list of workspace links, for the navigation drawer on phones. */
export function WorkspaceLinks({ onNavigate }: { onNavigate?: () => void }) {
  const workspace = useWorkspace();
  return (
    <ul aria-label="Workspaces" className="flex flex-col gap-0.5">
      {WORKSPACES.map((w) => (
        <li key={w.id}>
          <Link
            to={w.path}
            onClick={onNavigate}
            aria-current={w.id === workspace.id ? 'page' : undefined}
            className={`${MENU_ITEM_CLASS} ${w.id === workspace.id ? 'font-semibold !text-primary' : ''}`}
          >
            {w.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WorkspaceSwitcher() {
  const workspace = useWorkspace();
  const { open, toggle, close, triggerRef, panelRef } = usePopover();

  useEffect(() => {
    if (open) focusFirstMenuItem(panelRef.current);
  }, [open, panelRef]);

  return (
    <div className="relative flex items-center gap-2 min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Workspace: ${workspace.label}`}
        onClick={toggle}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-field text-body text-ink-muted hover:bg-base-200 whitespace-nowrap"
      >
        {workspace.label}
        <FiChevronDown aria-hidden="true" size={12} />
      </button>
      <WorkspaceProgress />
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Workspace"
          onKeyDown={handleMenuKeyDown}
          className={`${POPOVER_PANEL_CLASS} top-full left-0 w-60`}
        >
          {WORKSPACES.map((w) => (
            <Link
              key={w.id}
              to={w.path}
              role="menuitem"
              aria-current={w.id === workspace.id ? 'page' : undefined}
              onClick={() => close()}
              className={`${MENU_ITEM_CLASS} ${w.id === workspace.id ? 'font-semibold !text-primary' : ''}`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
