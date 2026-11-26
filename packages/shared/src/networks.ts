/**
 * Network registry shared by the client and the local QA server.
 *
 * Holds raw service URLs only; the client layers its dev-proxy URLs on top.
 */

export type NetworkKey = 'TESTNET' | 'MAINNET' | 'SHIELDED_TESTNET' | 'NEXT_TESTNET';

/** Network name wallet-lib's `Network` class accepts. */
export type LibNetworkName = 'testnet' | 'mainnet';

export interface BlueprintIds {
  bet: string;
  fee: string;
  authority: string;
}

/**
 * A Hathor Next side chain, as hathor-wallet-mobile pins it
 * (src/multichain/chains.js). HTR moves to it by a burn on the Hathor Network
 * that its backend builds; the backend refuses wallets whose pins differ.
 */
export interface HathorNextChain {
  label: string;
  backendUrl: string;
  explorerUrl: string;
  /** What GET /v1/config must answer, field by field. */
  networkId: number;
  nativeToken: string;
  nativeTokenSymbol: string;
  serviceViewPub: string;
  /** Where a burn pays, and the Hathor Next network its data output names. */
  transferAddress: string;
  destinationNetwork: string;
  /** The Hathor Next token a burn of HTR mints. */
  mintToken: string;
  /** Hathor Network confirmations before the mint. */
  confirmations: number;
}

export interface NetworkDefinition {
  key: NetworkKey;
  label: string;
  /** Passed to wallet-lib. The shielded node reports `testnet-shielded-outputs`, which the lib accepts as `testnet`. */
  libName: LibNetworkName;
  /** The name the fullnode's /version reports, when only this network uses it. */
  nodeNetwork?: string;
  fullNodeUrl: string;
  txMiningUrl: string;
  /** Absent on networks without an explorer; links to it are hidden there. */
  explorerUrl?: string;
  explorerServiceUrl?: string;
  walletServiceUrl?: string;
  walletServiceWsUrl?: string;
  supportsShielded: boolean;
  /** Only networks where the QA blueprints are deployed. */
  blueprints?: BlueprintIds;
  /** The Hathor Next side chain beside this network, if any. */
  hathorNext?: HathorNextChain;
}

export const NETWORKS: Record<NetworkKey, NetworkDefinition> = {
  TESTNET: {
    key: 'TESTNET',
    label: 'Testnet',
    libName: 'testnet',
    fullNodeUrl: 'https://node1.testnet.hathor.network/v1a/',
    txMiningUrl: 'https://txmining.testnet.hathor.network/',
    explorerUrl: 'https://explorer.testnet.hathor.network/',
    explorerServiceUrl: 'https://explorer-service.testnet.hathor.network/',
    supportsShielded: false,
    blueprints: {
      bet: '0000019865eda743812c566ce6ad3ac49c5f90796b73aa2792a09b7655ac5a5e',
      fee: '00000000f9f4b9c025cfd757e1cbd662b3eefdc44e0a16cc54906ccf07f8ba8c',
      authority: '00000478ac24158fb576d7eb77cdce19cb7facf43838b71f7e0bf6421bc12977',
    },
  },
  MAINNET: {
    key: 'MAINNET',
    label: 'Mainnet',
    libName: 'mainnet',
    fullNodeUrl: 'https://node1.mainnet.hathor.network/v1a/',
    txMiningUrl: 'https://txmining.mainnet.hathor.network/',
    explorerUrl: 'https://explorer.hathor.network/',
    explorerServiceUrl: 'https://explorer-service.mainnet.hathor.network/',
    supportsShielded: false,
  },
  SHIELDED_TESTNET: {
    key: 'SHIELDED_TESTNET',
    label: 'Shielded testnet',
    libName: 'testnet',
    fullNodeUrl: 'https://node1.shielded-outputs.testnet.hathor.network/v1a/',
    txMiningUrl: 'https://txmining.shielded-outputs.testnet.hathor.network/',
    explorerUrl: 'https://explorer.shielded-outputs.testnet.hathor.network/',
    explorerServiceUrl: 'https://explorer-service.shielded-outputs.testnet.hathor.network/',
    walletServiceUrl: 'https://wallet-service.shielded-outputs.testnet.hathor.network/',
    walletServiceWsUrl: 'wss://ws.wallet-service.shielded-outputs.testnet.hathor.network/',
    supportsShielded: true,
  },
  /**
   * Hathor Next testnet: hathor-core's testnet-juliet, paired with
   * hathor-next's testnet-alpha (hathor-wallet-mobile's
   * PRE_SETTINGS_NEXT_TESTNET). wallet-lib runs it as `testnet`. No
   * explorer-service.
   */
  NEXT_TESTNET: {
    key: 'NEXT_TESTNET',
    label: 'Next testnet',
    libName: 'testnet',
    nodeNetwork: 'testnet-juliet',
    fullNodeUrl: 'https://legacy-node.testnet-alpha.samba.hathor.network/v1a/',
    txMiningUrl: 'https://tx-mining.testnet-alpha.samba.hathor.network/',
    explorerUrl: 'https://legacy-explorer.testnet-alpha.samba.hathor.network/',
    walletServiceUrl: 'https://legacy-wallet-service.testnet-alpha.samba.hathor.network/',
    walletServiceWsUrl: 'wss://legacy-wallet-service-ws.testnet-alpha.samba.hathor.network/',
    supportsShielded: false,
    hathorNext: {
      label: 'Hathor Next (testnet-alpha)',
      backendUrl: 'https://wallet-backend.testnet-alpha.samba.hathor.network',
      explorerUrl: 'https://samba.explorer.hathor.dev/',
      networkId: 1004,
      nativeToken: 'd957d448377de9c9d313d545398677cd6df99ac051dcf2afcd1b38dcb22f92d8',
      nativeTokenSymbol: 'USDT',
      serviceViewPub: 'ee29df21a6c64fe43fc8ec6cd7b8c1ecfc4c89eec9370086129e367693bbf400',
      transferAddress: 'WScTqhLsBQnz3HMdQqh66JBgWqb255XffL',
      destinationNetwork: 'fb3694106fd98e1dc5aa959ef2dc8b1792d593846de685af69c39590a7642b23',
      mintToken: '664cf15052b6f66f1f06ac32189381a27f1bfe1eda2f77cea4fde760b5884d33',
      confirmations: 21,
    },
  },
};

export const NETWORK_KEYS = Object.keys(NETWORKS) as NetworkKey[];

export function isNetworkKey(value: unknown): value is NetworkKey {
  return typeof value === 'string' && value in NETWORKS;
}
