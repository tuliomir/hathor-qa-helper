/**
 * Desktop QA Sidebar Component
 * Displays section and step navigation with progress indicators
 */

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCompletedStepsCount,
  selectCurrentLocation,
  selectStepStatus,
  setCurrentLocation,
} from '../../store/slices/desktopQAProgressSlice';
import { getSections } from '../../config/desktopQA';
import type { SectionConfig, StepConfig } from '../../types/desktopQA';
import { FiChevronDown } from 'react-icons/fi';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

const STEP_ROW =
  'relative flex w-full items-center gap-2 min-h-8 py-1 pl-[26px] pr-2 rounded-field text-left text-body text-base-content hover:bg-base-300';
const STEP_ROW_ACTIVE =
  "bg-[color-mix(in_oklab,var(--color-primary)_8%,transparent)] !text-primary font-semibold hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] before:content-[''] before:absolute before:left-2.5 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded before:bg-primary";

function StepItem({
  step,
  sectionId,
  isActive,
  onClick,
}: {
  step: StepConfig;
  sectionId: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const status = useAppSelector((state) => selectStepStatus(state, sectionId, step.id));
  const isCompleted = status === 'completed';
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={isActive ? 'step' : undefined}
        className={`${STEP_ROW} ${isActive ? STEP_ROW_ACTIVE : ''}`}
      >
        {isCompleted ? (
          <MdCheckCircle aria-hidden="true" className="flex-none text-success" size={16} />
        ) : (
          <MdRadioButtonUnchecked aria-hidden="true" className="flex-none text-ink-muted" size={16} />
        )}
        <span className="min-w-0 flex-1">{step.title}</span>
        {isCompleted && <span className="sr-only">(completed)</span>}
      </button>
    </li>
  );
}

function SectionItem({
  section,
  isExpanded,
  onToggle,
}: {
  section: SectionConfig;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const dispatch = useAppDispatch();
  const currentLocation = useAppSelector(selectCurrentLocation);
  const completedCount = useAppSelector((state) => selectCompletedStepsCount(state, section.id));
  const totalSteps = section.steps.length;
  const isCurrentSection = currentLocation.sectionId === section.id;
  const isSectionDone = completedCount === totalSteps && totalSteps > 0;
  const listId = `desktop-qa-section-${section.id}`;

  const handleStepClick = (stepId: string) => {
    dispatch(setCurrentLocation({ sectionId: section.id, stepId }));
  };

  return (
    <li>
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={listId}
          className={`flex w-full items-center gap-1.5 h-8 px-2 rounded-field text-left text-body font-semibold hover:bg-base-300 ${
            isCurrentSection ? 'text-primary' : 'text-base-content'
          }`}
        >
          <FiChevronDown
            aria-hidden="true"
            size={14}
            className={`flex-none text-ink-muted transition-transform duration-[180ms] ${isExpanded ? '' : '-rotate-90'}`}
          />
          <span className="truncate">{section.title}</span>
          <span className="ml-auto flex flex-none items-center gap-1 font-mono text-data-sm font-normal text-ink-muted">
            {isSectionDone && <MdCheckCircle aria-hidden="true" className="text-success" size={14} />}
            <span aria-label={`${completedCount} of ${totalSteps} steps completed`}>
              {completedCount}/{totalSteps}
            </span>
          </span>
        </button>
      </h3>

      {isExpanded && (
        <ul id={listId} className="m-0 mt-0.5 flex list-none flex-col gap-0.5 p-0">
          {section.steps.map((step) => (
            <StepItem
              key={step.id}
              step={step}
              sectionId={section.id}
              isActive={isCurrentSection && currentLocation.stepId === step.id}
              onClick={() => handleStepClick(step.id)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DesktopQASidebar() {
  const sections = getSections();
  const currentLocation = useAppSelector(selectCurrentLocation);

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Initially expand the current section
    return new Set([currentLocation.sectionId]);
  });

  // Track previous section to detect navigation
  const prevSectionIdRef = useRef(currentLocation.sectionId);

  // Get completion counts for all sections (for auto-collapse logic)
  const sectionCompletionMap = useAppSelector((state) => {
    const map: Record<string, { completed: number; total: number }> = {};
    for (const section of sections) {
      map[section.id] = {
        completed: selectCompletedStepsCount(state, section.id),
        total: section.steps.length,
      };
    }
    return map;
  });

  // Auto-collapse completed sections when navigating to a new section
  useEffect(() => {
    const prevSectionId = prevSectionIdRef.current;
    const currentSectionId = currentLocation.sectionId;

    // Only act if we actually changed sections
    if (prevSectionId !== currentSectionId) {
      // Check if the previous section is fully completed
      const prevSectionStatus = sectionCompletionMap[prevSectionId];
      const isPrevSectionComplete = prevSectionStatus && prevSectionStatus.completed === prevSectionStatus.total;

      setExpandedSections((prev) => {
        const next = new Set(prev);

        // Collapse the previous section only if it's fully completed
        if (isPrevSectionComplete) {
          next.delete(prevSectionId);
        }

        // Expand the new current section
        next.add(currentSectionId);

        return next;
      });

      // Update the ref
      prevSectionIdRef.current = currentSectionId;
    }
  }, [currentLocation.sectionId, sectionCompletionMap]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Keep the active step row visible. Scroll the list itself rather than
  // calling scrollIntoView, which would also scroll the page around it.
  const navRef = useRef<HTMLElement>(null);
  const activeSectionOpen = expandedSections.has(currentLocation.sectionId);
  useEffect(() => {
    const list = navRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !row) return;
    const rowTop = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (rowTop < list.scrollTop) list.scrollTop = rowTop;
    else if (rowTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = rowTop + row.offsetHeight - list.clientHeight;
    }
  }, [currentLocation.sectionId, currentLocation.stepId, activeSectionOpen]);

  // Calculate current section index (1-based)
  const currentSectionIndex = sections.findIndex((s) => s.id === currentLocation.sectionId) + 1;
  const totalSections = sections.length;

  return (
    <nav
      ref={navRef}
      aria-label="Walkthrough steps"
      className="flex w-full min-h-0 flex-col overflow-y-auto bg-base-200 border-r border-base-300"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 className="m-0 text-caption font-semibold text-ink-muted">Sections</h2>
        <span className="text-caption text-ink-muted">
          Section <span className="font-mono">{currentSectionIndex}</span> of{' '}
          <span className="font-mono">{totalSections}</span>
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-0.5 px-2 pb-4">
        {sections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </ul>
    </nav>
  );
}
