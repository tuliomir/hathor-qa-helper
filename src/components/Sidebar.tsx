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
    <div
      style={{
        width: '280px',
        backgroundColor: '#f8f9fa',
        borderRight: '2px solid #dee2e6',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#212529' }}>QA Stages</h2>

      {STAGES.map((stage) => {
        const isActive = currentStage === stage.id;
        return (
          <button
            key={stage.id}
            onClick={() => handleStageClick(stage.id)}
            style={{
              padding: '15px',
              backgroundColor: isActive ? '#007bff' : 'white',
              color: isActive ? 'white' : '#212529',
              border: isActive ? '2px solid #0056b3' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              fontWeight: isActive ? 'bold' : 'normal',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#dee2e6';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <span style={{ fontSize: '20px' }}>{stage.icon}</span>
              <span style={{ fontSize: '16px' }}>{stage.title}</span>
            </div>
            <div style={{ fontSize: '13px', opacity: isActive ? 0.9 : 0.7, marginLeft: '30px' }}>
              {stage.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
