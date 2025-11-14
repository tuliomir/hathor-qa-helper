/**
 * Hathor QA Helper - Wallet Display Component
 * Connects to Hathor testnet and displays the first wallet address
 */

import { useState, useEffect } from 'react';
import HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import Connection from '@hathor/wallet-lib/lib/new/connection.js';
import Mnemonic from 'bitcore-mnemonic';

// Testnet configuration
const TESTNET_FULLNODE_URL = 'https://node1.testnet.hathor.network/v1a/';
const NETWORK_NAME = 'testnet';

type WalletState = {
  status: 'idle' | 'connecting' | 'syncing' | 'ready' | 'error';
  seedPhrase?: string;
  firstAddress?: string;
  error?: string;
};

export default function WalletDisplay() {
  const [walletState, setWalletState] = useState<WalletState>({
    status: 'idle',
  });
  const [wallet, setWallet] = useState<HathorWallet | null>(null);

  useEffect(() => {
    let mounted = true;
    let walletInstance: HathorWallet | null = null;

    async function initializeWallet() {
      try {
        // Generate a new seed phrase for the wallet
        const mnemonic = new Mnemonic();
        const seed = mnemonic.phrase;

        if (!mounted) return;
        setWalletState({
          status: 'connecting',
          seedPhrase: seed,
        });

        // Create connection to Hathor testnet
        const connection = new Connection({
          network: NETWORK_NAME,
          servers: [TESTNET_FULLNODE_URL],
          connectionTimeout: 30000,
        });

        // Create and configure the wallet
        walletInstance = new HathorWallet({
          seed,
          connection,
          password: 'test-password',
          pinCode: '123456',
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

        setWalletState((prev) => ({
          ...prev,
          status: 'syncing',
        }));

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
              setTimeout(checkReady, 100);
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

        setWalletState((prev) => ({
          ...prev,
          status: 'ready',
          firstAddress,
        }));
      } catch (error) {
        if (!mounted) return;
        setWalletState({
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
  }, []);

  // Cleanup wallet on unmount
  useEffect(() => {
    return () => {
      if (wallet) {
        wallet.stop().catch(console.error);
      }
    };
  }, [wallet]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Hathor QA Helper - Wallet Display</h1>

      {walletState.status === 'idle' && <p>Initializing...</p>}

      {walletState.status === 'connecting' && (
        <div>
          <p>🔌 Connecting to Hathor testnet...</p>
          {walletState.seedPhrase && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
              <h3>📝 Generated Seed Phrase:</h3>
              <p style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {walletState.seedPhrase}
              </p>
              <p style={{ fontSize: '0.9em', color: '#856404' }}>
                ⚠️ Save this seed phrase if you want to access this wallet again!
              </p>
            </div>
          )}
        </div>
      )}

      {walletState.status === 'syncing' && (
        <div>
          <p>⏳ Wallet started, waiting for sync...</p>
          {walletState.seedPhrase && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
              <h3>📝 Seed Phrase:</h3>
              <p style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {walletState.seedPhrase}
              </p>
            </div>
          )}
        </div>
      )}

      {walletState.status === 'ready' && (
        <div>
          <div style={{ padding: '15px', backgroundColor: '#d4edda', border: '1px solid #28a745', borderRadius: '4px', marginBottom: '20px' }}>
            <h2>✅ Wallet is Ready!</h2>
          </div>

          {walletState.seedPhrase && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
              <h3>📝 Seed Phrase:</h3>
              <p style={{ fontFamily: 'monospace', wordBreak: 'break-word', fontSize: '0.9em' }}>
                {walletState.seedPhrase}
              </p>
              <p style={{ fontSize: '0.85em', color: '#856404', marginTop: '10px' }}>
                ⚠️ Save this seed phrase if you want to access this wallet again!
              </p>
            </div>
          )}

          {walletState.firstAddress && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', border: '1px solid #17a2b8', borderRadius: '4px' }}>
              <h3>📬 First Address:</h3>
              <p style={{ fontFamily: 'monospace', fontSize: '1.1em', wordBreak: 'break-all', fontWeight: 'bold' }}>
                {walletState.firstAddress}
              </p>
              <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
                You can fund this address at:{' '}
                <a
                  href="https://testnet.hathor.network/wallet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0056b3' }}
                >
                  https://testnet.hathor.network/wallet/
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {walletState.status === 'error' && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', border: '1px solid #dc3545', borderRadius: '4px' }}>
          <h2>❌ Error</h2>
          <p style={{ color: '#721c24' }}>{walletState.error}</p>
        </div>
      )}
    </div>
  );
}