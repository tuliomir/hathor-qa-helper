/**
 * Address List Viewer Component
 * Displays the first N addresses from the test wallet with their indexes and transaction counts
 * Used for comparing addresses shown in the Desktop Wallet app
 */

import { useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import { Identifier } from '../common/Identifier';
import { PreconditionStrip } from '../common/PreconditionStrip';
import { Panel } from '../ui/Panel';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { StatusChip } from '../ui/StatusChip';
import { useRequireTestWallet } from '../../hooks/useRequirements';

interface AddressInfo {
  index: number;
  address: string;
  transactionCount: number;
}

const ADDRESS_COUNT = 10;

export default function AddressListViewer() {
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();
  const testWalletRequirement = useRequireTestWallet();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const [addresses, setAddresses] = useState<AddressInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-runs on every wallet event (transaction counts change). Rows stay up
  // while it refreshes: swapping them for skeletons would shrink the page
  // and scroll it back up.
  useEffect(() => {
    async function fetchAddresses() {
      if (!testWallet?.instance) return;

      setIsLoading(true);
      setError(null);

      try {
        const walletInstance = testWallet.instance;

        // Use getAllAddresses() async iterator - it returns objects with
        // { address, index, transactions } directly from wallet-lib
        const fetchedAddresses: AddressInfo[] = [];
        const iterator = walletInstance.getAllAddresses();

        for (;;) {
          const result = await iterator.next();
          const { value, done } = result;

          if (done) break;

          // wallet-lib provides: { address, index, transactions }
          const addressObj = value as { address: string; index: number; transactions: number };

          fetchedAddresses.push({
            index: addressObj.index,
            address: addressObj.address,
            transactionCount: addressObj.transactions,
          });

          // Stop after collecting ADDRESS_COUNT addresses
          if (fetchedAddresses.length >= ADDRESS_COUNT) break;
        }

        setAddresses(fetchedAddresses);
      } catch (err) {
        console.error('Error fetching addresses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch addresses');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAddresses();
  }, [testWallet]);

  const columns: DataTableColumn<AddressInfo>[] = [
    { key: 'index', header: 'Index', className: 'w-16 font-mono text-data tabular-nums', value: (a) => a.index },
    {
      key: 'address',
      header: 'Address',
      type: 'identifier',
      render: (a) => (
        <>
          <Identifier value={a.address} kind="address" head={34} tail={0} className="hidden md:inline-flex" />
          <Identifier value={a.address} kind="address" className="md:hidden" />
        </>
      ),
    },
    {
      key: 'transactions',
      header: 'Transactions',
      type: 'status',
      className: 'w-28',
      render: (a) => (
        <StatusChip
          status={String(a.transactionCount)}
          tone={a.transactionCount > 0 ? 'success' : 'idle'}
          label={`${a.transactionCount} ${a.transactionCount === 1 ? 'tx' : 'txs'}`}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PreconditionStrip requirements={[testWalletRequirement]} />
      <Panel
        title="Wallet addresses"
        description={
          testWallet ? (
            <>
              First {ADDRESS_COUNT} addresses from{' '}
              <span className="font-medium text-base-content">{testWallet.metadata.friendlyName}</span>. Compare them
              with the addresses shown in the Desktop Wallet app.
            </>
          ) : (
            `First ${ADDRESS_COUNT} addresses of the test wallet, to compare with the Desktop Wallet app.`
          )
        }
      >
        {!testWalletId ? (
          <EmptyState>Addresses appear here once a test wallet is selected.</EmptyState>
        ) : !testWallet ? (
          <p className="m-0 flex items-center gap-2 text-body text-ink-muted">
            <span className="loading loading-spinner loading-xs" aria-hidden="true" />
            Wallet is connecting…
          </p>
        ) : (
          <>
            <DataTable
              caption="Test wallet addresses"
              columns={columns}
              rows={addresses}
              getRowKey={(a) => String(a.index)}
              loading={isLoading && addresses.length === 0}
              error={error ? { message: 'Could not load addresses.', detail: error } : null}
              empty="No addresses found."
            />
            {!isLoading && !error && addresses.length > 0 && (
              <p className="m-0 text-caption text-ink-muted">Addresses with transactions show a green count.</p>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
