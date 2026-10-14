/**
 * Quick-fill sources for the Shielded stages: legacy and shielded address 0
 * of every client wallet and every QA server session.
 */

import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { walletInstancesMap } from '../store/slices/walletStoreSlice';
import { sessionLabel } from '../store/slices/qaServerSlice';
import { NETWORK_CONFIG } from '../constants/network';
import type { CustomAddressSource } from '../components/common/AddressInput';

export function useShieldedAddressBook(): CustomAddressSource[] {
  const wallets = useAppSelector((state) => state.walletStore.wallets);
  const { sessions, labels } = useAppSelector((state) => state.qaServer);

  return useMemo(() => {
    const sources: CustomAddressSource[] = [];
    for (const w of Object.values(wallets)) {
      const name = w.metadata.friendlyName;
      const ready = w.status === 'ready';
      const notReady = ready ? null : `${name} is not started`;
      sources.push({
        key: `client-${w.metadata.id}-legacy`,
        label: `${name} addr 0`,
        disabledReason: notReady,
        value: async () => {
          const instance = walletInstancesMap.get(w.metadata.id);
          if (!instance) throw new Error('wallet not started');
          return instance.getAddressAtIndex(0);
        },
      });
      if (NETWORK_CONFIG[w.metadata.network]?.supportsShielded) {
        sources.push({
          key: `client-${w.metadata.id}-shielded`,
          label: `${name} shielded addr 0`,
          disabledReason: notReady,
          value: async () => {
            const instance = walletInstancesMap.get(w.metadata.id);
            if (!instance) throw new Error('wallet not started');
            return instance.getAddressAtIndex(0, { legacy: false });
          },
        });
      }
    }
    for (const s of sessions) {
      const name = `Server: ${sessionLabel(s, labels)}`;
      sources.push({ key: `server-${s.id}-legacy`, label: `${name} addr 0`, value: s.legacyAddress0 });
      sources.push({
        key: `server-${s.id}-shielded`,
        label: `${name} shielded addr 0`,
        value: s.shieldedAddress0 ?? '',
        disabledReason: s.shieldedAddress0 ? null : 'No shielded address on this session',
      });
    }
    return sources;
  }, [wallets, sessions, labels]);
}
