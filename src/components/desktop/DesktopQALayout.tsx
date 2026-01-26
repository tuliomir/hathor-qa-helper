/**
 * Desktop QA Layout Component
 * Main layout combining header, sidebar, step content, and tool panel
 */

import DesktopQAHeader from './DesktopQAHeader';
import DesktopQASidebar from './DesktopQASidebar';
import DesktopQAStepContent from './DesktopQAStepContent';
import DesktopQAToolPanel from './DesktopQAToolPanel';
import ToastContainer from '../common/ToastContainer';
import DeepLinkModal from '../common/DeepLinkModal';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentLocation } from '../../store/slices/desktopQAProgressSlice';
import { getStep } from '../../config/desktopQA';

export default function DesktopQALayout() {
  const currentLocation = useAppSelector(selectCurrentLocation);
  const step = getStep(currentLocation.sectionId, currentLocation.stepId);
  const hasTool = !!step?.tool;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header */}
      <DesktopQAHeader />

      {/* Main Content Area: add top padding equal to header height (h-14 = 56px) */}
      <div className="flex flex-1 pt-14 min-h-0">
        {/* Sidebar */}
        <DesktopQASidebar />

        {/* Content Area */}
        <div className="flex-1 flex min-h-0">
          {hasTool ? (
            // Two-column layout when tool is present
            <>
              {/* Left: Instructions (40% width) */}
              <div className="w-2/5 overflow-y-auto border-r border-gray-200 bg-white">
                <DesktopQAStepContent />
              </div>

              {/* Right: Tool Panel (60% width) */}
              <div className="w-3/5 overflow-y-auto">
                <DesktopQAToolPanel />
              </div>
            </>
          ) : (
            // Single column layout when no tool
            <div className="flex-1 overflow-y-auto bg-white">
              <DesktopQAStepContent />
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
      <DeepLinkModal />
    </div>
  );
}
