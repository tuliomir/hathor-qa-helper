/**
 * Desktop QA Header Component
 * Displays progress information and navigation back to main QA
 */

import { useAppSelector } from '../../store/hooks';
import { selectTotalCompletedSteps } from '../../store/slices/desktopQAProgressSlice';
import { desktopQAConfig, getTotalStepsCount } from '../../config/desktopQA';
import { Link } from 'react-router-dom';
import { MdArrowBack, MdOpenInNew } from 'react-icons/md';

export default function DesktopQAHeader() {
  const completedSteps = useAppSelector(selectTotalCompletedSteps);
  const totalSteps = getTotalStepsCount();
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-gradient-to-r from-blue-600 to-cyan-700 text-white shadow-md">
      <div className="px-6 h-14 flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
          >
            <MdArrowBack size={20} />
            <span className="text-sm font-medium">Main QA</span>
          </Link>
          <div className="border-l border-white/30 pl-4">
            <h2 className="text-lg font-bold m-0">Desktop QA Walkthrough</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={desktopQAConfig.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
          >
            <MdOpenInNew size={16} />
            <span>View Original</span>
          </a>
          <div className="text-sm">
            <span className="opacity-80">Progress: </span>
            <span className="font-bold">
              {completedSteps} / {totalSteps}
            </span>
          </div>
          <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-bold">{progressPercentage}%</span>
        </div>
      </div>
    </div>
  );
}
