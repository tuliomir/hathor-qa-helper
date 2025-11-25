/**
 * Stage Content Component
 * Renders the content for the currently selected stage
 */

import { useStage } from '../hooks/useStage';
import { useScrollPreservation } from '../hooks/useScrollPreservation';
import WalletInitialization from './stages/WalletInitialization';
import AddressValidation from './stages/AddressValidation';
import CustomTokens from './stages/CustomTokens';
import TransactionHistory from './stages/TransactionHistory';
import TxUpdateEvents from './stages/TxUpdateEvents';
import { ConnectionStage } from './stages/ConnectionStage';
import { GetBalanceStage } from './stages/GetBalanceStage';
import { SignWithAddressStage } from './stages/SignWithAddressStage';
import { SignOracleDataStage } from './stages/SignOracleDataStage';
import { BetInitializeStage } from './stages/BetInitializeStage';
import { BetDepositStage } from './stages/BetDepositStage';
import { SetBetResultStage } from './stages/SetBetResultStage';
import { BetWithdrawStage } from './stages/BetWithdrawStage';

export default function StageContent() {
  const { currentStage } = useStage();
  const scrollContainerRef = useScrollPreservation();

  return (
    // Independently scrollable content area with scroll position preservation
    <div
      ref={scrollContainerRef}
      className="flex-1 p-7.5 bg-white overflow-y-auto"
    >
      {currentStage === 'wallet-initialization' && <WalletInitialization />}
      {currentStage === 'address-validation' && <AddressValidation />}
      {currentStage === 'custom-tokens' && <CustomTokens />}
      {currentStage === 'transaction-history' && <TransactionHistory />}
      {currentStage === 'tx-update-events' && <TxUpdateEvents />}
      {currentStage === 'rpc-connection' && <ConnectionStage />}
      {currentStage === 'rpc-get-balance' && <GetBalanceStage />}
      {currentStage === 'rpc-sign-with-address' && <SignWithAddressStage />}
      {currentStage === 'rpc-sign-oracle-data' && <SignOracleDataStage />}
      {currentStage === 'rpc-bet-initialize' && <BetInitializeStage />}
      {currentStage === 'rpc-bet-deposit' && <BetDepositStage />}
      {currentStage === 'rpc-set-bet-result' && <SetBetResultStage />}
      {currentStage === 'rpc-bet-withdraw' && <BetWithdrawStage />}
    </div>
  );
}
