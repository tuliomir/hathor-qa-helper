/**
 * ShieldedBadge — accent text on the shielded tint with a veil edge.
 * `amount` (outline shield), `full` (filled shield), `count` ("2 of 3
 * outputs shielded") or the plain "Shielded" badge.
 */

import { MdOutlineShield, MdShield } from 'react-icons/md';
import { VEIL_STRIP } from '../ui/veil';

export type ShieldedBadgeProps =
  | { variant?: 'shielded' | 'amount' | 'full'; className?: string }
  | { variant: 'count'; count: number; total?: number; className?: string };

export function ShieldedBadge(props: ShieldedBadgeProps) {
  const variant = props.variant ?? 'shielded';
  let text: string;
  if (props.variant === 'count') {
    text =
      props.total !== undefined
        ? `${props.count} of ${props.total} outputs shielded`
        : `${props.count} shielded output${props.count === 1 ? '' : 's'}`;
  } else {
    text = variant === 'amount' ? 'Amount shielded' : variant === 'full' ? 'Fully shielded' : 'Shielded';
  }
  const Icon = variant === 'amount' ? MdOutlineShield : MdShield;

  return (
    <span
      className={`relative inline-flex h-[22px] items-center gap-1 overflow-hidden whitespace-nowrap rounded-selector bg-tint-shielded pl-2.5 pr-2 text-caption font-semibold text-accent ${props.className ?? ''}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${VEIL_STRIP}`} />
      <Icon className="h-3 w-3 flex-none" aria-hidden="true" />
      {text}
    </span>
  );
}

export default ShieldedBadge;
