/**
 * Transfers between the funding and test wallets, read from the per-token
 * balance change a transaction made to each wallet (HathorWallet.getTxBalance).
 * A token one wallet gained and the other lost moved between them.
 */

export type TransferDirection = 'test-to-funding' | 'funding-to-test';

export interface WalletTransfer {
  txId: string;
  timestamp: number;
  direction: TransferDirection;
  tokenUid: string;
  /** Base units the receiving wallet got, as a decimal string. */
  amount: string;
}

type TxBalance = Record<string, bigint | number>;

export function transfersInTx(
  tx: { txId: string; timestamp: number },
  fundingBalance: TxBalance,
  testBalance: TxBalance
): WalletTransfer[] {
  const tokens = new Set([...Object.keys(fundingBalance), ...Object.keys(testBalance)]);
  const transfers: WalletTransfer[] = [];
  for (const tokenUid of tokens) {
    const funding = BigInt(fundingBalance[tokenUid] ?? 0);
    const test = BigInt(testBalance[tokenUid] ?? 0);
    // The receiver's gain, not the sender's loss: the sender may also pay fees.
    if (funding > 0n && test < 0n) {
      transfers.push({ ...tx, direction: 'test-to-funding', tokenUid, amount: funding.toString() });
    } else if (test > 0n && funding < 0n) {
      transfers.push({ ...tx, direction: 'funding-to-test', tokenUid, amount: test.toString() });
    }
  }
  return transfers;
}

export function transferKey(transfer: Pick<WalletTransfer, 'txId' | 'tokenUid'>): string {
  return `${transfer.txId}:${transfer.tokenUid}`;
}
