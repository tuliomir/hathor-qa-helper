/**
 * Sidebar Component
 * Displays the list of QA stages and allows navigation between them
 */

import { useStage } from '../hooks/useStage';
import { STAGES } from '../types/stage';
import type { StageId } from '../types/stage';

export default function Sidebar() {
  const { currentStage, setCurrentStage } = useStage();

  const handleStageClick = (stageId: StageId) => {
    setCurrentStage(stageId);
  };

  return (
    <div className="w-70 bg-light border-r-2 border-border p-5 flex flex-col gap-2.5">
      <h2 className="m-0 mb-5 text-xl text-dark">QA Stages</h2>

      {STAGES.map((stage) => {
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
  );
}
