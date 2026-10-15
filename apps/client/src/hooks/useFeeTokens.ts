/**
 * Hook to identify and return fee-based tokens from the wallet.
 *
 * Fee tokens are created with version "fee" (TokenVersion.FEE) and
 * require HTR to transfer. This hook checks each token in the wallet
 * storage to determine if it's a fee token. An address-only wallet has no
 * storage, so its hand-added tokens are checked on the full node.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useWalletStore } from './useWalletStore';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { isFeeToken, isFeeTokenOnNode } from '../utils/feeTokenUtils';
import { useAddressOnlyTokens } from './useAddressOnlyTokens';
import { NETWORK_CONFIG } from '../constants/network';

export interface FeeTokenInfo {
  uid: string;
  symbol: string;
  name: string;
}

export function useFeeTokens(): { feeTokens: FeeTokenInfo[]; loading: boolean } {
  const { getWallet } = useWalletStore();
  const testWalletId = useSelector((state: RootState) => state.walletSelection.testWalletId);
  const allTokens = useSelector((state: RootState) => state.tokens.tokens);
  const testWallet = testWalletId ? getWallet(testWalletId) : null;
  const addressOnlyTokens = useAddressOnlyTokens();

  const [feeTokens, setFeeTokens] = useState<FeeTokenInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadAddressOnlyFeeTokens = async (tokens: FeeTokenInfo[], fullNodeUrl: string) => {
      setLoading(true);
      const checks = await Promise.all(tokens.map((t) => isFeeTokenOnNode(fullNodeUrl, t.uid)));
      if (cancelled) return;
      setFeeTokens(tokens.filter((_, i) => checks[i]));
      setLoading(false);
    };

    const loadFeeTokens = async () => {
      if (addressOnlyTokens && testWallet) {
        await loadAddressOnlyFeeTokens(addressOnlyTokens, NETWORK_CONFIG[testWallet.metadata.network].fullNodeUrl);
        return;
      }
      if (!testWallet?.instance || !testWallet.tokenUids) {
        setFeeTokens([]);
        return;
      }

      setLoading(true);
      try {
        const results: FeeTokenInfo[] = [];

        for (const uid of testWallet.tokenUids) {
          if (uid === NATIVE_TOKEN_UID) continue;

          if (await isFeeToken(testWallet.instance, uid)) {
            const tokenInfo = allTokens.find((t) => t.uid === uid);
            results.push({
              uid,
              symbol: tokenInfo?.symbol || uid.slice(0, 8),
              name: tokenInfo?.name || 'Unknown',
            });
          }
        }

        setFeeTokens(results);
      } catch (error) {
        console.error('[useFeeTokens] Failed to load fee tokens:', error);
        setFeeTokens([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeeTokens();
    return () => {
      cancelled = true;
    };
  }, [testWallet, allTokens, addressOnlyTokens]);

  return { feeTokens, loading };
}
