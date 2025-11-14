/**
 * Stage Content Component
 * Renders the content for the currently selected stage
 */

import { useStage } from '../hooks/useStage';

export default function StageContent() {
  const { currentStage } = useStage();

  return (
    <div
      style={{
        flex: 1,
        padding: '30px',
        backgroundColor: 'white',
        overflowY: 'auto',
      }}
    >
      {currentStage === 'wallet-initialization' && (
        <div>
          <h1 style={{ marginTop: 0 }}>Wallet Initialization</h1>
          <p style={{ color: '#6c757d' }}>
            This stage will allow you to initialize wallets by entering seed words.
          </p>
          <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
            Component coming in next step...
          </p>
        </div>
      )}

      {currentStage === 'address-validation' && (
        <div>
          <h1 style={{ marginTop: 0 }}>Address Validation</h1>
          <p style={{ color: '#6c757d' }}>
            This stage will allow you to validate addresses using initialized wallets.
          </p>
          <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
            Component coming in next step...
          </p>
        </div>
      )}
    </div>
  );
}
