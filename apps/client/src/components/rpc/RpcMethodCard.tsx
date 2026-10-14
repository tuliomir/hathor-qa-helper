/**
 * RPC adapter for MethodCard. Mainnet arming follows the WalletConnect
 * session's chain, not the active network: every RPC request targets the
 * chain the session approved (`hathor:testnet` today), whatever wallet the
 * QA Helper itself has selected.
 */

import { useSelector } from 'react-redux';
import { MethodCard, type MethodCardProps } from '../common/MethodCard';
import { selectRpcSessionIsMainnet } from '../../store/slices/walletConnectSlice';

export type RpcMethodCardProps = Omit<MethodCardProps, 'isMainnet'>;

export function RpcMethodCard(props: RpcMethodCardProps) {
  const isMainnet = useSelector(selectRpcSessionIsMainnet);
  return <MethodCard {...props} isMainnet={isMainnet} />;
}

export default RpcMethodCard;
