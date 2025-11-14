/**
 * QA Layout Component
 * Main layout with sidebar and content area
 */

import Sidebar from './Sidebar';
import StageContent from './StageContent';

export default function QALayout() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <StageContent />
    </div>
  );
}
