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
import { FeeInitializeStage } from './stages/FeeInitializeStage';
import { FeeDepositStage } from './stages/FeeDepositStage';
import { FeeWithdrawStage } from './stages/FeeWithdrawStage';
import PushNotifications from './stages/PushNotifications';
import { BasicInfoStage } from './stages/BasicInfoStage';
import { GetAddressStage } from './stages/GetAddressStage';
import { RawRpcEditorStage } from './stages/RawRpcEditorStage';
import TestWalletCleanup from './stages/TestWalletCleanup';
import MultisigWalletManagement from './stages/MultisigWalletManagement';
import { SnapConnectionStage } from './stages/SnapConnectionStage';
import { SnapGetAddressStage } from './stages/SnapGetAddressStage';
import { SnapGetBalanceStage } from './stages/SnapGetBalanceStage';
import { SnapGetNetworkStage } from './stages/SnapGetNetworkStage';
import { SnapGetUtxosStage } from './stages/SnapGetUtxosStage';
import { SnapSendTransactionStage } from './stages/SnapSendTransactionStage';
import { SnapSignWithAddressStage } from './stages/SnapSignWithAddressStage';
import { SnapCreateTokenStage } from './stages/SnapCreateTokenStage';
import { SnapSendNanoContractTxStage } from './stages/SnapSendNanoContractTxStage';
import { SnapCreateNcTokenStage } from './stages/SnapCreateNcTokenStage';
import { SnapSignOracleDataStage } from './stages/SnapSignOracleDataStage';
import { SnapChangeNetworkStage } from './stages/SnapChangeNetworkStage';
import { SnapGetXpubStage } from './stages/SnapGetXpubStage';
import { SnapGetWalletInfoStage } from './stages/SnapGetWalletInfoStage';
import { SnapBetInitializeStage } from './stages/SnapBetInitializeStage';
import { SnapBetDepositStage } from './stages/SnapBetDepositStage';
import { SnapSetBetResultStage } from './stages/SnapSetBetResultStage';
import { SnapBetWithdrawStage } from './stages/SnapBetWithdrawStage';
import { SnapFeeInitializeStage } from './stages/SnapFeeInitializeStage';
import { SnapFeeDepositStage } from './stages/SnapFeeDepositStage';
import { SnapFeeWithdrawStage } from './stages/SnapFeeWithdrawStage';

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
  'rpc-fee-initialize': FeeInitializeStage,
  'rpc-fee-deposit': FeeDepositStage,
  'rpc-fee-withdraw': FeeWithdrawStage,
  'push-notifications': PushNotifications,
  'transaction-history': TransactionHistory,
  'tx-update-events': TxUpdateEvents,
  'test-wallet-cleanup': TestWalletCleanup,
  'multisig-wallet-management': MultisigWalletManagement,
  'snap-connection': SnapConnectionStage,
  'snap-get-address': SnapGetAddressStage,
  'snap-get-balance': SnapGetBalanceStage,
  'snap-get-connected-network': SnapGetNetworkStage,
  'snap-get-utxos': SnapGetUtxosStage,
  'snap-send-transaction': SnapSendTransactionStage,
  'snap-sign-with-address': SnapSignWithAddressStage,
  'snap-create-token': SnapCreateTokenStage,
  'snap-send-nano-contract-tx': SnapSendNanoContractTxStage,
  'snap-create-nc-token': SnapCreateNcTokenStage,
  'snap-sign-oracle-data': SnapSignOracleDataStage,
  'snap-change-network': SnapChangeNetworkStage,
  'snap-get-xpub': SnapGetXpubStage,
  'snap-get-wallet-info': SnapGetWalletInfoStage,
  // Snap Bet Nano Contract
  'snap-bet-initialize': SnapBetInitializeStage,
  'snap-bet-deposit': SnapBetDepositStage,
  'snap-set-bet-result': SnapSetBetResultStage,
  'snap-bet-withdraw': SnapBetWithdrawStage,
  // Snap Fee Nano Contract
  'snap-fee-initialize': SnapFeeInitializeStage,
  'snap-fee-deposit': SnapFeeDepositStage,
  'snap-fee-withdraw': SnapFeeWithdrawStage,
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
