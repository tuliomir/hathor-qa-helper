/**
 * Snap Method Handlers
 *
 * Wraps @hathor/snap-utils invokeSnap calls for each Hathor Snap method.
 * Each handler builds the correct params, supports dry-run mode,
 * and returns { request, response } matching the existing RPC handler shape.
 */

type InvokeSnapFn = (params: {
  method: string;
  params?: Record<string, unknown>;
}) => Promise<unknown>;

export interface SnapHandlerResult {
  request: { method: string; params?: Record<string, unknown> };
  response: unknown;
}

export const createSnapHandlers = (
  invokeSnap: InvokeSnapFn,
  dryRun: boolean,
) => {
  const invoke = async (
    method: string,
    params?: Record<string, unknown>,
  ): Promise<SnapHandlerResult> => {
    const request = params ? { method, params } : { method };
    if (dryRun) return { request, response: null };
    const response = await invokeSnap(request);
    return { request, response };
  };

  return {
    getAddress: (type: string, index?: number) => {
      const params: Record<string, unknown> = { type };
      if (type === 'index' && index !== undefined) params.index = index;
      return invoke('htr_getAddress', params);
    },

    getBalance: (tokens: string[]) =>
      invoke('htr_getBalance', { tokens }),

    getConnectedNetwork: () =>
      invoke('htr_getConnectedNetwork'),

    getUtxos: (params?: Record<string, unknown>) =>
      invoke('htr_getUtxos', params ?? {}),

    sendTransaction: (params: Record<string, unknown>) =>
      invoke('htr_sendTransaction', params),

    signWithAddress: (message: string, addressIndex: number) =>
      invoke('htr_signWithAddress', { message, addressIndex }),

    createToken: (params: Record<string, unknown>) =>
      invoke('htr_createToken', params),

    sendNanoContractTx: (params: Record<string, unknown>) =>
      invoke('htr_sendNanoContractTx', params),

    createNanoContractCreateTokenTx: (params: Record<string, unknown>) =>
      invoke('htr_createNanoContractCreateTokenTx', params),

    signOracleData: (ncId: string, data: string, oracle: string) =>
      invoke('htr_signOracleData', { nc_id: ncId, data, oracle }),

    changeNetwork: (newNetwork: string) =>
      invoke('htr_changeNetwork', { newNetwork }),

    getXpub: (network: string) =>
      invoke('htr_getXpub', { network }),

    getWalletInformation: () =>
      invoke('htr_getWalletInformation'),
  };
};
