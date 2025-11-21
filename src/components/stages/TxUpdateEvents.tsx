/**
 * Tx Update Events Component
 * Displays real-time wallet events from all active wallets
 */

import { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectAllWalletEvents, type WalletEvent } from '../../store/slices/walletStoreSlice';
import { useToast } from '../../hooks/useToast';
import CopyButton from '../common/CopyButton';
import dateFormatter from '@hathor/wallet-lib/lib/utils/date';
import { getTransactionStatus, getStatusColorClass } from '../../utils/transactionStatus';

export default function TxUpdateEvents() {
  const dispatch = useAppDispatch();
  const allWallets = useAppSelector((s) => s.walletStore.wallets);
  const allEvents = useAppSelector(selectAllWalletEvents);
  const { info } = useToast();

  const [filterWalletId, setFilterWalletId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Filter events by selected wallet
  const filteredEvents = useMemo(() => {
    if (filterWalletId === 'all') {
      return allEvents;
    }
    return allEvents.filter((event) => event.walletId === filterWalletId);
  }, [allEvents, filterWalletId]);

  // Paginate filtered events
  const paginatedEvents = filteredEvents.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  const totalPages = Math.ceil(filteredEvents.length / pageSize);

  // Truncate hash for display
  function truncateHash(hash: string | undefined): string {
    if (!hash) return 'N/A';
    if (hash.length <= 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  }

  // Extract transaction hash from event data
  // Handles both tx_id and txId naming conventions
  function getTxHash(event: WalletEvent & { walletId: string }): string | undefined {
    if (event.eventType === 'new-tx' || event.eventType === 'update-tx') {
      return event.data?.tx_id ?? event.data?.txId;
    }
    return undefined;
  }

  // Get status for transaction events
  // Handles both naming conventions (first_block/firstBlock, is_voided/voided)
  function getTxStatus(event: WalletEvent & { walletId: string }): string | null {
    if (event.eventType === 'new-tx' || event.eventType === 'update-tx') {
      if (event.data) {
        const status = getTransactionStatus({
          first_block: event.data.first_block,
          firstBlock: event.data.firstBlock,
          is_voided: event.data.is_voided,
          voided: event.data.voided,
        });
        return status;
      }
    }
    return null;
  }

  // Get wallet friendly name
  function getWalletName(walletId: string): string {
    const wallet = allWallets[walletId];
    return wallet?.metadata.friendlyName || walletId;
  }

  // Handle event row click
  function handleEventClick(event: WalletEvent & { walletId: string }) {
    console.log(`Event ${event.id} (${event.eventType}):`, event.data);
    info('Raw event data exported to console');
  }

  // Get event type badge color
  function getEventTypeColor(eventType: WalletEvent['eventType']): string {
    switch (eventType) {
      case 'new-tx':
        return 'bg-blue-100 text-blue-800';
      case 'update-tx':
        return 'bg-purple-100 text-purple-800';
      case 'state':
        return 'bg-green-100 text-green-800';
      case 'more-addresses-loaded':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Tx Update Events</h1>
      <p className="text-muted mb-7.5">
        Monitor real-time wallet events from all active wallets
      </p>

      {/* Filter Controls */}
      <div className="card-primary mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold m-0">Filter Events</h2>
          <div className="flex items-center gap-4">
            <select
              value={filterWalletId}
              onChange={(e) => {
                setFilterWalletId(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Wallets</option>
              {Object.entries(allWallets).map(([id, wallet]) => (
                <option key={id} value={id}>
                  {wallet.metadata.friendlyName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-muted m-0">
          Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          {filterWalletId !== 'all' && ` from ${getWalletName(filterWalletId)}`}
        </p>
      </div>

      {/* Events Table */}
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-4">Wallet Events</h2>

        {filteredEvents.length === 0 ? (
          <p className="text-muted text-sm">
            No events yet. Events will appear here when wallets emit new-tx, update-tx, state, or
            more-addresses-loaded events.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-300">
                  <tr>
                    <th className="text-left py-2 px-3 font-bold">Event Type</th>
                    <th className="text-left py-2 px-3 font-bold">Timestamp</th>
                    <th className="text-left py-2 px-3 font-bold">Wallet</th>
                    <th className="text-left py-2 px-3 font-bold">Tx Hash</th>
                    <th className="text-center py-2 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEvents.map((event) => {
                    const txHash = getTxHash(event);
                    const status = getTxStatus(event);
                    return (
                      <tr
                        key={event.id}
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleEventClick(event)}
                      >
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getEventTypeColor(
                              event.eventType
                            )}`}
                          >
                            {event.eventType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {dateFormatter.parseTimestamp(event.timestamp / 1000)}
                        </td>
                        <td className="py-2 px-3 text-xs" title={event.walletId}>
                          {truncateHash(getWalletName(event.walletId))}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {txHash ? (
                            <div className="flex items-center gap-2">
                              {truncateHash(txHash)}
                              <CopyButton text={txHash} label="" />
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {status ? (
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColorClass(status)}`}>
                              {status}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-muted">
                  Page {currentPage + 1} of {totalPages} ({filteredEvents.length} total)
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
