/**
 * Hook to identify and return fee-based tokens from the wallet.
 *
 * Fee tokens are created with version "fee" (TokenVersion.FEE) and
 * require HTR to transfer. This hook checks each token in the wallet
 * storage to determine if it's a fee token.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useWalletStore } from './useWalletStore';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { isFeeToken } from '../utils/feeTokenUtils';

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

  const [feeTokens, setFeeTokens] = useState<FeeTokenInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFeeTokens = async () => {
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
  }, [testWallet, allTokens]);

  return { feeTokens, loading };
}
