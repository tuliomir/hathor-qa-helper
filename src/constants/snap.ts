/**
 * MetaMask Snap Constants
 */

export const DEFAULT_SNAP_ORIGIN =
  import.meta.env.VITE_SNAP_ORIGIN ?? 'local:http://localhost:8080';

export const SNAP_ORIGIN_NPM = 'npm:@hathor/hathor-snap';

/**
 * RPC response type numbers matching the RpcResponseTypes enum
 * from hathor-rpc-handler. The enum is 0-indexed.
 */
export const RpcResponseType = {
  SendNanoContractTx: 0,
  SignWithAddress: 1,
  GetAddress: 2,
  GetBalance: 3,
  GetConnectedNetwork: 4,
  GetUtxos: 5,
  CreateToken: 6,
  SignOracleData: 7,
  SendTransaction: 8,
  CreateNanoContractCreateTokenTx: 9,
  ChangeNetwork: 10,
  GetXpub: 11,
  GetWalletInformation: 12,
} as const;
