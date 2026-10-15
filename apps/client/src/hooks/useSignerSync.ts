/**
 * Keeps signers in step with wallets (`utils/signerSync.ts`). Mounted once
 * by the shell. Loads the session list when the QA server comes online or
 * its session count changes (a restart drops every session), and polls it
 * while a signer is starting.
 */

import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchServerSessions,
  selectQaServer,
  sessionOwnerSet,
  startSigner,
  stopSigner,
} from '../store/slices/qaServerSlice';
import { planSignerSync, type SignerWallet } from '../utils/signerSync';

const STARTING_POLL_MS = 2000;

export function useSignerSync() {
  const dispatch = useAppDispatch();
  const qaServer = useAppSelector(selectQaServer);
  const online = useAppSelector((s) => s.helperServer.status === 'online');
  const serverSessionCount = useAppSelector((s) => s.helperServer.sessions);
  const storeWallets = useAppSelector((s) => s.walletStore.wallets);
  const anyStarting = qaServer.sessions.some((s) => s.state === 'starting');

  const wallets = useMemo(
    (): SignerWallet[] =>
      Object.values(storeWallets).map((w) => ({
        id: w.metadata.id,
        network: w.metadata.network,
        kind: w.metadata.kind ?? 'seed',
        status: w.status,
        firstAddress: w.firstAddress,
      })),
    [storeWallets]
  );

  useEffect(() => {
    if (online) void dispatch(fetchServerSessions());
  }, [online, serverSessionCount, dispatch]);

  useEffect(() => {
    if (!online || !anyStarting) return;
    const timer = window.setInterval(() => void dispatch(fetchServerSessions()), STARTING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [online, anyStarting, dispatch]);

  useEffect(() => {
    // Act on a fresh list only: a stale one would restart or stop the wrong signers.
    if (!online || qaServer.status !== 'loaded') return;
    const plan = planSignerSync({
      wallets,
      sessions: qaServer.sessions,
      owners: qaServer.owners,
      busy: new Set(qaServer.busy),
      failed: new Set(Object.keys(qaServer.failures)),
    });
    for (const a of plan.adopt) dispatch(sessionOwnerSet(a));
    for (const walletId of plan.start) void dispatch(startSigner(walletId));
    for (const sessionId of plan.stop) {
      void dispatch(stopSigner({ sessionId, walletId: qaServer.owners[sessionId] }));
    }
  }, [
    online,
    wallets,
    qaServer.status,
    qaServer.sessions,
    qaServer.owners,
    qaServer.busy,
    qaServer.failures,
    dispatch,
  ]);
}
