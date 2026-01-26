/**
 * Address List Viewer Component
 * Displays the first N addresses from the test wallet with their indexes and transaction counts
 * Used for comparing addresses shown in the Desktop Wallet app
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useWalletStore } from '../../hooks/useWalletStore';
import CopyButton from '../common/CopyButton';
import Loading from '../common/Loading';

interface AddressInfo {
  index: number;
  address: string;
  transactionCount: number;
}

const ADDRESS_COUNT = 10;

export default function AddressListViewer() {
  const testWalletId = useAppSelector((s) => s.walletSelection.testWalletId);
  const { getWallet } = useWalletStore();

  const testWallet = testWalletId ? getWallet(testWalletId) : undefined;

  const [addresses, setAddresses] = useState<AddressInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Truncate address for display
  function truncateAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  if (!testWalletId) {
    return (
      <div className="p-4 bg-yellow-50 border border-warning rounded-lg">
        <p className="text-yellow-800 m-0 text-sm mb-2">No test wallet selected.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline text-sm">
          Go to Wallet Initialization to select a test wallet
        </Link>
      </div>
    );
  }

  if (!testWallet) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 m-0 text-sm">
          <span className="inline-block animate-pulse mr-2">⏳</span>
          Wallet is connecting... Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-2">Wallet Addresses</h2>
        <p className="text-muted text-sm mb-4">
          First {ADDRESS_COUNT} addresses from{' '}
          <span className="font-medium text-gray-900">{testWallet.metadata.friendlyName}</span>.
          Compare these with the addresses shown in the Desktop Wallet app.
        </p>

        {isLoading && <Loading message="Loading addresses and transaction counts..." />}

        {error && (
          <div className="p-3 bg-red-50 border border-danger rounded">
            <p className="m-0 text-red-900 text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && addresses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-2 px-3 font-bold w-16">Index</th>
                  <th className="text-left py-2 px-3 font-bold">Address</th>
                  <th className="text-center py-2 px-3 font-bold w-24">Transactions</th>
                  <th className="text-center py-2 px-3 font-bold w-16">Copy</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map((addr) => (
                  <tr
                    key={addr.index}
                    className={`border-b border-gray-200 ${
                      addr.transactionCount > 0 ? 'bg-green-50' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-center font-bold text-blue-600">
                      {addr.index}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs" title={addr.address}>
                      <span className="hidden md:inline">{addr.address}</span>
                      <span className="md:hidden">{truncateAddress(addr.address)}</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          addr.transactionCount > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {addr.transactionCount}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <CopyButton text={addr.address} label="" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !error && addresses.length === 0 && (
          <p className="text-muted text-sm">No addresses found.</p>
        )}

        {/* Legend */}
        {!isLoading && !error && addresses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-muted m-0">
              <span className="inline-block w-3 h-3 bg-green-50 border border-green-200 rounded mr-1 align-middle"></span>
              Addresses with transactions are highlighted in green.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
