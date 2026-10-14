/**
 * Network registry shared by the client and the local QA server.
 *
 * Holds raw service URLs only; the client layers its dev-proxy URLs on top.
 */

export type NetworkKey = 'TESTNET' | 'MAINNET' | 'SHIELDED_TESTNET';

/** Network name wallet-lib's `Network` class accepts. */
export type LibNetworkName = 'testnet' | 'mainnet';

export interface BlueprintIds {
  bet: string;
  fee: string;
  authority: string;
}

export interface NetworkDefinition {
  key: NetworkKey;
  label: string;
  /** Passed to wallet-lib. The shielded node reports `testnet-shielded-outputs`, which the lib accepts as `testnet`. */
  libName: LibNetworkName;
  fullNodeUrl: string;
  txMiningUrl: string;
  explorerUrl: string;
  explorerServiceUrl: string;
  walletServiceUrl?: string;
  walletServiceWsUrl?: string;
  supportsShielded: boolean;
  /** Only networks where the QA blueprints are deployed. */
  blueprints?: BlueprintIds;
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
};

export const NETWORK_KEYS = Object.keys(NETWORKS) as NetworkKey[];

export function isNetworkKey(value: unknown): value is NetworkKey {
  return typeof value === 'string' && value in NETWORKS;
}
