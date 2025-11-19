/**
 * Stage Content Component
 * Renders the content for the currently selected stage
 */

import { useStage } from '../hooks/useStage';
import WalletInitialization from './stages/WalletInitialization';
import AddressValidation from './stages/AddressValidation';
import CustomTokens from './stages/CustomTokens';
import TransactionHistory from './stages/TransactionHistory';
import { ConnectionStage } from './stages/ConnectionStage';
import { GetBalanceStage } from './stages/GetBalanceStage';
import { SignWithAddressStage } from './stages/SignWithAddressStage';
import { BetInitializeStage } from './stages/BetInitializeStage';
import { BetDepositStage } from './stages/BetDepositStage';
import { SetBetResultStage } from './stages/SetBetResultStage';
import { BetWithdrawStage } from './stages/BetWithdrawStage';

export default function StageContent() {
  const { currentStage } = useStage();

  return (
    // Ensure this content sits below the fixed header and is independently scrollable
    <div className="flex-1 p-7.5 bg-white overflow-y-auto pt-14">
      {currentStage === 'wallet-initialization' && <WalletInitialization />}
      {currentStage === 'address-validation' && <AddressValidation />}
      {currentStage === 'custom-tokens' && <CustomTokens />}
      {currentStage === 'transaction-history' && <TransactionHistory />}
      {currentStage === 'rpc-connection' && <ConnectionStage />}
      {currentStage === 'rpc-get-balance' && <GetBalanceStage />}
      {currentStage === 'rpc-sign-with-address' && <SignWithAddressStage />}
      {currentStage === 'rpc-bet-initialize' && <BetInitializeStage />}
      {currentStage === 'rpc-bet-deposit' && <BetDepositStage />}
      {currentStage === 'rpc-set-bet-result' && <SetBetResultStage />}
      {currentStage === 'rpc-bet-withdraw' && <BetWithdrawStage />}
    </div>
  );
}
