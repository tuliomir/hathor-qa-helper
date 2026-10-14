/**
 * Which workspace the current route belongs to (Tools, Mobile or Desktop
 * walkthrough), with walkthrough progress.
 */

import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectTotalCompletedSteps as selectMobileDone } from '../../store/slices/mobileQAProgressSlice';
import { selectTotalCompletedSteps as selectDesktopDone } from '../../store/slices/desktopQAProgressSlice';
import { getTotalStepsCount as mobileTotal } from '../../config/mobileQA';
import { getTotalStepsCount as desktopTotal } from '../../config/desktopQA';

export type WorkspaceId = 'tools' | 'mobile' | 'desktop';

export const WORKSPACES: { id: WorkspaceId; label: string; path: string }[] = [
  { id: 'tools', label: 'Tools', path: '/' },
  { id: 'mobile', label: 'Mobile walkthrough', path: '/mobile' },
  { id: 'desktop', label: 'Desktop walkthrough', path: '/desktop' },
];

export function workspaceForPath(pathname: string): WorkspaceId {
  if (pathname.startsWith('/mobile')) return 'mobile';
  if (pathname.startsWith('/desktop')) return 'desktop';
  return 'tools';
}

export interface WorkspaceInfo {
  id: WorkspaceId;
  label: string;
  progress: { done: number; total: number } | null;
}

export function useWorkspace(): WorkspaceInfo {
  const { pathname } = useLocation();
  const id = workspaceForPath(pathname);
  const mobileDone = useAppSelector(selectMobileDone);
  const desktopDone = useAppSelector(selectDesktopDone);
  const label = WORKSPACES.find((w) => w.id === id)!.label;

  if (id === 'mobile') return { id, label, progress: { done: mobileDone, total: mobileTotal() } };
  if (id === 'desktop') return { id, label, progress: { done: desktopDone, total: desktopTotal() } };
  return { id, label, progress: null };
}
