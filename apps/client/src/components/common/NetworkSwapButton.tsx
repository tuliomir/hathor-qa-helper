/**
 * NetworkSwapButton — icon button that opens a menu of networks and moves
 * the wallet to the one picked. Disabled while the wallet is connecting or
 * syncing.
 *
 * The menu is fixed to the viewport: the button sits in scrolling tables
 * and modals that would clip an absolutely positioned panel.
 */

import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { FiCheck } from 'react-icons/fi';
import { MdSwapVert } from 'react-icons/md';
import { NETWORK_CONFIG, NETWORK_MENU_ORDER, type NetworkKey } from '../../constants/network';
import { MENU_ITEM_CLASS, handleMenuKeyDown, usePopover } from '../ui/usePopover';
import NetworkSwatch from './NetworkSwatch';

const MENU_WIDTH_PX = 224;
const GAP_PX = 4;

interface NetworkSwapButtonProps {
  walletId: string;
  /** Names the wallet in the accessible label. */
  walletName?: string;
  currentNetwork: NetworkKey;
  walletStatus: string;
  onSwap: (walletId: string, currentNetwork: NetworkKey, status: string, target: NetworkKey) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

export default function NetworkSwapButton({
  walletId,
  walletName,
  currentNetwork,
  walletStatus,
  onSwap,
  className = '',
  disabled = false,
}: NetworkSwapButtonProps) {
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  const [position, setPosition] = useState<CSSProperties>({});
  const isSwapping = walletStatus === 'connecting' || walletStatus === 'syncing';
  const label = walletName ? `Move ${walletName} to another network` : 'Move to another network';

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fitsRight = rect.left + MENU_WIDTH_PX <= window.innerWidth - GAP_PX;
      setPosition({
        top: rect.bottom + GAP_PX,
        left: fitsRight ? rect.left : Math.max(GAP_PX, rect.right - MENU_WIDTH_PX),
        width: MENU_WIDTH_PX,
      });
    };
    place();
    panelRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]:not([disabled])')?.focus();
    // The anchor moves with any scrolling ancestor; closing is simpler than tracking it.
    const onScroll = () => close();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, close, triggerRef, panelRef]);

  const choose = (target: NetworkKey) => {
    close(true);
    onSwap(walletId, currentNetwork, walletStatus, target);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        title="Move to another network"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`btn btn-ghost btn-xs btn-square ${className}`}
        disabled={disabled || isSwapping}
      >
        <MdSwapVert aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          style={position}
          className="fixed z-50 flex flex-col gap-0.5 bg-base-100 text-base-content border border-base-300 rounded-box shadow-float p-1.5"
        >
          <p className="m-0 px-2 pt-1 pb-1.5 text-caption font-semibold text-ink-muted">Move to network</p>
          {NETWORK_MENU_ORDER.map((key) => {
            const isCurrent = key === currentNetwork;
            return (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                disabled={isCurrent}
                onClick={() => choose(key)}
                className={`${MENU_ITEM_CLASS} disabled:cursor-default disabled:hover:bg-transparent`}
              >
                <NetworkSwatch network={key} />
                <span className="flex-1 font-semibold">{NETWORK_CONFIG[key].label}</span>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                    <FiCheck aria-hidden="true" /> Current
                  </span>
                ) : (
                  key === 'MAINNET' && <span className="text-caption font-semibold text-error">Real funds</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
