/**
 * Fund from Miner: send one or two of the miner's oldest spendable rewards to
 * an address, in seconds, without loading the miner wallet. Bootstraps the
 * funding wallet on networks where only the miner seed is at hand.
 *
 * The seed lives in its own storage slot (see minerSeedStorage) and never
 * reaches HathorWallet. All chain work is in services/minerFunding.
 */

import { useState } from 'react';
import { StageHeader } from '../common/StageHeader';
import { TxIdDisplay } from '../common/TxIdDisplay';
import { Identifier } from '../common/Identifier';
import { Panel } from '../ui/Panel';
import { Field } from '../ui/Field';
import { Callout } from '../ui/Callout';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useAppSelector } from '../../store/hooks';
import { selectActiveNetwork } from '../../store/slices/networkSlice';
import { NETWORK_CONFIG, NETWORK_KEYS, type NetworkKey } from '../../constants/network';
import { applyNetworkServices } from '../../services/networkServices';
import { formatBalance } from '../../utils/balanceUtils';
import { forgetMinerSeed, loadMinerSeed, saveMinerSeed } from '../../services/minerSeedStorage';
import {
  buildFundingTx,
  deriveMinerKeys,
  fetchNetworkParams,
  findMinerUtxos,
  mineAndPush,
  type MinerKey,
  type MinerUtxo,
  type NetworkParams,
  type UtxoSearchResult,
} from '../../services/minerFunding';

/** addr0, then addr1 when addr0 has nothing spendable. */
const ADDRESSES_TO_TRY = 2;

interface SearchState {
  params: NetworkParams;
  keys: MinerKey[];
  utxos: MinerUtxo[];
  /** One entry per address searched. */
  log: { address: string; summary: string }[];
}

function describeStop(res: UtxoSearchResult): string {
  const found = `${res.utxos.length} found in ${res.pagesRead} page${res.pagesRead === 1 ? '' : 's'}`;
  if (res.stop === 'page-cap') return `${found}, stopped at the page cap`;
  if (res.stop === 'history-end') return `${found}, end of history`;
  return found;
}

export function FundFromMinerStage() {
  const activeNetwork = useAppSelector(selectActiveNetwork);
  const fundingAddress = useAppSelector((s) => {
    const id = s.walletSelection.fundingWalletId;
    return id ? s.walletStore.wallets[id]?.firstAddress : undefined;
  });

  const [network, setNetwork] = useState<NetworkKey>(activeNetwork);
  const [seed, setSeed] = useState(() => loadMinerSeed(activeNetwork));
  const [count, setCount] = useState<'1' | '2'>('1');
  const [destination, setDestination] = useState('');
  const [search, setSearch] = useState<SearchState | null>(null);
  const [busy, setBusy] = useState<'search' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const config = NETWORK_CONFIG[network];

  const switchNetwork = (next: NetworkKey) => {
    setNetwork(next);
    setSeed(loadMinerSeed(next));
    setSearch(null);
    setTxId(null);
    setError(null);
  };

  const handleSearch = async () => {
    setBusy('search');
    setError(null);
    setSearch(null);
    setTxId(null);
    try {
      const keys = deriveMinerKeys(seed, config.name, ADDRESSES_TO_TRY);
      saveMinerSeed(network, seed.trim());
      const params = await fetchNetworkParams(config.fullNodeUrl);
      const want = Number(count);
      const utxos: MinerUtxo[] = [];
      const log: SearchState['log'] = [];
      for (const key of keys) {
        const res = await findMinerUtxos({
          fullNodeUrl: config.fullNodeUrl,
          address: key.address,
          want: want - utxos.length,
          params,
        });
        utxos.push(...res.utxos);
        log.push({ address: key.address, summary: describeStop(res) });
        if (utxos.length >= want) break;
      }
      setSearch({ params, keys, utxos, log });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    if (!search) return;
    setBusy('send');
    setError(null);
    try {
      const tx = buildFundingTx({
        utxos: search.utxos,
        keys: search.keys,
        destination: destination.trim(),
        networkName: config.name,
        weightConstants: search.params.weightConstants,
      });
      applyNetworkServices(network);
      setTxId(await mineAndPush(tx, config.fullNodeUrl));
      setSearch(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleForget = () => {
    forgetMinerSeed(network);
    setSeed('');
    setSearch(null);
  };

  const total = search?.utxos.reduce((sum, u) => sum + u.value, 0n) ?? 0n;
  const canSend = Boolean(search && search.utxos.length > 0 && destination.trim()) && busy === null;

  return (
    <div className="flex max-w-stage flex-col gap-4">
      <StageHeader stageId="fund-from-miner" />

      <Panel
        title="Miner"
        description="Finds the miner's oldest spendable rewards without loading its wallet. The seed is stored only for this screen."
      >
        <div className="flex flex-col gap-4">
          <SegmentedControl
            aria-label="Network"
            value={network}
            onChange={switchNetwork}
            options={NETWORK_KEYS.map((key) => ({ value: key, label: NETWORK_CONFIG[key].label }))}
          />

          <Field
            label="Miner seed words"
            htmlFor="miner-seed"
            trailing={
              seed && (
                <button type="button" className="btn btn-ghost btn-xs" onClick={handleForget}>
                  Forget seed
                </button>
              )
            }
          >
            <textarea
              id="miner-seed"
              className="textarea w-full font-mono text-data"
              rows={3}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="24 words"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              aria-label="UTXOs to send"
              size="sm"
              value={count}
              onChange={setCount}
              options={[
                { value: '1', label: '1 UTXO' },
                { value: '2', label: '2 UTXOs' },
              ]}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!seed.trim() || busy !== null}
              onClick={handleSearch}
            >
              {busy === 'search' ? 'Searching…' : 'Find UTXOs'}
            </button>
          </div>
        </div>
      </Panel>

      {search && (
        <Panel
          title="Spendable rewards"
          description={`Reward lock ${search.params.rewardLock} block${search.params.rewardLock === 1 ? '' : 's'}, best height ${search.params.bestHeight}.`}
        >
          <div className="flex flex-col gap-3">
            <ul className="m-0 flex flex-col gap-1 pl-0 text-caption text-ink-muted">
              {search.log.map(({ address, summary }) => (
                <li key={address} className="flex list-none flex-wrap items-center gap-2">
                  <Identifier value={address} kind="address" walletTag={false} />
                  <span>{summary}</span>
                </li>
              ))}
            </ul>

            {search.utxos.length === 0 ? (
              <Callout tone="warning" title="Nothing spendable">
                Neither address has an unspent, unlocked HTR output in the pages read.
              </Callout>
            ) : (
              <ul className="m-0 flex flex-col gap-1 pl-0">
                {search.utxos.map((u) => (
                  <li key={`${u.txId}:${u.index}`} className="flex list-none flex-wrap items-center gap-2 text-data">
                    <span className="font-mono tabular-nums">{formatBalance(u.value)} HTR</span>
                    <Identifier value={u.txId} kind="tx" />
                    <span className="text-ink-muted">
                      output {u.index}
                      {u.height !== undefined && ` · height ${u.height}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}

      {search && search.utxos.length > 0 && (
        <Panel title="Send" description={`Sends ${formatBalance(total)} HTR whole, with no change output.`}>
          <div className="flex flex-col gap-4">
            <Field
              label="Destination address"
              htmlFor="miner-destination"
              trailing={
                fundingAddress && (
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setDestination(fundingAddress)}>
                    Funding wallet addr0
                  </button>
                )
              }
            >
              <input
                id="miner-destination"
                className="input w-full font-mono text-data"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Address on this network"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <div>
              <button type="button" className="btn btn-primary btn-sm" disabled={!canSend} onClick={handleSend}>
                {busy === 'send' ? 'Mining and sending…' : `Send ${formatBalance(total)} HTR`}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {error && (
        <Callout tone="error" title="Failed" role="alert">
          {error}
        </Callout>
      )}

      {txId && (
        <Panel title="Sent">
          <TxIdDisplay hash={txId} network={network} />
        </Panel>
      )}
    </div>
  );
}

export default FundFromMinerStage;
