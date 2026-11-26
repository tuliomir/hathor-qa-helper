/**
 * RPC adapter for MethodCard.
 *
 * - Everything follows the WalletConnect session's chain, not the active
 *   network: requests go to the chain the wallet approved (`hathor:testnet`,
 *   also on Next testnet, or `hathor:mainnet`), whatever wallet QA Helper
 *   has selected. Mainnet arms before sending.
 * - The request builders behind the live preview stamp `network: 'testnet'`;
 *   the preview shown, compared with what was sent and opened in the raw
 *   editor carries the session's network instead, as rpcHandlers sends it.
 * - Adds "Edit raw", which opens the live request in the Raw RPC editor.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MethodCard, type MethodCardProps } from '../common/MethodCard';
import SendToRawEditorButton from '../common/SendToRawEditorButton';
import { withSessionNetwork } from '../../utils/rpcCoreRequests';
import { selectRpcNetworkName, selectRpcSessionIsMainnet } from '../../store/slices/walletConnectSlice';

export type RpcMethodCardProps = Omit<MethodCardProps, 'isMainnet'>;

export function RpcMethodCard({ secondaryActions, liveRequest, ...props }: RpcMethodCardProps) {
  const isMainnet = useSelector(selectRpcSessionIsMainnet);
  const network = useSelector(selectRpcNetworkName);
  const request = useMemo(() => withSessionNetwork(liveRequest, network), [liveRequest, network]);
  return (
    <MethodCard
      {...props}
      liveRequest={request}
      isMainnet={isMainnet}
      secondaryActions={
        <>
          {secondaryActions}
          {request && <SendToRawEditorButton request={request} />}
        </>
      }
    />
  );
}

export default RpcMethodCard;
