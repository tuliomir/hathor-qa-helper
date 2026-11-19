/**
 * RpcMainnetWarning — a red banner on every RPC screen while the WalletConnect
 * session is on mainnet. QA Helper follows whichever chain the wallet
 * approved, so a phone on mainnet makes every RPC request spend real funds.
 */

import { useSelector } from 'react-redux';
import { MdWarningAmber } from 'react-icons/md';
import { selectRpcSessionIsMainnet } from '../../store/slices/walletConnectSlice';

export function RpcMainnetWarning() {
  const isMainnet = useSelector(selectRpcSessionIsMainnet);
  if (!isMainnet) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-box border-2 border-error bg-tint-error px-4 py-3 text-base-content"
    >
      <MdWarningAmber className="mt-0.5 h-6 w-6 flex-none text-error" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <strong className="text-title text-error">Mainnet: real funds</strong>
        <span>
          The connected wallet approved <code>hathor:mainnet</code>. Every RPC request on this screen acts on mainnet,
          and sends spend real HTR. Disconnect and reconnect from a wallet on a test network to test safely.
        </span>
      </div>
    </div>
  );
}

export default RpcMainnetWarning;
