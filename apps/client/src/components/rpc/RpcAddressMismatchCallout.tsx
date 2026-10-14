/**
 * Warning shown when the RPC session's wallet is not the test wallet.
 */

import { Callout } from '../ui/Callout';
import { Identifier } from '../common/Identifier';
import type { RpcAddressMismatch } from '../../hooks/useRpcAddressMismatch';

export function RpcAddressMismatchCallout({ mismatch }: { mismatch: RpcAddressMismatch }) {
  return (
    <Callout tone="warning" title="Connected wallet differs from the test wallet">
      <p className="m-0">
        The RPC session's first address does not match the test wallet's address 0, so sending is disabled. Connect the
        matching wallet or choose another test wallet.
      </p>
      <dl className="m-0 mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
        <dt>RPC session</dt>
        <dd className="m-0 min-w-0">
          <Identifier value={mismatch.connectedAddress} kind="address" walletTag={false} />
        </dd>
        <dt>Test wallet</dt>
        <dd className="m-0 min-w-0">
          <Identifier value={mismatch.testWalletAddress} kind="address" walletTag={false} />
        </dd>
      </dl>
    </Callout>
  );
}

export default RpcAddressMismatchCallout;
