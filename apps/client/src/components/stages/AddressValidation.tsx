/**
 * Address Validation Stage
 * Validates addresses using initialized wallets from the global store
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useWalletStore } from '../../hooks/useWalletStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setAddressIndex, setAmount } from '../../store/slices/addressValidationSlice';
import { MdClose, MdQrCodeScanner } from 'react-icons/md';
import NetworkChip from '../common/NetworkChip';
import { Identifier } from '../common/Identifier';
import { StageHeader } from '../common/StageHeader';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { Callout } from '../ui/Callout';
import { Field } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useRequireFundingWallet, useRequireTestWallet } from '../../hooks/useRequirements';
import { formatBalance } from '../../utils/balanceUtils';
import type { WalletInfo } from '../../types/walletStore';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { WALLET_CONFIG } from '../../constants/network.ts';
import { useSendTransaction } from '../../hooks/useSendTransaction';
import QrScanner from '../QrScanner';
import TimelockPicker from '../common/TimelockPicker';
import { defaultTimelockValue, timelockToUnix } from '../../utils/timelockUtils';
import { getAddressRecord } from '../../services/addressDatabase';
import { walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { applyNetworkServices } from '../../services/networkServices';
import { buildTransferTemplate } from '../../services/tokenTransfer';
import { parseScannedAddress } from '../../utils/addressUri';
import { AddressQr } from '../common/AddressQr';

type TabType = 'funding' | 'test';

/**
 * Result category for address lookup
 * - current-wallet: Address belongs to the currently active wallet (green)
 * - other-active-wallet: Address belongs to the other active wallet (blue)
 * - known-wallet: Address belongs to another known wallet in the database (yellow)
 * - unknown: Address not found in the database (gray)
 * - error: Parsing or validation error (red)
 */
type AddressLookupCategory = 'current-wallet' | 'other-active-wallet' | 'known-wallet' | 'unknown' | 'error';

interface AddressLookupResult {
  address: string;
  category: AddressLookupCategory;
  walletId?: string;
  walletName?: string;
  addressIndex?: number;
  error?: string;
}

// Component for displaying wallet address information
function WalletAddressDisplay({
  wallet,
  addressIndex,
  amount,
  onIndexChange,
  onAmountChange,
  fundingWalletId,
}: {
  wallet: WalletInfo;
  addressIndex: number;
  amount: number;
  onIndexChange: (index: number) => void;
  onAmountChange: (amount: number) => void;
  fundingWalletId: string | null;
}) {
  const { getAllWallets } = useWalletStore();
  const { sendTransaction, isSending, error: transactionError } = useSendTransaction();

  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingFirstEmpty, setIsFetchingFirstEmpty] = useState(false);
  // TODO: add setSelectedToken as soon as we have custom token feature implemented
  const [selectedToken] = useState<{ uid: string; name: string; symbol: string }>({
    uid: NATIVE_TOKEN_UID,
    name: DEFAULT_NATIVE_TOKEN_CONFIG.name,
    symbol: DEFAULT_NATIVE_TOKEN_CONFIG.symbol,
  });

  // Inject initial fund state
  const [injectUnlocked, setInjectUnlocked] = useState(10);
  const [injectLocked, setInjectLocked] = useState(5);
  const [injectTimestamp, setInjectTimestamp] = useState<string>(() => defaultTimelockValue(5));
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectError, setInjectError] = useState<string | null>(null);

  // Auto-derive selected address when wallet is selected. Keyed on the
  // instance: the wallet record is replaced on every event, and re-deriving
  // would hide the sections below and scroll the stage back up.
  const instance = wallet?.instance;
  useEffect(() => {
    const deriveAddress = async () => {
      if (!instance) {
        setDerivedAddress(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const address = await instance.getAddressAtIndex(addressIndex);
        setDerivedAddress(address);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive address');
        setDerivedAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    deriveAddress();
  }, [instance, addressIndex]);

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

  const handleGetFirstEmpty = async () => {
    if (!wallet || !wallet.instance) {
      return;
    }

    setIsFetchingFirstEmpty(true);
    setError(null);

    try {
      const currentAddress = await wallet.instance.getCurrentAddress();
      if (currentAddress.index != null) onIndexChange(currentAddress.index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get first empty address');
    } finally {
      setIsFetchingFirstEmpty(false);
    }
  };

  const handleGetAddr0 = () => {
    onIndexChange(0);
    setError(null);
  };

  // Send handler for the "Send from Fund Wallet" button
  const handleSendFromFundWallet = async () => {
    if (!fundingWalletId || !derivedAddress) {
      return;
    }

    try {
      // Get the funding wallet
      const wallets = getAllWallets();
      const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');

      if (!fundingWallet || !fundingWallet.instance) {
        throw new Error('Funding wallet not found or not ready');
      }

      // Get the first address of the funding wallet for change
      const fundWalletFirstAddress = await fundingWallet.instance.getAddressAtIndex(0);

      // Build the transaction template
      const template = buildTransferTemplate(
        [{ address: derivedAddress, amount: BigInt(amount), token: selectedToken.uid }],
        fundWalletFirstAddress
      );

      // Send the transaction using the centralized hook
      await sendTransaction(
        template,
        {
          fromWalletId: fundingWalletId,
          fromWallet: fundingWallet,
          toAddress: derivedAddress,
          amount,
          tokenUid: selectedToken.uid,
          tokenSymbol: selectedToken.symbol,
        },
        WALLET_CONFIG.DEFAULT_PIN_CODE
      );
    } catch (err) {
      // Error is already handled by the hook
      console.error('Transaction error:', err);
    }
  };

  // Handler for "Inject Initial Fund" — sends unlocked + locked outputs to address 0.
  // Uses sendManyOutputsSendTransaction directly (not the template builder) because
  // the template executor doesn't encode timelock into the output script.
  const handleInjectFund = async () => {
    if (!fundingWalletId || !wallet?.instance) return;

    setIsInjecting(true);
    setInjectError(null);

    try {
      const wallets = getAllWallets();
      const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');
      if (!fundingWallet?.instance) throw new Error('Funding wallet not ready');

      const addr0 = await wallet.instance.getAddressAtIndex(0);
      const fundAddr0 = await fundingWallet.instance.getAddressAtIndex(0);
      const timelockTs = timelockToUnix(injectTimestamp)!;

      const outputs: Array<{ address: string; value: bigint; token: string; timelock?: number }> = [];

      if (injectUnlocked > 0) {
        outputs.push({ address: addr0, value: BigInt(injectUnlocked), token: NATIVE_TOKEN_UID });
      }
      if (injectLocked > 0) {
        outputs.push({ address: addr0, value: BigInt(injectLocked), token: NATIVE_TOKEN_UID, timelock: timelockTs });
      }

      if (outputs.length === 0) return;

      applyNetworkServices(fundingWallet.metadata.network);
      const sendTx = await fundingWallet.instance.sendManyOutputsSendTransaction(outputs, {
        changeAddress: fundAddr0,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
      });
      // run() handles the full lifecycle: prepareTx → signTx → runFromMining.
      // runFromMining() alone fails because the transaction isn't prepared yet.
      await sendTx.run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to inject funds';
      setInjectError(msg);
      console.error('Inject fund error:', err);
    } finally {
      setIsInjecting(false);
    }
  };

  const spinner = <span className="loading loading-spinner loading-sm" aria-hidden="true" />;

  return (
    <>
      <Panel title="Wallet information">
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-caption text-ink-muted">Name</dt>
            <dd className="m-0 font-semibold">{wallet.metadata.friendlyName}</dd>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <dt className="text-caption text-ink-muted">Network</dt>
            <dd className="m-0">
              <NetworkChip network={wallet.metadata.network} size="sm" />
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-caption text-ink-muted">Balance</dt>
            <dd className="m-0 font-mono text-data">
              {wallet.balance !== undefined ? (
                <>
                  {formatBalance(wallet.balance)} <span className="font-sans text-ink-muted">HTR</span>
                </>
              ) : (
                'N/A'
              )}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-caption text-ink-muted">First address</dt>
            <dd className="m-0 min-w-0">
              {wallet.firstAddress ? (
                <Identifier value={wallet.firstAddress} kind="address" walletTag={false} />
              ) : (
                'N/A'
              )}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Address">
        <Field
          label="Address index"
          htmlFor="address-index"
          hint="Index used to derive the address (default 0)"
          wireControl={false}
        >
          <div className="flex flex-wrap items-start gap-2">
            <input
              id="address-index"
              aria-describedby="address-index-hint"
              type="number"
              min={0}
              step={1}
              value={addressIndex}
              onChange={handleIndexChange}
              className="input w-32 font-mono text-data"
            />
            <button
              type="button"
              onClick={handleGetAddr0}
              disabled={!wallet || !wallet.instance}
              className="btn btn-secondary"
            >
              Get addr0
            </button>
            <button
              type="button"
              onClick={handleGetFirstEmpty}
              disabled={isFetchingFirstEmpty || !wallet || !wallet.instance}
              className="btn btn-secondary"
            >
              {isFetchingFirstEmpty && spinner}
              Get first empty
            </button>
          </div>
        </Field>

        {(error || transactionError) && <Callout tone="error">{error || transactionError}</Callout>}

        {isLoading && (
          <p className="m-0 flex items-center gap-2 text-body text-ink-muted">
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
            Loading address…
          </p>
        )}

        {derivedAddress && !isLoading && (
          <section className="flex flex-col gap-3 border-t border-base-300 pt-3">
            <h3 className="m-0 text-body font-semibold">Address at index {addressIndex}</h3>
            <AddressQr walletId={wallet.metadata.id} index={addressIndex} showAddress />
          </section>
        )}
      </Panel>

      {derivedAddress && !isLoading && (
        <>
          <Panel
            title="Send from funding wallet"
            description={`Send HTR from the funding wallet to the transparent address at index ${addressIndex}.`}
          >
            <Field label="Amount" htmlFor="amount-input" hint="A positive integer amount of HTR">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={handleAmountChange}
                className="input w-40 font-mono text-data"
                placeholder="Amount"
              />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {!fundingWalletId && <span className="text-caption text-ink-muted">Select a funding wallet to send</span>}
              <button
                type="button"
                onClick={handleSendFromFundWallet}
                className="btn btn-primary"
                disabled={isSending || !fundingWalletId}
              >
                {isSending && spinner}
                {isSending ? 'Sending' : 'Send from funding wallet'}
              </button>
            </div>
          </Panel>

          <Panel
            title="Inject initial fund"
            description="Send unlocked and time-locked HTR from the funding wallet to address 0."
          >
            <Field label="Address" htmlFor="inject-address" hint="Index 0">
              <input
                type="text"
                value={
                  derivedAddress ? `${derivedAddress.slice(0, 12)}…${derivedAddress.slice(-8)} (index 0)` : 'Deriving…'
                }
                disabled
                className="input w-full font-mono text-data"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Unlocked" htmlFor="inject-unlocked">
                <input
                  type="number"
                  value={injectUnlocked}
                  onChange={(e) => setInjectUnlocked(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input w-full font-mono text-data"
                />
              </Field>
              <Field label="Locked" htmlFor="inject-locked">
                <input
                  type="number"
                  value={injectLocked}
                  onChange={(e) => setInjectLocked(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input w-full font-mono text-data"
                />
              </Field>
            </div>

            <TimelockPicker
              value={injectTimestamp}
              onChange={setInjectTimestamp}
              label="Timestamp (lock until)"
              hint="Locked funds will be unavailable until this time (default: 5 min from now)"
            />

            {injectError && <Callout tone="error">{injectError}</Callout>}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {!fundingWalletId && (
                <span className="text-caption text-ink-muted">Select a funding wallet to inject</span>
              )}
              <button
                type="button"
                onClick={handleInjectFund}
                disabled={isInjecting || isSending || !fundingWalletId || (injectUnlocked === 0 && injectLocked === 0)}
                className="btn btn-primary"
              >
                {isInjecting && spinner}
                {isInjecting ? 'Injecting' : 'Inject fund'}
              </button>
            </div>
          </Panel>
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

  const [activeTab, setActiveTab] = useState<TabType>('test');
  const testWalletRequirement = useRequireTestWallet();
  const fundingWalletRequirement = useRequireFundingWallet();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [lookupResult, setLookupResult] = useState<AddressLookupResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [addressInput, setAddressInput] = useState('');

  const fundingWallet = wallets.find((w) => w.metadata.id === fundingWalletId && w.status === 'ready');
  const testWallet = wallets.find((w) => w.metadata.id === testWalletId && w.status === 'ready');

  const handleIndexChange = (index: number) => {
    dispatch(setAddressIndex(index));
  };

  const handleAmountChange = (amount: number) => {
    dispatch(setAmount(amount));
  };

  /**
   * Look up an address to determine which wallet it belongs to
   */
  const lookupAddress = async (address: string) => {
    setIsValidating(true);
    setLookupResult(null);

    try {
      const cleanAddress = parseScannedAddress(address);

      if (!cleanAddress) {
        setLookupResult({
          address: address,
          category: 'error',
          error: 'Please enter an address',
        });
        setIsValidating(false);
        return;
      }

      // Get the current and other active wallet IDs
      const currentWalletId = activeTab === 'funding' ? fundingWalletId : testWalletId;
      const otherWalletId = activeTab === 'funding' ? testWalletId : fundingWalletId;

      // Look up the address in the database
      const record = await getAddressRecord(cleanAddress);

      if (!record) {
        // Address not found in database
        setLookupResult({
          address: cleanAddress,
          category: 'unknown',
        });
        setIsValidating(false);
        return;
      }

      // Found in database - determine category
      const { walletId, index } = record;

      // Check if the wallet still exists
      const wallet = wallets.find((w) => w.metadata.id === walletId);
      if (!wallet) {
        // Wallet was deleted - treat as unknown
        setLookupResult({
          address: cleanAddress,
          category: 'unknown',
        });
        setIsValidating(false);
        return;
      }

      // Determine the address index
      let addressIndex = index ?? undefined;

      // If index is not in the database, try to get it from the wallet instance
      if (addressIndex === undefined && wallet.status === 'ready') {
        const instance = walletInstancesMap.get(walletId);
        if (instance) {
          try {
            const indexResult = await instance.getAddressIndex(cleanAddress);
            if (indexResult !== null && indexResult !== undefined) {
              addressIndex = indexResult;
            }
          } catch (err) {
            // Ignore errors - index will remain undefined
            console.debug('Could not get address index:', err);
          }
        }
      }

      // Categorize the result
      if (walletId === currentWalletId) {
        // Belongs to current wallet (green)
        setLookupResult({
          address: cleanAddress,
          category: 'current-wallet',
          walletId,
          walletName: wallet.metadata.friendlyName,
          addressIndex,
        });
      } else if (walletId === otherWalletId) {
        // Belongs to other active wallet (blue)
        setLookupResult({
          address: cleanAddress,
          category: 'other-active-wallet',
          walletId,
          walletName: wallet.metadata.friendlyName,
          addressIndex,
        });
      } else {
        // Belongs to another known wallet (yellow)
        setLookupResult({
          address: cleanAddress,
          category: 'known-wallet',
          walletId,
          walletName: wallet.metadata.friendlyName,
          addressIndex,
        });
      }
    } catch (error) {
      console.error('Error looking up address:', error);
      setLookupResult({
        address: address,
        category: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleQrScan = (data: string) => {
    setShowQrScanner(false);
    lookupAddress(data);
  };

  const handleAddressInputSubmit = () => {
    if (addressInput.trim()) {
      lookupAddress(addressInput);
    }
  };

  const handleUseInTest = () => {
    if (lookupResult?.category === 'current-wallet' && lookupResult.addressIndex !== undefined) {
      dispatch(setAddressIndex(lookupResult.addressIndex));
      setLookupResult(null);
    }
  };

  const noWalletsSelected = !fundingWallet && !testWallet;

  const belongsTo = (r: AddressLookupResult) => (
    <>
      This address belongs to <strong>{r.walletName}</strong>
      {r.addressIndex !== undefined && (
        <>
          {' '}
          at index <strong>{r.addressIndex}</strong>
        </>
      )}
    </>
  );

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader
        stageId="address-validation"
        description="View and share wallet addresses through QR codes for the funding and test wallets."
      />
      <PreconditionStrip requirements={[testWalletRequirement, fundingWalletRequirement]} />

      {noWalletsSelected ? (
        <Panel title="Addresses">
          <EmptyState>
            Start wallets and choose a funding wallet and a test wallet; their addresses and QR codes appear here.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <Panel
            title="Address lookup"
            description="Enter an address or scan a QR code to find out which wallet it belongs to."
          >
            <Field label="Address" htmlFor="address-lookup-input" wireControl={false}>
              <div className="flex flex-wrap gap-2">
                <input
                  id="address-lookup-input"
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddressInputSubmit()}
                  placeholder="Enter a Hathor address"
                  className="input min-w-0 flex-1 font-mono text-data"
                  disabled={isValidating}
                />
                <button
                  type="button"
                  onClick={handleAddressInputSubmit}
                  className="btn btn-primary"
                  disabled={isValidating || !addressInput.trim()}
                >
                  {isValidating && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
                  Look up
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrScanner(true)}
                  className="btn btn-secondary"
                  disabled={isValidating}
                >
                  <MdQrCodeScanner aria-hidden="true" />
                  Scan QR code
                </button>
              </div>
            </Field>
          </Panel>

          <SegmentedControl<TabType>
            aria-label="Wallet"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              {
                value: 'funding',
                label: 'Funding wallet',
                disabled: !fundingWallet,
                reason: 'No funding wallet selected',
              },
              { value: 'test', label: 'Test wallet', disabled: !testWallet, reason: 'No test wallet selected' },
            ]}
            className="self-start"
          />

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

      {showQrScanner && <QrScanner onScan={handleQrScan} onCancel={() => setShowQrScanner(false)} />}

      {lookupResult && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="lookup-result-title">
          <div className="modal-box flex max-w-2xl flex-col gap-4 rounded-box border border-base-300 p-5 text-left shadow-float">
            <div className="flex items-center justify-between gap-2">
              <h2 id="lookup-result-title" className="m-0 text-title">
                Address lookup result
              </h2>
              <button
                type="button"
                onClick={() => setLookupResult(null)}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close"
              >
                <MdClose aria-hidden="true" />
              </button>
            </div>

            {lookupResult.address && (
              <div className="flex flex-col gap-1">
                <span className="text-caption text-ink-muted">Address</span>
                <Identifier value={lookupResult.address} kind="address" walletTag={false} />
              </div>
            )}

            {lookupResult.category === 'current-wallet' && (
              <Callout tone="success" title="Belongs to the current wallet">
                {belongsTo(lookupResult)}
              </Callout>
            )}
            {lookupResult.category === 'other-active-wallet' && (
              <Callout tone="info" title="Belongs to the other active wallet">
                {belongsTo(lookupResult)}
              </Callout>
            )}
            {lookupResult.category === 'known-wallet' && (
              <Callout tone="warning" title="Belongs to another wallet">
                {belongsTo(lookupResult)}
              </Callout>
            )}
            {lookupResult.category === 'unknown' && (
              <Callout tone="info" title="Unknown address">
                This address is not found in any known wallet.
              </Callout>
            )}
            {lookupResult.category === 'error' && (
              <Callout tone="error" title="Error">
                {lookupResult.error}
              </Callout>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {lookupResult.category === 'current-wallet' && lookupResult.addressIndex !== undefined && (
                <button type="button" onClick={handleUseInTest} className="btn btn-primary">
                  Use this in the test below
                </button>
              )}
              <button type="button" onClick={() => setLookupResult(null)} className="btn btn-ghost ml-auto">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLookupResult(null);
                  setShowQrScanner(true);
                }}
                className="btn btn-secondary"
              >
                Scan another
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setLookupResult(null)} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
