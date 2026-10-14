/**
 * StageHeader — the first thing in every stage: breadcrumb (family / group),
 * title, one-line description and, for method stages, the method name as a
 * chip. Title and description default to the stage registry. It also sets
 * the tab title ("Send transaction | RPC | QA Helper"); NetworkRail adds the
 * "[Mainnet] " prefix through the same controller.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdOpenInNew } from 'react-icons/md';
import { STAGE_FAMILIES, STAGE_GROUPS, type StageId } from '../../types/stage';
import { getStageUrl } from '../../config/stageRoutes';
import CopyButton from './CopyButton';
import { APP_TITLE, documentTitle, stageTitle } from '../../utils/documentTitle';

export interface StageHeaderProps {
  stageId: StageId;
  /** Overrides the registry title. */
  title?: string;
  /** Overrides the registry description. */
  description?: React.ReactNode;
  /** RPC or snap method name, shown as a mono chip with copy. */
  method?: string;
  docsUrl?: string;
  actions?: React.ReactNode;
}

export function StageHeader({ stageId, title, description, method, docsUrl, actions }: StageHeaderProps) {
  const group = STAGE_GROUPS.find((g) => g.stages.some((s) => s.id === stageId));
  const stage = group?.stages.find((s) => s.id === stageId);
  const family = group ? STAGE_FAMILIES.find((f) => f.id === group.family) : undefined;
  const shownTitle = title ?? stage?.title ?? stageId;

  useEffect(() => {
    documentTitle.setBase(stageTitle(shownTitle, family?.chip));
    return () => documentTitle.setBase(APP_TITLE);
  }, [shownTitle, family?.chip]);

  return (
    <header className="flex flex-col gap-0.5 text-left">
      {group && (
        <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
          {family && <span>{family.title} / </span>}
          <Link to={getStageUrl(group.stages[0].id)} className="text-inherit no-underline hover:underline">
            {group.title}
          </Link>
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="m-0 text-page">{shownTitle}</h1>
        {method && (
          <span className="inline-flex h-6 items-center gap-1 rounded-field border border-base-300 bg-base-100 pl-2 font-mono text-data-sm">
            {method}
            <CopyButton text={method} label="Copy method name" />
          </span>
        )}
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary inline-flex items-center gap-1 text-body"
          >
            Docs
            <MdOpenInNew aria-hidden="true" />
          </a>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {(description ?? stage?.description) && (
        <p className="m-0 text-body text-ink-muted">{description ?? stage?.description}</p>
      )}
    </header>
  );
}

export default StageHeader;
