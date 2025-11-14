/**
 * Stage Content Component
 * Renders the content for the currently selected stage
 */

import { useStage } from '../hooks/useStage';
import WalletInitialization from './stages/WalletInitialization';
import AddressValidation from './stages/AddressValidation';

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
      {currentStage === 'wallet-initialization' && <WalletInitialization />}
      {currentStage === 'address-validation' && <AddressValidation />}
    </div>
  );
}
