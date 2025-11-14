/**
 * Reusable Wallet Component
 * Initializes and manages a Hathor wallet with the provided seed phrase and network
 */

import { useState, useEffect } from 'react';
// @ts-ignore - Hathor wallet lib doesn't have TypeScript definitions
import HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
// @ts-ignore - Hathor wallet lib doesn't have TypeScript definitions
import Connection from '@hathor/wallet-lib/lib/new/connection.js';
import { NETWORK_CONFIG, WALLET_CONFIG } from '../constants/network';
import type { WalletProps, WalletState } from '../types/wallet';
import { validateSeed } from '../utils/walletUtils';

export default function Wallet({
  seedPhrase,
  network,
  onStatusChange,
  onWalletReady,
}: WalletProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    status: 'idle',
    seedPhrase,
  });
  const [wallet, setWallet] = useState<HathorWallet | null>(null);

  // Update state and notify parent
  const updateState = (newState: Partial<WalletState>) => {
    setWalletState((prev) => {
      const updated = { ...prev, ...newState };
      onStatusChange?.(updated);
      return updated;
    });
  };

  useEffect(() => {
    let mounted = true;
    let walletInstance: HathorWallet | null = null;

    async function initializeWallet() {
      try {
        // Validate seed phrase
        if (!validateSeed(seedPhrase)) {
          if (!mounted) return;
          updateState({
            status: 'error',
            error: 'Invalid seed phrase provided',
          });
          return;
        }

        // Get network configuration
        const networkConfig = NETWORK_CONFIG[network];
        if (!networkConfig) {
          if (!mounted) return;
          updateState({
            status: 'error',
            error: `Invalid network: ${network}`,
          });
          return;
        }

        if (!mounted) return;
        updateState({ status: 'connecting' });

        // Create connection to Hathor network
        const connection = new Connection({
          network: networkConfig.name,
          servers: [networkConfig.fullNodeUrl],
          connectionTimeout: WALLET_CONFIG.CONNECTION_TIMEOUT,
        } as any);

        // Create and configure the wallet
        walletInstance = new HathorWallet({
          seed: seedPhrase,
          connection,
          password: WALLET_CONFIG.DEFAULT_PASSWORD,
          pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
        });

        if (!mounted) {
          await walletInstance.stop();
          return;
        }

        setWallet(walletInstance);

        // Start the wallet
        await walletInstance.start();

        if (!mounted) {
          await walletInstance.stop();
          return;
        }

        updateState({ status: 'syncing' });

        // Wait for wallet to be ready
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (!mounted) {
              resolve();
              return;
            }
            if (walletInstance && walletInstance.isReady()) {
              resolve();
            } else {
              setTimeout(checkReady, WALLET_CONFIG.SYNC_CHECK_INTERVAL);
            }
          };
          checkReady();
        });

        if (!mounted || !walletInstance) return;

        // Get the first address
        const firstAddress = await walletInstance.getAddressAtIndex(0);

        if (!mounted) {
          await walletInstance.stop();
          return;
        }

        updateState({
          status: 'ready',
          firstAddress,
        });

        // Notify parent that wallet is ready
        onWalletReady?.(walletInstance);
      } catch (error) {
        if (!mounted) return;
        updateState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    initializeWallet();

    // Cleanup function
    return () => {
      mounted = false;
      if (walletInstance) {
        walletInstance.stop().catch(console.error);
      }
    };
  }, [seedPhrase, network]);

  // Cleanup wallet on unmount
  useEffect(() => {
    return () => {
      if (wallet) {
        wallet.stop().catch(console.error);
      }
    };
  }, [wallet]);

  return (
    <div>
      {walletState.status === 'idle' && <p>Initializing wallet...</p>}

      {walletState.status === 'connecting' && (
        <div>
          <p>🔌 Connecting to Hathor {network.toLowerCase()}...</p>
        </div>
      )}

      {walletState.status === 'syncing' && (
        <div>
          <p>⏳ Wallet started, waiting for sync...</p>
        </div>
      )}

      {walletState.status === 'ready' && (
        <div>
          <div
            style={{
              padding: '15px',
              backgroundColor: '#d4edda',
              border: '1px solid #28a745',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            <h2>✅ Wallet is Ready!</h2>
          </div>

          {walletState.firstAddress && (
            <div
              style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#d1ecf1',
                border: '1px solid #17a2b8',
                borderRadius: '4px',
              }}
            >
              <h3>📬 First Address:</h3>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.1em',
                  wordBreak: 'break-all',
                  fontWeight: 'bold',
                }}
              >
                {walletState.firstAddress}
              </p>
              <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
                Explorer:{' '}
                <a
                  href={NETWORK_CONFIG[network].explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0056b3' }}
                >
                  {NETWORK_CONFIG[network].explorerUrl}
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {walletState.status === 'error' && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#f8d7da',
            border: '1px solid #dc3545',
            borderRadius: '4px',
          }}
        >
          <h2>❌ Error</h2>
          <p style={{ color: '#721c24' }}>{walletState.error}</p>
        </div>
      )}
    </div>
  );
}
