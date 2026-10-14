/**
 * Mobile QA Layout Component
 * The mobile walkthrough inside the app shell: step list, step content and tool panel.
 */

import AppShell from '../shell/AppShell';
import MobileQASidebar from './MobileQASidebar';
import MobileQAStepContent from './MobileQAStepContent';
import MobileQAToolPanel from './MobileQAToolPanel';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/mobileQAProgressSlice';
import { getStep } from '../../config/mobileQA';

export default function MobileQALayout() {
  const currentLocation = useAppSelector(selectCurrentLocation);
  const step = getStep(currentLocation.sectionId, currentLocation.stepId);
  const hasTool = !!step?.tool;

  return (
    <AppShell nav={<MobileQASidebar />} navWidth="walkthrough">
      <div className="flex-1 flex min-h-0 bg-base-100">
        {hasTool ? (
          // Two-column layout when tool is present
          <>
            <div className="w-2/5 overflow-y-auto border-r border-base-300">
              <MobileQAStepContent />
            </div>
            <div className="w-3/5 overflow-y-auto">
              <MobileQAToolPanel />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <MobileQAStepContent />
          </div>
        )}
      </div>
    </AppShell>
  );
}
