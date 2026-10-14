/**
 * PreconditionStrip — one row of requirement chips under the stage header.
 * The stage still renders below it; ExecuteBar takes `firstUnmetReason()`
 * as its disabled reason. Requirements come from the useRequire* hooks.
 */

import { Link } from 'react-router-dom';
import { MdCheck, MdClose } from 'react-icons/md';
import { StatusDot } from '../ui/StatusDot';
import { sortRequirements, type Requirement } from '../../utils/requirements';

export function PreconditionStrip({ requirements }: { requirements: Requirement[] }) {
  if (requirements.length === 0) return null;

  if (requirements.every((r) => r.met === true)) {
    return (
      <p className="m-0 flex items-center gap-1.5 text-caption text-ink-muted" aria-label="Preconditions">
        <MdCheck className="text-success" aria-hidden="true" />
        Ready: {requirements.map((r) => r.short.toLowerCase()).join(', ')}
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Preconditions">
      {sortRequirements(requirements).map((r) => (
        <li
          key={r.id}
          className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-body ${
            r.met === false ? 'bg-tint-error' : 'border border-base-300 bg-base-100'
          }`}
        >
          {r.met === true && <MdCheck className="text-success" aria-label="Met" />}
          {r.met === false && <MdClose className="text-error" aria-label="Not met" />}
          {r.met === 'pending' && <StatusDot tone="progress" />}
          <span>{r.label}</span>
          {r.met !== true && r.fix && (
            <Link to={r.fix.to} className="link link-primary font-semibold">
              {r.fix.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default PreconditionStrip;
