/**
 * Mobile QA Layout Component
 * Main layout combining header, sidebar, step content, and tool panel
 */

import MobileQAHeader from './MobileQAHeader';
import MobileQASidebar from './MobileQASidebar';
import MobileQAStepContent from './MobileQAStepContent';
import MobileQAToolPanel from './MobileQAToolPanel';
import ToastContainer from '../common/ToastContainer';
import DeepLinkModal from '../common/DeepLinkModal';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/mobileQAProgressSlice';
import { getStep } from '../../config/mobileQA';

export default function MobileQALayout() {
  const currentLocation = useAppSelector(selectCurrentLocation);
  const step = getStep(currentLocation.sectionId, currentLocation.stepId);
  const hasTool = !!step?.tool;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header */}
      <MobileQAHeader />

      {/* Main Content Area: add top padding equal to header height (h-14 = 56px) */}
      <div className="flex flex-1 pt-14 min-h-0">
        {/* Sidebar */}
        <MobileQASidebar />

        {/* Content Area */}
        <div className="flex-1 flex min-h-0">
          {hasTool ? (
            // Two-column layout when tool is present
            <>
              {/* Left: Instructions (40% width) */}
              <div className="w-2/5 overflow-y-auto border-r border-gray-200 bg-white">
                <MobileQAStepContent />
              </div>

              {/* Right: Tool Panel (60% width) */}
              <div className="w-3/5 overflow-y-auto">
                <MobileQAToolPanel />
              </div>
            </>
          ) : (
            // Single column layout when no tool
            <div className="flex-1 overflow-y-auto bg-white">
              <MobileQAStepContent />
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
      <DeepLinkModal />
    </div>
  );
}
