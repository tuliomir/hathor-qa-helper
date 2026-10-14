/** Preconditions for funding a QA server wallet from a client wallet. */

import type { NetworkKey } from '@qa-helper/shared/networks';
import { NETWORK_CONFIG } from '../constants/network';
import type { Requirement } from './requirements';

export interface FundRequirementsInput {
  online: boolean;
  session: { network: NetworkKey } | null;
  from: { network: NetworkKey } | null;
  /** Base units, decimal string. */
  amount: string;
}

export function fundRequirements({ online, session, from, amount }: FundRequirementsInput): Requirement[] {
  const list: Requirement[] = [];
  if (!online)
    list.push({
      id: 'server',
      short: 'QA server',
      met: false,
      label: 'QA server not running',
      action: 'Start the QA server first',
    });
  if (!session)
    list.push({
      id: 'session',
      short: 'Session',
      met: false,
      label: 'No session',
      action: 'Choose a ready server wallet',
    });
  if (!from)
    list.push({
      id: 'from',
      short: 'Client wallet',
      met: false,
      label: 'No client wallet',
      action: 'Choose a started client wallet',
    });
  // Testnet and Shielded testnet encode addresses identically, so a mismatch
  // would send on the wrong chain and still report success.
  if (session && from && session.network !== from.network) {
    const label = NETWORK_CONFIG[session.network].label;
    list.push({
      id: 'network',
      short: 'Network',
      met: false,
      label: `Client wallet is not on ${label}`,
      action: `Choose a client wallet on ${label}`,
    });
  }
  if (!/^\d+$/.test(amount) || BigInt(amount) === 0n)
    list.push({ id: 'amount', short: 'Amount', met: false, label: 'No amount', action: 'Enter an amount' });
  return list;
}
