/**
 * Hathor QA Helper - Proof of Concept
 * Connects to Hathor testnet and displays the first wallet address
 */

import HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import Connection from '@hathor/wallet-lib/lib/new/connection.js';
import Mnemonic from 'bitcore-mnemonic';

// Testnet configuration
const TESTNET_FULLNODE_URL = 'https://node1.testnet.hathor.network/v1a/';
const NETWORK_NAME = 'testnet';

async function main() {
  console.log('🚀 Hathor QA Helper - Proof of Concept\n');

  // Generate a new seed phrase for the wallet
  const mnemonic = new Mnemonic();
  const seed = mnemonic.phrase;

  console.log('📝 Generated seed phrase:');
  console.log(seed);
  console.log('\n⚠️  Save this seed phrase if you want to access this wallet again!\n');

  // Create connection to Hathor testnet
  console.log('🔌 Connecting to Hathor testnet...');
  const connection = new Connection({
    network: NETWORK_NAME,
    servers: [TESTNET_FULLNODE_URL],
    connectionTimeout: 30000,
  });

  // Create and configure the wallet
  console.log('💼 Creating wallet...');
  const wallet = new HathorWallet({
    seed,
    connection,
    password: 'test-password',
    pinCode: '123456',
  });

  // Start the wallet
  console.log('⏳ Starting wallet and syncing with network...');
  await wallet.start();

  // Wait for wallet to be ready
  console.log('⏳ Waiting for wallet to be ready...');
  await new Promise<void>((resolve) => {
    const checkReady = () => {
      if (wallet.isReady()) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });

  // Get the first address
  const firstAddress = await wallet.getAddressAtIndex(0);

  console.log('✅ Wallet is ready!\n');
  console.log('📬 First address:', firstAddress);
  console.log('\nYou can fund this address at: https://testnet.hathor.network/wallet/');

  // Stop the wallet
  await wallet.stop();
  console.log('\n👋 Wallet stopped. Done!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});