/**
 * Address Validation Stage
 * Validates addresses using initialized wallets from the global store
 */

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setAddressIndex, setAmount } from '../../store/slices/addressValidationSlice';
import { addTransaction } from '../../store/slices/transactionHistorySlice';
import CopyButton from '../common/CopyButton';
import Loading from '../common/Loading';
import { formatBalance } from '../../utils/balanceUtils';
import type { WalletInfo } from '../../types/walletStore';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants'
import { WALLET_CONFIG, NETWORK_CONFIG, DEFAULT_NETWORK } from '../../constants/network.ts'
import { SendTransaction, TransactionTemplateBuilder } from '@hathor/wallet-lib'
import { useToast } from '../../hooks/useToast';
import * as React from 'react'

type TabType = 'funding' | 'test';

// Component for displaying wallet address information
function WalletAddressDisplay({
  wallet,
  addressIndex,
  amount,
  onIndexChange,
  onAmountChange,
  fundingWalletId
}: {
  wallet: WalletInfo;
  addressIndex: number;
  amount: number;
  onIndexChange: (index: number) => void;
  onAmountChange: (amount: number) => void;
  fundingWalletId: string | null;
}) {
  const dispatch = useAppDispatch();
  const { getAllWallets } = useWalletStore();
  const { success, error: showError } = useToast();

  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
	// TODO: add setSelectedToken as soon as we have custom token feature implemented
	const [selectedToken] = useState<{ uid: string; name: string; symbol: string }>({
		uid: NATIVE_TOKEN_UID,
		name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
		symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol
	});

  // Auto-derive selected address when wallet is selected
  useEffect(() => {
    const deriveAddress = async () => {
      if (!wallet || !wallet.instance) {
        setDerivedAddress(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const address = await wallet.instance.getAddressAtIndex(addressIndex);
        setDerivedAddress(address);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive address');
        setDerivedAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    deriveAddress();
  }, [wallet, addressIndex]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      onAmountChange(value);
    } else if (e.target.value === '') {
      onAmountChange(1);
    }
  };

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onIndexChange(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onIndexChange(parsed);
    }
  };

  // Send handler for the "Send from Fund Wallet" button
  const handleSendFromFundWallet = async () => {
    if (!fundingWalletId || !derivedAddress) {
      showError('Funding wallet or address not available');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Get the funding wallet
      const wallets = getAllWallets();
      const fundingWallet = wallets.find(
        (w) => w.metadata.id === fundingWalletId && w.status === 'ready'
      );

      if (!fundingWallet || !fundingWallet.instance) {
        throw new Error('Funding wallet not found or not ready');
      }

      // Get the first address of the funding wallet for change
      const fundWalletFirstAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Build and send the transaction
      const hWallet = fundingWallet.instance;

      const template = TransactionTemplateBuilder.new()
        .addSetVarAction({ name: 'recipientAddr', value: derivedAddress })
        .addSetVarAction({ name: 'changeAddr', value: fundWalletFirstAddress })
        .addTokenOutput({
          address: '{recipientAddr}',
          amount,
          token: selectedToken.uid
        })
        .addCompleteAction({
          changeAddress: '{changeAddr}'
        })
        .build();

      const tx = await hWallet.buildTxTemplate(template, {
        signTx: true,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE
      });
			/*
			 * Not working:
			 * Transaction error: TypeError: Cannot read properties of undefined (reading 'from')
			    at intToBytes (buffer.js:46:33)
			    at P2PKH.createScript (p2pkh.js:71:26)
			    at createOutputScriptFromAddress (address.js:116:18)
			    at execTokenOutputInstruction (executor.js:298:31)
			    at runInstruction (executor.js:43:60)
			    at WalletTxTemplateInterpreter.build (interpreter.js:126:27)
			    at async HathorWallet.buildTxTemplate (wallet.js:3442:16)
			    at async handleSendFromFundWallet (AddressValidation.tsx:141:18)
			 */

      const sendTx = new SendTransaction({ storage: hWallet.storage, transaction: tx });
      await sendTx.runFromMining();

      // Track transaction in history
      if (tx.hash) {
        dispatch(
          addTransaction({
            hash: tx.hash,
            timestamp: Date.now(),
            fromWalletId: fundingWalletId,
            toAddress: derivedAddress,
            amount,
            tokenUid: selectedToken.uid,
            tokenSymbol: selectedToken.symbol,
            network: fundingWallet.metadata.network,
            status: 'confirmed'
          })
        );
      }

      // Get explorer URL for the network
      const explorerUrl = NETWORK_CONFIG[DEFAULT_NETWORK].explorerUrl;
      const txUrl = `${explorerUrl}transaction/${tx.hash}`;

      success(`Transaction sent successfully! View on explorer: ${txUrl}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Transaction error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const getAddressUri = () => derivedAddress ? `hathor:${derivedAddress}` : '';

  const getPaymentRequest = () => {
    if (!derivedAddress) return '';
    return JSON.stringify({
      address: `hathor:${derivedAddress}`,
      amount: amount.toString(),
      token: {
        uid: '00',
        name: 'Hathor',
        symbol: 'HTR'
      }
    });
  };

  return (
    <>
      {/* Loading overlay when sending transaction */}
      {isSending && <Loading overlay message="Sending transaction..." />}

      {/* Wallet Info */}
      <div className="card-primary mb-7.5">
        <h2 className="text-xl font-bold mb-4">Wallet Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted mb-1">Name:</p>
            <p className="font-bold m-0">{wallet.metadata.friendlyName}</p>
          </div>
          <div>
            <p className="text-sm text-muted mb-1">Network:</p>
            <p className="font-bold m-0">{wallet.metadata.network}</p>
          </div>
          <div>
            <p className="text-sm text-muted mb-1">Balance:</p>
            <p className="font-bold m-0 text-success">
              {wallet.balance ? `${formatBalance(wallet.balance)} HTR` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted mb-1">First Address:</p>
            <p className="font-mono text-2xs m-0">{wallet.firstAddress || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Address Index Control */}
      <div className="card-primary mb-7.5">
        <label htmlFor="address-index" className="block mb-1.5 font-bold">
          Address Index:
        </label>
        <input
          id="address-index"
          type="number"
          min={0}
          step={1}
          value={addressIndex}
          onChange={handleIndexChange}
          className="input"
        />
        <p className="text-muted text-xs mt-1.5 mb-0">Index used to derive the address (default 0)</p>
      </div>

      {error && (
        <div className="card-primary mb-7.5 bg-red-50 border border-danger">
          <p className="m-0 text-red-900">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="card-primary mb-7.5 text-center">
          <p className="m-0">Loading address...</p>
        </div>
      )}

      {derivedAddress && !isLoading && (
        <>
          {/* Address Display */}
          <div className="card-primary mb-7.5">
            <div className="mb-3 text-center">
              <h3 className="text-lg font-bold m-0">Address (Index {addressIndex})</h3>
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded inline-block">
                {derivedAddress}
              </p>
              <CopyButton text={derivedAddress} label="Copy address" className="ml-2" />
            </div>
          </div>

          {/* Address URI QR Code */}
          <div className="card-primary mb-7.5">
            <div className="mb-3 text-center">
              <h3 className="text-lg font-bold m-0">Address QR Code</h3>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white border-2 border-gray-300 rounded">
                <QRCode value={getAddressUri()} size={200} />
              </div>
              <div className="flex items-center w-full justify-center">
                <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded text-center">
                  {getAddressUri()}
                </p>
                <CopyButton text={getAddressUri()} label="Copy address URI" className="ml-2" />
              </div>
            </div>
          </div>

          {/* Amount Field */}
          <div className="card-primary mb-7.5">
            <label htmlFor="amount-input" className="block mb-1.5 font-bold">
              Payment Amount:
            </label>
            <input
              id="amount-input"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={handleAmountChange}
              className="input"
              placeholder="Enter amount"
            />
            <p className="text-muted text-xs mt-1.5 mb-0">
              Enter a positive integer for the payment amount (HTR tokens)
            </p>
          </div>

          {/* Payment Request QR Code */}
          <div className="card-primary mb-7.5">
            <div className="mb-3 text-center">
              <h3 className="text-lg font-bold m-0">Payment Request QR Code</h3>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white border-2 border-gray-300 rounded">
                <QRCode value={getPaymentRequest()} size={200} />
              </div>
              <div className="flex items-center w-full">
                <p className="font-mono text-2xs break-all m-0 p-2 bg-gray-100 rounded w-full">
                  {getPaymentRequest()}
                </p>
                <CopyButton text={getPaymentRequest()} label="Copy payment request" className="ml-2" />
              </div>

              {/* Send button for fund wallet */}
              <div className="flex items-center justify-center mt-3">
                <button
                  type="button"
                  onClick={handleSendFromFundWallet}
                  className="btn-primary px-4 py-2"
                  disabled={isSending || !fundingWalletId}
                >
                  {isSending ? 'Sending...' : 'Send from Fund Wallet'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function AddressValidation() {
  const { getAllWallets } = useWalletStore();
  const wallets = getAllWallets();

  const dispatch = useAppDispatch();
  const addressIndexFromStore = useAppSelector((s) => s.addressValidation.addressIndex);
  const amountFromStore = useAppSelector((s) => s.addressValidation.amount);
  const fundingWalletId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);

  const [activeTab, setActiveTab] = useState<TabType>('funding');

  const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');
  const testWallet = wallets.find((w) => w.metadata.id === testWalletId && w.status === 'ready');

  const handleIndexChange = (index: number) => {
    dispatch(setAddressIndex(index));
  };

  const handleAmountChange = (amount: number) => {
    dispatch(setAmount(amount));
  };

  const noWalletsSelected = !fundingWallet && !testWallet;

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Address Validation</h1>
      <p className="text-muted mb-7.5">
        View and share wallet addresses through QR codes for the funding and test wallets.
      </p>

      {noWalletsSelected ? (
        <div className="p-10 text-center border-2 border-dashed border-warning rounded-lg bg-yellow-50 text-yellow-800">
          <h2 className="mt-0 text-2xl font-bold">No Wallets Selected</h2>
          <p className="text-base">
            Please go to the <strong>Wallet Initialization</strong> stage, start wallets, and select both a funding
            wallet and a test wallet.
          </p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="mb-7.5">
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setActiveTab('funding')}
                className={`px-6 py-3 font-bold text-base border-b-2 transition-colors ${
                  activeTab === 'funding'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
                disabled={!fundingWallet}
              >
                Funding Wallet
                {!fundingWallet && ' (Not Selected)'}
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`px-6 py-3 font-bold text-base border-b-2 transition-colors ${
                  activeTab === 'test'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
                disabled={!testWallet}
              >
                Test Wallet
                {!testWallet && ' (Not Selected)'}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'funding' && fundingWallet && (
            <WalletAddressDisplay
              wallet={fundingWallet}
              addressIndex={addressIndexFromStore}
              amount={amountFromStore}
              onIndexChange={handleIndexChange}
              onAmountChange={handleAmountChange}
              fundingWalletId={fundingWalletId}
            />
          )}

          {activeTab === 'test' && testWallet && (
            <WalletAddressDisplay
              wallet={testWallet}
              addressIndex={addressIndexFromStore}
              amount={amountFromStore}
              onIndexChange={handleIndexChange}
              onAmountChange={handleAmountChange}
              fundingWalletId={fundingWalletId}
            />
          )}
        </>
      )}
    </div>
  );
}
