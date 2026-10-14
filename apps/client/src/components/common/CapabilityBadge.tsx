/**
 * CapabilityBadge — a wallet's shielded capability as a three-segment
 * meter plus the word. It takes an explicit `canCreateShieldedOutputs`
 * input instead of trusting wallet-lib's `canSpend`: in the browser a
 * "full" wallet can only decrypt, so it reads "View · receive-only".
 * Use `canCreateShieldedOutputs()` from services/shieldedCapability for
 * browser wallets, and `true` only for server-side (native prover) wallets.
 */

import type { ShieldedCapabilityLevel } from '@qa-helper/shared/serverApi';
import { capabilityDisplay } from '../../utils/capabilityDisplay';

export interface CapabilityBadgeProps {
  /** Level as wallet-lib reports it. */
  level: ShieldedCapabilityLevel | undefined;
  /** Whether this context can build shielded outputs (never `canSpend`). */
  canCreateShieldedOutputs: boolean;
  /** wallet-lib's reason for a reduced level, for the tooltip. */
  reason?: string | null;
  className?: string;
}

export function CapabilityBadge({ level, canCreateShieldedOutputs, reason, className = '' }: CapabilityBadgeProps) {
  const d = capabilityDisplay(level, canCreateShieldedOutputs, reason);
  const muted = d.segments === 0;

  return (
    <span
      title={d.title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold ${muted ? 'text-ink-muted' : 'text-accent'} ${className}`}
    >
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className={`h-[11px] w-[5px] rounded-[1px] border ${muted ? 'border-ink-muted' : 'border-accent'} ${i < d.segments ? 'bg-accent' : ''}`}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">Shielded capability: </span>
        {d.word}
        {d.receiveOnly && <span className="font-normal"> · receive-only</span>}
      </span>
    </span>
  );
}

export default CapabilityBadge;
