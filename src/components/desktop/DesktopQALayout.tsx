/**
 * Desktop QA Layout Component
 * Main layout combining header, sidebar, and step content (with inline tools)
 */

import DesktopQAHeader from './DesktopQAHeader';
import DesktopQASidebar from './DesktopQASidebar';
import DesktopQAStepContent from './DesktopQAStepContent';
import ToastContainer from '../common/ToastContainer';
import DeepLinkModal from '../common/DeepLinkModal';

export default function DesktopQALayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header */}
      <DesktopQAHeader />

      {/* Main Content Area: add top padding equal to header height (h-14 = 56px) */}
      <div className="flex flex-1 pt-14 min-h-0">
        {/* Sidebar */}
        <DesktopQASidebar />

        {/* Content Area - single column with inline tools */}
        <div className="flex-1 overflow-y-auto bg-white">
          <DesktopQAStepContent />
        </div>
      </div>

      <ToastContainer />
      <DeepLinkModal />
    </div>
  );
}
