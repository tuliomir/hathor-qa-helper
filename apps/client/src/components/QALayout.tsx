/**
 * QA Layout Component
 * The Tools workspace: stage navigation and the active stage inside the app shell.
 */

import AppShell from './shell/AppShell';
import StageNav from './shell/StageNav';
import StageContent from './StageContent';

export default function QALayout() {
  return (
    <AppShell nav={<StageNav />}>
      <StageContent />
    </AppShell>
  );
}
