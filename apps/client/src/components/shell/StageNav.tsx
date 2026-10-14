/**
 * StageNav
 *
 * Stage navigation: families, then collapsible groups, then stage rows.
 * Only the group holding the active stage opens by default; groups the user
 * opens stay open. A filter at the top (`/` focuses it) searches stage
 * titles across all groups; Enter opens the first match.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { useStage } from '../../hooks/useStage';
import { getStageUrl } from '../../config/stageRoutes';
import {
  getGroupForStage,
  STAGE_FAMILIES,
  STAGE_GROUPS,
  type FamilyId,
  type GroupId,
  type Stage,
  type StageGroup,
} from '../../types/stage';
import StatusDot from './StatusDot';
import { useRpcStatus, useSnapStatus } from './connectionStatus';

const STAGE_ROW =
  'relative flex items-center h-8 pr-2 rounded-field text-body no-underline text-base-content hover:bg-base-300';
const STAGE_ROW_ACTIVE =
  "bg-[color-mix(in_oklab,var(--color-primary)_8%,transparent)] !text-primary font-semibold hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] before:content-[''] before:absolute before:left-2.5 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded before:bg-primary";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

interface FilterMatch {
  stage: Stage;
  group: StageGroup;
  familyTitle: string;
}

function filterStages(query: string): FilterMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches: FilterMatch[] = [];
  for (const group of STAGE_GROUPS) {
    const familyTitle = STAGE_FAMILIES.find((f) => f.id === group.family)!.title;
    for (const stage of group.stages) {
      if (stage.title.toLowerCase().includes(q)) matches.push({ stage, group, familyTitle });
    }
  }
  return matches;
}

function FamilyIndicator({ family }: { family: FamilyId }) {
  const rpc = useRpcStatus();
  const snap = useSnapStatus();
  const status = family === 'rpc' ? rpc : family === 'snap' ? snap : null;
  if (!status) return null;
  return (
    <span title={status.detail} className="inline-flex items-center">
      <StatusDot tone={status.tone} />
      <span className="sr-only">{status.detail}</span>
    </span>
  );
}

export default function StageNav() {
  const { currentStage } = useStage();
  const navigate = useNavigate();
  const activeGroup = getGroupForStage(currentStage);

  const [userOpen, setUserOpen] = useState<Set<GroupId>>(() => new Set());
  const [activeClosed, setActiveClosed] = useState(false);
  const [query, setQuery] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<HTMLAnchorElement>(null);

  // A new active stage always shows its group.
  useEffect(() => setActiveClosed(false), [currentStage]);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [currentStage]);

  // `/` focuses the filter of the visible nav.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      const input = filterRef.current;
      if (!input || input.offsetParent === null) return;
      event.preventDefault();
      input.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const matches = useMemo(() => filterStages(query), [query]);

  const isOpen = (groupId: GroupId) => userOpen.has(groupId) || (groupId === activeGroup && !activeClosed);

  const toggleGroup = (groupId: GroupId) => {
    const open = isOpen(groupId);
    if (groupId === activeGroup) setActiveClosed(open);
    setUserOpen((prev) => {
      const next = new Set(prev);
      if (open) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Clicking a row keeps the current group open so the list does not jump.
  const keepActiveGroupOpen = () => {
    if (activeGroup && !activeClosed) setUserOpen((prev) => new Set(prev).add(activeGroup));
  };

  const onFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && matches[0]) {
      event.preventDefault();
      navigate(getStageUrl(matches[0].stage.id));
      setQuery('');
    } else if (event.key === 'Escape' && query) {
      event.stopPropagation();
      setQuery('');
    }
  };

  const renderStageRow = (stage: Stage, suffix?: string) => {
    const active = stage.id === currentStage;
    return (
      <li key={stage.id}>
        <Link
          to={getStageUrl(stage.id)}
          ref={active ? activeRowRef : undefined}
          aria-current={active ? 'page' : undefined}
          onClick={keepActiveGroupOpen}
          className={`${STAGE_ROW} ${suffix ? 'pl-2' : 'pl-[26px]'} ${active ? STAGE_ROW_ACTIVE : ''}`}
        >
          <span className="truncate">{stage.title}</span>
          {suffix && <span className="ml-auto pl-2 text-caption text-ink-muted truncate">{suffix}</span>}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Stages" className="flex flex-col w-full min-h-0 bg-base-200 border-r border-base-300">
      <div className="px-3 pt-3 pb-2 flex-none">
        <label className="flex items-center gap-1.5 h-8 px-2 rounded-field border border-field-border bg-base-100 text-ink-muted focus-within:outline focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2">
          <FiSearch aria-hidden="true" size={14} className="flex-none" />
          <span className="sr-only">Filter stages</span>
          <input
            ref={filterRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onFilterKeyDown}
            placeholder="Filter stages"
            className="flex-1 min-w-0 bg-transparent text-body text-base-content placeholder:text-ink-muted outline-none focus-visible:outline-none"
          />
          {!query && (
            <kbd className="text-[11px] leading-4 px-1 border border-base-300 rounded-selector font-mono">/</kbd>
          )}
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
        {query ? (
          matches.length > 0 ? (
            <ul aria-label="Matching stages" className="flex flex-col gap-0.5">
              {matches.map(({ stage, group, familyTitle }) => renderStageRow(stage, `${familyTitle} / ${group.title}`))}
            </ul>
          ) : (
            <p className="px-2 py-2 text-body text-ink-muted">No stage matches “{query}”.</p>
          )
        ) : (
          STAGE_FAMILIES.map((family) => {
            const groups = STAGE_GROUPS.filter((g) => g.family === family.id);
            if (groups.length === 0) return null;
            return (
              <section key={family.id} aria-labelledby={`family-${family.id}`}>
                <h2
                  id={`family-${family.id}`}
                  className="flex items-center justify-between px-2 pt-3 pb-1 m-0 text-caption font-semibold text-ink-muted"
                >
                  <span>{family.title}</span>
                  <FamilyIndicator family={family.id} />
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {groups.map((group) => {
                    const open = isOpen(group.id);
                    const listId = `stage-group-${group.id}`;
                    return (
                      <li key={group.id}>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={listId}
                          onClick={() => toggleGroup(group.id)}
                          className="flex w-full items-center gap-1.5 h-8 px-2 rounded-field text-body font-semibold text-base-content hover:bg-base-300"
                        >
                          <FiChevronDown
                            aria-hidden="true"
                            size={14}
                            className={`flex-none text-ink-muted transition-transform duration-[180ms] ${open ? '' : '-rotate-90'}`}
                          />
                          <span className="truncate">{group.title}</span>
                          <span className="ml-auto font-mono text-data-sm font-normal text-ink-muted">
                            {group.stages.length}
                          </span>
                        </button>
                        {open && (
                          <ul id={listId} className="flex flex-col gap-0.5 mt-0.5">
                            {group.stages.map((stage) => renderStageRow(stage))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </nav>
  );
}
