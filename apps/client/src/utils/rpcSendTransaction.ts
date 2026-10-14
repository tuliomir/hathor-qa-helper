/** htr_sendTransaction request building shared by the RPC send stage and its card. */

import type { SendTransactionOutput } from '../store/slices/sendTransactionSlice';
import { timelockToUnix } from './timelockUtils';

/** Builds the request exactly as rpcHandlers.getRpcSendTransaction does. */
export function buildSendTransactionRequest(outputs: SendTransactionOutput[], pushTx: boolean) {
  return {
    method: 'htr_sendTransaction',
    params: {
      network: 'testnet',
      push_tx: pushTx,
      outputs: outputs.map((o) => {
        if (o.type === 'data') return { data: o.data };
        const out: { address?: string; value?: string; token?: string; timelock?: number } = {
          address: o.address,
          value: o.value,
          token: o.token,
        };
        const ts = timelockToUnix(o.timelock || '');
        if (ts !== undefined) out.timelock = ts;
        return out;
      }),
    },
  };
}
