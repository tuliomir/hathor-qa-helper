/**
 * Sidebar Component
 * Displays the list of QA stages and allows navigation between them
 */

import { useStage } from '../hooks/useStage';
import { STAGES } from '../types/stage';
import type { StageId, StageItem, StageSection } from '../types/stage';

export default function Sidebar() {
  const { currentStage, setCurrentStage } = useStage();

  const handleStageClick = (stageId: StageId) => {
    setCurrentStage(stageId);
  };

  // Type guard to check if item is a separator
  const isSeparator = (item: StageItem): item is StageSection => {
    return 'type' in item && item.type === 'separator';
  };

  return (
    // Adjust sticky to account for fixed header (top-14) and use full remaining height
    <div className="w-70 bg-light border-r-2 border-border sticky top-14 h-[calc(100vh-56px)] flex flex-col">
      <div className="p-5 flex-shrink-0">
        <h2 className="m-0 text-xl text-dark">QA Stages</h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
        <div className="flex flex-col gap-2.5">
          {STAGES.map((item, index) => {
            // Render separator
            if (isSeparator(item)) {
              return (
                <div
                  key={`separator-${index}`}
                  className={`${index > 0 ? 'mt-4' : ''} mb-2`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-px bg-border flex-1"></div>
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      {item.title}
                    </span>
                    <div className="h-px bg-border flex-1"></div>
                  </div>
                </div>
              );
            }

            // Render stage button
            const stage = item;
            const isActive = currentStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage.id)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer text-left transition-all duration-200
                  ${isActive
                    ? 'bg-primary text-white border-primary-dark font-bold'
                    : 'bg-white text-dark border-border hover:bg-gray-100 hover:border-gray-400'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-xl">{stage.icon}</span>
                  <span className="text-base">{stage.title}</span>
                </div>
                <div className={`text-xs ml-7.5 ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                  {stage.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
