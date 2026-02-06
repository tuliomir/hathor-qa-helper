/**
 * Stage Content Component
 * Renders the content for the currently selected stage
 */

import type { ComponentType } from 'react';
import { useStage } from '../hooks/useStage';
import { useScrollPreservation } from '../hooks/useScrollPreservation';
import type { StageId } from '../types/stage';
import WalletInitialization from './stages/WalletInitialization';
import AddressValidation from './stages/AddressValidation';
import CustomTokens from './stages/CustomTokens';
import TransactionHistory from './stages/TransactionHistory';
import TxUpdateEvents from './stages/TxUpdateEvents';
import { ConnectionStage } from './stages/ConnectionStage';
import { GetBalanceStage } from './stages/GetBalanceStage';
import { GetUtxosStage } from './stages/GetUtxosStage';
import { SignWithAddressStage } from './stages/SignWithAddressStage';
import { CreateTokenStage } from './stages/CreateTokenStage';
import { SendTransactionStage } from './stages/SendTransactionStage';
import { SignOracleDataStage } from './stages/SignOracleDataStage';
import { BetInitializeStage } from './stages/BetInitializeStage';
import { BetDepositStage } from './stages/BetDepositStage';
import { SetBetResultStage } from './stages/SetBetResultStage';
import { BetWithdrawStage } from './stages/BetWithdrawStage';
import PushNotifications from './stages/PushNotifications';
import { BasicInfoStage } from './stages/BasicInfoStage';
import { GetAddressStage } from './stages/GetAddressStage';
import { RawRpcEditorStage } from './stages/RawRpcEditorStage';
import TestWalletCleanup from './stages/TestWalletCleanup';
import MultisigWalletManagement from './stages/MultisigWalletManagement';

const STAGE_COMPONENT_MAP: Record<StageId, ComponentType> = {
  'wallet-initialization': WalletInitialization,
  'address-validation': AddressValidation,
  'custom-tokens': CustomTokens,
  'rpc-connection': ConnectionStage,
  'rpc-basic-info': BasicInfoStage,
  'rpc-get-address': GetAddressStage,
  'rpc-get-balance': GetBalanceStage,
  'rpc-get-utxos': GetUtxosStage,
  'rpc-sign-with-address': SignWithAddressStage,
  'rpc-create-token': CreateTokenStage,
  'rpc-send-transaction': SendTransactionStage,
  'rpc-sign-oracle-data': SignOracleDataStage,
  'rpc-raw-editor': RawRpcEditorStage,
  'rpc-bet-initialize': BetInitializeStage,
  'rpc-bet-deposit': BetDepositStage,
  'rpc-set-bet-result': SetBetResultStage,
  'rpc-bet-withdraw': BetWithdrawStage,
  'push-notifications': PushNotifications,
  'transaction-history': TransactionHistory,
  'tx-update-events': TxUpdateEvents,
  'test-wallet-cleanup': TestWalletCleanup,
  'multisig-wallet-management': MultisigWalletManagement,
};

export default function StageContent() {
  const { currentStage } = useStage();
  const scrollContainerRef = useScrollPreservation();

  const StageComponent = STAGE_COMPONENT_MAP[currentStage];

  return (
    // Independently scrollable content area with scroll position preservation
    <div
      ref={scrollContainerRef}
      className="flex-1 p-7.5 bg-white overflow-y-auto"
    >
      {StageComponent ? <StageComponent /> : <div className="text-center text-gray-500 mt-8">Stage not found</div>}
    </div>
  );
}
