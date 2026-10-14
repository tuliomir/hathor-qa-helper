/**
 * Cleanup Batching Utility
 *
 * Splits cleanup tokens into smaller batches when a single unified
 * cleanup transaction is too large for the tx mining service.
 * Used as a fallback — the first attempt always tries all at once.
 */

import type { CleanupToken, ReturnToken } from '../services/cleanupTemplateBuilder';

const DEFAULT_MAX_TOKENS_PER_BATCH = 15;

export interface CleanupBatch {
  tokensToMelt: CleanupToken[];
  swapTokens: CleanupToken[];
  returnTokens: ReturnToken[];
  /** Only the last batch should transfer HTR to the funding wallet */
  includeHtr: boolean;
}

/**
 * Split cleanup token lists into batches of at most `maxTokensPerBatch`.
 *
 * Fills batches in order: melt tokens first, then swap, then return.
 * Only the last batch gets `includeHtr: true` so HTR is transferred
 * after all token operations complete (melts produce HTR that should
 * be included in the final transfer).
 */
export function splitIntoBatches(
  tokensToMelt: CleanupToken[],
  swapTokens: CleanupToken[],
  returnTokens: ReturnToken[],
  maxTokensPerBatch = DEFAULT_MAX_TOKENS_PER_BATCH
): CleanupBatch[] {
  // Flatten all tokens into a tagged list so we can chunk them
  type Tagged =
    | { kind: 'melt'; token: CleanupToken }
    | { kind: 'swap'; token: CleanupToken }
    | { kind: 'return'; token: ReturnToken };

  const all: Tagged[] = [
    ...tokensToMelt.map((t) => ({ kind: 'melt' as const, token: t })),
    ...swapTokens.map((t) => ({ kind: 'swap' as const, token: t })),
    ...returnTokens.map((t) => ({ kind: 'return' as const, token: t })),
  ];

  // Chunk into groups of maxTokensPerBatch
  const chunks: Tagged[][] = [];
  for (let i = 0; i < all.length; i += maxTokensPerBatch) {
    chunks.push(all.slice(i, i + maxTokensPerBatch));
  }

  // If no tokens at all, still need one batch for HTR transfer
  if (chunks.length === 0) {
    return [{ tokensToMelt: [], swapTokens: [], returnTokens: [], includeHtr: true }];
  }

  return chunks.map((chunk, idx) => {
    const batch: CleanupBatch = {
      tokensToMelt: [],
      swapTokens: [],
      returnTokens: [],
      includeHtr: idx === chunks.length - 1,
    };

    for (const item of chunk) {
      switch (item.kind) {
        case 'melt':
          batch.tokensToMelt.push(item.token);
          break;
        case 'swap':
          batch.swapTokens.push(item.token);
          break;
        case 'return':
          batch.returnTokens.push(item.token as ReturnToken);
          break;
      }
    }

    return batch;
  });
}
