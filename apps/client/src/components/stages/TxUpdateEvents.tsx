/**
 * Tx Update Events Component
 * Displays real-time wallet events from all active wallets
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectAllWalletEvents, type WalletEvent } from '../../store/slices/walletStoreSlice';
import { setFilterWalletId, setCurrentPage } from '../../store/slices/txUpdateEventsSlice';
import { useToast } from '../../hooks/useToast';
import { MdTerminal } from 'react-icons/md';
import { Identifier } from '../common/Identifier';
import { StageHeader } from '../common/StageHeader';
import { Panel } from '../ui/Panel';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import TxStatus from '../common/TxStatus';
import dateFormatter from '@hathor/wallet-lib/lib/utils/date';

export default function TxUpdateEvents() {
  const dispatch = useAppDispatch();
  const allWallets = useAppSelector((s) => s.walletStore.wallets);
  const allEvents = useAppSelector(selectAllWalletEvents);
  const filterWalletId = useAppSelector((s) => s.txUpdateEvents.filterWalletId);
  const currentPage = useAppSelector((s) => s.txUpdateEvents.currentPage);
  const { info } = useToast();

  const pageSize = 20;

  // Filter events by selected wallet
  const filteredEvents = useMemo(() => {
    if (filterWalletId === 'all') {
      return allEvents;
    }
    return allEvents.filter((event) => event.walletId === filterWalletId);
  }, [allEvents, filterWalletId]);

  // Paginate filtered events
  const paginatedEvents = filteredEvents.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(filteredEvents.length / pageSize);

  // Extract transaction hash from event data
  // Handles both tx_id and txId naming conventions
  function getTxHash(event: WalletEvent & { walletId: string }): string | undefined {
    if (event.eventType === 'new-tx' || event.eventType === 'update-tx') {
      const data = event.data as { tx_id?: string; txId?: string };
      return data?.tx_id ?? data?.txId;
    }
    return undefined;
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

  type EventRow = WalletEvent & { walletId: string };

  const columns: DataTableColumn<EventRow>[] = [
    {
      key: 'type',
      header: 'Event type',
      render: (event) => (
        <span className="whitespace-nowrap rounded-selector bg-base-200 px-1.5 py-0.5 font-mono text-data-sm">
          {event.eventType}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      className: 'whitespace-nowrap',
      value: (event) => dateFormatter.parseTimestamp(event.timestamp / 1000),
    },
    {
      key: 'wallet',
      header: 'Wallet',
      render: (event) => (
        <span className="block max-w-40 truncate" title={event.walletId}>
          {getWalletName(event.walletId)}
        </span>
      ),
    },
    {
      key: 'hash',
      header: 'Tx hash',
      type: 'identifier',
      render: (event) => {
        const txHash = getTxHash(event);
        return txHash ? <Identifier value={txHash} kind="tx" head={6} tail={6} /> : null;
      },
    },
    {
      key: 'status',
      header: 'Status',
      type: 'status',
      render: (event) => {
        const txHash = getTxHash(event);
        return txHash ? <TxStatus hash={txHash} walletId={event.walletId} /> : null;
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      type: 'actions',
      hideLabelWhenStacked: true,
      render: (event) => (
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => handleEventClick(event)}>
          <MdTerminal aria-hidden="true" />
          Log raw data
        </button>
      ),
    },
  ];

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="tx-update-events" />

      <Panel
        title="Wallet events"
        description={
          <>
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            {filterWalletId !== 'all' && ` from ${getWalletName(filterWalletId)}`}
          </>
        }
        actions={
          <label className="flex items-center gap-2 text-body">
            <span className="text-ink-muted">Wallet</span>
            <select
              value={filterWalletId}
              onChange={(e) => {
                dispatch(setFilterWalletId(e.target.value));
              }}
              className="select select-sm w-auto"
            >
              <option value="all">All wallets</option>
              {Object.entries(allWallets).map(([id, wallet]) => (
                <option key={id} value={id}>
                  {wallet.metadata.friendlyName}
                </option>
              ))}
            </select>
          </label>
        }
        footer={
          totalPages > 1 ? (
            <>
              <button
                type="button"
                onClick={() => dispatch(setCurrentPage(Math.max(0, currentPage - 1)))}
                disabled={currentPage === 0}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="text-body text-ink-muted">
                Page {currentPage + 1} of {totalPages} ({filteredEvents.length} total)
              </span>
              <button
                type="button"
                onClick={() => dispatch(setCurrentPage(Math.min(totalPages - 1, currentPage + 1)))}
                disabled={currentPage === totalPages - 1}
                className="btn btn-secondary btn-sm ml-auto"
              >
                Next
              </button>
            </>
          ) : undefined
        }
      >
        <DataTable
          caption="Wallet events"
          columns={columns}
          rows={paginatedEvents}
          getRowKey={(event) => event.id}
          empty="Events from running wallets appear here. Start a wallet to see new-tx, update-tx, state and more-addresses-loaded events."
        />
      </Panel>
    </div>
  );
}
