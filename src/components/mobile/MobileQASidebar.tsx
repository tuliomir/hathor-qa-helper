/**
 * Mobile QA Sidebar Component
 * Displays section and step navigation with progress indicators
 */

import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  selectCurrentLocation,
  selectStepStatus,
  selectCompletedStepsCount,
  setCurrentLocation,
} from '../../store/slices/mobileQAProgressSlice';
import { getSections } from '../../config/mobileQA';
import type { SectionConfig, StepConfig } from '../../types/mobileQA';
import { MdExpandMore, MdExpandLess, MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

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
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
        isActive
          ? 'bg-purple-100 border-l-4 border-purple-600 text-purple-900'
          : 'hover:bg-gray-100 border-l-4 border-transparent'
      }`}
    >
      {isCompleted ? (
        <MdCheckCircle className="text-success flex-shrink-0" size={18} />
      ) : (
        <MdRadioButtonUnchecked className="text-muted flex-shrink-0" size={18} />
      )}
      <span className={`text-sm ${isCompleted ? 'text-success' : ''}`}>{step.title}</span>
    </button>
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
  const completedCount = useAppSelector((state) =>
    selectCompletedStepsCount(state, section.id)
  );
  const totalSteps = section.steps.length;
  const isCurrentSection = currentLocation.sectionId === section.id;

  const handleStepClick = (stepId: string) => {
    dispatch(setCurrentLocation({ sectionId: section.id, stepId }));
  };

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
          isCurrentSection ? 'bg-purple-50' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex-1">
          <h3 className="text-base font-bold m-0">{section.title}</h3>
          <p className="text-xs text-muted m-0 mt-0.5">
            {completedCount} / {totalSteps} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {completedCount === totalSteps && totalSteps > 0 && (
            <MdCheckCircle className="text-success" size={20} />
          )}
          {isExpanded ? <MdExpandLess size={24} /> : <MdExpandMore size={24} />}
        </div>
      </button>

      {/* Steps List */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {section.steps.map((step) => (
            <StepItem
              key={step.id}
              step={step}
              sectionId={section.id}
              isActive={isCurrentSection && currentLocation.stepId === step.id}
              onClick={() => handleStepClick(step.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileQASidebar() {
  const sections = getSections();
  const currentLocation = useAppSelector(selectCurrentLocation);

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Initially expand the current section
    return new Set([currentLocation.sectionId]);
  });

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

  return (
    <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
      <div className="py-4">
        <h2 className="px-4 text-sm font-bold text-muted uppercase tracking-wide mb-2">
          Sections
        </h2>
        <div>
          {sections.map((section) => (
            <SectionItem
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
