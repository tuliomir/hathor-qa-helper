/**
 * RPC adapter for MethodCard.
 *
 * - Mainnet arming follows the WalletConnect session's chain, not the
 *   active network: every RPC request targets the chain the session
 *   approved (`hathor:testnet` today), whatever wallet QA Helper has
 *   selected.
 * - Adds "Edit raw", which opens the live request in the Raw RPC editor.
 */

import { useSelector } from 'react-redux';
import { MethodCard, type MethodCardProps } from '../common/MethodCard';
import SendToRawEditorButton from '../common/SendToRawEditorButton';
import { selectRpcSessionIsMainnet } from '../../store/slices/walletConnectSlice';

export type RpcMethodCardProps = Omit<MethodCardProps, 'isMainnet'>;

export function RpcMethodCard({ secondaryActions, ...props }: RpcMethodCardProps) {
  const isMainnet = useSelector(selectRpcSessionIsMainnet);
  return (
    <MethodCard
      {...props}
      isMainnet={isMainnet}
      secondaryActions={
        <>
          {secondaryActions}
          {props.liveRequest && <SendToRawEditorButton request={props.liveRequest} />}
        </>
      }
    />
  );
}

export default RpcMethodCard;
