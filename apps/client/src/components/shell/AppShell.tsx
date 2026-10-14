/**
 * AppShell
 *
 * The frame around every workspace: network rail, top bar, navigation slot
 * and content. The rail and top bar stay put; navigation and content scroll
 * independently. Below 1024px the navigation moves into a drawer.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import NetworkRail from './NetworkRail';
import TopBar from './TopBar';
import NavDrawer from './NavDrawer';
import { WorkspaceLinks, WorkspaceProgress } from './WorkspaceSwitcher';
import { useWorkspace } from './useWorkspace';
import ToastContainer from '../common/ToastContainer';
import DeepLinkModal from '../common/DeepLinkModal';

interface AppShellProps {
  /** Navigation for the sidebar slot (stage nav or a walkthrough's step list). */
  nav: ReactNode;
  /** Walkthrough step lists are wider than the stage nav. */
  navWidth?: 'stage' | 'walkthrough';
  children: ReactNode;
}

const GRID_COLUMNS = {
  stage: 'lg:grid-cols-[248px_minmax(0,1fr)]',
  walkthrough: 'lg:grid-cols-[288px_minmax(0,1fr)]',
} as const;

export default function AppShell({ nav, navWidth = 'stage', children }: AppShellProps) {
  const { pathname } = useLocation();
  const { progress } = useWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Navigating closes the drawer.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;

  return (
    <div
      className={`h-dvh grid grid-rows-[auto_auto_minmax(0,1fr)] grid-cols-[minmax(0,1fr)] ${GRID_COLUMNS[navWidth]}`}
    >
      <div className="col-span-full">
        <NetworkRail />
      </div>
      <div className="col-span-full relative">
        <TopBar ref={menuButtonRef} drawerOpen={drawerOpen} onOpenDrawer={() => setDrawerOpen(true)} />
        {percent !== null && (
          <div
            role="progressbar"
            aria-label="Walkthrough progress"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="absolute inset-x-0 bottom-0 h-0.5"
          >
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <div className="hidden lg:flex min-h-0">{nav}</div>

      <main className="min-h-0 min-w-0 flex flex-col overflow-hidden">{children}</main>

      {drawerOpen && (
        <NavDrawer onClose={closeDrawer}>
          <div className="md:hidden px-2 pt-2 pb-2 border-b border-base-300">
            <WorkspaceLinks />
            <WorkspaceProgress className="block px-2 pt-1" />
          </div>
          <div className="flex-1 min-h-0 flex">{nav}</div>
        </NavDrawer>
      )}

      <ToastContainer />
      <DeepLinkModal />
    </div>
  );
}
