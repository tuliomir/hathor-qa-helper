/**
 * Mock MetaMask Provider for E2E Tests
 *
 * Injected via page.addInitScript() BEFORE the app loads. Creates a mock
 * window.ethereum provider that snap-utils' getSnapsProvider() discovers.
 *
 * The mock handles:
 * - wallet_getSnaps → returns installed snap info
 * - wallet_requestSnaps → simulates snap installation
 * - wallet_invokeSnap → configurable: success response or error
 *
 * Test control via window.__mockMetaMask:
 * - setNextResponse(response) — next wallet_invokeSnap resolves with this
 * - setNextError(error) — next wallet_invokeSnap rejects with this
 * - getCallLog() — returns array of all wallet_invokeSnap calls
 */

export const MOCK_SNAP_ID = 'local:http://localhost:8080';
export const MOCK_SNAP_VERSION = '0.1.0';

/**
 * Returns the script string to inject via page.addInitScript().
 * Must be a self-contained function — no closures over external variables.
 */
export function getMockProviderScript(options?: {
  snapId?: string;
  snapVersion?: string;
}) {
  const snapId = options?.snapId ?? MOCK_SNAP_ID;
  const snapVersion = options?.snapVersion ?? MOCK_SNAP_VERSION;

  // The function is serialized and runs in the browser context
  return `
(function() {
  const SNAP_ID = ${JSON.stringify(snapId)};
  const SNAP_VERSION = ${JSON.stringify(snapVersion)};

  let nextResponse = undefined;
  let nextError = undefined;
  const callLog = [];

  const provider = {
    isMetaMask: true,
    request: async function(args) {
      const method = args.method;
      const params = args.params;

      if (method === 'wallet_getSnaps') {
        const result = {};
        result[SNAP_ID] = {
          id: SNAP_ID,
          version: SNAP_VERSION,
          enabled: true,
          blocked: false,
        };
        return result;
      }

      if (method === 'wallet_requestSnaps') {
        const result = {};
        result[SNAP_ID] = {
          id: SNAP_ID,
          version: SNAP_VERSION,
        };
        return result;
      }

      if (method === 'wallet_invokeSnap') {
        const snapRequest = params?.request;
        callLog.push({
          snapId: params?.snapId,
          method: snapRequest?.method,
          params: snapRequest?.params,
          timestamp: Date.now(),
        });

        if (nextError !== undefined) {
          const err = nextError;
          nextError = undefined;
          throw err;
        }

        if (nextResponse !== undefined) {
          const resp = nextResponse;
          nextResponse = undefined;
          return resp;
        }

        // Default: return a generic success response
        return { success: true, method: snapRequest?.method };
      }

      // Unknown method — return null
      return null;
    },
    on: function() {},
    removeListener: function() {},
  };

  // Set as window.ethereum so getSnapsProvider() finds it immediately
  window.ethereum = provider;

  // Also announce via EIP-6963 for the SnapConnectionStage detection
  window.addEventListener('eip6963:requestProvider', function() {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'mock-metamask-uuid',
          name: 'MetaMask (Mock)',
          icon: 'data:image/svg+xml,<svg/>',
          rdns: 'io.metamask',
        },
        provider: provider,
      },
    }));
  });

  // Expose test control API
  window.__mockMetaMask = {
    setNextResponse: function(response) {
      nextResponse = response;
      nextError = undefined;
    },
    setNextError: function(error) {
      nextError = error;
      nextResponse = undefined;
    },
    getCallLog: function() {
      return callLog.slice();
    },
    clearCallLog: function() {
      callLog.length = 0;
    },
    reset: function() {
      nextResponse = undefined;
      nextError = undefined;
      callLog.length = 0;
    },
  };
})();
`;
}
