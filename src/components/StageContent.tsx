/**
 * Stage Content Component
 * Renders the content for the currently selected stage
 */

import { useStage } from '../hooks/useStage';
import WalletInitialization from './stages/WalletInitialization';
import AddressValidation from './stages/AddressValidation';
import CustomTokens from './stages/CustomTokens';

export default function StageContent() {
  const { currentStage } = useStage();

  return (
    <div className="flex-1 p-7.5 bg-white overflow-y-auto">
      {currentStage === 'wallet-initialization' && <WalletInitialization />}
      {currentStage === 'address-validation' && <AddressValidation />}
      {currentStage === 'custom-tokens' && <CustomTokens />}
    </div>
  );
}
