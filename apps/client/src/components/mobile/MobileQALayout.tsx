/**
 * Mobile QA Layout Component
 * The mobile walkthrough inside the app shell: step list, step content and tool panel.
 * At 1280px and up the tool sits in its own column; below that it follows the step.
 */

import { useEffect, useRef } from 'react';
import AppShell from '../shell/AppShell';
import MobileQASidebar from './MobileQASidebar';
import MobileQAStepContent from './MobileQAStepContent';
import MobileQAToolPanel from './MobileQAToolPanel';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/mobileQAProgressSlice';
import { getStep } from '../../config/mobileQA';

export default function MobileQALayout() {
  const currentLocation = useAppSelector(selectCurrentLocation);
  const { sectionId, stepId } = currentLocation;
  const step = getStep(sectionId, stepId);
  const hasTool = !!step?.tool;
  const outerRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);

  // A new step starts at the top of its content.
  useEffect(() => {
    for (const el of [outerRef.current, stepRef.current, toolRef.current]) el?.scrollTo?.({ top: 0 });
  }, [sectionId, stepId]);

  return (
    <AppShell nav={<MobileQASidebar />} navWidth="walkthrough">
      {hasTool ? (
        <div ref={outerRef} className="flex-1 min-h-0 overflow-y-auto bg-base-100 xl:flex xl:overflow-hidden">
          <div ref={stepRef} className="xl:w-2/5 xl:min-w-0 xl:overflow-y-auto xl:border-r xl:border-base-300">
            <MobileQAStepContent />
          </div>
          <div ref={toolRef} className="border-t border-base-300 xl:w-3/5 xl:min-w-0 xl:overflow-y-auto xl:border-t-0">
            <MobileQAToolPanel />
          </div>
        </div>
      ) : (
        <div ref={outerRef} className="flex-1 min-h-0 overflow-y-auto bg-base-100">
          <MobileQAStepContent />
        </div>
      )}
    </AppShell>
  );
}
