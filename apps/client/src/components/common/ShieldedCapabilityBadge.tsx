/**
 * Small badge with a wallet's shielded capability, as the browser can use it.
 */

import { shieldedCapabilityBadge, type ShieldedCapabilitySummary } from '../../services/shieldedCapability';

export default function ShieldedCapabilityBadge({ capability }: { capability?: ShieldedCapabilitySummary }) {
  const badge = shieldedCapabilityBadge(capability);
  if (!badge) return null;
  return (
    <span className={`badge badge-sm whitespace-nowrap ${badge.className}`} title={badge.title}>
      {badge.label}
    </span>
  );
}
