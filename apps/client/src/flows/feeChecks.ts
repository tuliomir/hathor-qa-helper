/**
 * On-chain checks of the fee flow's txs, read from the fullnode's view of a
 * confirmed tx: its fee header (`fees`), HTR inputs and outputs, and the
 * contract actions. A fee-based token costs 0.01 HTR (1 base unit) per
 * output, a deposit action counting as one (wallet-lib `Fee.calculate`),
 * so each step of the flow pays exactly 0.01 HTR.
 *
 * The HTR the tx moves balances out as
 *   wallet inputs + contract withdrawals = wallet outputs + contract deposits + fee
 * so the wallet paid the fee when its HTR shrank by the fee and nothing came
 * out of the contract, and the contract paid it when an HTR withdrawal of
 * the fee went straight to the fee and the wallet's HTR didn't move.
 */

import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { FlowCheck } from '../store/slices/flowRunSlice';
import type { FullnodeTx } from '../utils/nanoTxConfirmation';
import { formatAmount } from '../utils/amount';

/** Who the tx should take its fee from; `none` for a tx with no fee-based token. */
export type FeePayer = 'wallet' | 'contract' | 'none';

/** 0.01 HTR: one fee-based token output. */
export const FEE_PER_OUTPUT = 1n;

const DECIMALS = 2;

export const htr = (value: bigint) => `${formatAmount(value, DECIMALS)} HTR`;

function sumOf<T>(items: T[] | null | undefined, keep: (item: T) => boolean, value: (item: T) => number | string) {
  return (items ?? []).filter(keep).reduce((total, item) => total + BigInt(String(value(item))), 0n);
}

/** Checks the fee the tx paid and who paid it. */
export function feePaymentChecks(tx: FullnodeTx, payer: FeePayer): FlowCheck[] {
  const isHtr = (t: string) => t === NATIVE_TOKEN_UID;
  const expectedFee = payer === 'none' ? 0n : FEE_PER_OUTPUT;
  const fee = sumOf(
    tx.fees,
    (f) => isHtr(f.token_uid),
    (f) => f.amount
  );
  const otherFees = (tx.fees ?? []).filter((f) => !isHtr(f.token_uid));
  const actions = tx.nc_context?.actions ?? [];
  const deposited = sumOf(
    actions,
    (a) => a.type === 'deposit' && isHtr(a.token_uid),
    (a) => a.amount
  );
  const withdrawn = sumOf(
    actions,
    (a) => a.type === 'withdrawal' && isHtr(a.token_uid),
    (a) => a.amount
  );
  const walletSpent =
    sumOf(
      tx.inputs,
      (i) => isHtr(i.token),
      (i) => i.value
    ) -
    sumOf(
      tx.outputs,
      (o) => isHtr(o.token),
      (o) => o.value
    ) -
    deposited;

  const checks: FlowCheck[] = [];
  if (otherFees.length > 0) {
    checks.push({ ok: false, text: `The fee was paid in ${otherFees.map((f) => f.token_uid).join(', ')}, not HTR` });
  }
  checks.push(
    fee === expectedFee
      ? { ok: true, text: expectedFee === 0n ? 'No fee charged' : `Fee: ${htr(fee)}` }
      : { ok: false, text: `Expected a fee of ${htr(expectedFee)}, got ${htr(fee)}` }
  );
  if (payer === 'wallet') {
    checks.push(
      withdrawn === 0n && walletSpent === expectedFee
        ? { ok: true, text: `Paid by the wallet: its HTR went down by ${htr(walletSpent)}` }
        : {
            ok: false,
            text: `Expected the wallet to pay the fee, but it spent ${htr(walletSpent)} and the contract gave ${htr(withdrawn)}`,
          }
    );
  } else if (payer === 'contract') {
    checks.push(
      withdrawn === expectedFee && walletSpent === 0n
        ? { ok: true, text: `Paid by the contract: ${htr(withdrawn)} withdrawn from its balance, none from the wallet` }
        : {
            ok: false,
            text: `Expected the contract to pay the fee, but it gave ${htr(withdrawn)} and the wallet spent ${htr(walletSpent)}`,
          }
    );
  }
  return checks;
}

/** Checks a contract balance against what the flow expects at this point. */
export function contractBalanceCheck(actual: bigint, expected: bigint, symbol: string): FlowCheck {
  const amount = (v: bigint) => `${formatAmount(v, DECIMALS)} ${symbol}`;
  return actual === expected
    ? { ok: true, text: `The contract holds ${amount(actual)}` }
    : { ok: false, text: `Expected the contract to hold ${amount(expected)}, it holds ${amount(actual)}` };
}
