/**
 * TopBar
 *
 * 48px bar under the network rail: menu (below 1024px), brand, workspace
 * switcher, wallet context, then the helper server pill, network switcher
 * and overflow menu. Below 768px the wallet context moves into the drawer.
 */

import { forwardRef } from 'react';
import { FiMenu, FiSearch } from 'react-icons/fi';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import OverflowMenu from './OverflowMenu';
import WalletContextBar from './WalletContextBar';
import HelperServerPill from './HelperServerPill';
import NetworkSwitcher from './NetworkSwitcher';

interface TopBarProps {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onOpenPalette: () => void;
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const PALETTE_HINT = IS_MAC ? '⌘K' : 'Ctrl K';

const TopBar = forwardRef<HTMLButtonElement, TopBarProps>(function TopBar(
  { drawerOpen, onOpenDrawer, onOpenPalette },
  menuRef
) {
  return (
    <header className="flex items-center gap-3 h-12 pl-2 pr-3 lg:pl-4 bg-base-100 border-b border-base-300 min-w-0">
      <button
        ref={menuRef}
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        className="lg:hidden inline-grid place-items-center w-8 h-8 rounded-field text-ink-muted hover:bg-base-200 flex-none"
      >
        <FiMenu aria-hidden="true" size={18} />
      </button>
      <span className="text-body-lg font-bold whitespace-nowrap">QA Helper</span>
      <div className="hidden md:flex min-w-0">
        <WorkspaceSwitcher />
      </div>
      <div className="flex-1 min-w-0 flex items-center">
        <div className="hidden xl:flex min-w-0">
          <WalletContextBar variant="bar" />
        </div>
        <div className="hidden md:flex xl:hidden">
          <WalletContextBar variant="compact" />
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Find stage"
        aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
        className="flex-none inline-flex items-center gap-2 h-8 w-8 lg:w-44 justify-center lg:justify-start lg:pl-2.5 lg:pr-1.5 rounded-field border border-base-300 bg-base-200 text-ink-muted hover:border-field-border"
      >
        <FiSearch aria-hidden="true" size={14} className="flex-none" />
        <span className="hidden lg:inline text-body">Find stage</span>
        <kbd className="hidden lg:inline ml-auto text-[11px] leading-4 px-1.5 border border-base-300 rounded-selector bg-base-100 font-sans">
          {PALETTE_HINT}
        </kbd>
      </button>
      <HelperServerPill />
      <NetworkSwitcher />
      <OverflowMenu />
    </header>
  );
});

export default TopBar;
