/**
 * TopBar
 *
 * 48px bar under the network rail: menu (below 1024px), brand, workspace
 * switcher, then the global controls on the right.
 */

import { forwardRef } from 'react';
import { FiMenu } from 'react-icons/fi';
import NetworkChip from '../common/NetworkChip';
import { useAppSelector } from '../../store/hooks';
import { selectActiveNetwork } from '../../store/slices/networkSlice';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import OverflowMenu from './OverflowMenu';

interface TopBarProps {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}

const TopBar = forwardRef<HTMLButtonElement, TopBarProps>(function TopBar({ drawerOpen, onOpenDrawer }, menuRef) {
  const network = useAppSelector(selectActiveNetwork);

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
      <div className="flex-1 min-w-0" />
      <NetworkChip network={network} label="responsive" />
      <OverflowMenu />
    </header>
  );
});

export default TopBar;
