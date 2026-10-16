/** The flows a run can drive, by ID. */

import { BET_FLOW } from './betFlow';
import { FEE_FLOW } from './feeFlow';
import { RPC_FLOW } from './rpcFlow';
import type { FlowDefinition } from './flowRunner';

const FLOWS: Record<string, FlowDefinition> = {
  [BET_FLOW.id]: BET_FLOW,
  [FEE_FLOW.id]: FEE_FLOW,
  [RPC_FLOW.id]: RPC_FLOW,
};

export function flowById(id: string | null): FlowDefinition | null {
  return id ? (FLOWS[id] ?? null) : null;
}

export { BET_FLOW, FEE_FLOW, RPC_FLOW };
