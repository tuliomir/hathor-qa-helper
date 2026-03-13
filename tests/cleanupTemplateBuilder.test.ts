/**
 * Tests for the unified cleanup template builder.
 *
 * These tests validate template construction without a blockchain —
 * TransactionTemplateBuilder.build() produces a plain data structure
 * describing the operations, which we assert against directly.
 */

import { describe, test, expect } from 'bun:test';
import { buildUnifiedCleanupTemplate, type CleanupToken, type ReturnToken } from '../src/services/cleanupTemplateBuilder';

// ---------------------------------------------------------------------------
// Test constants — valid 64-char hex UIDs required by wallet-lib's Zod schema
// ---------------------------------------------------------------------------
const HTR_UID = '00';
const TOKEN_A = '0000000000000000000000000000000000000000000000000000000000000001';
const TOKEN_B = '0000000000000000000000000000000000000000000000000000000000000002';
const SWAP_TOKEN_NST = '00000000d3ab1beb579a2ff95f2ca86e911c92603f70fd74e4a6243d6af693e6';
const SWAP_TOKEN_KELB = '0000000094c00683bdca052d6f2c1ae384bb04ed91a333b425c474226d1a22e7';

const RETURN_TOKEN_C = '0000000000000000000000000000000000000000000000000000000000000003';

const TEST_ADDR = 'WYBwT3xLpDnHNtYZiU5WfQqFn921';
const FUNDING_ADDR = 'WZ4p6bXjNqh5cDBxFiNZNwJzSAR22';
const SENDER_ADDR_1 = 'WSenderAddr1xyzABC123';
const SENDER_ADDR_2 = 'WSenderAddr2xyzDEF456';

// ---------------------------------------------------------------------------
// Helpers — filter template operations by type
// ---------------------------------------------------------------------------
type TemplateOp = { type: string; [key: string]: unknown };

const ops = (template: TemplateOp[], type: string) =>
  template.filter((op) => op.type === type);

const utxoSelects = (template: TemplateOp[]) => ops(template, 'input/utxo');
const authoritySelects = (template: TemplateOp[]) => ops(template, 'input/authority');
const tokenOutputs = (template: TemplateOp[]) => ops(template, 'output/token');
const authorityOutputs = (template: TemplateOp[]) => ops(template, 'output/authority');
const setVars = (template: TemplateOp[]) => ops(template, 'action/setvar');
const completeActions = (template: TemplateOp[]) => ops(template, 'action/complete');

/** Find token outputs for a specific token UID */
const tokenOutputsFor = (template: TemplateOp[], uid: string) =>
  tokenOutputs(template).filter((op) => op.token === uid);

/** Find utxo selects for a specific token UID */
const utxoSelectsFor = (template: TemplateOp[], uid: string) =>
  utxoSelects(template).filter((op) => op.token === uid);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const meltToken = (uid: string, meltableAmount: number, balance?: bigint): CleanupToken => ({
  uid,
  balance: balance ?? BigInt(meltableAmount),
  meltableAmount,
});

const swapToken = (uid: string, balance: number): CleanupToken => ({
  uid,
  balance: BigInt(balance),
  meltableAmount: 0,
});

const returnToken = (uid: string, amount: number, recipientAddress: string): ReturnToken => ({
  uid,
  amount,
  recipientAddress,
});

// ===========================================================================
// Tests
// ===========================================================================

describe('buildUnifiedCleanupTemplate', () => {

  // -------------------------------------------------------------------------
  // Structural invariants (should hold for ALL templates)
  // -------------------------------------------------------------------------
  describe('structural invariants', () => {
    test('always starts with two setVar actions (fundingAddr, testAddr)', () => {
      const template = buildUnifiedCleanupTemplate([], [], [], TEST_ADDR, FUNDING_ADDR, 0n);
      const vars = setVars(template);
      expect(vars.length).toBe(2);
      expect(vars[0].name).toBe('fundingAddr');
      expect(vars[0].value).toBe(FUNDING_ADDR);
      expect(vars[1].name).toBe('testAddr');
      expect(vars[1].value).toBe(TEST_ADDR);
    });

    test('never includes addCompleteAction', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 200)],
        [swapToken(SWAP_TOKEN_NST, 50)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        300n
      );
      expect(completeActions(template)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Only HTR, no tokens
  // -------------------------------------------------------------------------
  describe('only HTR, no tokens', () => {
    test('selects HTR UTXOs and outputs to funding', () => {
      const template = buildUnifiedCleanupTemplate([], [], [], TEST_ADDR, FUNDING_ADDR, 500n);

      // One HTR utxo select
      const htrSelects = utxoSelectsFor(template, HTR_UID);
      expect(htrSelects).toHaveLength(1);
      expect(htrSelects[0].fill).toBe(500n);

      // One HTR output to funding
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(500n);
      expect(htrOutputs[0].address).toBe('{fundingAddr}');

      // No melt operations
      expect(authoritySelects(template)).toHaveLength(0);
      expect(authorityOutputs(template)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Empty wallet — no HTR, no tokens
  // -------------------------------------------------------------------------
  describe('empty wallet', () => {
    test('produces only setVar actions', () => {
      const template = buildUnifiedCleanupTemplate([], [], [], TEST_ADDR, FUNDING_ADDR, 0n);

      expect(template).toHaveLength(2); // just the two setVars
      expect(utxoSelects(template)).toHaveLength(0);
      expect(tokenOutputs(template)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Single meltable token + HTR
  // -------------------------------------------------------------------------
  describe('single meltable token + HTR', () => {
    test('melts token and combines HTR output', () => {
      // 200 tokens → melt produces 2 HTR. Existing 300 HTR. Total = 302 HTR.
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 200)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        300n
      );

      // Token melt: utxoSelect + authoritySelect + authorityOutput
      const tokenSelects = utxoSelectsFor(template, TOKEN_A);
      expect(tokenSelects).toHaveLength(1);
      expect(tokenSelects[0].fill).toBe(200n);

      const authSelects = authoritySelects(template);
      expect(authSelects).toHaveLength(1);
      expect(authSelects[0].token).toBe(TOKEN_A);
      expect(authSelects[0].authority).toBe('melt');

      // Authority preserved to test wallet
      const authOuts = authorityOutputs(template);
      expect(authOuts).toHaveLength(1);
      expect(authOuts[0].token).toBe(TOKEN_A);
      expect(authOuts[0].address).toBe('{testAddr}');

      // No token output for TOKEN_A (it's being melted — inputs > outputs)
      expect(tokenOutputsFor(template, TOKEN_A)).toHaveLength(0);

      // Combined HTR output: 300 existing + 2 from melt = 302
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(302n);
      expect(htrOutputs[0].address).toBe('{fundingAddr}');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Multiple meltable tokens + HTR
  // -------------------------------------------------------------------------
  describe('multiple meltable tokens + HTR', () => {
    test('melts all tokens with single combined HTR output', () => {
      // TOKEN_A: 500 → 5 HTR.  TOKEN_B: 300 → 3 HTR.  Existing: 100 HTR.  Total: 108 HTR.
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 500), meltToken(TOKEN_B, 300)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        100n
      );

      // Two sets of melt operations
      expect(utxoSelectsFor(template, TOKEN_A)).toHaveLength(1);
      expect(utxoSelectsFor(template, TOKEN_B)).toHaveLength(1);
      expect(authoritySelects(template)).toHaveLength(2);
      expect(authorityOutputs(template)).toHaveLength(2);

      // Single combined HTR output: 100 + 5 + 3 = 108
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(108n);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Only swap tokens, no HTR
  // -------------------------------------------------------------------------
  describe('only swap tokens, no HTR', () => {
    test('transfers swap tokens to funding without melt ops or HTR output', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [swapToken(SWAP_TOKEN_NST, 50)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      // Swap: utxoSelect + tokenOutput
      expect(utxoSelectsFor(template, SWAP_TOKEN_NST)).toHaveLength(1);

      const nstOutputs = tokenOutputsFor(template, SWAP_TOKEN_NST);
      expect(nstOutputs).toHaveLength(1);
      expect(nstOutputs[0].amount).toBe(50n);
      expect(nstOutputs[0].address).toBe('{fundingAddr}');

      // No melt, no HTR
      expect(authoritySelects(template)).toHaveLength(0);
      expect(tokenOutputsFor(template, HTR_UID)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Swap tokens + HTR
  // -------------------------------------------------------------------------
  describe('swap tokens + HTR (no melts)', () => {
    test('transfers swap tokens and HTR to funding', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [swapToken(SWAP_TOKEN_NST, 17), swapToken(SWAP_TOKEN_KELB, 42)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        300n
      );

      // Swap transfers
      const nstOutputs = tokenOutputsFor(template, SWAP_TOKEN_NST);
      expect(nstOutputs).toHaveLength(1);
      expect(nstOutputs[0].amount).toBe(17n);

      const kelbOutputs = tokenOutputsFor(template, SWAP_TOKEN_KELB);
      expect(kelbOutputs).toHaveLength(1);
      expect(kelbOutputs[0].amount).toBe(42n);

      // HTR output (no melts, so just existing balance)
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(300n);

      // No melt ops
      expect(authoritySelects(template)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Full mix — meltable + swap + HTR (user's example)
  // -------------------------------------------------------------------------
  describe('full mix: melt + swap + HTR (the NST example)', () => {
    test('100 TST melted, 17 NST transferred, 4 HTR sent to funding', () => {
      // User example: "100 TST, 3 HTR and 17 NST"
      // TST is meltable → melt 100 → 1 HTR.  NST is swap.  Total HTR = 3 + 1 = 4.
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 100)], // TST
        [swapToken(SWAP_TOKEN_NST, 17)], // NST
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        3n // 3 HTR existing
      );

      // Melt ops for TOKEN_A (TST)
      expect(utxoSelectsFor(template, TOKEN_A)).toHaveLength(1);
      expect(authoritySelects(template)).toHaveLength(1);
      expect(authorityOutputs(template)).toHaveLength(1);
      expect(tokenOutputsFor(template, TOKEN_A)).toHaveLength(0); // melted, no output

      // Swap transfer for NST
      const nstOutputs = tokenOutputsFor(template, SWAP_TOKEN_NST);
      expect(nstOutputs).toHaveLength(1);
      expect(nstOutputs[0].amount).toBe(17n);
      expect(nstOutputs[0].address).toBe('{fundingAddr}');

      // Combined HTR: 3 existing + 1 from melt = 4
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(4n);
      expect(htrOutputs[0].address).toBe('{fundingAddr}');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Token with remainder (not divisible by 100)
  // -------------------------------------------------------------------------
  describe('meltable token with remainder', () => {
    test('only melts multiples of 100, remainder is excluded from template', () => {
      // Balance 350, meltableAmount 300 (the caller pre-computes this).
      // The builder receives meltableAmount=300. HTR from melt: 3.
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 300, 350n)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      // Melt selects only the meltable portion
      const tokenSelects = utxoSelectsFor(template, TOKEN_A);
      expect(tokenSelects).toHaveLength(1);
      expect(tokenSelects[0].fill).toBe(300n);

      // HTR output: 0 existing + 3 from melt = 3
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(3n);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Zero-balance swap token is excluded
  // -------------------------------------------------------------------------
  describe('zero-balance swap token', () => {
    test('skips swap tokens with zero balance', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [swapToken(SWAP_TOKEN_NST, 0)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        100n
      );

      // No swap operations
      expect(utxoSelectsFor(template, SWAP_TOKEN_NST)).toHaveLength(0);
      expect(tokenOutputsFor(template, SWAP_TOKEN_NST)).toHaveLength(0);

      // Only HTR
      expect(tokenOutputsFor(template, HTR_UID)).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Zero meltableAmount token is excluded
  // -------------------------------------------------------------------------
  describe('zero meltableAmount token', () => {
    test('skips tokens with meltableAmount of 0', () => {
      // Balance is 50 but meltableAmount is 0 (< 100 units)
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 0, 50n)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        200n
      );

      // No melt operations
      expect(utxoSelectsFor(template, TOKEN_A)).toHaveLength(0);
      expect(authoritySelects(template)).toHaveLength(0);

      // HTR output is just existing balance (no melt contribution)
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(200n);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Melt authority goes to test wallet, not funding
  // -------------------------------------------------------------------------
  describe('authority output destination', () => {
    test('melt authority is preserved to test wallet address, not funding', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 100), meltToken(TOKEN_B, 200)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      const authOuts = authorityOutputs(template);
      expect(authOuts).toHaveLength(2);

      // ALL authority outputs go to testAddr (not fundingAddr)
      for (const out of authOuts) {
        expect(out.address).toBe('{testAddr}');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Large melt producing significant HTR
  // -------------------------------------------------------------------------
  describe('large melt amounts', () => {
    test('correctly calculates HTR from large token melts', () => {
      // 10000 tokens → 100 HTR from melt. Plus 50 existing = 150 total.
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 10000)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        50n
      );

      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(150n);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Operation ordering
  // -------------------------------------------------------------------------
  describe('operation ordering', () => {
    test('setVars come first, then melts, then swaps, then HTR', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 100)],
        [swapToken(SWAP_TOKEN_NST, 25)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        10n
      ) as TemplateOp[];

      // Find indices of first occurrence of each operation type
      const firstSetVar = template.findIndex((op) => op.type === 'action/setvar');
      const firstMeltUtxo = template.findIndex((op) => op.type === 'input/utxo' && op.token === TOKEN_A);
      const firstSwapUtxo = template.findIndex((op) => op.type === 'input/utxo' && op.token === SWAP_TOKEN_NST);
      const htrUtxo = template.findIndex((op) => op.type === 'input/utxo' && op.token === HTR_UID);
      const htrOutput = template.findIndex((op) => op.type === 'output/token' && op.token === HTR_UID);

      // setVars first
      expect(firstSetVar).toBe(0);
      // melt before swap
      expect(firstMeltUtxo).toBeLessThan(firstSwapUtxo);
      // swap before HTR select
      expect(firstSwapUtxo).toBeLessThan(htrUtxo);
      // HTR select before HTR output
      expect(htrUtxo).toBeLessThan(htrOutput);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 14: Multiple swap tokens in one transaction
  // -------------------------------------------------------------------------
  describe('multiple swap tokens', () => {
    test('each swap token gets its own utxoSelect + tokenOutput pair', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [swapToken(SWAP_TOKEN_NST, 100), swapToken(SWAP_TOKEN_KELB, 200)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      // NST
      expect(utxoSelectsFor(template, SWAP_TOKEN_NST)).toHaveLength(1);
      const nstOut = tokenOutputsFor(template, SWAP_TOKEN_NST);
      expect(nstOut).toHaveLength(1);
      expect(nstOut[0].amount).toBe(100n);

      // KELB
      expect(utxoSelectsFor(template, SWAP_TOKEN_KELB)).toHaveLength(1);
      const kelbOut = tokenOutputsFor(template, SWAP_TOKEN_KELB);
      expect(kelbOut).toHaveLength(1);
      expect(kelbOut[0].amount).toBe(200n);

      // Both go to funding
      expect(nstOut[0].address).toBe('{fundingAddr}');
      expect(kelbOut[0].address).toBe('{fundingAddr}');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Melt-only (no existing HTR)
  // -------------------------------------------------------------------------
  describe('melt-only, no existing HTR', () => {
    test('HTR output comes entirely from melt proceeds', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 500)],
        [],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        0n // no existing HTR
      );

      // No HTR utxo select (nothing to select)
      expect(utxoSelectsFor(template, HTR_UID)).toHaveLength(0);

      // HTR output is purely from melt: 500 / 100 = 5
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(5n);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 16: Kitchen sink — everything at once
  // -------------------------------------------------------------------------
  describe('kitchen sink: multiple melts + multiple swaps + HTR', () => {
    test('all operations coexist in one template', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 400), meltToken(TOKEN_B, 600)],
        [swapToken(SWAP_TOKEN_NST, 33), swapToken(SWAP_TOKEN_KELB, 77)],
        [],
        TEST_ADDR,
        FUNDING_ADDR,
        1000n
      );

      // Melt ops: 2 tokens × (utxoSelect + authoritySelect + authorityOutput)
      expect(authoritySelects(template)).toHaveLength(2);
      expect(authorityOutputs(template)).toHaveLength(2);
      expect(utxoSelectsFor(template, TOKEN_A)).toHaveLength(1);
      expect(utxoSelectsFor(template, TOKEN_B)).toHaveLength(1);

      // Swap ops: 2 tokens × (utxoSelect + tokenOutput)
      expect(utxoSelectsFor(template, SWAP_TOKEN_NST)).toHaveLength(1);
      expect(utxoSelectsFor(template, SWAP_TOKEN_KELB)).toHaveLength(1);
      expect(tokenOutputsFor(template, SWAP_TOKEN_NST)[0].amount).toBe(33n);
      expect(tokenOutputsFor(template, SWAP_TOKEN_KELB)[0].amount).toBe(77n);

      // HTR: 1000 existing + 4 (from 400) + 6 (from 600) = 1010
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(1010n);

      // Total utxo selects: 2 melt + 2 swap + 1 HTR = 5
      expect(utxoSelects(template)).toHaveLength(5);

      // Total token outputs: 2 swap + 1 HTR = 3 (melted tokens have NO output)
      expect(tokenOutputs(template)).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 17: Single return-to-sender token
  // -------------------------------------------------------------------------
  describe('single return-to-sender token', () => {
    test('creates setVar for recipient + utxoSelect + tokenOutput to recipient', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [],
        [returnToken(RETURN_TOKEN_C, 50, SENDER_ADDR_1)],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      // 3 setVars: fundingAddr, testAddr, returnAddr_0
      const vars = setVars(template);
      expect(vars).toHaveLength(3);
      expect(vars[2].name).toBe('returnAddr_0');
      expect(vars[2].value).toBe(SENDER_ADDR_1);

      // utxoSelect for the return token
      expect(utxoSelectsFor(template, RETURN_TOKEN_C)).toHaveLength(1);

      // tokenOutput to the recipient address variable
      const returnOutputs = tokenOutputsFor(template, RETURN_TOKEN_C);
      expect(returnOutputs).toHaveLength(1);
      expect(returnOutputs[0].amount).toBe(50n);
      expect(returnOutputs[0].address).toBe('{returnAddr_0}');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 18: Multiple return tokens to different recipients
  // -------------------------------------------------------------------------
  describe('multiple return tokens, different recipients', () => {
    test('creates one setVar per unique recipient address', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [],
        [
          returnToken(RETURN_TOKEN_C, 30, SENDER_ADDR_1),
          returnToken(TOKEN_B, 70, SENDER_ADDR_2),
        ],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      // 4 setVars: fundingAddr, testAddr, returnAddr_0, returnAddr_1
      const vars = setVars(template);
      expect(vars).toHaveLength(4);
      expect(vars[2].name).toBe('returnAddr_0');
      expect(vars[2].value).toBe(SENDER_ADDR_1);
      expect(vars[3].name).toBe('returnAddr_1');
      expect(vars[3].value).toBe(SENDER_ADDR_2);

      // Each return token gets its own output to respective recipient
      const cOutputs = tokenOutputsFor(template, RETURN_TOKEN_C);
      expect(cOutputs).toHaveLength(1);
      expect(cOutputs[0].address).toBe('{returnAddr_0}');

      const bOutputs = tokenOutputsFor(template, TOKEN_B);
      expect(bOutputs).toHaveLength(1);
      expect(bOutputs[0].address).toBe('{returnAddr_1}');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 19: Multiple return tokens to the SAME recipient (deduplication)
  // -------------------------------------------------------------------------
  describe('return tokens to same recipient', () => {
    test('deduplicates setVar — only one variable per unique address', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [],
        [
          returnToken(RETURN_TOKEN_C, 20, SENDER_ADDR_1),
          returnToken(TOKEN_B, 40, SENDER_ADDR_1), // same recipient
        ],
        TEST_ADDR,
        FUNDING_ADDR,
        0n
      );

      // Only 3 setVars (not 4): fundingAddr, testAddr, returnAddr_0
      const vars = setVars(template);
      expect(vars).toHaveLength(3);

      // Both outputs use the same address variable
      const cOutputs = tokenOutputsFor(template, RETURN_TOKEN_C);
      const bOutputs = tokenOutputsFor(template, TOKEN_B);
      expect(cOutputs[0].address).toBe('{returnAddr_0}');
      expect(bOutputs[0].address).toBe('{returnAddr_0}');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 20: Zero-amount return tokens are skipped
  // -------------------------------------------------------------------------
  describe('zero-amount return token', () => {
    test('skips return tokens with zero amount', () => {
      const template = buildUnifiedCleanupTemplate(
        [],
        [],
        [returnToken(RETURN_TOKEN_C, 0, SENDER_ADDR_1)],
        TEST_ADDR,
        FUNDING_ADDR,
        100n
      );

      // No return address setVar (only fundingAddr + testAddr)
      expect(setVars(template)).toHaveLength(2);

      // No operations for the return token
      expect(utxoSelectsFor(template, RETURN_TOKEN_C)).toHaveLength(0);
      expect(tokenOutputsFor(template, RETURN_TOKEN_C)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 21: Full kitchen sink — melt + swap + return + HTR
  // -------------------------------------------------------------------------
  describe('kitchen sink: melt + swap + return + HTR', () => {
    test('all operation types coexist in one atomic template', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 400)],
        [swapToken(SWAP_TOKEN_NST, 33)],
        [returnToken(RETURN_TOKEN_C, 25, SENDER_ADDR_1)],
        TEST_ADDR,
        FUNDING_ADDR,
        100n
      );

      // 3 setVars: fundingAddr, testAddr, returnAddr_0
      expect(setVars(template)).toHaveLength(3);

      // Melt ops
      expect(utxoSelectsFor(template, TOKEN_A)).toHaveLength(1);
      expect(authoritySelects(template)).toHaveLength(1);
      expect(authorityOutputs(template)).toHaveLength(1);

      // Swap ops
      const nstOutputs = tokenOutputsFor(template, SWAP_TOKEN_NST);
      expect(nstOutputs).toHaveLength(1);
      expect(nstOutputs[0].address).toBe('{fundingAddr}');

      // Return ops
      const returnOutputs = tokenOutputsFor(template, RETURN_TOKEN_C);
      expect(returnOutputs).toHaveLength(1);
      expect(returnOutputs[0].amount).toBe(25n);
      expect(returnOutputs[0].address).toBe('{returnAddr_0}');

      // HTR: 100 existing + 4 from melt = 104
      const htrOutputs = tokenOutputsFor(template, HTR_UID);
      expect(htrOutputs).toHaveLength(1);
      expect(htrOutputs[0].amount).toBe(104n);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 22: Operation ordering with returns
  // -------------------------------------------------------------------------
  describe('operation ordering with returns', () => {
    test('returns come after swaps and before HTR select', () => {
      const template = buildUnifiedCleanupTemplate(
        [meltToken(TOKEN_A, 100)],
        [swapToken(SWAP_TOKEN_NST, 25)],
        [returnToken(RETURN_TOKEN_C, 10, SENDER_ADDR_1)],
        TEST_ADDR,
        FUNDING_ADDR,
        50n
      ) as TemplateOp[];

      const firstSwapUtxo = template.findIndex((op) => op.type === 'input/utxo' && op.token === SWAP_TOKEN_NST);
      const firstReturnUtxo = template.findIndex((op) => op.type === 'input/utxo' && op.token === RETURN_TOKEN_C);
      const htrUtxo = template.findIndex((op) => op.type === 'input/utxo' && op.token === HTR_UID);

      // swap before return
      expect(firstSwapUtxo).toBeLessThan(firstReturnUtxo);
      // return before HTR
      expect(firstReturnUtxo).toBeLessThan(htrUtxo);
    });
  });
});
