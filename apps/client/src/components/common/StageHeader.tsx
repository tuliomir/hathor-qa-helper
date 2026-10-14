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
import type { StageId } from '../../types/stage';
import { getStageUrl } from '../../config/stageRoutes';
import CopyButton from './CopyButton';
import { APP_TITLE, documentTitle, stageTitle } from '../../utils/documentTitle';
import { stageHeading } from '../../utils/stageHeading';

interface StageHeaderBaseProps {
  /** Overrides the registry description. */
  description?: React.ReactNode;
  /** Replaces the registry breadcrumb (family / group). */
  breadcrumb?: React.ReactNode;
  /** Shown right after the title, e.g. a status chip. */
  titleAdornment?: React.ReactNode;
  /** RPC or snap method name, shown as a mono chip with copy. */
  method?: string;
  docsUrl?: string;
  actions?: React.ReactNode;
}

/**
 * With `stageId`, title, description and breadcrumb come from the stage
 * registry. Without it (walkthrough steps), pass `title` and `breadcrumb`.
 */
export type StageHeaderProps = StageHeaderBaseProps &
  ({ stageId: StageId; title?: string } | { stageId?: undefined; title: string });

export function StageHeader({
  stageId,
  title,
  description,
  breadcrumb,
  titleAdornment,
  method,
  docsUrl,
  actions,
}: StageHeaderProps) {
  const heading = stageId ? stageHeading(stageId) : undefined;
  const shownTitle = title ?? heading?.title ?? '';
  const shownDescription = description ?? heading?.description;
  const familyChip = heading?.familyChip;

  useEffect(() => {
    documentTitle.setBase(stageTitle(shownTitle, familyChip));
    return () => documentTitle.setBase(APP_TITLE);
  }, [shownTitle, familyChip]);

  const registryBreadcrumb = heading?.groupTitle && heading.groupFirstStageId && (
    <>
      {heading.familyTitle && <span>{heading.familyTitle} / </span>}
      <Link to={getStageUrl(heading.groupFirstStageId)} className="text-inherit no-underline hover:underline">
        {heading.groupTitle}
      </Link>
    </>
  );
  const shownBreadcrumb = breadcrumb ?? registryBreadcrumb;

  return (
    <header className="flex flex-col gap-0.5 text-left">
      {shownBreadcrumb && (
        <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
          {shownBreadcrumb}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="m-0 text-page">{shownTitle}</h1>
        {titleAdornment}
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
      {shownDescription && <p className="m-0 text-body text-ink-muted">{shownDescription}</p>}
    </header>
  );
}

export default StageHeader;
