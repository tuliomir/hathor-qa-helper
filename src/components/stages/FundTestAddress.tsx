/**
 * Fund Test Address Stage Component
 * Combines address selection and funding for Desktop/Mobile QA workflows
 * Selects an address from the test wallet and sends funds from the funding wallet
 */

import { useState } from 'react';
import WalletAddressSelector from '../common/WalletAddressSelector';
import SendFromFundWallet from '../common/SendFromFundWallet';

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
    <div className="space-y-6">
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-2">Fund Test Wallet Address</h2>
        <p className="text-muted text-sm mb-4">
          Select an address from the test wallet and send HTR from the funding wallet.
        </p>

        {/* Address Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3 text-gray-700">1. Select Receiving Address</h3>
          <WalletAddressSelector
            label="Address Index"
            onAddressChange={handleAddressChange}
          />
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-200" />

        {/* Send Section */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-gray-700">2. Send from Funding Wallet</h3>
          <SendFromFundWallet
            targetAddress={selectedAddress}
            initialAmount={10}
            onTransactionSent={handleTransactionSent}
          />
        </div>

        {/* Success Message */}
        {transactionSent && lastTxId && (
          <div className="mt-6 p-4 bg-green-50 border border-success rounded-lg">
            <p className="text-success font-medium m-0 mb-2">Transaction sent successfully!</p>
            <p className="text-xs text-green-800 m-0">
              Transaction ID: <code className="bg-green-100 px-1 py-0.5 rounded">{lastTxId}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
