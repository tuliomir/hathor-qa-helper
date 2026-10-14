/**
 * Callout — inline message with an icon, optional title, body and action.
 * Coloured boxes in stages are Callouts; Panels have no colour variants.
 */

import React from 'react';
import {
  MdCheckCircleOutline,
  MdErrorOutline,
  MdInfoOutline,
  MdOutlineScience,
  MdShield,
  MdWarningAmber,
} from 'react-icons/md';
import { VEIL_STRIP } from './veil';

export type CalloutTone = 'info' | 'success' | 'warning' | 'error' | 'shielded' | 'dry-run';

const TONE: Record<CalloutTone, { box: string; icon: string; Icon: React.ComponentType<{ className?: string }> }> = {
  info: { box: 'bg-tint-info', icon: 'text-info', Icon: MdInfoOutline },
  success: { box: 'bg-tint-success', icon: 'text-success', Icon: MdCheckCircleOutline },
  warning: { box: 'bg-tint-warning', icon: 'text-warning-ink', Icon: MdWarningAmber },
  error: { box: 'bg-tint-error', icon: 'text-error', Icon: MdErrorOutline },
  shielded: { box: 'bg-tint-shielded pl-4 overflow-hidden', icon: 'text-accent', Icon: MdShield },
  'dry-run': {
    box: 'bg-base-100 border border-dashed border-field-border',
    icon: 'text-base-content',
    Icon: MdOutlineScience,
  },
};

export interface CalloutProps {
  tone?: CalloutTone;
  title?: React.ReactNode;
  /** Rendered after the body, e.g. a button or link. */
  action?: React.ReactNode;
  className?: string;
  role?: 'status' | 'alert';
  children?: React.ReactNode;
}

export function Callout({ tone = 'info', title, action, className = '', role, children }: CalloutProps) {
  const { box, icon, Icon } = TONE[tone];
  return (
    <div
      className={`relative flex items-start gap-2.5 rounded-box px-3 py-2.5 text-left text-body text-base-content ${box} ${className}`}
      role={role}
    >
      {tone === 'shielded' && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${VEIL_STRIP}`} />}
      <Icon className={`mt-0.5 h-4 w-4 flex-none ${icon}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <div className={`font-semibold ${icon}`}>{title}</div>}
        {children && <div className="min-w-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}

export default Callout;
