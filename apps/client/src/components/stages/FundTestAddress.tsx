/**
 * Fund Test Address Stage Component
 * Combines address selection and funding for Desktop/Mobile QA workflows
 * Selects an address from the test wallet and sends funds from the funding wallet
 */

import { useState } from 'react';
import WalletAddressSelector from '../common/WalletAddressSelector';
import SendFromFundWallet from '../common/SendFromFundWallet';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';

export default function FundTestAddress() {
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [transactionSent, setTransactionSent] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const handleAddressChange = (address: string | null) => {
    setSelectedAddress(address);
    // Reset transaction state when address changes
    setTransactionSent(false);
    setLastTxId(null);
  };

  const handleTransactionSent = (txId: string) => {
    setTransactionSent(true);
    setLastTxId(txId);
  };

  return (
    <Panel
      title="Fund test wallet address"
      description="Select an address from the test wallet and send HTR from the funding wallet."
    >
      <section className="flex flex-col gap-3">
        <h3 className="m-0 text-body font-semibold">1. Select receiving address</h3>
        <WalletAddressSelector label="Address index" onAddressChange={handleAddressChange} />
      </section>

      <section className="flex flex-col gap-3 border-t border-base-300 pt-3">
        <h3 className="m-0 text-body font-semibold">2. Send from funding wallet</h3>
        <SendFromFundWallet
          targetAddress={selectedAddress}
          initialAmount={10}
          onTransactionSent={handleTransactionSent}
        />
      </section>

      {transactionSent && lastTxId && (
        <Callout tone="success" title="Transaction sent">
          <TxIdDisplay hash={lastTxId} />
        </Callout>
      )}
    </Panel>
  );
}
