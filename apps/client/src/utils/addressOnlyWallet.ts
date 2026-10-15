/**
 * Address-only wallets: wallets known only by name, network and address 0,
 * such as passkey wallets from the mobile app (knowledge/passkeys.md). They
 * have no seed, are never started, and work only where the test wallet's
 * address is enough: RPC requests and sends to the test wallet.
 */

import type { NetworkKey } from '@qa-helper/shared/networks';
import type { WalletMetadata } from '../types/walletStore';
import { addressAcceptError, detectAddressKind } from './addressKind';

export function isAddressOnly(metadata: Pick<WalletMetadata, 'kind'>): boolean {
  return metadata.kind === 'address';
}

/** Address 0: saved for address-only wallets, known for seed wallets once started. */
export function walletAddress0(
  wallet: { metadata: WalletMetadata; firstAddress?: string } | null | undefined
): string | null {
  if (!wallet) return null;
  if (isAddressOnly(wallet.metadata)) return wallet.metadata.address0 ?? null;
  return wallet.firstAddress ?? null;
}

/** Why `address` can't be an address-only wallet's address 0 on `network`, or null. */
export function addressOnlyError(address: string, network: NetworkKey): string | null {
  if (address.trim() === '') return 'Enter the wallet’s address 0';
  return addressAcceptError(detectAddressKind(address, network), 'transparent', network);
}

/**
 * The tokens added by hand to an address-only wallet, named from the
 * configuration string they were added with, then the token registry, then
 * a shortened UID.
 */
export function addressOnlyTokenOptions(
  added: NonNullable<WalletMetadata['tokens']>,
  known: ReadonlyArray<{ uid: string; name: string; symbol: string }>
): Array<{ uid: string; name: string; symbol: string }> {
  return added.map((t) => {
    const k = known.find((token) => token.uid === t.uid);
    return {
      uid: t.uid,
      name: t.name ?? k?.name ?? 'Unknown',
      symbol: t.symbol ?? k?.symbol ?? `${t.uid.slice(0, 8)}…`,
    };
  });
}
