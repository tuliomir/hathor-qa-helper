/**
 * QA Layout Component
 * Main layout with sidebar and content area
 */

import Sidebar from './Sidebar';
import StageContent from './StageContent';
import ToastContainer from './common/ToastContainer';

export default function QALayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <StageContent />
      <ToastContainer />
    </div>
  );
}
