/**
 * Cleanup Template Builder
 *
 * Builds transaction templates for the unified cleanup operation:
 * melting tokens + transferring swap tokens + transferring HTR
 * in a single atomic transaction.
 */

import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

export interface CleanupToken {
  uid: string;
  balance: bigint;
  meltableAmount: number;
}

/**
 * Builds a unified cleanup template that handles all three operation types
 * in a single atomic transaction:
 *
 * 1. Melt tokens (inputs > outputs with melt authority)
 * 2. Transfer swap tokens to funding wallet (balanced inputs = outputs)
 * 3. Transfer all HTR (existing + produced by melts) to funding wallet
 *
 * Does NOT use addCompleteAction — all UTXOs are manually selected
 * because addCompleteAction would create change outputs that prevent melts.
 */
export function buildUnifiedCleanupTemplate(
  tokensToMelt: CleanupToken[],
  swapTokens: CleanupToken[],
  testWalletAddr: string,
  fundingAddr: string,
  existingHtrBalance: bigint
) {
  let builder = TransactionTemplateBuilder.new()
    .addSetVarAction({ name: 'fundingAddr', value: fundingAddr })
    .addSetVarAction({ name: 'testAddr', value: testWalletAddr });

  let totalHtrFromMelts = 0;

  // Melt operations: select token UTXOs + authority, preserve authority
  for (const token of tokensToMelt) {
    if (token.meltableAmount <= 0) continue;

    builder = builder
      .addUtxoSelect({ fill: token.meltableAmount, token: token.uid })
      .addAuthoritySelect({ authority: 'melt', token: token.uid })
      .addAuthorityOutput({
        authority: 'melt',
        token: token.uid,
        address: '{testAddr}',
      });

    totalHtrFromMelts += Math.floor(token.meltableAmount / 100);
  }

  // Swap token transfers: select UTXOs + output to funding (no melt)
  for (const token of swapTokens) {
    const amount = Number(token.balance);
    if (amount <= 0) continue;

    builder = builder
      .addUtxoSelect({ fill: amount, token: token.uid })
      .addTokenOutput({
        address: '{fundingAddr}',
        amount,
        token: token.uid,
      });
  }

  // Select existing HTR (manually, not via addCompleteAction)
  if (existingHtrBalance > 0n) {
    builder = builder.addUtxoSelect({
      fill: existingHtrBalance,
      token: NATIVE_TOKEN_UID,
    });
  }

  // Output total HTR: existing + melt-produced
  const totalHtrOutput = Number(existingHtrBalance) + totalHtrFromMelts;
  if (totalHtrOutput > 0) {
    builder = builder.addTokenOutput({
      address: '{fundingAddr}',
      amount: totalHtrOutput,
    });
  }

  return builder.build();
}
