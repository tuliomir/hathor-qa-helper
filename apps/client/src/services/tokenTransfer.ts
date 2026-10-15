/**
 * Token transfer template — the one place that builds "send these outputs,
 * return the change" transactions.
 *
 * Fees are left to wallet-lib: with `calculateFee` its complete action adds
 * the HTR fee for fee-based tokens (TokenVersion.FEE) and nothing for HTR or
 * deposit tokens, so callers never check token versions themselves.
 */

import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

export interface TransferOutput {
  address: string;
  /** Base units. */
  amount: bigint | number;
  /** Defaults to HTR. */
  token?: string;
}

export function buildTransferTemplate(outputs: readonly TransferOutput[], changeAddress: string) {
  if (outputs.length === 0) throw new Error('A transfer needs at least one output');
  let builder = TransactionTemplateBuilder.new();
  for (const { address, amount, token = NATIVE_TOKEN_UID } of outputs) {
    builder = builder.addTokenOutput({ address, amount: BigInt(amount), token });
  }
  return builder.addCompleteAction({ changeAddress, calculateFee: true }).build();
}
