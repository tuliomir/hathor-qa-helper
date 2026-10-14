/**
 * CommandPalette
 *
 * Ctrl K / ⌘K. Sections: Recent (when the query is empty), Stages (ranked by
 * utils/stageSearch, so `htr_getBalance` finds both Get balance stages) and a
 * short list of Actions. Arrows move, Enter runs, Escape closes; focus
 * returns to whatever had it before.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { getStageUrl } from '../../config/stageRoutes';
import { NETWORK_CONFIG, NETWORK_KEYS, type NetworkKey } from '../../constants/network';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectPreferredNetwork, setPreferredNetwork } from '../../store/slices/networkSlice';
import { startWallet } from '../../store/slices/walletStoreSlice';
import { useToast } from '../../hooks/useToast';
import { searchStages, stageEntry } from '../../utils/stageSearch';
import { readRecentStages } from './recentStages';
import { useTheme } from './useTheme';

type Section = 'Recent' | 'Stages' | 'Actions';

interface PaletteItem {
  id: string;
  section: Section;
  title: string;
  subtitle?: string;
  chip?: string;
  danger?: boolean;
  /** Return true to keep the palette open. */
  run: () => boolean | void;
}

function useActions(armed: string | null, setArmed: (id: string | null) => void): PaletteItem[] {
  const dispatch = useAppDispatch();
  const { success } = useToast();
  const { theme, toggleTheme } = useTheme();
  const preferred = useAppSelector(selectPreferredNetwork);
  const testId = useAppSelector((s) => s.walletSelection.testWalletId);
  const fundingId = useAppSelector((s) => s.walletSelection.fundingWalletId);
  const testWallet = useAppSelector((s) => (testId ? s.walletStore.wallets[testId] : undefined));
  const fundingWallet = useAppSelector((s) => (fundingId ? s.walletStore.wallets[fundingId] : undefined));

  const actions: PaletteItem[] = [];

  for (const key of NETWORK_KEYS.filter((k) => k !== preferred) as NetworkKey[]) {
    const id = `network-${key}`;
    const label = NETWORK_CONFIG[key].label;
    const isMain = key === 'MAINNET';
    actions.push({
      id,
      section: 'Actions',
      title: isMain && armed === id ? 'Press Enter again to switch to Mainnet' : `Switch network to ${label}`,
      subtitle: isMain
        ? 'Real funds. Sets the default network; selected wallets keep theirs.'
        : 'Sets the default network',
      danger: isMain,
      run: () => {
        if (isMain && armed !== id) {
          setArmed(id);
          return true;
        }
        dispatch(setPreferredNetwork(key));
      },
    });
  }

  const copy = (role: string, address: string | undefined, id: string) => {
    if (!address) return;
    actions.push({
      id,
      section: 'Actions',
      title: `Copy ${role} wallet address 0`,
      subtitle: address,
      run: () => {
        void navigator.clipboard?.writeText(address);
        success(`${role[0].toUpperCase()}${role.slice(1)} address 0 copied`);
      },
    });
  };
  copy('test', testWallet?.firstAddress, 'copy-test');
  copy('funding', fundingWallet?.firstAddress, 'copy-funding');

  const stopped = [testWallet, fundingWallet].filter((w) => w?.status === 'idle').map((w) => w!.metadata.id);
  if (stopped.length > 0) {
    actions.push({
      id: 'start-wallets',
      section: 'Actions',
      title: 'Start selected wallets',
      subtitle: `${stopped.length} stopped`,
      run: () => {
        for (const id of new Set(stopped)) void dispatch(startWallet(id));
      },
    });
  }

  actions.push({
    id: 'theme',
    section: 'Actions',
    title: theme === 'bench' ? 'Switch to dark theme' : 'Switch to light theme',
    run: toggleTheme,
  });

  return actions;
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [armed, setArmed] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const actions = useActions(armed, setArmed);
  const recent = useMemo(() => readRecentStages(), []);

  const items = useMemo<PaletteItem[]>(() => {
    const stageItem = (section: Section, id: Parameters<typeof stageEntry>[0]): PaletteItem | null => {
      const entry = stageEntry(id);
      if (!entry) return null;
      return {
        id: `${section}-${id}`,
        section,
        title: entry.stage.title,
        subtitle: entry.stage.description,
        chip: entry.family.chip,
        run: () => {
          void navigate(getStageUrl(id));
        },
      };
    };

    const q = query.trim().toLowerCase();
    if (!q) {
      return [...recent.map((id) => stageItem('Recent', id)).filter((i): i is PaletteItem => i !== null), ...actions];
    }
    const stages = searchStages(q)
      .slice(0, 12)
      .map((r) => stageItem('Stages', r.stage.id))
      .filter((i): i is PaletteItem => i !== null);
    const words = q.split(/\s+/);
    const matchingActions = actions.filter((a) => words.every((w) => a.title.toLowerCase().includes(w)));
    return [...stages, ...matchingActions];
  }, [query, recent, actions, navigate]);

  const active = Math.min(activeIndex, Math.max(items.length - 1, 0));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.run() === true) return;
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((active + step + items.length) % items.length);
      setArmed(null);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(items[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (armed) setArmed(null);
      else onClose();
    } else if (event.key === 'Tab') {
      // The input is the only tab stop; keep focus inside the dialog.
      event.preventDefault();
    }
  };

  const sections: Section[] = ['Recent', 'Stages', 'Actions'];
  const activeItem = items[active];

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-start pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-[640px] bg-base-100 border border-base-300 rounded-box shadow-float flex flex-col max-h-[70vh]"
      >
        <div className="flex items-center gap-2 h-12 px-3 border-b border-base-300 flex-none">
          <FiSearch aria-hidden="true" className="text-ink-muted flex-none" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-autocomplete="list"
            aria-activedescendant={activeItem ? `command-palette-${activeItem.id}` : undefined}
            aria-label="Find a stage or action"
            placeholder="Find a stage, method or action"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              setArmed(null);
            }}
            onKeyDown={onKeyDown}
            className="flex-1 min-w-0 bg-transparent text-body-lg outline-none focus-visible:outline-none placeholder:text-ink-muted"
          />
          <kbd className="text-[11px] leading-4 px-1.5 border border-base-300 rounded-selector font-mono text-ink-muted">
            Esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Results"
          className="m-0 p-1.5 list-none overflow-y-auto flex-1 min-h-0"
        >
          {items.length === 0 && <li className="px-2 py-3 text-ink-muted">Nothing matches “{query}”.</li>}
          {sections.map((section) => {
            const sectionItems = items.filter((item) => item.section === section);
            if (sectionItems.length === 0) return null;
            const headingId = `command-palette-${section}`;
            return (
              <li key={section} role="presentation">
                <div id={headingId} className="px-2 pt-2 pb-1 text-caption font-semibold text-ink-muted">
                  {section}
                </div>
                <ul role="group" aria-labelledby={headingId} className="m-0 p-0 list-none">
                  {sectionItems.map((item) => {
                    const index = items.indexOf(item);
                    const selected = index === active;
                    return (
                      <li
                        key={item.id}
                        id={`command-palette-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={index}
                        onMouseMove={() => index !== active && setActiveIndex(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runItem(item)}
                        className={`flex items-center gap-3 px-2 py-1.5 rounded-field cursor-pointer ${selected ? 'bg-base-200' : ''}`}
                      >
                        <span className="flex-1 min-w-0">
                          <span
                            className={`block truncate ${item.danger ? 'text-error font-semibold' : 'font-semibold'}`}
                          >
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="block truncate text-caption text-ink-muted">{item.subtitle}</span>
                          )}
                        </span>
                        {item.chip && (
                          <span className="flex-none inline-flex items-center h-5 px-2 rounded-full border border-base-300 bg-base-100 text-caption text-ink-muted">
                            {item.chip}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
