/**
 * Maps the contract's mode names to wallet-lib enum values. Imports only the
 * lib's light enum module (it pulls in `@hathor/ct-crypto-provider`, not the
 * wallet), so the router stays free of wallet-lib's runtime.
 */

import { OutputKind, ShieldedOutputMode, type ChangeOutputMode } from '@hathor/wallet-lib/lib/shielded/types.js';
import type { ProposedOutput, SendManyOutputsOptions } from '@hathor/wallet-lib/lib/new/types';
import type { ChangeOutputModeName, SendRequest, ShieldedOutputModeName } from '@qa-helper/shared/serverApi';

export const HTR_UID = '00';

const OUTPUT_MODES: Record<ShieldedOutputModeName, ShieldedOutputMode> = {
  AMOUNT_SHIELDED: ShieldedOutputMode.AMOUNT_SHIELDED,
  FULLY_SHIELDED: ShieldedOutputMode.FULLY_SHIELDED,
};

const CHANGE_MODES: Record<ChangeOutputModeName, ChangeOutputMode> = {
  ...OUTPUT_MODES,
  TRANSPARENT: OutputKind.TRANSPARENT,
};

export function toLibSend(req: SendRequest): { outputs: ProposedOutput[]; options: SendManyOutputsOptions } {
  const outputs = req.outputs.map((o) => {
    const out: ProposedOutput = { address: o.address, value: BigInt(o.value), token: o.token ?? HTR_UID };
    if (o.shielded) out.shielded = OUTPUT_MODES[o.shielded];
    return out;
  });
  // Absent mode: leave the option out so the lib's automatic change rules apply.
  const options: SendManyOutputsOptions = req.changeShieldedMode
    ? { changeShieldedMode: CHANGE_MODES[req.changeShieldedMode] }
    : {};
  return { outputs, options };
}
