/**
 * NetworkSwitcher
 *
 * The network chip in the top bar and its popover. The active network
 * follows the selected test (else funding) wallet; the choice made here is
 * the preferred network: the default for new wallets and what the app shows
 * when no wallet is selected. It never restarts or moves wallets.
 * Choosing mainnet asks for confirmation first.
 */

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { NETWORKS } from '@qa-helper/shared/networks';
import { NETWORK_CONFIG, NETWORK_MENU_ORDER, type NetworkKey } from '../../constants/network';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectActiveNetworkInfo, selectPreferredNetwork, setPreferredNetwork } from '../../store/slices/networkSlice';
import { useStage } from '../../hooks/useStage';
import NetworkChip from '../common/NetworkChip';
import NetworkSwatch from '../common/NetworkSwatch';
import { POPOVER_PANEL_CLASS, usePopover } from '../ui/usePopover';

const NOTES: Record<NetworkKey, { text: string; className: string }> = {
  TESTNET: { text: '', className: '' },
  SHIELDED_TESTNET: { text: 'Shielded outputs', className: 'text-accent' },
  MAINNET: { text: 'Real funds', className: 'text-error font-semibold' },
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function NetworkSwitcher() {
  const dispatch = useAppDispatch();
  const { setCurrentStage } = useStage();
  const active = useAppSelector(selectActiveNetworkInfo);
  const preferred = useAppSelector(selectPreferredNetwork);
  const followedWallet = useAppSelector((s) => {
    const id = active.source === 'test-wallet' ? s.walletSelection.testWalletId : s.walletSelection.fundingWalletId;
    return active.source === 'preference' || !id ? null : (s.walletStore.wallets[id]?.metadata.friendlyName ?? null);
  });
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) setConfirming(false);
    else panelRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
  }, [open, panelRef]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const choose = (network: NetworkKey) => {
    if (network === 'MAINNET' && preferred !== 'MAINNET') {
      setConfirming(true);
      return;
    }
    dispatch(setPreferredNetwork(network));
    close(true);
  };

  const label = NETWORK_CONFIG[active.network].label;

  return (
    <div className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Network: ${label}`}
        onClick={toggle}
        className="rounded-full"
      >
        <NetworkChip network={active.network} label="responsive">
          <FiChevronDown aria-hidden="true" size={12} />
        </NetworkChip>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Network"
          className={`${POPOVER_PANEL_CLASS} top-full right-0 w-[min(400px,calc(100vw-1rem))]`}
        >
          <h2 className="m-0 px-2 pt-1.5 pb-2 text-caption font-semibold text-ink-muted">Network</h2>
          {followedWallet && (
            <p className="m-0 mx-2 mb-2 text-caption text-ink-muted">
              Showing the {active.source === 'test-wallet' ? 'test' : 'funding'} wallet’s network ({followedWallet}).
              Your choice here is the default for new wallets and applies when no wallet is selected.{' '}
              <button
                type="button"
                className="link link-primary"
                onClick={() => {
                  close();
                  setCurrentStage('wallet-initialization');
                }}
              >
                Manage wallets
              </button>
            </p>
          )}
          <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
            {NETWORK_MENU_ORDER.map((key) => {
              const isActive = key === active.network;
              const isPreferred = key === preferred;
              const note = NOTES[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => choose(key)}
                    className={`grid w-full grid-cols-[16px_1fr_auto] items-center gap-x-2.5 gap-y-0.5 p-2 rounded-field text-left hover:bg-base-200 ${isActive ? 'bg-base-200' : ''}`}
                  >
                    <NetworkSwatch network={key} />
                    <span className="font-semibold">{NETWORK_CONFIG[key].label}</span>
                    <span className={`text-caption ${note.className}`}>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-success font-semibold">
                          <FiCheck aria-hidden="true" /> Active
                        </span>
                      ) : (
                        note.text
                      )}
                    </span>
                    <span className="col-start-2 col-span-2 font-mono text-data-sm text-ink-muted">
                      {hostOf(NETWORKS[key].fullNodeUrl)}
                      {isPreferred && !isActive && <span className="font-sans"> · default for new wallets</span>}
                    </span>
                  </button>
                  {key === 'MAINNET' && confirming && (
                    <div
                      role="group"
                      aria-label="Confirm mainnet"
                      className="ml-8 mr-2 mb-2 p-2.5 rounded-field bg-tint-error"
                    >
                      <p className="m-0 text-body">
                        New wallets will default to mainnet, which uses real funds. Selected wallets, RPC and Snap
                        sessions keep their own network.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          ref={confirmRef}
                          type="button"
                          className="btn btn-sm btn-error"
                          onClick={() => {
                            dispatch(setPreferredNetwork('MAINNET'));
                            close(true);
                          }}
                        >
                          Switch to mainnet
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
