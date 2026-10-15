/**
 * QA Layout Component
 * The Tools workspace: stage navigation and the active stage inside the app shell.
 */

import AppShell from './shell/AppShell';
import StageNav from './shell/StageNav';
import StageContent from './StageContent';
import { useRecordRecentStage } from './shell/recentStages';
import FlowRunPanel from './flows/FlowRunPanel';

export default function QALayout() {
  useRecordRecentStage();
  return (
    <AppShell nav={<StageNav />}>
      <StageContent />
      <FlowRunPanel />
    </AppShell>
  );
}
