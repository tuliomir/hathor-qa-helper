/**
 * QA Layout Component
 * Main layout with sidebar and content area
 */

import Sidebar from './Sidebar';
import StageContent from './StageContent';

export default function QALayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <StageContent />
    </div>
  );
}
