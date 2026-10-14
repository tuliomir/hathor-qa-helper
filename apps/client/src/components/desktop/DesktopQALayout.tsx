/**
 * Desktop QA Layout Component
 * The desktop walkthrough inside the app shell: step list and step content (with inline tools).
 */

import { useEffect, useRef } from 'react';
import AppShell from '../shell/AppShell';
import DesktopQASidebar from './DesktopQASidebar';
import DesktopQAStepContent from './DesktopQAStepContent';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/desktopQAProgressSlice';

export default function DesktopQALayout() {
  const { sectionId, stepId } = useAppSelector(selectCurrentLocation);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A new step starts at the top of its content.
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [sectionId, stepId]);

  return (
    <AppShell nav={<DesktopQASidebar />} navWidth="walkthrough">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-base-100">
        <DesktopQAStepContent />
      </div>
    </AppShell>
  );
}
