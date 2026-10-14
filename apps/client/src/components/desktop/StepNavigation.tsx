/**
 * Step navigation for the mobile and desktop walkthroughs: Previous (ghost),
 * Mark complete (secondary) and Complete and next (primary). Once a step is
 * complete the primary action becomes Next step. Sticks to the bottom of the
 * scrolling step content so it stays reachable below long embedded tools.
 */

import { MdCheck, MdNavigateBefore, MdNavigateNext, MdUndo } from 'react-icons/md';

interface StepNavigationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  isCompleted: boolean;
  onPrevious: () => void;
  onToggleComplete: () => void;
  onCompleteAndNext: () => void;
  onNext: () => void;
}

export default function StepNavigation({
  hasPrevious,
  hasNext,
  isCompleted,
  onPrevious,
  onToggleComplete,
  onCompleteAndNext,
  onNext,
}: StepNavigationProps) {
  // On the last step "Mark complete" is the only forward action, so it leads.
  const toggleClass = isCompleted ? 'btn-ghost' : hasNext ? 'btn-secondary' : 'btn-primary';

  return (
    <div
      role="group"
      aria-label="Step navigation"
      className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-base-300 bg-base-100 px-4 py-3 md:-mx-6 md:px-6"
    >
      <button type="button" onClick={onPrevious} disabled={!hasPrevious} className="btn btn-ghost">
        <MdNavigateBefore aria-hidden="true" size={18} />
        Previous
      </button>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onToggleComplete} className={`btn ${toggleClass}`}>
          {isCompleted ? (
            <>
              <MdUndo aria-hidden="true" size={16} />
              Mark incomplete
            </>
          ) : (
            <>
              <MdCheck aria-hidden="true" size={16} />
              Mark complete
            </>
          )}
        </button>

        {hasNext &&
          (isCompleted ? (
            <button type="button" onClick={onNext} className="btn btn-primary">
              Next step
              <MdNavigateNext aria-hidden="true" size={18} />
            </button>
          ) : (
            <button type="button" onClick={onCompleteAndNext} className="btn btn-primary">
              Complete and next
              <MdNavigateNext aria-hidden="true" size={18} />
            </button>
          ))}
      </div>
    </div>
  );
}
