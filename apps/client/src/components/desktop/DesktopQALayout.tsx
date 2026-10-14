/**
 * Desktop QA Layout Component
 * The desktop walkthrough inside the app shell: step list and step content (with inline tools).
 */

import AppShell from '../shell/AppShell';
import DesktopQASidebar from './DesktopQASidebar';
import DesktopQAStepContent from './DesktopQAStepContent';

export default function DesktopQALayout() {
  return (
    <AppShell nav={<DesktopQASidebar />} navWidth="walkthrough">
      <div className="flex-1 min-h-0 overflow-y-auto bg-base-100">
        <DesktopQAStepContent />
      </div>
    </AppShell>
  );
}
