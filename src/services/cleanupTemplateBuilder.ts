/**
 * Cleanup Template Builder
 *
 * Builds transaction templates for the unified cleanup operation:
 * melting tokens + transferring swap tokens + returning tokens to senders
 * + transferring HTR — all in a single atomic transaction.
 */

import { TransactionTemplateBuilder } from '@hathor/wallet-lib';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

/**
 * Maximum tokens to process per cleanup transaction.
 * Each token adds 2-3 inputs; keeping this low prevents
 * transactions from exceeding the tx mining service size limit.
 */
export const MAX_TOKENS_PER_BATCH = 15;

export interface CleanupToken {
  uid: string;
  balance: bigint;
  meltableAmount: number;
}

export interface ReturnToken {
  uid: string;
  amount: number;
  recipientAddress: string;
}

/**
 * Builds a unified cleanup template that handles all operation types
 * in a single atomic transaction:
 *
 * 1. Melt tokens (inputs > outputs with melt authority)
 * 2. Transfer swap tokens to funding wallet (balanced inputs = outputs)
 * 3. Return tokens to their original senders (balanced inputs = outputs)
 * 4. Transfer all HTR (existing + produced by melts) to funding wallet
 *
 * Does NOT use addCompleteAction — all UTXOs are manually selected
 * because addCompleteAction would create change outputs that prevent melts.
 */
export function buildUnifiedCleanupTemplate(
  tokensToMelt: CleanupToken[],
  swapTokens: CleanupToken[],
  returnTokens: ReturnToken[],
  testWalletAddr: string,
  fundingAddr: string,
  existingHtrBalance: bigint,
  /** When false, skip the HTR transfer (used in batched mode for non-final batches) */
  includeHtr = true,
) {
  let builder = TransactionTemplateBuilder.new()
    .addSetVarAction({ name: 'fundingAddr', value: fundingAddr })
    .addSetVarAction({ name: 'testAddr', value: testWalletAddr });

  // Set variables for unique return-to-sender addresses
  const returnAddressVars = new Map<string, string>();
  for (const token of returnTokens) {
    if (token.amount <= 0 || returnAddressVars.has(token.recipientAddress)) continue;
    const varName = `returnAddr_${returnAddressVars.size}`;
    returnAddressVars.set(token.recipientAddress, varName);
    builder = builder.addSetVarAction({ name: varName, value: token.recipientAddress });
  }

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

  // Return-to-sender transfers: select UTXOs + output to original sender
  for (const token of returnTokens) {
    if (token.amount <= 0) continue;
    const varName = returnAddressVars.get(token.recipientAddress)!;

    builder = builder
      .addUtxoSelect({ fill: token.amount, token: token.uid })
      .addTokenOutput({
        address: `{${varName}}`,
        amount: token.amount,
        token: token.uid,
      });
  }

  // Select existing HTR and transfer to funding wallet
  // Skipped in batched mode for non-final batches (includeHtr=false)
  if (includeHtr) {
    if (existingHtrBalance > 0n) {
      builder = builder.addUtxoSelect({
        fill: existingHtrBalance,
        token: NATIVE_TOKEN_UID,
      });
    }

    const totalHtrOutput = Number(existingHtrBalance) + totalHtrFromMelts;
    if (totalHtrOutput > 0) {
      builder = builder.addTokenOutput({
        address: '{fundingAddr}',
        amount: totalHtrOutput,
      });
    }
  }

  return builder.build();
}
